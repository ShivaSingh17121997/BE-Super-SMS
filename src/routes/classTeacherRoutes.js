const express = require('express');
const router = express.Router();
const { getAssignments, assignClassTeacher, removeAssignment } = require('../controllers/classTeacherController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher'), getAssignments)
  .post(authorize('super-admin', 'school-admin'), assignClassTeacher);

router
  .route('/:id')
  .delete(authorize('super-admin', 'school-admin'), removeAssignment);

module.exports = router;
