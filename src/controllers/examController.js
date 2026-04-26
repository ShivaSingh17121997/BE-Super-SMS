const asyncHandler = require('../middleware/asyncHandler');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const ApiError = require('../utils/ApiError');

// ─── Exam CRUD ───

const getExams = asyncHandler(async (req, res) => {
  const { schoolId, class: cls, subject, page = 1, limit = 50 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (cls) query.class = cls;
  if (subject) query.subject = subject;

  const exams = await Exam.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await Exam.countDocuments(query);

  res.status(200).json({
    success: true,
    data: exams,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

const getExam = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const exam = await Exam.findOne(query);
  if (!exam) throw new ApiError(404, 'Exam not found');
  res.status(200).json({ success: true, data: exam });
});

const createExam = asyncHandler(async (req, res) => {
  const exam = await Exam.create(req.body);
  res.status(201).json({ success: true, data: exam });
});

const updateExam = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const exam = await Exam.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!exam) throw new ApiError(404, 'Exam not found');
  res.status(200).json({ success: true, data: exam });
});

const deleteExam = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const exam = await Exam.findOneAndDelete(query);
  if (!exam) throw new ApiError(404, 'Exam not found');

  // Also delete all results for this exam
  await ExamResult.deleteMany({ examId: req.params.id });

  res.status(200).json({ success: true, message: 'Exam and its results deleted' });
});

// ─── Exam Results ───

const getExamResults = asyncHandler(async (req, res) => {
  const { schoolId, examId, studentId, page = 1, limit = 100 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (examId) query.examId = examId;
  if (studentId) query.studentId = studentId;

  const results = await ExamResult.find(query)
    .populate('studentId', 'name rollNumber class section')
    .populate('examId', 'name type subject totalMarks')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await ExamResult.countDocuments(query);

  res.status(200).json({
    success: true,
    data: results,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

const createExamResult = asyncHandler(async (req, res) => {
  const result = await ExamResult.create(req.body);
  res.status(201).json({ success: true, data: result });
});

const updateExamResult = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const result = await ExamResult.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!result) throw new ApiError(404, 'Exam result not found');
  res.status(200).json({ success: true, data: result });
});

const deleteExamResult = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const result = await ExamResult.findOneAndDelete(query);
  if (!result) throw new ApiError(404, 'Exam result not found');
  res.status(200).json({ success: true, message: 'Exam result deleted' });
});

module.exports = {
  getExams, getExam, createExam, updateExam, deleteExam,
  getExamResults, createExamResult, updateExamResult, deleteExamResult,
};
