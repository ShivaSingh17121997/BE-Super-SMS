const express = require('express');
const {
  createOrUpdateRoadmap,
  getRoadmap,
  updateLessonPlanProgress,
  getCourseProgress,
  deleteRoadmap
} = require('../controllers/roadmapController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// Roadmap Management Routes
router.post('/', authorize('super-admin', 'school-admin', 'principal'), createOrUpdateRoadmap);
router.get('/:className/:subject/:academicYear', getRoadmap);
router.delete('/:className/:subject/:academicYear', authorize('super-admin', 'school-admin', 'principal'), deleteRoadmap);

// Lesson Plan Tracking Routes
router.put('/lesson-plan', authorize('teacher', 'super-admin', 'school-admin', 'principal'), updateLessonPlanProgress);

// Progress Analytics Routes
router.get('/progress/:className/:section/:subject/:academicYear', getCourseProgress);

module.exports = router;
