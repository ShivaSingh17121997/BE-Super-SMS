const express = require('express');
const router = express.Router();
const { getNotices, getNotice, createNotice, updateNotice, deleteNotice } = require('../controllers/noticeController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getNotices)
  .post(authorize('super-admin', 'school-admin', 'principal'), createNotice);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'teacher', 'student', 'parent'), getNotice)
  .put(authorize('super-admin', 'school-admin', 'principal'), updateNotice)
  .delete(authorize('super-admin', 'school-admin', 'principal'), deleteNotice);

module.exports = router;
