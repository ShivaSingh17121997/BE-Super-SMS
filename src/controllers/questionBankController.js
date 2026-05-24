const asyncHandler = require('../middleware/asyncHandler');
const Question = require('../models/Question');
const QuestionPaper = require('../models/QuestionPaper');
const ApiError = require('../utils/ApiError');
const XLSX = require('xlsx');

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — build filter query from request params
// ═══════════════════════════════════════════════════════════════════════════
function buildQuestionQuery(queryParams) {
  const { schoolId, class: cls, subject, chapter, topic, questionType, category, difficulty, search, isActive } = queryParams;
  const query = {};

  if (schoolId) query.schoolId = schoolId;
  if (cls) query.class = cls;
  if (subject) query.subject = subject;
  if (chapter) query.chapter = new RegExp(chapter, 'i');
  if (topic) query.topic = new RegExp(topic, 'i');
  if (questionType) query.questionType = questionType;
  if (category) query.category = category;
  if (difficulty) query.difficulty = difficulty;

  // Default to only active questions
  query.isActive = isActive === 'false' ? false : true;

  if (search && search.trim()) {
    query.$text = { $search: search.trim() };
  }

  return query;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — validate a single question payload
// ═══════════════════════════════════════════════════════════════════════════
function validateQuestionPayload(data, rowIndex = null) {
  const prefix = rowIndex != null ? `Row ${rowIndex + 1}: ` : '';
  const errors = [];

  if (!data.questionText || !data.questionText.trim()) errors.push(`${prefix}questionText is required`);
  if (!data.class || !data.class.toString().trim()) errors.push(`${prefix}class is required`);
  if (!data.subject || !data.subject.trim()) errors.push(`${prefix}subject is required`);
  if (!data.questionType) errors.push(`${prefix}questionType is required (mcq or paragraph)`);
  if (data.questionType && !['mcq', 'paragraph'].includes(data.questionType)) {
    errors.push(`${prefix}questionType must be 'mcq' or 'paragraph'`);
  }
  if (data.marks && isNaN(Number(data.marks))) errors.push(`${prefix}marks must be a number`);
  if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
    errors.push(`${prefix}difficulty must be easy, medium, or hard`);
  }
  if (data.category && !['optional', 'theoretical', 'practical'].includes(data.category)) {
    errors.push(`${prefix}category must be optional, theoretical, or practical`);
  }

  if (data.questionType === 'mcq') {
    if (!data.options || data.options.length < 2) {
      errors.push(`${prefix}MCQ questions must have at least 2 options`);
    } else {
      const hasCorrect = data.options.some((o) => o.isCorrect);
      if (!hasCorrect) errors.push(`${prefix}At least one option must be marked as correct`);
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — parse bulk upload rows from Excel/CSV buffer
// ═══════════════════════════════════════════════════════════════════════════
function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — convert flat Excel row to question document
// ═══════════════════════════════════════════════════════════════════════════
function rowToQuestion(row, schoolId) {
  const questionType = (row['questionType'] || row['Question Type'] || 'paragraph').toString().toLowerCase().trim();

  let options = [];
  if (questionType === 'mcq') {
    // Expect columns: optionA, optionB, optionC, optionD, correctOption (A/B/C/D or 0/1/2/3)
    const optionCols = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'optionF'];
    const rawCorrect = (row['correctOption'] || row['Correct Option'] || '').toString().toUpperCase().trim();
    const correctLetterMap = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
    const correctIndex = isNaN(rawCorrect)
      ? correctLetterMap[rawCorrect]
      : parseInt(rawCorrect);

    optionCols.forEach((col, idx) => {
      const text = row[col] || row[col.replace('option', 'Option')] || '';
      if (text.toString().trim()) {
        options.push({ text: text.toString().trim(), isCorrect: idx === correctIndex });
      }
    });
  }

  return {
    schoolId,
    class: (row['class'] || row['Class'] || '').toString().trim(),
    subject: (row['subject'] || row['Subject'] || '').toString().trim(),
    chapter: (row['chapter'] || row['Chapter'] || '').toString().trim(),
    topic: (row['topic'] || row['Topic'] || '').toString().trim(),
    questionType,
    questionText: (row['questionText'] || row['Question Text'] || '').toString().trim(),
    marks: parseFloat(row['marks'] || row['Marks'] || 1),
    difficulty: (row['difficulty'] || row['Difficulty'] || 'medium').toString().toLowerCase().trim(),
    category: (row['category'] || row['Category'] || 'theoretical').toString().toLowerCase().trim(),
    options,
    modelAnswer: (row['modelAnswer'] || row['Model Answer'] || '').toString().trim(),
    tags: (row['tags'] || row['Tags'] || '').toString().split(',').map((t) => t.trim()).filter(Boolean),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION BANK CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/question-bank/questions
 * Filter, search, paginate questions.
 */
const getQuestions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const query = buildQuestionQuery(req.query);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let dbQuery = Question.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // If text search, add score projection
  if (req.query.search) {
    dbQuery = dbQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
  }

  const [questions, total] = await Promise.all([
    dbQuery.lean(),
    Question.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: questions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * GET /api/question-bank/questions/:id
 */
const getQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOne({
    _id: req.params.id,
    schoolId: req.query.schoolId,
    isActive: true,
  });
  if (!question) throw new ApiError(404, 'Question not found');
  res.status(200).json({ success: true, data: question });
});

/**
 * POST /api/question-bank/questions
 * Create a single question with duplicate detection.
 */
const createQuestion = asyncHandler(async (req, res) => {
  const data = { ...req.body };

  // Validate
  const errors = validateQuestionPayload(data);
  if (errors.length > 0) throw new ApiError(400, errors.join('; '));

  // Compute hash for duplicate detection
  const contentHash = Question.hashText(data.questionText);

  // Check for duplicate within this school
  const existing = await Question.findOne({
    schoolId: data.schoolId,
    contentHash,
    isActive: true,
  });
  if (existing) {
    throw new ApiError(409, `Duplicate question detected. An identical question already exists (ID: ${existing._id}).`);
  }

  data.contentHash = contentHash;
  data.createdBy = req.user._id;

  const question = await Question.create(data);
  res.status(201).json({ success: true, data: question, message: 'Question created successfully' });
});

/**
 * PUT /api/question-bank/questions/:id
 */
const updateQuestion = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, schoolId: req.query.schoolId || req.body.schoolId };

  const data = { ...req.body };

  // If question text changed, recompute hash and check duplicate
  if (data.questionText) {
    const contentHash = Question.hashText(data.questionText);
    const existing = await Question.findOne({
      schoolId: data.schoolId,
      contentHash,
      isActive: true,
      _id: { $ne: req.params.id },
    });
    if (existing) {
      throw new ApiError(409, `Duplicate question detected. An identical question already exists (ID: ${existing._id}).`);
    }
    data.contentHash = contentHash;
  }

  const question = await Question.findOneAndUpdate(query, data, { new: true, runValidators: true });
  if (!question) throw new ApiError(404, 'Question not found');
  res.status(200).json({ success: true, data: question });
});

/**
 * DELETE /api/question-bank/questions/:id  (soft delete)
 */
const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOneAndUpdate(
    { _id: req.params.id, schoolId: req.query.schoolId },
    { isActive: false },
    { new: true }
  );
  if (!question) throw new ApiError(404, 'Question not found');
  res.status(200).json({ success: true, message: 'Question deleted successfully' });
});

