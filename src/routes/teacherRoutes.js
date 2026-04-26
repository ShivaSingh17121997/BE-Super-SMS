const express = require('express');
const router = express.Router();
const { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacherController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'parent', 'student'), getTeachers)
  .post(authorize('super-admin', 'school-admin'), createTeacher);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'parent', 'student'), getTeacher)
  .put(authorize('super-admin', 'school-admin'), updateTeacher)
  .delete(authorize('super-admin', 'school-admin'), deleteTeacher);

module.exports = router;
