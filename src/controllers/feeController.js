const asyncHandler = require('../middleware/asyncHandler');
const FeeInvoice = require('../models/FeeInvoice');
const ApiError = require('../utils/ApiError');

const getFees = asyncHandler(async (req, res) => {
  const { schoolId, studentId, status, type, page = 1, limit = 50 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (studentId) query.studentId = studentId;
  if (status) query.status = status;
  if (type) query.type = type;

  const fees = await FeeInvoice.find(query)
    .sort({ dueDate: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('studentId', 'name rollNumber class section');
  const total = await FeeInvoice.countDocuments(query);

  res.status(200).json({
    success: true,
    data: fees,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

const getFee = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const fee = await FeeInvoice.findOne(query).populate('studentId', 'name rollNumber class section');
  if (!fee) throw new ApiError(404, 'Fee invoice not found');
  res.status(200).json({ success: true, data: fee });
});

const createFee = asyncHandler(async (req, res) => {
  const fee = await FeeInvoice.create(req.body);
  res.status(201).json({ success: true, data: fee });
});

const updateFee = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  // Auto-set status based on payment
  if (req.body.paidAmount !== undefined) {
    const existing = await FeeInvoice.findOne(query);
    if (existing) {
      const totalPaid = req.body.paidAmount;
      if (totalPaid >= existing.amount) {
        req.body.status = 'paid';
      } else if (totalPaid > 0) {
        req.body.status = 'partial';
      }
    }
  }

  const fee = await FeeInvoice.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!fee) throw new ApiError(404, 'Fee invoice not found');
  res.status(200).json({ success: true, data: fee });
});

const deleteFee = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const fee = await FeeInvoice.findOneAndDelete(query);
  if (!fee) throw new ApiError(404, 'Fee invoice not found');
  res.status(200).json({ success: true, message: 'Fee invoice deleted' });
});

module.exports = { getFees, getFee, createFee, updateFee, deleteFee };
