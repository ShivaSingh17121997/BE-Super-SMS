const asyncHandler = require('../middleware/asyncHandler');
const classTeacherService = require('../services/classTeacherService');

/**
 * @desc    Get all active class teacher assignments
 * @route   GET /api/class-teachers
 * @access  Private
 */
const getAssignments = asyncHandler(async (req, res) => {
  const schoolId = req.query.schoolId || req.schoolId;
  const assignments = await classTeacherService.getActiveAssignments(schoolId);
  res.status(200).json({ success: true, data: assignments });
});

/**
 * @desc    Assign a class teacher (replaces existing if any)
 * @route   POST /api/class-teachers
 * @access  Private (school-admin)
 */
const assignClassTeacher = asyncHandler(async (req, res) => {
  const { teacherId, class: className, section, academicYear } = req.body;
  const schoolId = req.body.schoolId || req.schoolId;

  const assignment = await classTeacherService.assign(
    teacherId,
    className,
    section,
    schoolId,
    academicYear
  );

  res.status(201).json({ success: true, data: assignment });
});

/**
 * @desc    Remove (deactivate) a class teacher assignment
 * @route   DELETE /api/class-teachers/:id
 * @access  Private (school-admin)
 */
const removeAssignment = asyncHandler(async (req, res) => {
  const schoolId = req.query.schoolId || req.schoolId;
  const assignment = await classTeacherService.remove(req.params.id, schoolId);
  res.status(200).json({ success: true, message: 'Assignment removed', data: assignment });
});

module.exports = { getAssignments, assignClassTeacher, removeAssignment };
