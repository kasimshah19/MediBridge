import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import env from '../config/env.js';
import {
  ROLES,
  DONATION_STATUS,
  MEDICINE_STATUS,
  VERIFICATION_DECISION,
  TRANSFER_STATUS,
  TRANSFER_ITEM_STATUS,
  CLAIM_STATUS,
  REJECTION_REASON_LABELS,
  RECEIPT_REJECTION_LABELS,
  AUTO_SCREENING_REJECTION_REASONS,
  PRIORITY_LEVELS,
  TRACKED_STATUSES,
} from '../config/constants.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Verification from '../models/Verification.js';
import Claim from '../models/Claim.js';
import Transfer from '../models/Transfer.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Request from '../models/Request.js';
import JobRun from '../models/JobRun.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import CustodyEvent from '../models/CustodyEvent.js';
import ApiError from '../utils/ApiError.js';
import { nowIST, TIMEZONE } from '../utils/dates.js';

// In-memory analytics cache
const analyticsCache = new Map();

/**
 * Get cached result or execute fn and cache
 */
export const getCachedOrFetch = async (cacheKey, fetchFn) => {
  const ttlMs = (env.ANALYTICS_CACHE_SECONDS || 60) * 1000;
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = await fetchFn();
  analyticsCache.set(cacheKey, {
    data,
    expiresAt: now + ttlMs,
  });

  // Evict expired entries if cache grows
  if (analyticsCache.size > 200) {
    for (const [k, v] of analyticsCache.entries()) {
      if (v.expiresAt <= now) {
        analyticsCache.delete(k);
      }
    }
  }

  return data;
};

/**
 * Clear analytics cache (e.g. for testing)
 */
export const clearAnalyticsCache = () => {
  analyticsCache.clear();
};

/**
 * Parse and validate date range in Asia/Kolkata
 */
export const parseDateRange = (fromStr, toStr) => {
  const defaultTo = nowIST().endOf('day');
  const defaultFrom = defaultTo.minus({ days: 30 }).startOf('day');

  let dtTo = defaultTo;
  let dtFrom = defaultFrom;

  if (toStr) {
    dtTo = DateTime.fromISO(toStr, { zone: TIMEZONE }).endOf('day');
    if (!dtTo.isValid) {
      throw new ApiError(422, 'Invalid "to" date format. Use ISO format (YYYY-MM-DD).');
    }
  }

  if (fromStr) {
    dtFrom = DateTime.fromISO(fromStr, { zone: TIMEZONE }).startOf('day');
    if (!dtFrom.isValid) {
      throw new ApiError(422, 'Invalid "from" date format. Use ISO format (YYYY-MM-DD).');
    }
  }

  if (dtFrom > dtTo) {
    throw new ApiError(422, '"from" date must be earlier than or equal to "to" date.');
  }

  const diffDays = dtTo.diff(dtFrom, 'days').days;
  if (diffDays > 366) {
    throw new ApiError(422, 'Date range cannot exceed 366 days.');
  }

  const fromDate = dtFrom.toJSDate();
  const toDate = dtTo.toJSDate();

  // Calculate previous period of equal length
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  return {
    fromDate,
    toDate,
    prevFrom,
    prevTo,
    dtFrom,
    dtTo,
    diffDays: Math.round(diffDays),
  };
};

/**
 * Round coordinates to 2 decimal places (~1.1 km precision) for privacy
 */
