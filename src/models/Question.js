const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Generates a stable content hash for duplicate detection.
 * Normalises whitespace, lowercases, and removes punctuation before hashing.
 */
function generateContentHash(text) {
  const normalised = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
  return crypto.createHash('sha256').update(normalised).digest('hex');
}

// ── MCQ Option Sub-schema ──────────────────────────────────────────────────
const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

// ── Main Question Schema ───────────────────────────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School ID is required'],
    },

    // ── Categorisation ──
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
    chapter: {
      type: String,
      trim: true,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Question Content ──
    questionType: {
      type: String,
      enum: ['mcq', 'paragraph'],
      required: [true, 'Question type is required'],
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.5, 'Marks must be at least 0.5'],
      default: 1,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['optional', 'theoretical', 'practical'],
      default: 'theoretical',
    },

    // ── MCQ Fields ──
    options: {
      type: [optionSchema],
      validate: {
        validator: function (opts) {
          if (this.questionType === 'mcq') {
            if (!opts || opts.length < 2 || opts.length > 6) return false;
            const correctCount = opts.filter((o) => o.isCorrect).length;
            return correctCount >= 1;
          }
          return true;
        },
        message:
          'MCQ questions must have 2-6 options with at least one marked as correct.',
      },
    },

    // ── Paragraph / Theoretical Fields ──
    modelAnswer: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Meta ──
    tags: {
      type: [String],
      default: [],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    /**
     * SHA-256 hash of normalised question text.
     * Used for exact-duplicate detection scoped to a school.
     */
    contentHash: {
      type: String,
      required: true,
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

// ── Indexes ────────────────────────────────────────────────────────────────
// Unique duplicate guard per school
questionSchema.index({ schoolId: 1, contentHash: 1 }, { unique: true });
// Filter indexes
questionSchema.index({ schoolId: 1, class: 1, subject: 1 });
questionSchema.index({ schoolId: 1, questionType: 1 });
questionSchema.index({ schoolId: 1, category: 1 });
questionSchema.index({ schoolId: 1, difficulty: 1 });
questionSchema.index({ schoolId: 1, isActive: 1 });
// Text search index
questionSchema.index({ questionText: 'text', modelAnswer: 'text', tags: 'text' });

// ── Pre-save Hook: auto-generate contentHash ───────────────────────────────
questionSchema.pre('save', function (next) {
  if (this.isModified('questionText') || this.isNew) {
    this.contentHash = generateContentHash(this.questionText);
  }
  next();
});

// ── Static Helper ──────────────────────────────────────────────────────────
questionSchema.statics.hashText = generateContentHash;

module.exports = mongoose.model('Question', questionSchema);
