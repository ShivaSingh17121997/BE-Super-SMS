require('dotenv').config();
const mongoose = require('mongoose');
const School = require('./src/models/School');
const CourseRoadmap = require('./src/models/CourseRoadmap');
const LessonPlan = require('./src/models/LessonPlan');
const connectDB = require('./src/config/db');

const seedRoadmaps = async () => {
  try {
    await connectDB();

    const school = await School.findOne();
    if (!school) {
      console.log('No school found in the database. Please seed schools first.');
      process.exit(1);
    }
    const schoolId = school._id;
    const academicYear = '2023-2024';
    const subject = 'Mathematics';

    // A generic roadmap template for Mathematics
    const mathsChapters = [
      { chapterName: 'Number Systems', expectedDays: 10, order: 1, term: 'Term 1' },
      { chapterName: 'Algebra & Polynomials', expectedDays: 15, order: 2, term: 'Term 1' },
      { chapterName: 'Geometry basics', expectedDays: 12, order: 3, term: 'Term 1' },
      { chapterName: 'Mensuration', expectedDays: 18, order: 4, term: 'Term 1' },
      { chapterName: 'Trigonometry', expectedDays: 20, order: 5, term: 'Term 2' },
      { chapterName: 'Statistics', expectedDays: 10, order: 6, term: 'Term 2' },
      { chapterName: 'Probability', expectedDays: 8, order: 7, term: 'Term 2' }
    ];

    console.log('Clearing old roadmap data for Mathematics...');
    await CourseRoadmap.deleteMany({ subject });
    await LessonPlan.deleteMany({ subject });

    for (let i = 1; i <= 10; i++) {
      const className = i.toString();
      
      const roadmap = await CourseRoadmap.create({
        school: schoolId,
        className,
        subject,
        academicYear,
        chapters: mathsChapters
      });

      // Let's create some dummy lesson plan progress for section 'A' just to make the UI look alive
      // For class 10, we'll mark some as completed
      if (className === '10') {
        const teacherId = new mongoose.Types.ObjectId(); // Fake teacher id for seeding
        
        // Chapter 1: Completed
        await LessonPlan.create({
          school: schoolId, teacher: teacherId, className, section: 'A', subject,
          roadmap: roadmap._id, chapterId: roadmap.chapters[0]._id, status: 'Completed',
          actualStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          actualEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        });

        // Chapter 2: In Progress
        await LessonPlan.create({
          school: schoolId, teacher: teacherId, className, section: 'A', subject,
          roadmap: roadmap._id, chapterId: roadmap.chapters[1]._id, status: 'In Progress',
          actualStartDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        });
      }
      
      console.log(`Seeded CourseRoadmap for Class ${className} - ${subject}`);
    }

    console.log('Database Seeding Completed Successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedRoadmaps();
