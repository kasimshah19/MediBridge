import { DateTime } from 'luxon';
import env from '../config/env.js';
import {
  ROLES,
  APPROVAL_STATUS,
  TRACKED_STATUSES,
  MEDICINE_STATUS,
  PRIORITY_LEVELS,
} from '../config/constants.js';
import Medicine from '../models/Medicine.js';
import Donation from '../models/Donation.js';
import JobRun from '../models/JobRun.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  getDaysLeft,
  isExpired,
  calculatePriority,
  decorateMedicine,
  runExpiryCheck,
} from '../services/expiry.service.js';
import { nowIST } from '../utils/dates.js';

/**
 * Validates role-based scope access for expiry endpoints.
 * - Donor: only own medicines
 * - Admin: all medicines
 * - Approved Pharmacist: all medicines
 * - Unapproved Pharmacist: 403 Forbidden
 * - NGO: 403 Forbidden
 */
const resolveScopeFilter = (user) => {
  if (user.role === ROLES.NGO) {
    throw new ApiError(403, 'NGOs do not have access to the medicine expiry tracker');
  }

  if (user.role === ROLES.PHARMACIST) {
    if (user.approvalStatus !== APPROVAL_STATUS.APPROVED) {
      throw new ApiError(403, 'Pharmacist credentials must be approved to access expiry tracking');
    }
    return {}; // All medicines
  }

  if (user.role === ROLES.ADMIN) {
    return {}; // All medicines
  }

  if (user.role === ROLES.DONOR) {
    return { donorId: user._id };
  }

  throw new ApiError(403, 'Access denied to expiry tracking');
};

/**
 * GET /api/expiry/summary
 * Returns real computed summary metrics for the user's scope.
 */
