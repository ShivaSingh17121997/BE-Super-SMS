const express = require('express');
const router = express.Router();
const { getEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('../controllers/calendarController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getEvents)
  .post(authorize('super-admin', 'school-admin', 'principal'), createEvent);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getEvent)
  .put(authorize('super-admin', 'school-admin', 'principal'), updateEvent)
  .delete(authorize('super-admin', 'school-admin', 'principal'), deleteEvent);

module.exports = router;
