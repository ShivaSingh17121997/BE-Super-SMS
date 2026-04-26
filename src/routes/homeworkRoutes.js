const express = require('express');
const router = express.Router();
const { getHomeworks, getHomework, createHomework, updateHomework, deleteHomework } = require('../controllers/homeworkController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getHomeworks)
  .post(authorize('super-admin', 'school-admin', 'principal', 'teacher'), createHomework);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getHomework)
  .put(authorize('super-admin', 'school-admin', 'principal', 'teacher'), updateHomework)
  .delete(authorize('super-admin', 'school-admin', 'principal', 'teacher'), deleteHomework);

module.exports = router;
