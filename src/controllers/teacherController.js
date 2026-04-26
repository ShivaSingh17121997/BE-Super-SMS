const asyncHandler = require('../middleware/asyncHandler');
const Teacher = require('../models/Teacher');
const teacherService = require('../services/teacherService');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get all teachers (scoped by school)
 * @route   GET /api/teachers
 * @access  Private
 */
const getTeachers = asyncHandler(async (req, res) => {
  const { schoolId, page = 1, limit = 50, search, department, isActive } = req.query;

  const query = {};
  if (schoolId) query.schoolId = schoolId;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  if (department) query.department = department;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const teachers = await Teacher.find(query)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Teacher.countDocuments(query);

  res.status(200).json({
    success: true,
    data: teachers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single teacher
 * @route   GET /api/teachers/:id
 * @access  Private
 */
const getTeacher = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const teacher = await Teacher.findOne(query);
  if (!teacher) throw new ApiError(404, 'Teacher not found');

  res.status(200).json({ success: true, data: teacher });
});

/**
 * @desc    Create teacher (with auto User account creation)
 * @route   POST /api/teachers
 * @access  Private (school-admin)
 */
const createTeacher = asyncHandler(async (req, res) => {
  const schoolId = req.body.schoolId || req.schoolId;
  if (!schoolId) throw new ApiError(400, 'School ID is required');

  const teacher = await teacherService.createTeacher(req.body, schoolId);

  res.status(201).json({ success: true, data: teacher });
});

/**
 * @desc    Update teacher
 * @route   PUT /api/teachers/:id
 * @access  Private (school-admin)
 */
const updateTeacher = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const teacher = await Teacher.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!teacher) throw new ApiError(404, 'Teacher not found');

  res.status(200).json({ success: true, data: teacher });
});

/**
 * @desc    Delete teacher (cascading)
 * @route   DELETE /api/teachers/:id
 * @access  Private (school-admin)
 */
const deleteTeacher = asyncHandler(async (req, res) => {
  const schoolId = req.query.schoolId || req.schoolId;
  if (!schoolId) throw new ApiError(400, 'School ID is required');

  const result = await teacherService.deleteTeacher(req.params.id, schoolId);

  res.status(200).json({ success: true, ...result });
});

module.exports = { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher };
