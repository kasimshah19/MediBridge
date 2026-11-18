import apiClient from './axios';

/**
 * Geo API Client for nearby organization lookup.
 */
export const getNearbyOrganizations = async (params) => {
  const response = await apiClient.get('/geo/organizations/nearby', { params });
  return response.data;
};

export default {
  getNearbyOrganizations,
};
