const express = require('express');
const { getTimetables, createTimetableSlot, deleteTimetableSlot } = require('../controllers/timetableController');
const { protect, authorize, tenant } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(tenant);

router.route('/')
  .get(getTimetables)
  .post(authorize('super-admin', 'school-admin', 'principal'), createTimetableSlot);

router.route('/:id')
  .delete(authorize('super-admin', 'school-admin', 'principal'), deleteTimetableSlot);

module.exports = router;
