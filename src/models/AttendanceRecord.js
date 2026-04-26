const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day'],
      required: [true, 'Status is required'],
    },
    class: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School ID is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Prevent duplicate attendance for same student on same day
attendanceRecordSchema.index({ studentId: 1, date: 1, schoolId: 1 }, { unique: true });
attendanceRecordSchema.index({ schoolId: 1, date: 1 });
attendanceRecordSchema.index({ schoolId: 1, class: 1, date: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
