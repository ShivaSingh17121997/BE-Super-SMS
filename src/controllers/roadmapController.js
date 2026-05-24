const CourseRoadmap = require('../models/CourseRoadmap');
const LessonPlan = require('../models/LessonPlan');

// @desc    Create or update a Course Roadmap
// @route   POST /api/roadmap
// @access  Private (Admin/Principal)
exports.createOrUpdateRoadmap = async (req, res, next) => {
  try {
    const { className, subject, academicYear, chapters } = req.body;
    const school = req.user.schoolId;

    if (!className || !subject || !academicYear || !chapters || !chapters.length) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields including chapters' });
    }

    let roadmap = await CourseRoadmap.findOne({ school, className, subject, academicYear });

    if (roadmap) {
      roadmap.chapters = chapters;
      await roadmap.save();
    } else {
      roadmap = await CourseRoadmap.create({ school, className, subject, academicYear, chapters });
    }

    res.status(200).json({ success: true, data: roadmap });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Roadmap for a specific class and subject
// @route   GET /api/roadmap/:className/:subject/:academicYear
// @access  Private
exports.getRoadmap = async (req, res, next) => {
  try {
    const { className, subject, academicYear } = req.params;
    const school = req.user.schoolId;

    const roadmap = await CourseRoadmap.findOne({ school, className, subject, academicYear });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Course Roadmap not found for this class and subject' });
    }

    res.status(200).json({ success: true, data: roadmap });
  } catch (err) {
    next(err);
  }
};

// @desc    Update Lesson Plan Progress
// @route   PUT /api/roadmap/lesson-plan
// @access  Private (Teacher)
exports.updateLessonPlanProgress = async (req, res, next) => {
  try {
    const { className, section, subject, roadmapId, chapterId, status, notes } = req.body;
    const school = req.user.schoolId;
    const teacher = req.user.id;

    if (!className || !section || !subject || !roadmapId || !chapterId || !status) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    let lessonPlan = await LessonPlan.findOne({ school, className, section, subject, roadmap: roadmapId, chapterId });

    if (lessonPlan) {
      lessonPlan.status = status;
      lessonPlan.notes = notes;
      
      if (status === 'In Progress' && !lessonPlan.actualStartDate) {
        lessonPlan.actualStartDate = Date.now();
      } else if (status === 'Completed') {
        lessonPlan.actualEndDate = Date.now();
        if (!lessonPlan.actualStartDate) lessonPlan.actualStartDate = Date.now();
      }
      
      await lessonPlan.save();
    } else {
      const dates = {};
      if (status === 'In Progress') dates.actualStartDate = Date.now();
      if (status === 'Completed') {
        dates.actualStartDate = Date.now();
        dates.actualEndDate = Date.now();
      }
      
      lessonPlan = await LessonPlan.create({
        school, teacher, className, section, subject, roadmap: roadmapId, chapterId, status, notes, ...dates
      });
    }

    res.status(200).json({ success: true, data: lessonPlan });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Overall Course Progress Analytics
// @route   GET /api/roadmap/progress/:className/:section/:subject/:academicYear
// @access  Private
exports.getCourseProgress = async (req, res, next) => {
  try {
    const { className, section, subject, academicYear } = req.params;
    const school = req.user.schoolId;

    const roadmap = await CourseRoadmap.findOne({ school, className, subject, academicYear });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found' });
    }

    const lessonPlans = await LessonPlan.find({ school, className, section, subject, roadmap: roadmap._id });

    // Calculate metrics
    let totalExpectedDays = 0;
    let completedDays = 0;
    let inProgressDays = 0;

    const detailedChapters = roadmap.chapters.map(chap => {
      totalExpectedDays += chap.expectedDays;
      
      const plan = lessonPlans.find(lp => lp.chapterId.toString() === chap._id.toString());
      const status = plan ? plan.status : 'Not Started';
      
      if (status === 'Completed') {
        completedDays += chap.expectedDays;
      } else if (status === 'In Progress') {
        inProgressDays += chap.expectedDays; // Can refine to a fraction if we want 50%
      }

      return {
        chapterId: chap._id,
        chapterName: chap.chapterName,
        expectedDays: chap.expectedDays,
        term: chap.term,
        order: chap.order,
        status,
        plan: plan || null
      };
    });

    const percentCompleted = totalExpectedDays === 0 ? 0 : Math.round((completedDays / totalExpectedDays) * 100);

    let progressStatus = 'On Track';
    // Simplified logic: purely based on completed vs expected over time. 
    // For a real advanced system, we'd compare against elapsed days in academic year.

    res.status(200).json({
      success: true,
      data: {
        _id: roadmap._id,
        totalExpectedDays,
        completedDays,
        percentCompleted,
        progressStatus,
        chapters: detailedChapters
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Course Roadmap and its lesson plans
// @route   DELETE /api/roadmap/:className/:subject/:academicYear
// @access  Private (Admin/Principal)
exports.deleteRoadmap = async (req, res, next) => {
  try {
    const { className, subject, academicYear } = req.params;
    const school = req.user.schoolId;

    const roadmap = await CourseRoadmap.findOne({ school, className, subject, academicYear });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Course Roadmap not found' });
    }

    // Delete associated Lesson Plans
    await LessonPlan.deleteMany({ school, className, subject, roadmap: roadmap._id });

    // Delete Roadmap
    await CourseRoadmap.deleteOne({ _id: roadmap._id });

    res.status(200).json({ success: true, message: 'Course Roadmap and associated lesson plans deleted successfully' });
  } catch (err) {
    next(err);
  }
};
