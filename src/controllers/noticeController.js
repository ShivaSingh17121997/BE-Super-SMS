const asyncHandler = require('../middleware/asyncHandler');
const Notice = require('../models/Notice');
const ApiError = require('../utils/ApiError');

const getNotices = asyncHandler(async (req, res) => {
  const { schoolId, category, priority, page = 1, limit = 50 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (category) query.category = category;
  if (priority) query.priority = priority;

  const notices = await Notice.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('postedBy', 'name');
  const total = await Notice.countDocuments(query);

  res.status(200).json({
    success: true,
    data: notices,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

const getNotice = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const notice = await Notice.findOne(query).populate('postedBy', 'name');
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.status(200).json({ success: true, data: notice });
});

const createNotice = asyncHandler(async (req, res) => {
  req.body.postedBy = req.user._id;
  const notice = await Notice.create(req.body);
  res.status(201).json({ success: true, data: notice });
});

const updateNotice = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const notice = await Notice.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.status(200).json({ success: true, data: notice });
});

const deleteNotice = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const notice = await Notice.findOneAndDelete(query);
  if (!notice) throw new ApiError(404, 'Notice not found');
  res.status(200).json({ success: true, message: 'Notice deleted' });
});

module.exports = { getNotices, getNotice, createNotice, updateNotice, deleteNotice };
