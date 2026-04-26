const asyncHandler = require('../middleware/asyncHandler');
const Staff = require('../models/Staff');
const staffService = require('../services/staffService');
const ApiError = require('../utils/ApiError');

const getStaffMembers = asyncHandler(async (req, res) => {
  const { schoolId, page = 1, limit = 50, search, department } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (department) query.department = department;

  const staff = await Staff.find(query)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await Staff.countDocuments(query);

  res.status(200).json({
    success: true,
    data: staff,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

const getStaffMember = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const staff = await Staff.findOne(query);
  if (!staff) throw new ApiError(404, 'Staff member not found');

  res.status(200).json({ success: true, data: staff });
});

const createStaffMember = asyncHandler(async (req, res) => {
  const schoolId = req.body.schoolId || req.schoolId;
  if (!schoolId) throw new ApiError(400, 'School ID is required');

  const staff = await staffService.createStaff(req.body, schoolId);
  res.status(201).json({ success: true, data: staff });
});

const updateStaffMember = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const staff = await Staff.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!staff) throw new ApiError(404, 'Staff member not found');

  res.status(200).json({ success: true, data: staff });
});

const deleteStaffMember = asyncHandler(async (req, res) => {
  const schoolId = req.query.schoolId || req.schoolId;
  if (!schoolId) throw new ApiError(400, 'School ID is required');

  const result = await staffService.deleteStaff(req.params.id, schoolId);
  res.status(200).json({ success: true, ...result });
});

module.exports = { getStaffMembers, getStaffMember, createStaffMember, updateStaffMember, deleteStaffMember };
