import api from './axios.js';

/**
 * 1. GET /api/verification/summary - Real dashboard statistics for the logged-in pharmacist.
 */
export const getVerificationSummary = async () => {
  const response = await api.get('/verification/summary');
  return response.data;
};

/**
 * 2. GET /api/verification/queue - Paginated donation cards for the verification queue.
 */
export const getVerificationQueue = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.tab) query.append('tab', params.tab);
  if (params.priority) query.append('priority', params.priority);
  if (params.search) query.append('search', params.search);
  if (params.sort) query.append('sort', params.sort);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const response = await api.get(`/verification/queue?${query.toString()}`);
  return response.data;
};

/**
 * 3. GET /api/verification/donations/:id - Full review payload for a donation.
 */
export const getVerificationDonationDetail = async (id) => {
  const response = await api.get(`/verification/donations/${id}`);
  return response.data;
};

/**
 * 4. POST /api/verification/donations/:id/claim - Claim a donation for exclusive review (60 min TTL).
 */
export const claimDonation = async (id) => {
  const response = await api.post(`/verification/donations/${id}/claim`);
  return response.data;
};

/**
 * 5. POST /api/verification/donations/:id/release - Release claim held by the pharmacist.
 */
export const releaseDonation = async (id) => {
  const response = await api.post(`/verification/donations/${id}/release`);
  return response.data;
};

/**
 * 6. POST /api/verification/items/:medicineId/decision - Submit verification decision for a medicine item.
 */
export const submitMedicineDecision = async (medicineId, data) => {
  const response = await api.post(`/verification/items/${medicineId}/decision`, data);
  return response.data;
};

/**
 * 7. GET /api/verification/history - Past decisions made by the calling pharmacist.
 */
export const getVerificationHistory = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.decision) query.append('decision', params.decision);
  if (params.search) query.append('search', params.search);
  if (params.from) query.append('from', params.from);
  if (params.to) query.append('to', params.to);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const response = await api.get(`/verification/history?${query.toString()}`);
  return response.data;
};

export default {
  getVerificationSummary,
  getVerificationQueue,
  getVerificationDonationDetail,
  claimDonation,
  releaseDonation,
  submitMedicineDecision,
  getVerificationHistory,
};
