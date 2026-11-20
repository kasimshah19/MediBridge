import mongoose from 'mongoose';
import {
  PRIORITY_LEVELS,
  EXPIRY_THRESHOLDS,
  ALERT_DAYS,
  TRACKED_STATUSES,
  MEDICINE_STATUS,
  DONATION_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
  ROLES,
  CLAIM_STATUS,
  CLAIM_INITIATOR,
  REQUEST_STATUS,
  CUSTODY_EVENT_TYPES,
  TRANSFER_STATUS,
  TRANSFER_ITEM_STATUS,
} from '../config/constants.js';
import env from '../config/env.js';
import Medicine from '../models/Medicine.js';
import Donation from '../models/Donation.js';
import JobRun from '../models/JobRun.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Claim from '../models/Claim.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import ApiError from '../utils/ApiError.js';
import recordAuditLog from './audit.service.js';
import { recordEvent, isDbConnected } from './custody.service.js';
import { sendExpiryAlertEmail } from './email.service.js';
import {
  nowIST,
  startOfDayIST,
  calendarDaysBetweenIST,
  endOfMonthIST,
  normalizeExpiryDate,
} from '../utils/dates.js';

export { normalizeExpiryDate, endOfMonthIST, startOfDayIST, calendarDaysBetweenIST };

/**
 * Calculates calendar days remaining until expiry in Asia/Kolkata timezone.
 *
 * @param {Date|string} expiryDate
 * @param {Date|string} [now=new Date()]
 * @returns {number}
 */
export const getDaysLeft = (expiryDate, now = new Date()) => {
  return calendarDaysBetweenIST(now, expiryDate);
};

/**
 * Backward compatibility alias for calculateRemainingDays from Phase 3.
 */
export const calculateRemainingDays = (expiryDate, now = new Date()) => {
  return getDaysLeft(expiryDate, now);
};

/**
 * Checks if a medicine has expired.
 * A medicine is considered expired once the reference time passes the expiryDate
 * (which is stored at 23:59:59.999 IST on the last day of the printed month).
 *
 * @param {Date|string} expiryDate
 * @param {Date|string} [now=new Date()]
 * @returns {boolean}
 */
export const isExpired = (expiryDate, now = new Date()) => {
  if (!expiryDate) return false;
  const exp = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const ref = now instanceof Date ? now : new Date(now);
  if (isNaN(exp.getTime()) || isNaN(ref.getTime())) return false;
  return ref.getTime() > exp.getTime();
};

/**
 * Calculates priority based on remaining days of shelf life in Asia/Kolkata:
 * normal > 180, medium 91-180, high 31-90, critical 0-30.
 *
 * @param {Date|string} expiryDate
 * @param {Date|string} [now=new Date()]
 * @returns {'normal'|'medium'|'high'|'critical'}
 */
export const calculatePriority = (expiryDate, now = new Date()) => {
  const daysLeft = getDaysLeft(expiryDate, now);

  if (daysLeft > EXPIRY_THRESHOLDS.medium) {
    return PRIORITY_LEVELS.NORMAL;
  }
  if (daysLeft > EXPIRY_THRESHOLDS.high) {
    return PRIORITY_LEVELS.MEDIUM;
  }
  if (daysLeft > EXPIRY_THRESHOLDS.critical) {
    return PRIORITY_LEVELS.HIGH;
  }
  return PRIORITY_LEVELS.CRITICAL;
};

/**
 * Generates a human-friendly label for medicine expiry.
 *
 * @param {number} daysLeft
 * @param {boolean} expired
 * @returns {string}
 */
export const getExpiryLabel = (daysLeft, expired) => {
  if (expired) {
    const absDays = Math.abs(daysLeft);
    if (absDays <= 1) {
      return 'Expired yesterday';
    }
    return `Expired ${absDays} days ago`;
  }
  if (daysLeft === 0) {
    return 'Expires today';
  }
  if (daysLeft === 1) {
    return '1 day left';
  }
  return `${daysLeft} days left`;
};

