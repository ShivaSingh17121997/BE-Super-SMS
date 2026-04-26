const asyncHandler = require('../middleware/asyncHandler');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get notifications for the current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { schoolId, isRead, page = 1, limit = 50 } = req.query;

  const query = {};
  if (schoolId) query.schoolId = schoolId;

  // Users see their own notifications
  if (req.user.role !== 'super-admin') {
    query.$or = [
      { userId: req.user._id },
      { userId: null }, // Global notifications for the school
    ];
  }

  if (isRead !== undefined) query.isRead = isRead === 'true';

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await Notification.countDocuments(query);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

/**
 * @desc    Create a notification
 * @route   POST /api/notifications
 * @access  Private (school-admin)
 */
const createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create(req.body);
  res.status(201).json({ success: true, data: notification });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  res.status(200).json({ success: true, data: notification });
});

/**
 * @desc    Mark all notifications as read for the current user
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const query = { isRead: false };
  if (req.user.role !== 'super-admin') {
    query.schoolId = req.user.schoolId;
    query.$or = [{ userId: req.user._id }, { userId: null }];
  }

  await Notification.updateMany(query, { isRead: true });
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found');
  res.status(200).json({ success: true, message: 'Notification deleted' });
});

module.exports = { getNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification };
