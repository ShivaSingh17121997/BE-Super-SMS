const express = require('express');
const {
  createOrUpdateRoadmap,
  getRoadmap,
  updateLessonPlanProgress,
  getCourseProgress
} = require('../controllers/roadmapController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// Roadmap Management Routes
router.post('/', authorize('super_admin', 'admin', 'principal'), createOrUpdateRoadmap);
router.get('/:className/:subject/:academicYear', getRoadmap);

// Lesson Plan Tracking Routes
router.put('/lesson-plan', authorize('teacher', 'super_admin', 'admin', 'principal'), updateLessonPlanProgress);

// Progress Analytics Routes
router.get('/progress/:className/:section/:subject/:academicYear', getCourseProgress);

module.exports = router;
