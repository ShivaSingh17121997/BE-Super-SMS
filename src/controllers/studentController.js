const asyncHandler = require('../middleware/asyncHandler');
const Student = require('../models/Student');
const studentService = require('../services/studentService');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get all students (scoped by school)
 * @route   GET /api/students
 * @access  Private
 */
const getStudents = asyncHandler(async (req, res) => {
  const { schoolId, page = 1, limit = 50, search, class: cls, section, isActive } = req.query;

  const query = {};
  if (schoolId) query.schoolId = schoolId;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
    ];
  }

  if (cls) query.class = cls;
  if (section) query.section = section;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  if (req.user.role === 'teacher') {
    const Teacher = require('../models/Teacher');
    const Timetable = require('../models/Timetable');
    const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');

    const teacherProfile = await Teacher.findOne({ email: req.user.email });
    if (teacherProfile) {
      const [timetables, classAssignments] = await Promise.all([
        Timetable.find({ teacher: teacherProfile._id, schoolId: teacherProfile.schoolId }),
        ClassTeacherAssignment.find({ teacherId: teacherProfile._id, schoolId: teacherProfile.schoolId, isActive: true })
      ]);

      const uniqueClasses = new Set();
      timetables.forEach(t => uniqueClasses.add(`${t.class}|${t.section}`));
      classAssignments.forEach(ca => uniqueClasses.add(`${ca.class}|${ca.section}`));

      const classesCondition = Array.from(uniqueClasses).map(c => {
        const [cls, sec] = c.split('|');
        return { class: cls, section: sec };
      });

      if (classesCondition.length > 0) {
        if (query.$or) {
          // If there's already a search or other $or condition, intersect it with class visibility
          query.$and = [{ $or: query.$or }, { $or: classesCondition }];
          delete query.$or;
        } else {
          query.$or = classesCondition;
        }
      } else {
        // No classes assigned, see no students
        query._id = null;
      }
    } else {
      query._id = null;
    }
  }

  const students = await Student.find(query)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Student.countDocuments(query);

  res.status(200).json({
    success: true,
    data: students,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get single student
 * @route   GET /api/students/:id
 * @access  Private
 */
const getStudent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const student = await Student.findOne(query);
  if (!student) throw new ApiError(404, 'Student not found');

  res.status(200).json({ success: true, data: student });
});

/**
 * @desc    Create student (with auto User + Parent account creation)
 * @route   POST /api/students
 * @access  Private (school-admin, principal)
 */
const createStudent = asyncHandler(async (req, res) => {
  const schoolId = req.body.schoolId || req.schoolId;
  if (!schoolId) throw new ApiError(400, 'School ID is required');

  const student = await studentService.createStudent(req.body, schoolId);

  res.status(201).json({ success: true, data: student });
});

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private (school-admin, principal)
 */
const updateStudent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const student = await Student.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!student) throw new ApiError(404, 'Student not found');

  res.status(200).json({ success: true, data: student });
});

/**
 * @desc    Delete student (cascading)
 * @route   DELETE /api/students/:id
 * @access  Private (school-admin)
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const schoolId = req.query.schoolId || req.schoolId;
  if (!schoolId) throw new ApiError(400, 'School ID is required');

  const result = await studentService.deleteStudent(req.params.id, schoolId);

  res.status(200).json({ success: true, ...result });
});

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent };
