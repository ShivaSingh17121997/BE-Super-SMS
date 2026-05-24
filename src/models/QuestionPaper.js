const mongoose = require('mongoose');

/**
 * QuestionPaper — a generated exam paper composed of selected questions.
 * Questions can be from the question bank or manually added free-text entries.
 */

// ── Inline / Manual Question sub-schema ───────────────────────────────────
// Used for questions added directly to a paper without being in the bank.
const inlineQuestionSchema = new mongoose.Schema(
  {
    questionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      default: null, // null = manually added, not from bank
    },
    questionText: { type: String, required: true, trim: true },
    questionType: { type: String, enum: ['mcq', 'paragraph'], default: 'paragraph' },
    marks: { type: Number, required: true, default: 1 },
    options: [{ text: String, isCorrect: Boolean }], // for MCQ
    modelAnswer: { type: String, default: '' },
    order: { type: Number, default: 0 }, // for drag-reorder
  },
  { _id: true }
);

// ── Section sub-schema ─────────────────────────────────────────────────────
const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: 'Section A' },
    instructions: { type: String, trim: true, default: '' },
    questions: [inlineQuestionSchema],
    sectionMarks: { type: Number, default: 0 },
  },
  { _id: true }
);

// ── Main QuestionPaper Schema ──────────────────────────────────────────────
const questionPaperSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Question paper title is required'],
      trim: true,
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    examType: {
      type: String,
      enum: ['unit-test', 'mid-term', 'final', 'quiz', 'practice', 'other'],
      default: 'unit-test',
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100,
    },
    duration: {
      type: Number, // in minutes
      default: 60,
    },
    instructions: {
      type: String,
      trim: true,
      default: 'Answer all questions. All questions carry equal marks.',
    },

    // Sections hold the actual questions (bank refs + manual)
    sections: {
      type: [sectionSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Virtual: computed totalMarks from sections ─────────────────────────────
questionPaperSchema.virtual('computedTotalMarks').get(function () {
  return this.sections.reduce((total, section) => {
    return total + section.questions.reduce((st, q) => st + (q.marks || 0), 0);
  }, 0);
});

// ── Indexes ────────────────────────────────────────────────────────────────
questionPaperSchema.index({ schoolId: 1, class: 1, subject: 1 });
questionPaperSchema.index({ schoolId: 1, status: 1 });
questionPaperSchema.index({ schoolId: 1, createdBy: 1 });

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
