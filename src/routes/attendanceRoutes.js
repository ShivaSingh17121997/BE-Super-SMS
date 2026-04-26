const express = require('express');
const router = express.Router();
const { getAttendance, markAttendance, updateAttendance, deleteAttendance } = require('../controllers/attendanceController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'parent', 'student'), getAttendance)
  .post(authorize('super-admin', 'school-admin', 'principal', 'teacher'), markAttendance);

router
  .route('/:id')
  .put(authorize('super-admin', 'school-admin', 'principal', 'teacher'), updateAttendance)
  .delete(authorize('super-admin', 'school-admin'), deleteAttendance);

module.exports = router;
