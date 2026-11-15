import api from './axios.js';

/**
 * Fetch real computed expiry summary metrics (normal, medium, high, critical, expiredTotal, etc.).
 */
export const getExpirySummary = async () => {
  const response = await api.get('/expiry/summary');
  return response.data;
};

/**
 * Fetch paginated list of medicines with decorated expiry fields.
 *
 * @param {object} params
 * @param {string} [params.priority]
 * @param {string} [params.status]
 * @param {string} [params.search]
 * @param {string} [params.sort]
 * @param {'asc'|'desc'} [params.order]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 */
export const getExpiryItems = async (params = {}) => {
  const response = await api.get('/expiry/items', { params });
  return response.data;
};

/**
 * Fetch counts of tracked medicines grouped by expiry month for next 12 months.
 */
export const getExpiryTimeline = async () => {
  const response = await api.get('/expiry/timeline');
  return response.data;
};

export default {
  getExpirySummary,
  getExpiryItems,
  getExpiryTimeline,
};

