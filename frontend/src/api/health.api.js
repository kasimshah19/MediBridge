import api from './axios.js';

/**
 * Fetch health status of MediBridge API and connected database.
 * @returns {Promise<object>} Health response payload
 */
export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

