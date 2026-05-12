const mongoose = require('mongoose');
const User = require('../models/User');
const School = require('../models/School');
const generateToken = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');

/**
 * Login — authenticate user with email and password.
 * Returns user data shaped for the frontend + JWT token.
 */
const login = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  // Robust email handling (trim and lowercase)
  const normalizedEmail = email.trim().toLowerCase();
  
  console.log(`[Login Debug] Attempt for: ${normalizedEmail}`);

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    console.log(`[Login Debug] User not found for: ${normalizedEmail}`);
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated. Contact your administrator.');
  }

  const isMatch = await user.matchPassword(password);
  console.log(`[Login Debug] Password match result: ${isMatch}`);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = generateToken(user._id);

  const baseUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId || null,
    isActive: user.isActive,
    phone: user.phone,
    avatar: user.avatar,
  };

  if (user.role === 'student' || user.role === 'parent') {
    const Student = mongoose.models.Student || mongoose.model('Student');
    const query = user.role === 'student' ? { userId: user._id } : { parentEmail: user.email };
    const student = await Student.findOne(query);
    if (student) {
      baseUser.class = student.class;
      baseUser.section = student.section;
      baseUser.studentId = student._id;
    }
  } else if (user.role === 'teacher') {
    const Teacher = mongoose.models.Teacher || mongoose.model('Teacher');
    const ClassTeacherAssignment = mongoose.models.ClassTeacherAssignment || mongoose.model('ClassTeacherAssignment');
    
    const teacher = await Teacher.findOne({ userId: user._id });
    if (teacher) {
      const assignment = await ClassTeacherAssignment.findOne({ 
        teacherId: teacher._id, 
        isActive: true 
      });
      
      if (assignment) {
        baseUser.isClassTeacher = true;
        baseUser.class = assignment.class;
        baseUser.section = assignment.section;
      } else {
        baseUser.isClassTeacher = false;
      }
    }
  }

  // Return exactly what the frontend expects
  return {
    token,
    user: baseUser,
  };
};

/**
 * Onboard a new school — creates School + School Admin User in a transaction.
 */
const onboardSchool = async (schoolData, adminData) => {
  const useTransactions = process.env.DB_TRANSACTIONS !== 'false';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    // Check if school email already exists
    const existingSchool = await School.findOne({ email: schoolData.email });
    if (existingSchool) {
      throw new ApiError(400, 'A school with this email already exists');
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminData.email });
    if (existingUser) {
      throw new ApiError(400, 'A user with this email already exists');
    }

    // 1. Create the School
    const [school] = await School.create([schoolData], session ? { session } : {});

    // 2. Create the School Admin user, linked to the new school
    const [adminUser] = await User.create(
      [
        {
          name: adminData.name,
          email: adminData.email,
          password: adminData.password,
          role: 'school-admin',
          phone: adminData.phone || '',
          schoolId: school._id,
        },
      ],
      session ? { session } : {}
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    const token = generateToken(adminUser._id);

    return {
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        schoolId: adminUser.schoolId,
        isActive: adminUser.isActive,
      },
      school: school.toJSON(),
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

module.exports = { login, onboardSchool };
