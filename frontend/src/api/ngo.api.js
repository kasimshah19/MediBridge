import apiClient from './axios';

/**
 * NGO API Client for dashboard metrics and radius-based available medicine discovery.
 */
export const getNgoSummary = async () => {
  const response = await apiClient.get('/ngo/summary');
  return response.data;
};

export const getAvailableMedicines = async (params) => {
  const response = await apiClient.get('/ngo/available', { params });
  return response.data;
};

export default {
  getNgoSummary,
  getAvailableMedicines,
};
