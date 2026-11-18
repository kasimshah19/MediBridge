import apiClient from './axios';

/**
 * Requirements API Client for NGO demand posting and lifecycle.
 */
export const createRequirement = async (data) => {
  const response = await apiClient.post('/requirements', data);
  return response.data;
};

export const getMyRequirements = async (params) => {
  const response = await apiClient.get('/requirements/my', { params });
  return response.data;
};

export const getRequirementById = async (id) => {
  const response = await apiClient.get(`/requirements/${id}`);
  return response.data;
};

export const updateRequirement = async (id, data) => {
  const response = await apiClient.patch(`/requirements/${id}`, data);
  return response.data;
};

export const closeRequirement = async (id, data = {}) => {
  const response = await apiClient.post(`/requirements/${id}/close`, data);
  return response.data;
};

export default {
  createRequirement,
  getMyRequirements,
  getRequirementById,
  updateRequirement,
  closeRequirement,
};
