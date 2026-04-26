const express = require('express');
const router = express.Router();
const { getSchools, getSchool, createSchool, updateSchool, deleteSchool } = require('../controllers/schoolController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(authorize('super-admin'), getSchools)
  .post(authorize('super-admin'), createSchool);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin'), getSchool)
  .put(authorize('super-admin', 'school-admin'), updateSchool)
  .delete(authorize('super-admin'), deleteSchool);

module.exports = router;
