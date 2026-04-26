const express = require('express');
const router = express.Router();
const { getNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notificationController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(getNotifications)
  .post(authorize('super-admin', 'school-admin', 'principal'), createNotification);

router.put('/read-all', markAllAsRead);

router
  .route('/:id')
  .delete(authorize('super-admin', 'school-admin'), deleteNotification);

router.put('/:id/read', markAsRead);

module.exports = router;
