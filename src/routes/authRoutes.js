const express = require('express');
const router = express.Router();
const { login, onboard, getMe, updateProfile, changePassword, resetUserPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/onboard', onboard);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/reset-password/:id', protect, authorize('super-admin', 'school-admin'), resetUserPassword);

module.exports = router;
