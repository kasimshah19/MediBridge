import api from './axios.js';

export const updateMe = async (data) => {
  const response = await api.patch('/users/me', data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.patch('/users/me/password', data);
  return response.data;
};

export const getMyAuditLogs = async () => {
  const response = await api.get('/users/me/audit');
  return response.data;
};
