const asyncHandler = require('../middleware/asyncHandler');
const AttendanceRecord = require('../models/AttendanceRecord');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Get attendance records (by date, class, section)
 * @route   GET /api/attendance
 * @access  Private
 */
const getAttendance = asyncHandler(async (req, res) => {
  const { schoolId, date, class: cls, section, studentId, page = 1, limit = 100 } = req.query;

  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (date) {
    const d = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = { $gte: d, $lt: nextDay };
  }
  if (cls) query.class = cls;
  if (section) query.section = section;
  if (studentId) query.studentId = studentId;

  const records = await AttendanceRecord.find(query)
    .sort({ date: -1, studentName: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('markedBy', 'name');

  const total = await AttendanceRecord.countDocuments(query);

  res.status(200).json({
    success: true,
    data: records,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

/**
 * @desc    Mark attendance (supports bulk — array of records)
 * @route   POST /api/attendance
 * @access  Private (teacher, school-admin)
 */
const markAttendance = asyncHandler(async (req, res) => {
  const { records } = req.body;
  const schoolId = req.body.schoolId || req.schoolId;

  if (!records || !Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'Please provide an array of attendance records');
  }

  // Enrich each record with schoolId and markedBy
  const enrichedRecords = records.map((r) => ({
    ...r,
    schoolId,
    markedBy: req.user._id,
  }));

  // Use bulkWrite with upsert to handle duplicates gracefully
  const operations = enrichedRecords.map((record) => ({
    updateOne: {
      filter: {
        studentId: record.studentId,
        date: new Date(record.date),
        schoolId: record.schoolId,
      },
      update: { $set: record },
      upsert: true,
    },
  }));

  const result = await AttendanceRecord.bulkWrite(operations);

  res.status(201).json({
    success: true,
    message: `Attendance marked for ${enrichedRecords.length} students`,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  });
});

/**
 * @desc    Update single attendance record
 * @route   PUT /api/attendance/:id
 * @access  Private
 */
const updateAttendance = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const record = await AttendanceRecord.findOneAndUpdate(query, req.body, {
    new: true,
    runValidators: true,
  });

  if (!record) throw new ApiError(404, 'Attendance record not found');

  res.status(200).json({ success: true, data: record });
});

/**
 * @desc    Delete attendance record
 * @route   DELETE /api/attendance/:id
 * @access  Private
 */
const deleteAttendance = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;

  const record = await AttendanceRecord.findOneAndDelete(query);
  if (!record) throw new ApiError(404, 'Attendance record not found');

  res.status(200).json({ success: true, message: 'Attendance record deleted' });
});

module.exports = { getAttendance, markAttendance, updateAttendance, deleteAttendance };
