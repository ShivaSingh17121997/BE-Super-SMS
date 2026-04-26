const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const ApiError = require('../utils/ApiError');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'school123';

/**
 * Create a teacher with automatic User account creation.
 * - Creates 1 Teacher document
 * - Creates 1 User document (role: 'teacher') for login
 * - All within a single transaction
 */
const createTeacher = async (data, schoolId) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ApiError(400, `A user with email '${data.email}' already exists`);
    }

    // 1. Create the Teacher record
    const [teacher] = await Teacher.create(
      [{ ...data, schoolId }],
      session ? { session } : {}
    );

    // 2. Create a User account for login
    const [teacherUser] = await User.create(
      [
        {
          name: data.name,
          email: data.email,
          password: data.password || DEFAULT_PASSWORD,
          role: 'teacher',
          phone: data.phone || '',
          schoolId,
        },
      ],
      session ? { session } : {}
    );

    // 3. Link the user account to the teacher record
    teacher.userId = teacherUser._id;
    await teacher.save(session ? { session } : {});

    // 4. Increment the school's teacher count
    await School.findByIdAndUpdate(
      schoolId,
      { $inc: { teachersCount: 1 } },
      session ? { session } : {}
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return teacher;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

/**
 * Delete a teacher and clean up associated records.
 */
const deleteTeacher = async (teacherId, schoolId) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) {
      throw new ApiError(404, 'Teacher not found');
    }

    // 1. Delete the teacher's User account
    if (teacher.userId) {
      await User.findByIdAndDelete(teacher.userId, session ? { session } : {});
    }
    if (teacher.email) {
      await User.deleteOne(
        { email: teacher.email, role: 'teacher', schoolId },
        session ? { session } : {}
      );
    }

    // 2. Deactivate any class teacher assignments
    await ClassTeacherAssignment.updateMany(
      { teacherId, schoolId, isActive: true },
      { isActive: false },
      session ? { session } : {}
    );

    // 3. Delete the Teacher document
    await Teacher.findByIdAndDelete(teacherId, session ? { session } : {});

    // 4. Decrement the school's teacher count
    await School.findByIdAndUpdate(
      schoolId,
      { $inc: { teachersCount: -1 } },
      session ? { session } : {}
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return { message: 'Teacher and all related records deleted successfully' };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

module.exports = { createTeacher, deleteTeacher };
