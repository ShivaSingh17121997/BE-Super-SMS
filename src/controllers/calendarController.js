const asyncHandler = require('../middleware/asyncHandler');
const CalendarEvent = require('../models/CalendarEvent');
const ApiError = require('../utils/ApiError');

const getEvents = asyncHandler(async (req, res) => {
  const { schoolId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  const events = await CalendarEvent.find(query)
    .sort({ startDate: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const total = await CalendarEvent.countDocuments(query);

  res.status(200).json({
    success: true,
    data: events,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
});

const getEvent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const event = await CalendarEvent.findOne(query);
  if (!event) throw new ApiError(404, 'Event not found');
  res.status(200).json({ success: true, data: event });
});

const createEvent = asyncHandler(async (req, res) => {
  const event = await CalendarEvent.create(req.body);
  res.status(201).json({ success: true, data: event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const event = await CalendarEvent.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!event) throw new ApiError(404, 'Event not found');
  res.status(200).json({ success: true, data: event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.query.schoolId) query.schoolId = req.query.schoolId;
  const event = await CalendarEvent.findOneAndDelete(query);
  if (!event) throw new ApiError(404, 'Event not found');
  res.status(200).json({ success: true, message: 'Event deleted' });
});

module.exports = { getEvents, getEvent, createEvent, updateEvent, deleteEvent };
