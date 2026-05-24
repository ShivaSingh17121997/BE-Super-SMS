const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  chapterName: {
    type: String,
    required: true,
    trim: true,
  },
  expectedDays: {
    type: Number,
    required: true,
    min: 1,
  },
  order: {
    type: Number,
    required: true,
  },
  term: {
    type: String,
    trim: true,
    default: 'Full Year'
  }
});

const courseRoadmapSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  className: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
  },
  chapters: [chapterSchema]
}, {
  timestamps: true,
});

// Ensure a subject roadmap is unique per class and academic year for a school
courseRoadmapSchema.index({ school: 1, className: 1, subject: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('CourseRoadmap', courseRoadmapSchema);
