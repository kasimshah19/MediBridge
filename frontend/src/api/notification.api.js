import api from './axios';

/**
 * Get paginated notifications for current user with optional unreadOnly filter
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

/**
 * Delete a single notification
 */
export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

/**
 * Clear all read notifications
 */
export const clearReadNotifications = async () => {
  const response = await api.delete('/notifications');
  return response.data;
};

export const markNotificationAsRead = markAsRead;
export const markAllNotificationsAsRead = markAllAsRead;

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
};
