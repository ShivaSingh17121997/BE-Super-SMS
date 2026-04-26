const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  class: {
    type: String,
    required: true,
  },
  section: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  }
}, {
  timestamps: true,
});

// A teacher cannot be booked for two different classes at the same time
timetableSchema.index({ schoolId: 1, teacher: 1, day: 1, period: 1 }, { unique: true });

// A class section cannot have two different teachers at the same time
timetableSchema.index({ schoolId: 1, class: 1, section: 1, day: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
