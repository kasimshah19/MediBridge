import asyncHandler from '../middleware/asyncHandler.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Get notifications for the logged-in user with pagination and unread filtering.
 * @route GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const query = { userId: req.user._id };

  // Support unread=true|false as well as unreadOnly=true
  if (req.query.unread === 'true' || req.query.unreadOnly === 'true') {
    query.isRead = false;
  } else if (req.query.unread === 'false') {
    query.isRead = true;
  }

  // Support filtering by notification type
  if (req.query.type) {
    query.type = req.query.type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        unreadCount,
      },
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

/**
 * Delete a single notification.
 * @route DELETE /api/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return next(new ApiError(404, 'Notification not found.'));
  }

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json(
    new ApiResponse(200, { unreadCount }, 'Notification deleted successfully.')
  );
});

/**
 * Clear all read notifications for current user.
 * @route DELETE /api/notifications
 */
export const clearReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    userId: req.user._id,
    isRead: true,
  });

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { deletedCount: result.deletedCount, unreadCount },
      'All read notifications cleared.'
    )
  );
});

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};
