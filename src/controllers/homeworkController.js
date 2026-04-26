const asyncHandler = require('../middleware/asyncHandler');
const Homework = require('../models/Homework');
const ApiError = require('../utils/ApiError');

const getHomeworks = asyncHandler(async (req, res) => {
  const { schoolId, class: cls, section, subject, page = 1, limit = 50 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (cls) query.class = cls;
  if (section) query.section = section;
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

const getHomework = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const homework = await Homework.findOne(query).populate('assignedBy', 'name');
  if (!homework) throw new ApiError(404, 'Homework not found');
  res.status(200).json({ success: true, data: homework });
});

const createHomework = asyncHandler(async (req, res) => {
  req.body.assignedBy = req.user._id;
  const homework = await Homework.create(req.body);
  res.status(201).json({ success: true, data: homework });
});

const updateHomework = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const homework = await Homework.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!homework) throw new ApiError(404, 'Homework not found');
  res.status(200).json({ success: true, data: homework });
});

const deleteHomework = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const homework = await Homework.findOneAndDelete(query);
  if (!homework) throw new ApiError(404, 'Homework not found');
  res.status(200).json({ success: true, message: 'Homework deleted' });
});

module.exports = { getHomeworks, getHomework, createHomework, updateHomework, deleteHomework };
