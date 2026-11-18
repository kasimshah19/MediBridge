import apiClient from './axios';

/**
 * Claims API Client for mutual matching, accept/decline, and contact disclosure.
 */
export const createClaim = async (data) => {
  const response = await apiClient.post('/claims', data);
  return response.data;
};

export const getMyClaims = async (params) => {
  const response = await apiClient.get('/claims/my', { params });
  return response.data;
};

export const getClaimById = async (id) => {
  const response = await apiClient.get(`/claims/${id}`);
  return response.data;
};

export const getHandoverDetails = async (id) => {
  const response = await apiClient.get(`/claims/${id}/handover-details`);
  return response.data;
};

export const acceptClaim = async (id, data = {}) => {
  const response = await apiClient.post(`/claims/${id}/accept`, data);
  return response.data;
};

export const declineClaim = async (id, data) => {
  const response = await apiClient.post(`/claims/${id}/decline`, data);
  return response.data;
};

export const withdrawClaim = async (id) => {
  const response = await apiClient.post(`/claims/${id}/withdraw`);
  return response.data;
};

export const cancelClaim = async (id, data) => {
  const response = await apiClient.post(`/claims/${id}/cancel`, data);
  return response.data;
};

export default {
  createClaim,
  getMyClaims,
  getClaimById,
  getHandoverDetails,
  acceptClaim,
  declineClaim,
  withdrawClaim,
  cancelClaim,
};
