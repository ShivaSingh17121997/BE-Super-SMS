const express = require('express');
const router = express.Router();

const {
  // Questions
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  getFiltersMetadata,
  // Papers
  getQuestionPapers,
  getQuestionPaperById,
  createQuestionPaper,
  updateQuestionPaper,
  deleteQuestionPaper,
} = require('../controllers/questionBankController');

const { protect, authorize, tenant } = require('../middleware/auth');

// All routes require authentication and tenant scoping
router.use(protect, tenant);

// ── Filter Metadata ──────────────────────────────────────────────────────
router
  .route('/filters')
  .get(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    getFiltersMetadata
  );

// ── Bulk Upload (admin/principal only) ───────────────────────────────────
router
  .route('/questions/bulk')
  .post(
    authorize('super-admin', 'school-admin', 'principal'),
    bulkUploadQuestions
  );

// ── Questions CRUD ───────────────────────────────────────────────────────
router
  .route('/questions')
  .get(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    getQuestions
  )
  .post(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    createQuestion
  );

router
  .route('/questions/:id')
  .get(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    getQuestion
  )
  .put(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    updateQuestion
  )
  .delete(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    deleteQuestion
  );

// ── Question Papers ──────────────────────────────────────────────────────
router
  .route('/papers')
  .get(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    getQuestionPapers
  )
  .post(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    createQuestionPaper
  );

router
  .route('/papers/:id')
  .get(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    getQuestionPaperById
  )
  .put(
    authorize('super-admin', 'school-admin', 'principal', 'teacher'),
    updateQuestionPaper
  )
  .delete(
    authorize('super-admin', 'school-admin', 'principal'),
    deleteQuestionPaper
  );

module.exports = router;
