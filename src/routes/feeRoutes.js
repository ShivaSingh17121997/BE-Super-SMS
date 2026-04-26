const express = require('express');
const router = express.Router();
const { getFees, getFee, createFee, updateFee, deleteFee } = require('../controllers/feeController');
const { protect, authorize, tenant } = require('../middleware/auth');

router.use(protect, tenant);

router
  .route('/')
  .get(authorize('super-admin', 'school-admin', 'principal', 'parent', 'student'), getFees)
  .post(authorize('super-admin', 'school-admin'), createFee);

router
  .route('/:id')
  .get(authorize('super-admin', 'school-admin', 'principal', 'parent', 'student'), getFee)
  .put(authorize('super-admin', 'school-admin'), updateFee)
  .delete(authorize('super-admin', 'school-admin'), deleteFee);

module.exports = router;
