import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import analyticsService from '../services/analytics.service.js';

/**
 * GET /api/admin/analytics/overview
 */
export const getOverview = asyncHandler(async (req, res) => {
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `overview:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getOverviewKPIs(range)
  );

  return ApiResponse.success(res, 200, 'Analytics overview retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/timeseries
 */
export const getTimeSeries = asyncHandler(async (req, res) => {
  const { metric = 'donations', interval = 'day' } = req.query;
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `timeseries:${metric}:${interval}:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getTimeSeries(range, metric, interval)
  );

  return ApiResponse.success(res, 200, 'Time series data retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/funnel
 */
export const getFunnel = asyncHandler(async (req, res) => {
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `funnel:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getFunnel(range)
  );

  return ApiResponse.success(res, 200, 'Conversion funnel retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/rejections
 */
export const getRejections = asyncHandler(async (req, res) => {
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `rejections:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getRejections(range)
  );

  return ApiResponse.success(res, 200, 'Top rejection reasons retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/expiry
 */
export const getExpiry = asyncHandler(async (_req, res) => {
  const cacheKey = 'expiry:distribution';

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getExpiryAnalytics()
  );

  return ApiResponse.success(res, 200, 'Expiry distribution and timeline retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/top-medicines
 */
export const getTopMedicines = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const cacheKey = `top-medicines:${limit}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getTopMedicines(limit)
  );

  return ApiResponse.success(res, 200, 'Top medicines retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/organizations
 */
export const getOrganizations = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `orgs:${page}:${limit}:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getOrganizationPerformance({ page, limit, range })
  );

  return ApiResponse.success(res, 200, 'Organization analytics retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/pharmacists
 */
export const getPharmacists = asyncHandler(async (req, res) => {
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `pharmacists:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getPharmacistPerformance(range)
  );

  return ApiResponse.success(res, 200, 'Pharmacist performance metrics retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/geo
 */
export const getGeo = asyncHandler(async (req, res) => {
  const range = analyticsService.parseDateRange(req.query.from, req.query.to);
  const cacheKey = `geo:${range.fromDate.toISOString()}:${range.toDate.toISOString()}`;

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getGeoAnalytics(range)
  );

  return ApiResponse.success(res, 200, 'Geographic analytics retrieved successfully', data);
});

/**
 * GET /api/admin/analytics/system
 */
export const getSystem = asyncHandler(async (_req, res) => {
  const cacheKey = 'system:health';

  const data = await analyticsService.getCachedOrFetch(cacheKey, () =>
    analyticsService.getSystemHealth()
  );

  return ApiResponse.success(res, 200, 'System platform metrics retrieved successfully', data);
});

export default {
  getOverview,
  getTimeSeries,
  getFunnel,
  getRejections,
  getExpiry,
  getTopMedicines,
  getOrganizations,
  getPharmacists,
  getGeo,
  getSystem,
};
