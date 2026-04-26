const asyncHandler = require('../middleware/asyncHandler');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const Homework = require('../models/Homework');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get all students associated with the logged-in parent
 * @route   GET /api/parent/students
 * @access  Private (parent)
 */
const getMyStudents = asyncHandler(async (req, res) => {
  const parentEmail = req.user.email;
  const schoolId = req.user.schoolId;

  const students = await Student.find({ parentEmail, schoolId });

  res.status(200).json({
    success: true,
    data: students,
  });
});

/**
 * @desc    Get attendance for a specific child
 * @route   GET /api/parent/students/:studentId/attendance
 * @access  Private (parent)
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const parentEmail = req.user.email;
  const schoolId = req.user.schoolId;

  // Verify the student belongs to this parent
  const student = await Student.findOne({ _id: studentId, parentEmail, schoolId });
  if (!student) {
    throw new ApiError(403, 'Access denied. You can only view attendance for your own children.');
  }

  const { page = 1, limit = 30 } = req.query;
  const records = await AttendanceRecord.find({ studentId, schoolId })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await AttendanceRecord.countDocuments({ studentId, schoolId });

  res.status(200).json({
    success: true,
    data: records,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

/**
 * @desc    Get homework for a specific child's class
 * @route   GET /api/parent/students/:studentId/homework
 * @access  Private (parent)
 */
const getStudentHomework = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const parentEmail = req.user.email;
  const schoolId = req.user.schoolId;

  // Verify the student belongs to this parent
  const student = await Student.findOne({ _id: studentId, parentEmail, schoolId });
  if (!student) {
    throw new ApiError(403, 'Access denied. You can only view homework for your own children.');
  }

  const { subject, page = 1, limit = 30 } = req.query;
  const query = {
    schoolId,
    class: student.class,
    section: student.section,
  };
  if (subject) query.subject = subject;

  const homeworks = await Homework.find(query)
    .sort({ dueDate: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('assignedBy', 'name');

  const total = await Homework.countDocuments(query);

  res.status(200).json({
    success: true,
    data: homeworks,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

module.exports = {
  getMyStudents,
  getStudentAttendance,
  getStudentHomework,
};
