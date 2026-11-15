import api from './axios.js';

/**
 * Search locations via Nominatim geocoding proxy.
 */
export const searchGeocode = async (q) => {
  const response = await api.get('/geocode/search', { params: { q } });
  return response.data;
};

/**
 * Reverse geocode coordinates to address details.
 */
export const reverseGeocode = async (lat, lng) => {
  const response = await api.get('/geocode/reverse', { params: { lat, lng } });
  return response.data;
};

export default {
  searchGeocode,
  reverseGeocode,
};

