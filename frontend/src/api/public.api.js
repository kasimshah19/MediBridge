import api from './axios.js';

/**
 * Get real public statistics for landing page impact strip.
 */
export const getPublicStats = async () => {
  const response = await api.get('/public/stats');
  return response.data;
};

/**
 * Get verified partner organizations list for landing page showcase.
 */
export const getPublicOrganizations = async (limit = 6) => {
  const response = await api.get(`/public/organizations?limit=${limit}`);
  return response.data;
};

export default {
  getPublicStats,
  getPublicOrganizations,
};
