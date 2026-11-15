import api from './axios.js';

/**
 * Get recent notifications with unread count.
 */
export const getNotifications = async (limit = 20) => {
  const response = await api.get(`/notifications?limit=${limit}`);
  return response.data;
};

/**
 * Mark a single notification as read.
 */
export const markNotificationAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read.
 */
export const markAllNotificationsAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