export const roundCoordinate = (val, decimals = 2) => {
  if (typeof val !== 'number' || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
};

/**
 * Generate zero-filled date buckets
 */
export const generateZeroFilledBuckets = (dtFrom, dtTo, interval = 'day') => {
  const buckets = [];
  let cursor = dtFrom;

  if (interval === 'month') {
    cursor = cursor.startOf('month');
    while (cursor <= dtTo) {
      const bucket = cursor.toFormat('yyyy-MM');
      buckets.push({ bucket, label: cursor.toFormat('MMM yyyy'), value: 0 });
      cursor = cursor.plus({ months: 1 });
    }
  } else if (interval === 'week') {
    cursor = cursor.startOf('week');
    while (cursor <= dtTo) {
      const bucket = `${cursor.year}-W${String(cursor.weekNumber).padStart(2, '0')}`;
      buckets.push({ bucket, label: `Week ${cursor.weekNumber}, ${cursor.year}`, value: 0 });
      cursor = cursor.plus({ weeks: 1 });
    }
  } else {
    // Default day
    cursor = cursor.startOf('day');
    while (cursor <= dtTo) {
      const bucket = cursor.toFormat('yyyy-MM-dd');
      buckets.push({ bucket, label: cursor.toFormat('dd MMM'), value: 0 });
      cursor = cursor.plus({ days: 1 });
    }
  }

  return buckets;
};

// ====================================================
// 1. OVERVIEW KPIs
// ====================================================
export const getOverviewKPIs = async (range) => {
  const { fromDate, toDate, prevFrom, prevTo } = range;

  const calculatePeriodKPIs = async (start, end) => {
    const matchCreated = { createdAt: { $gte: start, $lte: end } };

    // 1. Donations submitted
    const donationsSubmitted = await Donation.countDocuments({
      ...matchCreated,
      status: { $ne: DONATION_STATUS.DRAFT },
    });

    // 2. Medicines submitted & screening pass rate
    const medicineStats = await Medicine.aggregate([
      { $match: matchCreated },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          passedScreening: {
            $sum: { $cond: [{ $eq: ['$screening.passed', true] }, 1, 0] },
          },
        },
      },
    ]);
    const medicinesSubmitted = medicineStats[0]?.total || 0;
    const passedScreening = medicineStats[0]?.passedScreening || 0;
    const screeningPassRate = medicinesSubmitted > 0
      ? Math.round((passedScreening / medicinesSubmitted) * 1000) / 10
      : 0;

    // 3. Pharmacist approval rate
    const verificationStats = await Verification.aggregate([
      { $match: { verifiedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$decision', VERIFICATION_DECISION.APPROVED] }, 1, 0] },
          },
        },
      },
    ]);
    const verificationsTotal = verificationStats[0]?.total || 0;
    const verificationsApproved = verificationStats[0]?.approved || 0;
    const pharmacistApprovalRate = verificationsTotal > 0
      ? Math.round((verificationsApproved / verificationsTotal) * 1000) / 10
      : 0;

    // 4. Medicines matched & transferred
    const medicinesMatched = await Medicine.countDocuments({
      status: { $in: [MEDICINE_STATUS.RESERVED, MEDICINE_STATUS.TRANSFERRED] },
      updatedAt: { $gte: start, $lte: end },
    });

    const transferredItems = await Transfer.aggregate([
      {
        $match: {
          status: TRANSFER_STATUS.COMPLETED,
          completedAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      { $match: { 'items.status': TRANSFER_ITEM_STATUS.RECEIVED } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          units: { $sum: '$items.quantity' },
        },
      },
    ]);
    const medicinesTransferred = transferredItems[0]?.count || 0;
    const wastagePreventedUnits = transferredItems[0]?.units || 0;

    // 5. Handovers completed
    const handoversCompleted = await Transfer.countDocuments({
      status: TRANSFER_STATUS.COMPLETED,
      completedAt: { $gte: start, $lte: end },
    });

    // 6. Avg Verification Hours (submit to first decision)
    const turnaroundTimes = await Verification.aggregate([
      { $match: { verifiedAt: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicineId',
          foreignField: '_id',
          as: 'medicine',
        },
      },
      { $unwind: '$medicine' },
      {
        $project: {
          durationHours: {
            $divide: [
              { $subtract: ['$verifiedAt', '$medicine.createdAt'] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$durationHours' },
        },
      },
    ]);
    const avgVerificationHours = turnaroundTimes[0]?.avgHours
      ? Math.round(turnaroundTimes[0].avgHours * 10) / 10
      : 0;

    // 7. Avg Submit to Handover Days
    const handoverDurations = await Transfer.aggregate([
      {
        $match: {
          status: TRANSFER_STATUS.COMPLETED,
          completedAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          durationDays: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$durationDays' },
        },
      },
    ]);
    const avgSubmitToHandoverDays = handoverDurations[0]?.avgDays
      ? Math.round(handoverDurations[0].avgDays * 10) / 10
      : 0;

    // 8. Active Donors
    const activeDonorsList = await Donation.distinct('donorId', {
      createdAt: { $gte: start, $lte: end },
      status: { $ne: DONATION_STATUS.DRAFT },
    });
    const activeDonors = activeDonorsList.length;

    // 9. Verified Organizations (total up to end of period)
    const verifiedOrganizations = await Organization.countDocuments({
      verificationStatus: 'verified',
      verifiedAt: { $lte: end },
    });

    // 10. New Users by role
    const usersByRole = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const newUsers = { donor: 0, pharmacist: 0, ngo: 0, admin: 0 };
    for (const u of usersByRole) {
      if (newUsers[u._id] !== undefined) {
        newUsers[u._id] = u.count;
      }
    }

    // 11. Expired without transfer
    const expiredWithoutTransfer = await Medicine.countDocuments({
      status: MEDICINE_STATUS.EXPIRED,
      expiredAt: { $gte: start, $lte: end },
    });

    return {
      donationsSubmitted,
      medicinesSubmitted,
      screeningPassRate,
      pharmacistApprovalRate,
      medicinesMatched,
      medicinesTransferred,
      handoversCompleted,
      avgVerificationHours,
      avgSubmitToHandoverDays,
      activeDonors,
      verifiedOrganizations,
      newUsers,
      expiredWithoutTransfer,
      wastagePreventedUnits,
    };
  };

  const current = await calculatePeriodKPIs(fromDate, toDate);
  const previous = await calculatePeriodKPIs(prevFrom, prevTo);

  // Compute percentage changes
  const calcChange = (curr, prev) => {
    if (typeof curr !== 'number' || typeof prev !== 'number') return 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const change = {
    donationsSubmitted: calcChange(current.donationsSubmitted, previous.donationsSubmitted),
    medicinesSubmitted: calcChange(current.medicinesSubmitted, previous.medicinesSubmitted),
    screeningPassRate: Math.round((current.screeningPassRate - previous.screeningPassRate) * 10) / 10,
    pharmacistApprovalRate: Math.round((current.pharmacistApprovalRate - previous.pharmacistApprovalRate) * 10) / 10,
    medicinesMatched: calcChange(current.medicinesMatched, previous.medicinesMatched),
    medicinesTransferred: calcChange(current.medicinesTransferred, previous.medicinesTransferred),
    handoversCompleted: calcChange(current.handoversCompleted, previous.handoversCompleted),
    avgVerificationHours: Math.round((current.avgVerificationHours - previous.avgVerificationHours) * 10) / 10,
    avgSubmitToHandoverDays: Math.round((current.avgSubmitToHandoverDays - previous.avgSubmitToHandoverDays) * 10) / 10,
    activeDonors: calcChange(current.activeDonors, previous.activeDonors),
    verifiedOrganizations: calcChange(current.verifiedOrganizations, previous.verifiedOrganizations),
    expiredWithoutTransfer: calcChange(current.expiredWithoutTransfer, previous.expiredWithoutTransfer),
    wastagePreventedUnits: calcChange(current.wastagePreventedUnits, previous.wastagePreventedUnits),
  };

  return {
    range: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      previousFrom: prevFrom.toISOString(),
      previousTo: prevTo.toISOString(),
    },
    current,
    previous,
    change,
    complianceNote:
      'Wastage prevented counts declared manufacturer units transferred to verified recipients. MediBridge records platform activity and does not certify chemical purity.',
  };
};

// ====================================================
// 2. TIME SERIES
// ====================================================
export const getTimeSeries = async (range, metric = 'donations', interval = 'day') => {
  const { fromDate, toDate, dtFrom, dtTo } = range;
  const zeroBuckets = generateZeroFilledBuckets(dtFrom, dtTo, interval);
  const bucketMap = new Map();

  for (const b of zeroBuckets) {
    bucketMap.set(b.bucket, { ...b });
  }

  // MongoDB date format string for IST grouping
  let formatString = '%Y-%m-%d';
  if (interval === 'month') {
    formatString = '%Y-%m';
  } else if (interval === 'week') {
    formatString = '%G-W%V';
  }

  const dateGrouping = {
    $dateToString: {
      format: formatString,
      date: '$dateField',
      timezone: TIMEZONE,
    },
  };

  let pipeline = [];

  if (metric === 'donations') {
    pipeline = [
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
          status: { $ne: DONATION_STATUS.DRAFT },
        },
      },
      { $project: { dateField: '$createdAt' } },
      { $group: { _id: dateGrouping, count: { $sum: 1 } } },
    ];
    const results = await Donation.aggregate(pipeline);
    for (const r of results) {
      if (bucketMap.has(r._id)) {
        bucketMap.get(r._id).value = r.count;
      }
    }
  } else if (metric === 'medicines') {
    pipeline = [
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $project: { dateField: '$createdAt' } },
      { $group: { _id: dateGrouping, count: { $sum: 1 } } },
    ];
    const results = await Medicine.aggregate(pipeline);
    for (const r of results) {
      if (bucketMap.has(r._id)) {
        bucketMap.get(r._id).value = r.count;
      }
    }
  } else if (metric === 'verifications') {
    pipeline = [
      { $match: { verifiedAt: { $gte: fromDate, $lte: toDate } } },
      { $project: { dateField: '$verifiedAt', decision: '$decision' } },
      {
        $group: {
          _id: { bucket: dateGrouping, decision: '$decision' },
          count: { $sum: 1 },
        },
      },
    ];
    const results = await Verification.aggregate(pipeline);
    // Initialize split values on all buckets
    for (const b of bucketMap.values()) {
      b.approved = 0;
      b.rejected = 0;
      b.more_info_required = 0;
    }
    for (const r of results) {
      const bKey = r._id.bucket;
      const dec = r._id.decision;
      if (bucketMap.has(bKey)) {
        const item = bucketMap.get(bKey);
        item.value += r.count;
        if (dec === VERIFICATION_DECISION.APPROVED) item.approved = r.count;
        if (dec === VERIFICATION_DECISION.REJECTED) item.rejected = r.count;
        if (dec === VERIFICATION_DECISION.MORE_INFO_REQUIRED) item.more_info_required = r.count;
      }
    }
  } else if (metric === 'matches') {
    pipeline = [
      {
        $match: {
          status: CLAIM_STATUS.ACCEPTED,
          acceptedAt: { $gte: fromDate, $lte: toDate },
        },
      },
      { $project: { dateField: '$acceptedAt' } },
      { $group: { _id: dateGrouping, count: { $sum: 1 } } },
    ];
    const results = await Claim.aggregate(pipeline);
    for (const r of results) {
      if (bucketMap.has(r._id)) {
        bucketMap.get(r._id).value = r.count;
      }
    }
  } else if (metric === 'handovers') {
    pipeline = [
      {
        $match: {
          status: TRANSFER_STATUS.COMPLETED,
          completedAt: { $gte: fromDate, $lte: toDate },
        },
      },
      { $project: { dateField: '$completedAt' } },
      { $group: { _id: dateGrouping, count: { $sum: 1 } } },
    ];
    const results = await Transfer.aggregate(pipeline);
    for (const r of results) {
      if (bucketMap.has(r._id)) {
        bucketMap.get(r._id).value = r.count;
      }
    }
  } else if (metric === 'users') {
    pipeline = [
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $project: { dateField: '$createdAt' } },
      { $group: { _id: dateGrouping, count: { $sum: 1 } } },
    ];
    const results = await User.aggregate(pipeline);
    for (const r of results) {
      if (bucketMap.has(r._id)) {
        bucketMap.get(r._id).value = r.count;
      }
    }
  }

  return {
    metric,
    interval,
    series: Array.from(bucketMap.values()),
  };
};

