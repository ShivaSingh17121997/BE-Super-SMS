const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const User = require('../models/User');
const School = require('../models/School');
const ApiError = require('../utils/ApiError');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'school123';

/**
 * Create a staff member with automatic User account creation.
 */
const createStaff = async (data, schoolId) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    // Check if email already exists
    if (data.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new ApiError(400, `A user with email '${data.email}' already exists`);
      }
    }

    // 1. Create the Staff record
    const [staff] = await Staff.create(
      [{ ...data, schoolId }],
      session ? { session } : {}
    );

    // 2. Create a User account for login (role will be 'teacher' or a generic role depending on requirements)
    // For this SMS, let's treat Staff as having a login role if they have an email.
    // However, the User model only has specific roles. I'll check the User model again.
    // Based on User.js: enum: ['super-admin', 'school-admin', 'principal', 'teacher', 'parent', 'student']
    // Since 'staff' isn't there, I might need to add it or use 'teacher' as a generic staff role.
    // But logically, Staff should have their own role or just be 'staff'.
    
    if (data.email) {
        const [staffUser] = await User.create(
          [
            {
              name: data.name,
              email: data.email,
              password: data.password || DEFAULT_PASSWORD,
              role: 'staff',
              phone: data.phone || '',
              schoolId,
            },
          ],
          session ? { session } : {}
        );
        
        staff.userId = staffUser._id;
        await staff.save(session ? { session } : {});
    }

    // 4. Increment the school's staff count (if School model tracks it)
    await School.findByIdAndUpdate(
      schoolId,
      { $inc: { staffCount: 1 } },
      session ? { session } : {}
    ).catch(() => {}); // Ignore if count field doesn't exist

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return staff;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

/**
 * Delete a staff member and clean up.
 */
const deleteStaff = async (staffId, schoolId) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const staff = await Staff.findOne({ _id: staffId, schoolId });
    if (!staff) throw new ApiError(404, 'Staff member not found');

    if (staff.userId) {
      await User.findByIdAndDelete(staff.userId, session ? { session } : {});
    }
    
    await Staff.findByIdAndDelete(staffId, session ? { session } : {});

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return { message: 'Staff member deleted' };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

module.exports = { createStaff, deleteStaff };
