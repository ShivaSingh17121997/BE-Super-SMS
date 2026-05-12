const School = require('../models/School');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Staff = require('../models/Staff');
const FeeInvoice = require('../models/FeeInvoice');
const AttendanceRecord = require('../models/AttendanceRecord');
const Homework = require('../models/Homework');
const Notice = require('../models/Notice');

const Timetable = require('../models/Timetable');

/**
 * Dashboard stats for Super Admin.
 * Returns global aggregated statistics across all schools.
 */
const getSuperAdminStats = async () => {
  const [
    totalSchools,
    activeSchools,
    totalUsers,
    totalStudents,
    totalTeachers,
    planBreakdown,
    recentSchools,
  ] = await Promise.all([
    School.countDocuments(),
    School.countDocuments({ isActive: true }),
    User.countDocuments(),
    Student.countDocuments(),
    Teacher.countDocuments(),
    School.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]),
    School.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email plan isActive studentsCount teachersCount createdAt'),
  ]);

  // Convert plan breakdown array to object
  const plans = {};
  planBreakdown.forEach((p) => {
    plans[p._id] = p.count;
  });

  return {
    totalSchools,
    activeSchools,
    totalUsers,
    totalStudents,
    totalTeachers,
    planBreakdown: plans,
    recentSchools,
  };
};

/**
 * Dashboard stats for School Admin / Principal.
 * Returns stats scoped to a specific school.
 */
const getSchoolAdminStats = async (schoolId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalStudents,
    totalTeachers,
    totalStaff,
    feeStats,
    todayAttendance,
    upcomingHomework,
    recentNotices,
  ] = await Promise.all([
    // Count students
    Student.countDocuments({ schoolId, isActive: true }),

    // Count teachers
    Teacher.countDocuments({ schoolId, isActive: true }),

    // Count staff
    Staff.countDocuments({ schoolId, isActive: true }),

    // Fee aggregation
    FeeInvoice.aggregate([
      { $match: { schoolId: require('mongoose').Types.ObjectId.createFromHexString(schoolId) } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$paidAmount' },
          totalPending: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'overdue']] }, '$amount', 0],
            },
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          overdueCount: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
        },
      },
    ]),

    // Today's attendance
    AttendanceRecord.aggregate([
      {
        $match: {
          schoolId: require('mongoose').Types.ObjectId.createFromHexString(schoolId),
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Upcoming homework (due in the future)
    Homework.find({ schoolId, dueDate: { $gte: today } })
      .sort({ dueDate: 1 })
      .limit(5)
      .select('title subject class section dueDate'),

    // Recent notices
    Notice.find({ schoolId })
      .sort({ date: -1 })
      .limit(5)
      .select('title category priority date'),
  ]);

  // Format fee stats
  const fees = feeStats.length > 0 ? feeStats[0] : {
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
  };
  delete fees._id;

  // Format attendance
  const attendance = { present: 0, absent: 0, late: 0, 'half-day': 0, total: 0 };
  todayAttendance.forEach((a) => {
    attendance[a._id] = a.count;
    attendance.total += a.count;
  });

  return {
    totalStudents,
    totalTeachers,
    totalStaff,
    feeCollection: fees,
    todayAttendance: attendance,
    upcomingHomework,
    recentNotices,
  };
};

/**
 * Dashboard stats for Teacher.
 */
const getTeacherStats = async (userId, schoolId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[today.getDay()];

  // Get teacher profile to get their ID if we only have userId
  const teacher = await Teacher.findOne({ userId, schoolId });
  const teacherId = teacher ? teacher._id : null;

  const [
    todaysClasses,
    activeHomework,
    attendanceRecords,
  ] = await Promise.all([
    // Today's classes for this teacher
    teacherId ? Timetable.find({ teacher: teacherId, day: dayName, schoolId }) : [],

    // Active homework assigned by this teacher
    Homework.countDocuments({ assignedBy: userId, schoolId, dueDate: { $gte: today } }),

    // Attendance records by this teacher for today
    AttendanceRecord.find({ 
      schoolId, 
      date: { $gte: today, $lt: tomorrow } 
    }).select('class section'),
  ]);

  // Pending attendance: classes today that don't have records
  const markedClasses = new Set(attendanceRecords.map(r => `${r.class}-${r.section}`));
  let pendingAttendanceCount = 0;
  
  const uniqueTodayClasses = new Set();
  todaysClasses.forEach(c => {
    const key = `${c.class}-${c.section}`;
    if (!markedClasses.has(key) && !uniqueTodayClasses.has(key)) {
      pendingAttendanceCount++;
      uniqueTodayClasses.add(key);
    }
  });

  return {
    todayClassesCount: todaysClasses.length,
    activeHomeworkCount: activeHomework,
    pendingAttendanceCount,
    pendingEvaluationsCount: 0, // Placeholder
  };
};

module.exports = { getSuperAdminStats, getSchoolAdminStats, getTeacherStats };
