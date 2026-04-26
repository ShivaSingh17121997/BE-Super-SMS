const express = require('express');
const router = express.Router();
const {
  getExams, getExam, createExam, updateExam, deleteExam,
  getExamResults, createExamResult, updateExamResult, deleteExamResult,
} = require('../controllers/examController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

// Exam routes
router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getExams)
  .post(authorize('super-admin', 'school-admin', 'principal'), createExam);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getExam)
  .put(authorize('super-admin', 'school-admin', 'principal'), updateExam)
  .delete(authorize('super-admin', 'school-admin', 'principal'), deleteExam);

// Exam Result routes
router
  .route('/results/all')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getExamResults);

router
  .route('/results/create')
  .post(authorize('super-admin', 'school-admin', 'principal', 'teacher'), createExamResult);

router
  .route('/results/:id')
  .put(authorize('super-admin', 'school-admin', 'principal', 'teacher'), updateExamResult)
  .delete(authorize('super-admin', 'school-admin', 'principal'), deleteExamResult);

module.exports = router;
