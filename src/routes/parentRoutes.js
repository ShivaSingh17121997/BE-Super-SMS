const express = require('express');
const router = express.Router();
const { getMyStudents, getStudentAttendance, getStudentHomework } = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/auth');

// All routes here are protected and restricted to parents
router.use(protect);
router.use(authorize('parent'));

router.get('/students', getMyStudents);
router.get('/students/:studentId/attendance', getStudentAttendance);
router.get('/students/:studentId/homework', getStudentHomework);

module.exports = router;
