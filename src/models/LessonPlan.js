const mongoose = require('mongoose');

const lessonPlanSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  className: {
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
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseRoadmap',
    required: true,
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed'],
    default: 'Not Started',
  },
  actualStartDate: {
    type: Date,
  },
  actualEndDate: {
    type: Date,
  },
  notes: {
    type: String,
  }
}, {
  timestamps: true,
});

// A teacher updates progress for a specific chapter in a specific class section
lessonPlanSchema.index({ school: 1, className: 1, section: 1, subject: 1, roadmap: 1, chapterId: 1 }, { unique: true });

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);
