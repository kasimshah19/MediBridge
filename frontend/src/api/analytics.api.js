import api from './axios';

export const getOverview = async (params = {}) => {
  const response = await api.get('/admin/analytics/overview', { params });
  return response.data;
};

export const getTimeSeries = async (params = {}) => {
  const response = await api.get('/admin/analytics/timeseries', { params });
  return response.data;
};

export const getFunnel = async (params = {}) => {
  const response = await api.get('/admin/analytics/funnel', { params });
  return response.data;
};

export const getRejections = async (params = {}) => {
  const response = await api.get('/admin/analytics/rejections', { params });
  return response.data;
};

export const getExpiry = async () => {
  const response = await api.get('/admin/analytics/expiry');
  return response.data;
};

export const getTopMedicines = async (limit = 10) => {
  const response = await api.get('/admin/analytics/top-medicines', { params: { limit } });
  return response.data;
};

export const getOrganizations = async (params = {}) => {
  const response = await api.get('/admin/analytics/organizations', { params });
  return response.data;
};

export const getPharmacists = async (params = {}) => {
  const response = await api.get('/admin/analytics/pharmacists', { params });
  return response.data;
};

export const getGeo = async (params = {}) => {
  const response = await api.get('/admin/analytics/geo', { params });
  return response.data;
};

export const getSystem = async () => {
  const response = await api.get('/admin/analytics/system');
  return response.data;
};

export default {
  getOverview,
  getTimeSeries,
  getFunnel,
  getRejections,
  getExpiry,
  getTopMedicines,
  getOrganizations,
  getPharmacists,
  getGeo,
  getSystem,
};
