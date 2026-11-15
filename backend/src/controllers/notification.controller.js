import asyncHandler from '../middleware/asyncHandler.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Get recent notifications for the logged-in user with unread count.
 * @route GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      { notifications, unreadCount },
      'Notifications retrieved successfully.'
    )
  );
});

/**
 * Mark a single notification as read.
 * @route PATCH /api/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return next(new ApiError(404, 'Notification not found.'));
  }

  notification.isRead = true;
  await notification.save();

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { notification, unreadCount },
      'Notification marked as read.'
    )
  );
});

/**
 * Mark all notifications as read for current user.
 * @route PATCH /api/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json(
    new ApiResponse(200, { unreadCount: 0 }, 'All notifications marked as read.')
  );
});

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
