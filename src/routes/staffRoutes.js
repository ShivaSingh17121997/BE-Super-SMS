const express = require('express');
const router = express.Router();
const { getStaffMembers, getStaffMember, createStaffMember, updateStaffMember, deleteStaffMember } = require('../controllers/staffController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal'), getStaffMembers)
  .post(authorize('super-admin', 'school-admin'), createStaffMember);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal'), getStaffMember)
  .put(authorize('super-admin', 'school-admin'), updateStaffMember)
  .delete(authorize('super-admin', 'school-admin'), deleteStaffMember);

module.exports = router;
