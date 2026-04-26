const asyncHandler = require('../middleware/asyncHandler');
const School = require('../models/School');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get all schools
 * @route   GET /api/schools
 * @access  Private (super-admin)
 */
const getSchools = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, plan, isActive } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];
  }

  if (plan) query.plan = plan;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const schools = await School.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await School.countDocuments(query);

  res.status(200).json({
    success: true,
    data: schools,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single school
 * @route   GET /api/schools/:id
 * @access  Private
 */
const getSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) throw new ApiError(404, 'School not found');

  res.status(200).json({ success: true, data: school });
});

/**
 * @desc    Create a school (without admin — for super-admin use)
 * @route   POST /api/schools
 * @access  Private (super-admin)
 */
const createSchool = asyncHandler(async (req, res) => {
  const school = await School.create(req.body);
  res.status(201).json({ success: true, data: school });
});

/**
 * @desc    Update school
 * @route   PUT /api/schools/:id
 * @access  Private (super-admin, school-admin)
 */
const updateSchool = asyncHandler(async (req, res) => {
  const school = await School.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!school) throw new ApiError(404, 'School not found');

  res.status(200).json({ success: true, data: school });
});

/**
 * @desc    Delete school (soft-delete by deactivating)
 * @route   DELETE /api/schools/:id
 * @access  Private (super-admin)
 */
const deleteSchool = asyncHandler(async (req, res) => {
  const school = await School.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!school) throw new ApiError(404, 'School not found');

  res.status(200).json({ success: true, message: 'School deactivated', data: school });
});

module.exports = { getSchools, getSchool, createSchool, updateSchool, deleteSchool };