export const getExpirySummary = async (req, res, next) => {
  try {
    const scopeFilter = resolveScopeFilter(req.user);
    const now = new Date();

    // Query all items that are either in tracked statuses or already marked expired
    const medicines = await Medicine.find({
      ...scopeFilter,
      status: { $in: [...TRACKED_STATUSES, MEDICINE_STATUS.EXPIRED] },
    })
      .select('expiryDate status priority')
      .lean();

    let normal = 0;
    let medium = 0;
    let high = 0;
    let critical = 0;
    let expiredTotal = 0;
    let expiringIn7Days = 0;
    let totalTracked = 0;

    for (const med of medicines) {
      const expired = isExpired(med.expiryDate, now) || med.status === MEDICINE_STATUS.EXPIRED;
      const daysLeft = getDaysLeft(med.expiryDate, now);

      if (expired) {
        expiredTotal++;
      } else {
        totalTracked++;
        if (daysLeft <= 7) {
          expiringIn7Days++;
        }

        const priority = calculatePriority(med.expiryDate, now);
        if (priority === PRIORITY_LEVELS.NORMAL) normal++;
        else if (priority === PRIORITY_LEVELS.MEDIUM) medium++;
        else if (priority === PRIORITY_LEVELS.HIGH) high++;
        else if (priority === PRIORITY_LEVELS.CRITICAL) critical++;
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          normal,
          medium,
          high,
          critical,
          expiredTotal,
          expiringIn7Days,
          totalTracked,
        },
        'Expiry summary retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/expiry/items
 * Returns a paginated list of medicines with decorated fields.
 */
export const getExpiryItems = async (req, res, next) => {
  try {
    const scopeFilter = resolveScopeFilter(req.user);
    const now = new Date();

    const {
      priority,
      status,
      search,
      sort = 'expiryDate',
      order = 'asc',
      page = 1,
      limit = 20,
    } = req.query;

    const query = { ...scopeFilter };

    // Default status: tracked statuses plus expired
    if (!status || status === 'all') {
      query.status = { $in: [...TRACKED_STATUSES, MEDICINE_STATUS.EXPIRED] };
    } else {
      query.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      if (priority === 'expired') {
        query.status = MEDICINE_STATUS.EXPIRED;
      } else {
        query.priority = priority;
      }
    }

    // Search filter: name, batchNumber, or donationCode
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Check if search matches any donationCodes
      const matchingDonations = await Donation.find({
        donationCode: searchRegex,
      }).select('_id');
      const matchingDonationIds = matchingDonations.map((d) => d._id);

      query.$or = [
        { name: searchRegex },
        { genericName: searchRegex },
        { batchNumber: searchRegex },
        ...(matchingDonationIds.length > 0 ? [{ donationId: { $in: matchingDonationIds } }] : []),
      ];
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortField = sort === 'daysLeft' ? 'expiryDate' : sort;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [medicines, total] = await Promise.all([
      Medicine.find(query)
        .populate('donationId', 'donationCode status')
        .populate('donorId', 'name')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Medicine.countDocuments(query),
    ]);

    const isElevated = [ROLES.ADMIN, ROLES.PHARMACIST].includes(req.user.role);

    // Decorate each medicine with live computed fields
    const items = medicines.map((med) => {
      const decorated = decorateMedicine(med, now);
      return {
        _id: decorated._id,
        medicineId: decorated.medicineId || decorated._id,
        name: decorated.name,
        genericName: decorated.genericName,
        manufacturer: decorated.manufacturer,
        batchNumber: decorated.batchNumber,
        expiryDate: decorated.expiryDate,
        quantity: decorated.quantity,
        unit: decorated.unit,
        status: decorated.status,
        priority: decorated.effectivePriority,
        daysLeft: decorated.daysLeft,
        isExpired: decorated.isExpired,
        expiryLabel: decorated.expiryLabel,
        donationId: decorated.donationId?._id || decorated.donationId,
        donationCode: decorated.donationId?.donationCode || null,
        ...(isElevated ? { donorName: decorated.donorId?.name || 'Anonymous Donor' } : {}),
      };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          items,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum) || 1,
          },
        },
        'Expiry items retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/expiry/timeline
 * Returns counts of tracked medicines grouped by expiry month for next 12 months.
 */
export const getExpiryTimeline = async (req, res, next) => {
  try {
    const scopeFilter = resolveScopeFilter(req.user);
    const now = new Date();
    const currentMonthIST = nowIST(now).startOf('month');

    // Generate array of the next 12 months in Asia/Kolkata
    const timeline = [];
    const monthKeyMap = new Map();

    for (let i = 0; i < 12; i++) {
      const dt = currentMonthIST.plus({ months: i });
      const monthKey = dt.toFormat('yyyy-MM');
      const monthObj = {
        month: monthKey,
        label: dt.toFormat('LLL yyyy'),
        count: 0,
        critical: 0,
        high: 0,
        medium: 0,
        normal: 0,
      };
      timeline.push(monthObj);
      monthKeyMap.set(monthKey, monthObj);
    }

    const medicines = await Medicine.find({
      ...scopeFilter,
      status: { $in: [...TRACKED_STATUSES, MEDICINE_STATUS.EXPIRED] },
    })
      .select('expiryDate status priority')
      .lean();

    let alreadyExpired = 0;

    for (const med of medicines) {
      const expired = isExpired(med.expiryDate, now) || med.status === MEDICINE_STATUS.EXPIRED;
      if (expired) {
        alreadyExpired++;
      } else {
        const priority = calculatePriority(med.expiryDate, now);
        const itemMonthKey = nowIST(med.expiryDate).toFormat('yyyy-MM');
        const monthObj = monthKeyMap.get(itemMonthKey);
        if (monthObj) {
          monthObj.count++;
          if (priority === PRIORITY_LEVELS.CRITICAL) monthObj.critical++;
          else if (priority === PRIORITY_LEVELS.HIGH) monthObj.high++;
          else if (priority === PRIORITY_LEVELS.MEDIUM) monthObj.medium++;
          else if (priority === PRIORITY_LEVELS.NORMAL) monthObj.normal++;
        }
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          timeline,
          alreadyExpired,
        },
        'Expiry timeline retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/jobs/expiry
 * Admin-only: list recent JobRun records and next scheduled run.
 */
export const getAdminJobRuns = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));

    const runs = await JobRun.find({ name: 'expiry-check' })
      .sort({ startedAt: -1 })
      .limit(limit)
      .populate('triggeredBy', 'name email role')
      .lean();

    // Compute next scheduled run time based on 00:10 IST schedule
    const nowDt = nowIST();
    let nextScheduled = nowDt.set({ hour: 0, minute: 10, second: 0, millisecond: 0 });
    if (nowDt > nextScheduled) {
      nextScheduled = nextScheduled.plus({ days: 1 });
    }

    const lastRun = runs[0] || null;
    const lastSuccessfulRun = runs.find((r) => r.status === 'success' && !r.dryRun) || null;

    // Check if last successful run was more than 26 hours ago
    const isStale = lastSuccessfulRun
      ? Date.now() - new Date(lastSuccessfulRun.startedAt).getTime() > 26 * 60 * 60 * 1000
      : false;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          runs,
          lastRun,
          lastSuccessfulRun,
          isStale,
          nextScheduledRun: nextScheduled.toJSDate(),
          cronEnabled: Boolean(env.ENABLE_INTERNAL_CRON),
          cronSchedule: env.EXPIRY_CRON_SCHEDULE,
        },
        'Job runs retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/jobs/expiry/run
 * Admin-only: trigger manual dry-run or real expiry check.
 */
export const runAdminExpiryCheck = async (req, res, next) => {
  try {
    const { dryRun = false, asOf } = req.body || {};

    let executionAsOf = new Date();
    if (env.NODE_ENV !== 'production' && env.ALLOW_DEV_TIME_TRAVEL && asOf) {
      const parsed = new Date(asOf);
      if (!isNaN(parsed.getTime())) {
        executionAsOf = parsed;
      }
    }

    const result = await runExpiryCheck({
      now: executionAsOf,
      dryRun: Boolean(dryRun),
      trigger: 'manual_admin',
      triggeredBy: req.user._id,
    });

    if (result.skipped) {
      return next(new ApiError(409, 'An expiry check job is already running'));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          jobRunId: result.jobRunId,
          dryRun: result.dryRun,
          stats: result.stats,
          durationMs: result.durationMs,
          sampleChanges: result.sampleChanges,
        },
        dryRun
          ? 'Expiry dry run completed successfully (no database writes made)'
          : 'Expiry check executed and applied successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

