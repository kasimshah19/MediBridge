import api from './axios';

/**
 * Fetch all platform users with role filters and pagination
 */
export const getAllUsers = async (params = {}) => {
  const response = await api.get('/admin/users/all', { params });
  return response.data;
};

/**
 * Update user account status (suspend, reactivate, block)
 */
export const updateUserStatus = async (id, { action, reason }) => {
  const response = await api.patch(`/admin/users/${id}/status`, { action, reason });
  return response.data;
};

export default {
  getAllUsers,
  updateUserStatus,
};