/**
 * POST /api/question-bank/questions/bulk
 * Bulk upload questions from Excel/CSV (base64 encoded file in body or raw buffer).
 * Restricted to admin/principal.
 */
const bulkUploadQuestions = asyncHandler(async (req, res) => {
  const { schoolId, questions: rawQuestions, fileBase64 } = req.body;

  let questionsToProcess = [];

  if (fileBase64) {
    // Excel/CSV uploaded as base64
    const buffer = Buffer.from(fileBase64, 'base64');
    const rows = parseExcelBuffer(buffer);
    questionsToProcess = rows.map((row) => rowToQuestion(row, schoolId));
  } else if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
    // JSON array uploaded directly
    questionsToProcess = rawQuestions.map((q) => ({ ...q, schoolId }));
  } else {
    throw new ApiError(400, 'Provide either fileBase64 (Excel/CSV) or a questions array.');
  }

  if (questionsToProcess.length === 0) {
    throw new ApiError(400, 'No questions found in the uploaded file.');
  }
  if (questionsToProcess.length > 500) {
    throw new ApiError(400, 'Maximum 500 questions per bulk upload.');
  }

  const results = { created: 0, skipped: 0, errors: [] };
  const createdQuestions = [];

  for (let i = 0; i < questionsToProcess.length; i++) {
    const qData = questionsToProcess[i];

    // Validate
    const errors = validateQuestionPayload(qData, i);
    if (errors.length > 0) {
      results.errors.push(...errors);
      results.skipped++;
      continue;
    }

    const contentHash = Question.hashText(qData.questionText);

    try {
      const question = await Question.create({
        ...qData,
        contentHash,
        createdBy: req.user._id,
      });
      createdQuestions.push(question._id);
      results.created++;
    } catch (err) {
      if (err.code === 11000) {
        results.errors.push(`Row ${i + 1}: Duplicate question skipped — "${qData.questionText.substring(0, 60)}..."`);
        results.skipped++;
      } else {
        results.errors.push(`Row ${i + 1}: ${err.message}`);
        results.skipped++;
      }
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk upload complete. Created: ${results.created}, Skipped: ${results.skipped}`,
    data: results,
  });
});

/**
 * GET /api/question-bank/filters
 * Returns distinct classes, subjects, chapters, topics for filter dropdowns.
 */
const getFiltersMetadata = asyncHandler(async (req, res) => {
  const schoolId = req.query.schoolId;
  const baseMatch = { schoolId: new require('mongoose').Types.ObjectId(schoolId), isActive: true };

  const [classes, subjects, chapters, topics] = await Promise.all([
    Question.distinct('class', baseMatch),
    Question.distinct('subject', baseMatch),
    Question.distinct('chapter', { ...baseMatch, chapter: { $ne: '' } }),
    Question.distinct('topic', { ...baseMatch, topic: { $ne: '' } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      classes: classes.sort(),
      subjects: subjects.sort(),
      chapters: chapters.sort(),
      topics: topics.sort(),
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION PAPER CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/question-bank/papers
 */
const getQuestionPapers = asyncHandler(async (req, res) => {
  const { schoolId, class: cls, subject, status, page = 1, limit = 30 } = req.query;
  const query = {};
  if (schoolId) query.schoolId = schoolId;
  if (cls) query.class = cls;
  if (subject) query.subject = subject;
  if (status) query.status = status;

  const [papers, total] = await Promise.all([
    QuestionPaper.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean(),
    QuestionPaper.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: papers,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
});

/**
 * GET /api/question-bank/papers/:id
 * Full paper with populated question bank refs.
 */
const getQuestionPaperById = asyncHandler(async (req, res) => {
  const paper = await QuestionPaper.findOne({
    _id: req.params.id,
    schoolId: req.query.schoolId,
  }).populate('createdBy', 'name email');

  if (!paper) throw new ApiError(404, 'Question paper not found');

  // Populate questionRef fields within sections
  await QuestionPaper.populate(paper, {
    path: 'sections.questions.questionRef',
    model: 'Question',
    select: 'questionText questionType options modelAnswer marks difficulty category',
  });

  res.status(200).json({ success: true, data: paper });
});

/**
 * POST /api/question-bank/papers
 * Create a new question paper from selected question IDs.
 */
const createQuestionPaper = asyncHandler(async (req, res) => {
  const {
    schoolId, title, class: cls, subject, examType,
    totalMarks, duration, instructions, sections,
    questionIds, // Flat list of question IDs → auto-creates single section
  } = req.body;

  if (!title || !cls || !subject) {
    throw new ApiError(400, 'title, class, and subject are required');
  }

  let finalSections = sections || [];

  // If flat questionIds provided, build a default single section
  if (!sections && Array.isArray(questionIds) && questionIds.length > 0) {
    const questions = await Question.find({ _id: { $in: questionIds }, schoolId, isActive: true });

    if (questions.length === 0) throw new ApiError(400, 'No valid questions found for provided IDs');

    const sectionQuestions = questions.map((q, idx) => ({
      questionRef: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      marks: q.marks,
      options: q.options,
      modelAnswer: q.modelAnswer,
      order: idx,
    }));

    finalSections = [{ name: 'Section A', instructions: '', questions: sectionQuestions }];

    // Increment usage count on selected questions
    await Question.updateMany({ _id: { $in: questionIds } }, { $inc: { usageCount: 1 } });
  }

  const computedTotal = finalSections.reduce(
    (sum, sec) => sum + sec.questions.reduce((s, q) => s + (q.marks || 0), 0),
    0
  );

  const paper = await QuestionPaper.create({
    schoolId,
    title,
    class: cls,
    subject,
    examType: examType || 'unit-test',
    totalMarks: totalMarks || computedTotal || 100,
    duration: duration || 60,
    instructions: instructions || 'Answer all questions.',
    sections: finalSections,
    status: 'draft',
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: paper, message: 'Question paper created successfully' });
});

/**
 * PUT /api/question-bank/papers/:id
 */
const updateQuestionPaper = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, schoolId: req.query.schoolId || req.body.schoolId };
  const paper = await QuestionPaper.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
  if (!paper) throw new ApiError(404, 'Question paper not found');
  res.status(200).json({ success: true, data: paper });
});

/**
 * DELETE /api/question-bank/papers/:id
 */
const deleteQuestionPaper = asyncHandler(async (req, res) => {
  const paper = await QuestionPaper.findOneAndDelete({
    _id: req.params.id,
    schoolId: req.query.schoolId,
  });
  if (!paper) throw new ApiError(404, 'Question paper not found');
  res.status(200).json({ success: true, message: 'Question paper deleted successfully' });
});

module.exports = {
  // Questions
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  getFiltersMetadata,
  // Papers
  getQuestionPapers,
  getQuestionPaperById,
  createQuestionPaper,
  updateQuestionPaper,
  deleteQuestionPaper,
};
