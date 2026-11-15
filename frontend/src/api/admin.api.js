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

export default {
  getAdminOrganizations,
  getAdminOrganizationById,
  reviewOrganization,
  getAdminUsers,
  reviewUser,
  getAdminOverview,
  getAdminExpiryJobs,
  runAdminExpiryCheck,
};

