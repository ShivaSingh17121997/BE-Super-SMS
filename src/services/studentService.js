const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const School = require('../models/School');
const AttendanceRecord = require('../models/AttendanceRecord');
const FeeInvoice = require('../models/FeeInvoice');
const ExamResult = require('../models/ExamResult');
const ApiError = require('../utils/ApiError');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'school123';

/**
 * Create a student with automatic User account creation.
 * - Always creates 1 Student document
 * - Always creates 1 User document (role: 'student') for login
 * - Optionally creates 1 User document (role: 'parent') if parentEmail is provided
 * - All within a single transaction
 */
const createStudent = async (data, schoolId) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    // 1. Create the Student record
    const [student] = await Student.create(
      [{ ...data, schoolId }],
      session ? { session } : {}
    );

    // 2. Create a User account for the student (for login)
    if (data.email) {
      // Check if a user with this email already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new ApiError(400, `A user with email '${data.email}' already exists`);
      }

      const [studentUser] = await User.create(
        [
          {
            name: data.name,
            email: data.email,
            password: data.password || DEFAULT_PASSWORD,
            role: 'student',
            phone: data.phone || '',
            schoolId,
          },
        ],
        session ? { session } : {}
      );

      // Link the user account to the student record
      student.userId = studentUser._id;
      await student.save(session ? { session } : {});
    }

    // 3. If parentEmail is provided, create a parent User account
    if (data.parentEmail) {
      const existingParent = await User.findOne({ email: data.parentEmail });
      if (!existingParent) {
        await User.create(
          [
            {
              name: data.parentName || `Parent of ${data.name}`,
              email: data.parentEmail,
              password: data.parentPassword || DEFAULT_PASSWORD,
              role: 'parent',
              phone: data.parentPhone || '',
              schoolId,
            },
          ],
          session ? { session } : {}
        );
      }
      // If parent already exists, skip (they may have another child in the school)
    }

    // 4. Increment the school's student count
    await School.findByIdAndUpdate(
      schoolId,
      { $inc: { studentsCount: 1 } },
      session ? { session } : {}
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return student;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

/**
 * Delete a student and all associated records (cascading).
 * Removes: Student doc, student User, attendance records, fee invoices, exam results.
 */
const deleteStudent = async (studentId, schoolId) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    // 1. Delete the student's User account (if it exists)
    if (student.userId) {
      await User.findByIdAndDelete(student.userId, session ? { session } : {});
    }

    // Also try deleting by email match (safety net)
    if (student.email) {
      await User.deleteOne(
        { email: student.email, role: 'student', schoolId },
        session ? { session } : {}
      );
    }

    // 2. Delete related attendance records
    await AttendanceRecord.deleteMany({ studentId, schoolId }, session ? { session } : {});

    // 3. Delete related fee invoices
    await FeeInvoice.deleteMany({ studentId, schoolId }, session ? { session } : {});

    // 4. Delete related exam results
    await ExamResult.deleteMany({ studentId, schoolId }, session ? { session } : {});

    // 5. Delete the Student document itself
    await Student.findByIdAndDelete(studentId, session ? { session } : {});

    // 6. Decrement the school's student count
    await School.findByIdAndUpdate(
      schoolId,
      { $inc: { studentsCount: -1 } },
      session ? { session } : {}
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return { message: 'Student and all related records deleted successfully' };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

module.exports = { createStudent, deleteStudent };