/**
 * Decorates a medicine document/object with live computed fields:
 * { daysLeft, isExpired, effectivePriority, expiryLabel }
 *
 * @param {object} medicine
 * @param {Date|string} [now=new Date()]
 * @returns {object}
 */
export const decorateMedicine = (medicine, now = new Date()) => {
  if (!medicine) return null;
  const raw = typeof medicine.toObject === 'function' ? medicine.toObject() : { ...medicine };

  const daysLeft = getDaysLeft(raw.expiryDate, now);
  const expired = isExpired(raw.expiryDate, now) || raw.status === MEDICINE_STATUS.EXPIRED;
  const effectivePriority = calculatePriority(raw.expiryDate, now);
  const expiryLabel = getExpiryLabel(daysLeft, expired);

  return {
    ...raw,
    daysLeft,
    isExpired: expired,
    effectivePriority,
    expiryLabel,
  };
};

/**
 * Asserts that a medicine is not expired, throwing ApiError 409 if expired.
 * Exported for Phase 5 (pharmacist verification) and Phase 7 (handover).
 *
 * @param {object} medicine
 * @param {Date|string} [now=new Date()]
 */
export const assertNotExpired = (medicine, now = new Date()) => {
  if (!medicine) return;
  if (isExpired(medicine.expiryDate, now) || medicine.status === MEDICINE_STATUS.EXPIRED) {
    throw new ApiError(409, 'This medicine has expired and cannot be approved or transferred');
  }
};

/**
 * THE MAIN EXPIRY CHECK LOGIC
 * Runs automated expiry and priority recalculation across all tracked medicines.
 *
 * @param {object} options
 * @param {Date} [options.now=new Date()]
 * @param {boolean} [options.dryRun=false]
 * @param {'cron'|'github_actions'|'manual_admin'|'startup_catchup'} options.trigger
 * @param {string|null} [options.triggeredBy=null]
 * @returns {Promise<object>}
 */
