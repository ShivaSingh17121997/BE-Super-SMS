const express = require('express');
const router = express.Router();
const { getStudents, getStudent, createStudent, updateStudent, deleteStudent } = require('../controllers/studentController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'parent', 'student'), getStudents)
  .post(authorize('super-admin', 'school-admin', 'principal'), createStudent);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'parent', 'student'), getStudent)
  .put(authorize('super-admin', 'school-admin', 'principal'), updateStudent)
  .delete(authorize('super-admin', 'school-admin'), deleteStudent);

module.exports = router;
