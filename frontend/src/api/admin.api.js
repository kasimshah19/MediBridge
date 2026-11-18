import api from './axios.js';

/**
 * Get paginated organizations list for administrator review.
 */
export const getAdminOrganizations = async (params = {}) => {
  const response = await api.get('/admin/organizations', { params });
  return response.data;
};

/**
 * Get organization by ID.
 */
export const getAdminOrganizationById = async (id) => {
  const response = await api.get(`/admin/organizations/${id}`);
  return response.data;
};

/**
 * Review organization (approve or reject with note).
 */
export const reviewOrganization = async (id, data) => {
  const response = await api.patch(`/admin/organizations/${id}/review`, data);
  return response.data;
};

/**
 * Get users list for administrator review (e.g. pharmacists).
 */
export const getAdminUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

/**
 * Review user application (approve or reject pharmacist).
 */
export const reviewUser = async (id, data) => {
  const response = await api.patch(`/admin/users/${id}/review`, data);
  return response.data;
};

/**
 * Get real administrator overview metrics.
 */
export const getAdminOverview = async () => {
  const response = await api.get('/admin/overview');
  return response.data;
};

/**
 * Get recent scheduled expiry jobs and cron execution status.
 */
export const getAdminExpiryJobs = async (limit = 10) => {
  const response = await api.get('/admin/jobs/expiry', { params: { limit } });
  return response.data;
};

/**
 * Trigger manual expiry check (dry run or real execution).
 */
export const runAdminExpiryCheck = async ({ dryRun = false, asOf } = {}) => {
  const response = await api.post('/admin/jobs/expiry/run', { dryRun, asOf });
  return response.data;
};

/**
 * Get verification summary & active claims for admins.
 */
export const getAdminVerificationSummary = async () => {
  const response = await api.get('/admin/verification/summary');
  return response.data;
};

/**
 * Get filterable verification log for admins.
 */
export const getAdminVerificationLog = async (params = {}) => {
  const response = await api.get('/admin/verification/log', { params });
  return response.data;
};

/**
 * Force release a claimed donation.
 */
export const forceReleaseDonation = async (id) => {
  const response = await api.post(`/admin/verification/donations/${id}/force-release`);
  return response.data;
};

/**
 * Get matching summary metrics for admin.
 */
export const getMatchingSummary = async () => {
  const response = await api.get('/admin/matching/summary');
  return response.data;
};

/**
 * Get claims list for admin with status filter & pagination.
 */
export const getAdminClaims = async (params = {}) => {
  const response = await api.get('/admin/claims', { params });
  return response.data;
};

/**
 * Force cancel an active claim by admin.
 */
export const cancelAdminClaim = async (id, reason) => {
  const response = await api.post(`/admin/claims/${id}/cancel`, { reason });
  return response.data;
};

/**
 * Get NGO requirements list for admin.
 */
export const getAdminRequirements = async (params = {}) => {
  const response = await api.get('/admin/requirements', { params });
  return response.data;
};

/**
 * Get verified organizations map coordinates.
 */
export const getOrganizationsMap = async () => {
  const response = await api.get('/admin/organizations/map');
  return response.data;
};

/**
 * Get all transfers for admin overview.
 */
export const getAdminTransfers = async (params = {}) => {
  const response = await api.get('/admin/transfers', { params });
  return response.data;
};

/**
 * Get transfer summary counts.
 */
export const getAdminTransfersSummary = async () => {
  const response = await api.get('/admin/transfers/summary');
  return response.data;
};

/**
 * Get unredacted custody trace for any medicine.
 */
export const getAdminCustodyTrace = async (medicineId) => {
  const response = await api.get(`/admin/custody/${medicineId}`);
  return response.data;
};

/**
 * Run cryptographic verification check across all custody chains.
 */
export const verifyAllCustodyChains = async () => {
  const response = await api.post('/admin/custody/verify');
  return response.data;
};

export default {
  getAdminOrganizations,
  getAdminOrganizationById,
  reviewOrganization,
  getAdminUsers,
  reviewUser,
  getAdminOverview,
  getAdminExpiryJobs,
  runAdminExpiryCheck,
  getAdminVerificationSummary,
  getAdminVerificationLog,
  forceReleaseDonation,
  getMatchingSummary,
  getAdminClaims,
  cancelAdminClaim,
  getAdminRequirements,
  getOrganizationsMap,
  getAdminTransfers,
  getAdminTransfersSummary,
  getAdminCustodyTrace,
  verifyAllCustodyChains,
};

