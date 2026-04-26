const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');

/**
 * Assign a class teacher.
 * If there's already an active assignment for this class+section+school,
 * deactivate it first, then create the new assignment.
 * This ensures only one active class teacher per section.
 */
const assign = async (teacherId, className, section, schoolId, academicYear) => {
  // Verify teacher exists and belongs to this school
  const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
  if (!teacher) {
    throw new ApiError(404, 'Teacher not found in this school');
  }

  // Deactivate any existing active assignment for this class+section
  await ClassTeacherAssignment.updateMany(
    { class: className, section, schoolId, isActive: true },
    { isActive: false }
  );

  // Create new assignment
  const assignment = await ClassTeacherAssignment.create({
    teacherId,
    teacherName: teacher.name,
    class: className,
    section,
    academicYear: academicYear || '',
    isActive: true,
    schoolId,
  });

  return assignment;
};

/**
 * Get all active class teacher assignments for a school.
 */
const getActiveAssignments = async (schoolId) => {
  return ClassTeacherAssignment.find({ schoolId, isActive: true })
    .populate('teacherId', 'name email department subjects')
    .sort({ class: 1, section: 1 });
};

/**
 * Remove (deactivate) a class teacher assignment.
 */
const remove = async (assignmentId, schoolId) => {
  const assignment = await ClassTeacherAssignment.findOne({
    _id: assignmentId,
    schoolId,
  });

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  assignment.isActive = false;
  await assignment.save();

  return assignment;
};

module.exports = { assign, getActiveAssignments, remove };
