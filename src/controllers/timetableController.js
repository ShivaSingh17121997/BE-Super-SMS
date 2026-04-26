const asyncHandler = require('../middleware/asyncHandler');
const Timetable = require('../models/Timetable');
const ApiError = require('../utils/ApiError');

// @desc    Get all timetable slots
// @route   GET /api/timetable
// @access  Private
const getTimetables = asyncHandler(async (req, res) => {
  const { schoolId, teacher, class: cls, section, day } = req.query;

  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (teacher) query.teacher = teacher;
  if (cls) query.class = cls;
  if (section) query.section = section;
  if (day) query.day = day;

  // Additional RBAC filtering based on user role
  if (req.user.role === 'teacher') {
      const Teacher = require('../models/Teacher');
      const teacherProfile = await Teacher.findOne({ email: req.user.email });
      if (teacherProfile) {
          query.teacher = teacherProfile._id;
      }
  } else if (req.user.role === 'student') {
      const Student = require('../models/Student');
      const student = await Student.findOne({ userId: req.user._id });
      if (student) {
          query.class = student.class;
          query.section = student.section;
      }
  } else if (req.user.role === 'parent') {
      const Student = require('../models/Student');
      const students = await Student.find({ parentEmail: req.user.email });
      if (students.length > 0) {
          query.$or = students.map(s => ({ class: s.class, section: s.section }));
      }
  }

  const timetables = await Timetable.find(query).populate('teacher', 'name email');

  res.status(200).json({
    success: true,
    data: timetables,
  });
});

// @desc    Create timetable slot
// @route   POST /api/timetable
// @access  Private (Admin only ideally)
const createTimetableSlot = asyncHandler(async (req, res) => {
  try {
    const slot = await Timetable.create(req.body);
    const populatedSlot = await slot.populate('teacher', 'name email');
    res.status(201).json({
      success: true,
      data: populatedSlot,
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.teacher) {
        throw new ApiError(400, 'This teacher is already assigned to another class during this period.');
      }
      if (error.keyPattern && error.keyPattern.class) {
        throw new ApiError(400, 'This class already has a different subject/teacher assigned during this period.');
      }
      throw new ApiError(400, 'Schedule conflict detected.');
    }
    throw error;
  }
});

// @desc    Delete timetable slot
// @route   DELETE /api/timetable/:id
// @access  Private (Admin only)
const deleteTimetableSlot = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const slot = await Timetable.findOneAndDelete(query);

  if (!slot) {
    throw new ApiError(404, 'Timetable slot not found');
  }

  res.status(200).json({
    success: true,
    message: 'Timetable slot removed',
  });
});

module.exports = {
  getTimetables,
  createTimetableSlot,
  deleteTimetableSlot,
};