// ====================================================
// 3. FUNNEL
// ====================================================
export const getFunnel = async (range) => {
  const { fromDate, toDate } = range;
  const matchCreated = { createdAt: { $gte: fromDate, $lte: toDate } };

  // 1. Submitted medicines
  const submitted = await Medicine.countDocuments(matchCreated);

  // 2. Passed auto-screening
  const passedScreening = await Medicine.countDocuments({
    ...matchCreated,
    'screening.passed': true,
  });

  // 3. Pharmacist approved
  const pharmacistApproved = await Medicine.countDocuments({
    ...matchCreated,
    status: {
      $in: [
        MEDICINE_STATUS.APPROVED,
        MEDICINE_STATUS.RESERVED,
        MEDICINE_STATUS.TRANSFERRED,
      ],
    },
  });

  // 4. Matched (reserved or transferred)
  const matched = await Medicine.countDocuments({
    ...matchCreated,
    status: { $in: [MEDICINE_STATUS.RESERVED, MEDICINE_STATUS.TRANSFERRED] },
  });

  // 5. Transferred (physical receipt confirmed)
  const transferred = await Medicine.countDocuments({
    ...matchCreated,
    status: MEDICINE_STATUS.TRANSFERRED,
  });

  const calcConversion = (val, base) => {
    if (base === 0) return 0;
    return Math.round((val / base) * 1000) / 10;
  };

  const steps = [
    {
      step: 'submitted',
      label: 'Submitted',
      count: submitted,
      overallConversion: 100,
      stepConversion: 100,
    },
    {
      step: 'passedScreening',
      label: 'Passed Auto-Screening',
      count: passedScreening,
      overallConversion: calcConversion(passedScreening, submitted),
      stepConversion: calcConversion(passedScreening, submitted),
    },
    {
      step: 'pharmacistApproved',
      label: 'Pharmacist Approved',
      count: pharmacistApproved,
      overallConversion: calcConversion(pharmacistApproved, submitted),
      stepConversion: calcConversion(pharmacistApproved, passedScreening),
    },
    {
      step: 'matched',
      label: 'Matched / Claimed',
      count: matched,
      overallConversion: calcConversion(matched, submitted),
      stepConversion: calcConversion(matched, pharmacistApproved),
    },
    {
      step: 'transferred',
      label: 'Handed Over & Verified',
      count: transferred,
      overallConversion: calcConversion(transferred, submitted),
      stepConversion: calcConversion(transferred, matched),
    },
  ];

  return { steps };
};