export const runExpiryCheck = async ({
  now = new Date(),
  dryRun = false,
  trigger = 'manual_admin',
  triggeredBy = null,
} = {}) => {
  const startedAt = new Date();
  const executionAsOf = now instanceof Date ? now : new Date(now);

  // 1. Lock check: return 409 if another run is currently active and started < 10 mins ago
  const tenMinutesAgo = new Date(startedAt.getTime() - 10 * 60 * 1000);
  const activeLock = await JobRun.findOne({
    name: 'expiry-check',
    status: 'running',
    startedAt: { $gte: tenMinutesAgo },
  });

  if (activeLock) {
    return {
      skipped: true,
      reason: 'already_running',
      jobRunId: activeLock._id,
    };
  }

  // Mark older stale running jobs as failed
  await JobRun.updateMany(
    {
      name: 'expiry-check',
      status: 'running',
      startedAt: { $lt: tenMinutesAgo },
    },
    {
      $set: {
        status: 'failed',
        error: 'Job timed out or crashed; marked stale automatically',
        finishedAt: startedAt,
      },
    }
  );

  // 2. Create JobRun
  const jobRun = await JobRun.create({
    name: 'expiry-check',
    trigger,
    triggeredBy,
    dryRun,
    asOf: executionAsOf,
    status: 'running',
    startedAt,
    stats: {
      scanned: 0,
      priorityChanged: 0,
      newlyExpired: 0,
      notificationsCreated: 0,
      notificationsPurged: 0,
      donationsAffected: 0,
    },
  });

  try {
    let scanned = 0;
    let priorityChanged = 0;
    let newlyExpired = 0;
    let notificationsCreated = 0;
    let notificationsPurged = 0;
    let donationsAffected = 0;

    const sampleChanges = [];
    const affectedDonationIds = new Set();
    const newlyExpiredMedicineIds = [];

    // Map: donorId -> { d90: [item], d30: [item], d7: [item], expired: [item] }
    const donorAlertsMap = new Map();

    // 3. Process tracked medicines using cursor in batches of 500
    const cursor = Medicine.find({
      status: { $in: TRACKED_STATUSES },
    })
      .select(
        '_id medicineId name donorId donationId expiryDate status priority expiryAlerts statusHistory'
      )
      .lean()
      .cursor({ batchSize: 500 });

    const bulkOperations = [];

    for await (const item of cursor) {
      scanned++;
      const daysLeft = getDaysLeft(item.expiryDate, executionAsOf);
      const expired = isExpired(item.expiryDate, executionAsOf);
      const newPriority = calculatePriority(item.expiryDate, executionAsOf);

      const donorIdStr = item.donorId.toString();
      if (!donorAlertsMap.has(donorIdStr)) {
        donorAlertsMap.set(donorIdStr, {
          d90: [],
          d30: [],
          d7: [],
          expired: [],
        });
      }
      const donorBucket = donorAlertsMap.get(donorIdStr);

      if (expired) {
        // Item is newly expired
        newlyExpired++;
        affectedDonationIds.add(item.donationId.toString());
        newlyExpiredMedicineIds.push(item._id);

        if (sampleChanges.length < 50) {
          sampleChanges.push({
            medicineId: item.medicineId || item._id,
            name: item.name,
            fromPriority: item.priority,
            toPriority: PRIORITY_LEVELS.CRITICAL,
            fromStatus: item.status,
            toStatus: MEDICINE_STATUS.EXPIRED,
            daysLeft,
          });
        }

        if (!dryRun) {
          const updateFields = {
            status: MEDICINE_STATUS.EXPIRED,
            expiredAt: executionAsOf,
            priority: PRIORITY_LEVELS.CRITICAL,
            expiryCheckedAt: executionAsOf,
          };

          const alertUpdates = {};
          if (!item.expiryAlerts?.expiredAt) {
            alertUpdates['expiryAlerts.expiredAt'] = executionAsOf;
            donorBucket.expired.push(item);
          }

          bulkOperations.push({
            updateOne: {
              filter: { _id: item._id, status: { $in: TRACKED_STATUSES } },
              update: {
                $set: { ...updateFields, ...alertUpdates },
                $push: {
                  statusHistory: {
                    status: MEDICINE_STATUS.EXPIRED,
                    note: 'Automatically marked expired by system',
                    at: executionAsOf,
                    by: null,
                  },
                },
              },
            },
          });
        }
      } else {
        // Not expired: recompute priority
        const priorityHasChanged = item.priority !== newPriority;
        if (priorityHasChanged) {
          priorityChanged++;
        }

        // Check threshold crossing for notifications
        let targetThreshold = null;
        const currentAlerts = item.expiryAlerts || {};

        if (daysLeft <= 7 && !currentAlerts.d7At) {
          targetThreshold = 'd7';
        } else if (daysLeft <= 30 && !currentAlerts.d30At) {
          targetThreshold = 'd30';
        } else if (daysLeft <= 90 && !currentAlerts.d90At) {
          targetThreshold = 'd90';
        }

        const alertUpdates = {};
        if (targetThreshold) {
          if (targetThreshold === 'd7') {
            alertUpdates['expiryAlerts.d7At'] = executionAsOf;
            alertUpdates['expiryAlerts.d30At'] = currentAlerts.d30At || executionAsOf;
            alertUpdates['expiryAlerts.d90At'] = currentAlerts.d90At || executionAsOf;
            donorBucket.d7.push(item);
          } else if (targetThreshold === 'd30') {
            alertUpdates['expiryAlerts.d30At'] = executionAsOf;
            alertUpdates['expiryAlerts.d90At'] = currentAlerts.d90At || executionAsOf;
            donorBucket.d30.push(item);
          } else if (targetThreshold === 'd90') {
            alertUpdates['expiryAlerts.d90At'] = executionAsOf;
            donorBucket.d90.push(item);
          }
        }

        if (priorityHasChanged && sampleChanges.length < 50) {
          sampleChanges.push({
            medicineId: item.medicineId || item._id,
            name: item.name,
            fromPriority: item.priority,
            toPriority: newPriority,
            fromStatus: item.status,
            toStatus: item.status,
            daysLeft,
          });
        }

        // Only update document if priority changed or alerts were stamped
        if (!dryRun && (priorityHasChanged || Object.keys(alertUpdates).length > 0)) {
          bulkOperations.push({
            updateOne: {
              filter: { _id: item._id },
              update: {
                $set: {
                  priority: newPriority,
                  expiryCheckedAt: executionAsOf,
                  ...alertUpdates,
                },
              },
            },
          });
        }
      }

      // Execute bulkWrite in chunks of 500
      if (!dryRun && bulkOperations.length >= 500) {
        await Medicine.bulkWrite(bulkOperations);
        bulkOperations.length = 0;
      }
    }

    // Flush any remaining bulk operations
    if (!dryRun && bulkOperations.length > 0) {
      await Medicine.bulkWrite(bulkOperations);
      bulkOperations.length = 0;
    }

    // 4. Donation consequences for affected donations (where medicines expired)
    if (!dryRun && affectedDonationIds.size > 0) {
      for (const donationId of affectedDonationIds) {
        const donation = await Donation.findById(donationId).populate('items');
        if (!donation) continue;

        // Check viable items in pending, approved, reserved
        const viableItems = (donation.items || []).filter((med) =>
          TRACKED_STATUSES.includes(med.status)
        );

        if (viableItems.length === 0) {
          // All items expired: if in under_verification, more_info_required, or approved -> reject
          if (
            [
              DONATION_STATUS.UNDER_VERIFICATION,
              DONATION_STATUS.MORE_INFO_REQUIRED,
              DONATION_STATUS.APPROVED,
            ].includes(donation.status)
          ) {
            donation.status = DONATION_STATUS.REJECTED;
            donation.rejectionReason = 'All medicines in this donation expired before handover';
            donation.statusHistory.push({
              status: DONATION_STATUS.REJECTED,
              note: 'All medicines in this donation expired before handover',
              at: executionAsOf,
              by: null,
            });
            await donation.save();
            donationsAffected++;

            await recordAuditLog({
              action: AUDIT_ACTIONS.DONATION_AUTO_CLOSED_EXPIRED,
              actorType: 'system',
              meta: {
                donationId: donation._id,
                donationCode: donation.donationCode,
              },
            });
          }
        } else {
          // Some items remain viable: add status note
          donation.statusHistory.push({
            status: donation.status,
            note: '1 or more medicines in this donation expired and were removed from circulation',
            at: executionAsOf,
            by: null,
          });
          await donation.save();
          donationsAffected++;
        }
      }
    } else if (dryRun) {
      donationsAffected = affectedDonationIds.size;
    }

    // 5. Grouped Notifications per donor & per threshold
    if (!dryRun) {
      for (const [donorId, buckets] of donorAlertsMap.entries()) {
        const donorUser = await User.findById(donorId);

        // Expired items
        if (buckets.expired.length > 0) {
          const count = buckets.expired.length;
          await Notification.create({
            userId: donorId,
            title: 'Medicines Expired',
            message: `${count} of your medicine${count === 1 ? '' : 's'} have expired and been marked inactive.`,
            type: NOTIFICATION_TYPES.EXPIRY_EXPIRED,
            link: '/donor/expiry?priority=critical',
          });
          notificationsCreated++;

          if (donorUser?.email) {
            await sendExpiryAlertEmail({
              to: donorUser.email,
              name: donorUser.name,
              count,
              type: 'expired',
            });
          }
        }

        // Critical <= 7 days
        if (buckets.d7.length > 0) {
          const count = buckets.d7.length;
          await Notification.create({
            userId: donorId,
            title: 'Urgent Expiry Alert',
            message: `${count} of your medicine${count === 1 ? '' : 's'} expire within 7 days.`,
            type: NOTIFICATION_TYPES.EXPIRY_CRITICAL,
            link: '/donor/expiry?priority=critical',
          });
          notificationsCreated++;
        }

        // Critical <= 30 days
        if (buckets.d30.length > 0) {
          const count = buckets.d30.length;
          await Notification.create({
            userId: donorId,
            title: 'Medicines Expiring Soon',
            message: `${count} of your medicine${count === 1 ? '' : 's'} expire within 30 days.`,
            type: NOTIFICATION_TYPES.EXPIRY_CRITICAL,
            link: '/donor/expiry?priority=critical',
          });
          notificationsCreated++;

          if (donorUser?.email) {
            await sendExpiryAlertEmail({
              to: donorUser.email,
              name: donorUser.name,
              count,
              type: 'warning',
            });
          }
        }

        // Warning <= 90 days
        if (buckets.d90.length > 0) {
          const count = buckets.d90.length;
          await Notification.create({
            userId: donorId,
            title: 'Shelf-Life Update',
            message: `${count} of your medicine${count === 1 ? '' : 's'} expire within 90 days.`,
            type: NOTIFICATION_TYPES.EXPIRY_WARNING,
            link: '/donor/expiry?priority=high',
          });
          notificationsCreated++;
        }
      }

      // Admin Summary notification if any item newly expired
      if (newlyExpired > 0) {
        const admins = await User.find({ role: ROLES.ADMIN }).select('_id');
        for (const admin of admins) {
          await Notification.create({
            userId: admin._id,
            title: 'Expiry Check Completed',
            message: `Automated expiry check identified ${newlyExpired} newly expired medicine${newlyExpired === 1 ? '' : 's'}.`,
            type: NOTIFICATION_TYPES.EXPIRY_EXPIRED,
            link: '/admin/expiry?priority=critical',
          });
          notificationsCreated++;
        }
      }

      // 6. Phase 6 Matching & Claims interplay
      if (newlyExpiredMedicineIds.length > 0) {
        // Auto-cancel pending claims referencing newly expired medicines
        const affectedPendingClaims = await Claim.find({
          status: CLAIM_STATUS.PENDING,
          medicineIds: { $in: newlyExpiredMedicineIds },
        });

        for (const claim of affectedPendingClaims) {
          claim.status = CLAIM_STATUS.CANCELLED;
          claim.statusHistory.push({
            status: CLAIM_STATUS.CANCELLED,
            note: 'Auto-cancelled: One or more requested medicines expired',
            at: executionAsOf,
          });
          await claim.save();

          await Notification.create({
            userId: claim.initiatedByUserId,
            title: 'Claim Auto-Cancelled',
            message: `Claim ${claim.claimCode} was auto-cancelled because one or more requested medicines expired.`,
            type: NOTIFICATION_TYPES.MATCH_CANCELLED,
            link: claim.initiatedBy === CLAIM_INITIATOR.NGO ? '/ngo/matches' : '/donor/matches',
          });

          await recordAuditLog({
            action: AUDIT_ACTIONS.CLAIM_AUTO_CANCELLED_EXPIRY,
            actorType: 'system',
            meta: { claimId: claim._id, claimCode: claim.claimCode },
          });
        }
      }

      // Expire stale pending claims past TTL
      const staleClaims = await Claim.find({
        status: CLAIM_STATUS.PENDING,
        expiresAt: { $lte: executionAsOf },
      });

      for (const stale of staleClaims) {
        stale.status = CLAIM_STATUS.EXPIRED;
        stale.statusHistory.push({
          status: CLAIM_STATUS.EXPIRED,
          note: 'Claim response window expired',
          at: executionAsOf,
        });
        await stale.save();

        await Notification.create({
          userId: stale.initiatedByUserId,
          title: 'Claim Expired',
          message: `Claim ${stale.claimCode} has expired as the response window closed.`,
          type: NOTIFICATION_TYPES.MATCH_EXPIRED,
          link: stale.initiatedBy === CLAIM_INITIATOR.NGO ? '/ngo/matches' : '/donor/matches',
        });

        await recordAuditLog({
          action: AUDIT_ACTIONS.CLAIM_EXPIRED,
          actorType: 'system',
          meta: { claimId: stale._id, claimCode: stale.claimCode },
        });
      }

      // Expire requirements past neededBy date
      const expiredRequirements = await Request.find({
        status: REQUEST_STATUS.OPEN,
        neededBy: { $lt: executionAsOf },
      });

      for (const req of expiredRequirements) {
        req.status = REQUEST_STATUS.EXPIRED;
        req.closedReason = 'Requirement neededBy date has passed';
        req.statusHistory.push({
          status: REQUEST_STATUS.EXPIRED,
          note: 'Automatically marked expired past neededBy date',
          at: executionAsOf,
        });
        await req.save();
      }

      // Record EXPIRED custody events for newly expired medicines
      for (const medId of newlyExpiredMedicineIds) {
        await recordEvent({
          medicineId: medId,
          eventType: CUSTODY_EVENT_TYPES.EXPIRED,
          actorId: null,
          actorRole: 'system',
          data: {
            reason: 'Automated expiry job detected medicine passed expiration date',
          },
        });
      }

      // Phase 7: Transfer interplay
      if (isDbConnected()) {
        // 1) Mark expired items in active transfers
        if (newlyExpiredMedicineIds.length > 0) {
          const affectedTransfers = await Transfer.find({
            status: { $in: [TRANSFER_STATUS.SCHEDULED, TRANSFER_STATUS.PARTIALLY_COMPLETED] },
            'items.medicineId': { $in: newlyExpiredMedicineIds },
          });

          for (const tr of affectedTransfers) {
            let trChanged = false;
            for (const it of tr.items) {
              if (
                newlyExpiredMedicineIds.some((id) => id.equals(it.medicineId)) &&
                it.status === TRANSFER_ITEM_STATUS.PENDING
              ) {
                it.status = TRANSFER_ITEM_STATUS.EXPIRED;
                trChanged = true;
              }
            }

            const hasViable = tr.items.some((it) =>
              [TRANSFER_ITEM_STATUS.PENDING, TRANSFER_ITEM_STATUS.RECEIVED].includes(it.status)
            );
            if (!hasViable) {
              tr.status = TRANSFER_STATUS.CANCELLED;
              tr.cancelReason = 'All items in transfer expired before physical receipt';
              tr.cancelledAt = executionAsOf;
              trChanged = true;
            }

            if (trChanged) {
              await tr.save();
            }
          }
        }

        // 2) Handover reminders (HANDOVER_REMINDER_DAYS = 3)
        const reminderThreshold = new Date(
          executionAsOf.getTime() - (env.HANDOVER_REMINDER_DAYS || 3) * 24 * 60 * 60 * 1000
        );
        const dueReminders = await Transfer.find({
          status: TRANSFER_STATUS.SCHEDULED,
          createdAt: { $lte: reminderThreshold },
          reminderSentAt: null,
        });

        for (const tr of dueReminders) {
          tr.reminderSentAt = executionAsOf;
          await tr.save();

          await Notification.create({
            userId: tr.donorId,
            title: 'Handover Reminder ⏰',
            message: `Transfer ${tr.transferCode} is awaiting handover. Please coordinate with the NGO or present your handover pass.`,
            type: NOTIFICATION_TYPES.HANDOVER_REMINDER,
            link: `/donor/handovers/${tr._id}`,
          });
          notificationsCreated++;
        }

        // 3) Handover auto-cancel (HANDOVER_AUTO_CANCEL_DAYS = 14) with no received items
        const autoCancelThreshold = new Date(
          executionAsOf.getTime() - (env.HANDOVER_AUTO_CANCEL_DAYS || 14) * 24 * 60 * 60 * 1000
        );
        const staleTransfers = await Transfer.find({
          status: TRANSFER_STATUS.SCHEDULED,
          createdAt: { $lte: autoCancelThreshold },
          'items.status': { $ne: TRANSFER_ITEM_STATUS.RECEIVED },
        });

        for (const tr of staleTransfers) {
          tr.status = TRANSFER_STATUS.CANCELLED;
          tr.cancelReason = 'Auto-cancelled: Handover window expired (14 days)';
          tr.cancelledAt = executionAsOf;

          for (const it of tr.items) {
            if (it.status === TRANSFER_ITEM_STATUS.PENDING) {
              it.status = TRANSFER_ITEM_STATUS.CANCELLED;
              await recordEvent({
                medicineId: it.medicineId,
                eventType: CUSTODY_EVENT_TYPES.MATCH_CANCELLED,
                actorId: null,
                actorRole: 'system',
                data: {
                  transferCode: tr.transferCode,
                  reason: 'Handover window expired (14 days)',
                },
              });
            }
          }
          await tr.save();

          const claim = await Claim.findById(tr.claimId);
          if (claim && claim.status === CLAIM_STATUS.ACCEPTED) {
            claim.status = CLAIM_STATUS.CANCELLED;
            claim.cancelReason = 'Auto-cancelled: Handover window expired (14 days)';
            claim.statusHistory.push({
              status: CLAIM_STATUS.CANCELLED,
              note: 'Auto-cancelled: Handover window expired (14 days)',
              at: executionAsOf,
            });
            await claim.save();

            await Medicine.updateMany(
              {
                _id: { $in: claim.medicineIds },
                'reservation.claimId': claim._id,
                status: MEDICINE_STATUS.RESERVED,
              },
              {
                $set: {
                  status: MEDICINE_STATUS.APPROVED,
                  reservation: null,
                },
              }
            );
          }

          await Notification.create({
            userId: tr.donorId,
            title: 'Handover Auto-Cancelled',
            message: `Transfer ${tr.transferCode} was auto-cancelled because the 14-day handover window elapsed.`,
            type: NOTIFICATION_TYPES.HANDOVER_CANCELLED,
            link: `/donor/handovers/${tr._id}`,
          });
          notificationsCreated++;
        }
      }

      // 7. Phase 8 Retention: Purge read notifications older than NOTIFICATION_RETENTION_DAYS (never unread)
      const retentionDays = env.NOTIFICATION_RETENTION_DAYS || 90;
      const purgeCutoff = new Date(executionAsOf.getTime() - retentionDays * 24 * 60 * 60 * 1000);
      try {
        const purgeResult = await Notification.deleteMany({
          isRead: true,
          createdAt: { $lt: purgeCutoff },
        });
        notificationsPurged = purgeResult?.deletedCount || 0;
      } catch (purgeErr) {
        notificationsPurged = 0;
      }
    }

    const durationMs = Date.now() - startedAt.getTime();
    const finalStats = {
      scanned,
      priorityChanged,
      newlyExpired,
      notificationsCreated,
      notificationsPurged,
      donationsAffected,
    };

    jobRun.status = 'success';
    jobRun.finishedAt = new Date();
    jobRun.durationMs = durationMs;
    jobRun.stats = finalStats;
    await jobRun.save();

    // Audit log
    await recordAuditLog({
      action: AUDIT_ACTIONS.EXPIRY_JOB_RUN,
      actorType: 'system',
      meta: {
        jobRunId: jobRun._id,
        trigger,
        dryRun,
        durationMs,
        stats: finalStats,
      },
    });

    return {
      success: true,
      jobRunId: jobRun._id,
      dryRun,
      stats: finalStats,
      durationMs,
      sampleChanges: dryRun ? sampleChanges : undefined,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    jobRun.status = 'failed';
    jobRun.finishedAt = new Date();
    jobRun.durationMs = durationMs;
    jobRun.error = err.message || 'Unknown expiry check failure';
    await jobRun.save();

    console.error('❌ Expiry check job failed:', err);
    throw err;
  }
};

export default {
  getDaysLeft,
  calculateRemainingDays,
  isExpired,
  calculatePriority,
  getExpiryLabel,
  decorateMedicine,
  assertNotExpired,
  runExpiryCheck,
  normalizeExpiryDate,
  endOfMonthIST,
  startOfDayIST,
  calendarDaysBetweenIST,
};