// ====================================================
// 4. REJECTIONS
// ====================================================
export const getRejections = async (range) => {
  const { fromDate, toDate } = range;

  // 1. Auto-screening rejections
  const autoRejections = await Medicine.aggregate([
    {
      $match: {
        createdAt: { $gte: fromDate, $lte: toDate },
        'screening.passed': false,
      },
    },
    { $unwind: '$screening.reasons' },
    {
      $group: {
        _id: '$screening.reasons.code',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const autoScreening = autoRejections.map((r) => ({
    code: r._id,
    label: AUTO_SCREENING_REJECTION_REASONS[r._id] || r._id,
    count: r.count,
  }));

  // 2. Pharmacist rejections
  const pharmacistRejections = await Verification.aggregate([
    {
      $match: {
        verifiedAt: { $gte: fromDate, $lte: toDate },
        decision: VERIFICATION_DECISION.REJECTED,
      },
    },
    {
      $group: {
        _id: '$reasonCode',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const pharmacist = pharmacistRejections.map((r) => ({
    code: r._id,
    label: REJECTION_REASON_LABELS[r._id] || r._id || 'Unspecified Reason',
    count: r.count,
  }));

  // 3. Receipt / Handover rejections
  const receiptRejections = await Transfer.aggregate([
    {
      $match: {
        updatedAt: { $gte: fromDate, $lte: toDate },
      },
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.status': TRANSFER_ITEM_STATUS.REJECTED,
      },
    },
    {
      $group: {
        _id: '$items.reasonCode',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const receipt = receiptRejections.map((r) => ({
    code: r._id,
    label: RECEIPT_REJECTION_LABELS[r._id] || r._id || 'Rejected at Receipt',
    count: r.count,
  }));

  return {
    autoScreening,
    pharmacist,
    receipt,
  };
};

// ====================================================
// 5. EXPIRY DISTRIBUTION & TIMELINE
// ====================================================
export const getExpiryAnalytics = async () => {
  // Distribution of currently tracked medicines
  const priorityDistribution = await Medicine.aggregate([
    { $match: { status: { $in: TRACKED_STATUSES } } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  const distribution = {
    [PRIORITY_LEVELS.CRITICAL]: 0,
    [PRIORITY_LEVELS.HIGH]: 0,
    [PRIORITY_LEVELS.MEDIUM]: 0,
    [PRIORITY_LEVELS.NORMAL]: 0,
  };

  for (const item of priorityDistribution) {
    if (distribution[item._id] !== undefined) {
      distribution[item._id] = item.count;
    }
  }

  // Next 12 months timeline in IST
  const timeline = [];
  const startMonth = nowIST().startOf('month');

  for (let i = 0; i < 12; i++) {
    const curMonth = startMonth.plus({ months: i });
    const monthKey = curMonth.toFormat('yyyy-MM');
    const monthLabel = curMonth.toFormat('MMM yyyy');
    const monthStart = curMonth.startOf('month').toJSDate();
    const monthEnd = curMonth.endOf('month').toJSDate();

    const count = await Medicine.countDocuments({
      status: { $in: TRACKED_STATUSES },
      expiryDate: { $gte: monthStart, $lte: monthEnd },
    });

    timeline.push({
      month: monthKey,
      label: monthLabel,
      count,
    });
  }

  return {
    distribution,
    timeline,
  };
};

// ====================================================
// 6. TOP MEDICINES
// ====================================================
export const getTopMedicines = async (limit = 10) => {
  const topDonated = await Medicine.aggregate([
    {
      $group: {
        _id: '$nameLower',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        displayName: { $first: '$name' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  const topRequested = await Request.aggregate([
    {
      $group: {
        _id: '$medicineNameLower',
        count: { $sum: 1 },
        totalNeeded: { $sum: '$quantityNeeded' },
        displayName: { $first: '$medicineName' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return {
    mostDonated: topDonated.map((m) => ({
      name: m.displayName || m._id,
      normalizedName: m._id,
      donationsCount: m.count,
      totalQuantity: m.totalQuantity,
    })),
    mostRequested: topRequested.map((r) => ({
      name: r.displayName || r._id,
      normalizedName: r._id,
      requestsCount: r.count,
      totalNeeded: r.totalNeeded,
    })),
  };
};

// ====================================================
// 7. ORGANIZATIONS PERFORMANCE
// ====================================================
export const getOrganizationPerformance = async ({ page = 1, limit = 10, range }) => {
  const { fromDate, toDate } = range;
  const skip = (page - 1) * limit;

  const totalVerified = await Organization.countDocuments({ verificationStatus: 'verified' });

  const orgs = await Organization.find({ verificationStatus: 'verified' })
    .select('_id name type city state createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const results = [];

  for (const org of orgs) {
    const claims = await Claim.find({
      organizationId: org._id,
      createdAt: { $gte: fromDate, $lte: toDate },
    }).lean();

    const claimsReceived = claims.length;
    const claimsAccepted = claims.filter((c) => c.status === CLAIM_STATUS.ACCEPTED).length;
    const acceptanceRate = claimsReceived > 0
      ? Math.round((claimsAccepted / claimsReceived) * 1000) / 10
      : 0;

    // Response time: created to accepted/declined
    let totalResponseHours = 0;
    let respondedClaims = 0;
    for (const c of claims) {
      if (c.acceptedAt || c.declinedAt) {
        const end = c.acceptedAt || c.declinedAt;
        const diffH = (new Date(end).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
        totalResponseHours += diffH;
        respondedClaims++;
      }
    }
    const avgResponseHours = respondedClaims > 0
      ? Math.round((totalResponseHours / respondedClaims) * 10) / 10
      : 0;

    // Items received in completed transfers
    const completedTransfers = await Transfer.find({
      organizationId: org._id,
      status: TRANSFER_STATUS.COMPLETED,
      completedAt: { $gte: fromDate, $lte: toDate },
    }).lean();

    let itemsReceived = 0;
    for (const t of completedTransfers) {
      for (const it of t.items || []) {
        if (it.status === TRANSFER_ITEM_STATUS.RECEIVED) {
          itemsReceived += it.quantity || 1;
        }
      }
    }

    // Open requirements
    const openRequirements = await Request.countDocuments({
      organizationId: org._id,
      status: 'active',
    });

    results.push({
      organizationId: org._id,
      name: org.name,
      type: org.type,
      city: org.city || 'N/A',
      state: org.state || 'N/A',
      claimsReceived,
      claimsAccepted,
      acceptanceRate,
      avgResponseHours,
      itemsReceived,
      openRequirements,
    });
  }

  return {
    total: totalVerified,
    page,
    limit,
    totalPages: Math.ceil(totalVerified / limit),
    organizations: results,
  };
};

// ====================================================
// 8. PHARMACISTS PERFORMANCE (Admin Only, No PII)
// ====================================================
export const getPharmacistPerformance = async (range) => {
  const { fromDate, toDate } = range;

  // Aggregate decisions grouped by pharmacistId
  const stats = await Verification.aggregate([
    { $match: { verifiedAt: { $gte: fromDate, $lte: toDate } } },
    {
      $group: {
        _id: '$pharmacistId',
        decisions: { $sum: 1 },
        approvedCount: {
          $sum: { $cond: [{ $eq: ['$decision', VERIFICATION_DECISION.APPROVED] }, 1, 0] },
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ['$decision', VERIFICATION_DECISION.REJECTED] }, 1, 0] },
        },
        moreInfoCount: {
          $sum: { $cond: [{ $eq: ['$decision', VERIFICATION_DECISION.MORE_INFO_REQUESTED] }, 1, 0] },
        },
      },
    },
    { $sort: { decisions: -1 } },
  ]);

  const results = [];

  for (const s of stats) {
    const user = await User.findById(s._id)
      .select('name pharmacistProfile.pharmacyName')
      .lean();

    // Redaction: First name only + pharmacy name only (Strictly NO email, phone, personal address)
    const firstName = user?.name ? user.name.split(' ')[0] : 'Pharmacist';
    const pharmacyName = user?.pharmacistProfile?.pharmacyName || 'Registered Pharmacy';

    const approvalRate = s.decisions > 0
      ? Math.round((s.approvedCount / s.decisions) * 1000) / 10
      : 0;
    const moreInfoRate = s.decisions > 0
      ? Math.round((s.moreInfoCount / s.decisions) * 1000) / 10
      : 0;

    results.push({
      pharmacistId: s._id,
      firstName,
      pharmacyName,
      decisions: s.decisions,
      approvedCount: s.approvedCount,
      rejectedCount: s.rejectedCount,
      moreInfoCount: s.moreInfoCount,
      approvalRate,
      moreInfoRate,
    });
  }

  return { pharmacists: results };
};

// ====================================================
// 9. GEO ANALYTICS (City Level & Rounded Coordinates)
// ====================================================
export const getGeoAnalytics = async (range) => {
  const { fromDate, toDate } = range;

  // City-level donation distribution
  const donationCities = await Donation.aggregate([
    {
      $match: {
        createdAt: { $gte: fromDate, $lte: toDate },
        status: { $ne: DONATION_STATUS.DRAFT },
        'pickupLocation.city': { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$pickupLocation.city',
        donations: { $sum: 1 },
      },
    },
    { $sort: { donations: -1 } },
    { $limit: 25 },
  ]);

  // City-level org distribution
  const orgCities = await Organization.aggregate([
    {
      $match: {
        verificationStatus: 'verified',
        city: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$city',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 25 },
  ]);

  // Map markers: Rounded to 2 decimals (~1.1km) for donor privacy
  const donationPoints = await Donation.aggregate([
    {
      $match: {
        createdAt: { $gte: fromDate, $lte: toDate },
        status: { $ne: DONATION_STATUS.DRAFT },
        'pickupLocation.coordinates': { $exists: true },
      },
    },
    {
      $project: {
        lng: { $arrayElemAt: ['$pickupLocation.coordinates', 0] },
        lat: { $arrayElemAt: ['$pickupLocation.coordinates', 1] },
        city: '$pickupLocation.city',
      },
    },
    {
      $group: {
        _id: {
          lat: { $round: ['$lat', 2] },
          lng: { $round: ['$lng', 2] },
          city: '$city',
        },
        count: { $sum: 1 },
      },
    },
    { $limit: 100 },
  ]);

  const mapPoints = donationPoints.map((p) => ({
    lat: p._id.lat,
    lng: p._id.lng,
    city: p._id.city || 'India',
    count: p.count,
  }));

  return {
    donationCities: donationCities.map((c) => ({ city: c._id, count: c.donations })),
    orgCities: orgCities.map((c) => ({ city: c._id, count: c.count })),
    mapPoints,
  };
};

// ====================================================
// 10. SYSTEM HEALTH
// ====================================================
export const getSystemHealth = async () => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Collection counts
  const [
    usersCount,
    orgsCount,
    donationsCount,
    medicinesCount,
    claimsCount,
    transfersCount,
    custodyEventsCount,
    notificationsCount,
    auditLogsCount,
  ] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    Donation.countDocuments(),
    Medicine.countDocuments(),
    Claim.countDocuments(),
    Transfer.countDocuments(),
    CustodyEvent.countDocuments(),
    Notification.countDocuments(),
    AuditLog.countDocuments(),
  ]);

  // 2. Last expiry JobRun
  const lastJobRun = await JobRun.findOne({ name: 'expiry-check' })
    .sort({ startedAt: -1 })
    .select('startedAt finishedAt durationMs status stats error trigger')
    .lean();

  // 3. Unread notifications
  const unreadNotifications = await Notification.countDocuments({ isRead: false });

  // 4. Audit entries last 24h
  const auditEntriesLast24h = await AuditLog.countDocuments({
    createdAt: { $gte: last24h },
  });

  // 5. Failed logins last 24h
  const failedLoginsLast24h = await AuditLog.countDocuments({
    action: 'LOGIN_FAILED',
    createdAt: { $gte: last24h },
  });

  // 6. Suspended and blocked users
  const suspendedUsers = await User.countDocuments({ accountStatus: 'suspended' });
  const blockedUsers = await User.countDocuments({ accountStatus: 'blocked' });

  return {
    collections: {
      users: usersCount,
      organizations: orgsCount,
      donations: donationsCount,
      medicines: medicinesCount,
      claims: claimsCount,
      transfers: transfersCount,
      custodyEvents: custodyEventsCount,
      notifications: notificationsCount,
      auditLogs: auditLogsCount,
    },
    lastExpiryJob: lastJobRun || null,
    unreadNotificationsTotal: unreadNotifications,
    security: {
      auditEntriesLast24h,
      failedLoginsLast24h,
      suspendedUsers,
      blockedUsers,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
};

export default {
  getCachedOrFetch,
  clearAnalyticsCache,
  parseDateRange,
  roundCoordinate,
  generateZeroFilledBuckets,
  getOverviewKPIs,
  getTimeSeries,
  getFunnel,
  getRejections,
  getExpiryAnalytics,
  getTopMedicines,
  getOrganizationPerformance,
  getPharmacistPerformance,
  getGeoAnalytics,
  getSystemHealth,
};
