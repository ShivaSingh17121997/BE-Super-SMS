const asyncHandler = require('../middleware/asyncHandler');
const authService = require('../services/authService');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
  });
});

/**
 * @desc    Onboard a new school with admin account
 * @route   POST /api/auth/onboard
 * @access  Public
 */
const onboard = asyncHandler(async (req, res) => {
  const { school, admin } = req.body;

  if (!school || !admin) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both school and admin details',
    });
  }

  const result = await authService.onboardSchool(school, admin);

  res.status(201).json({
    success: true,
    token: result.token,
    user: result.user,
    school: result.school,
  });
});

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

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
    const mongoose = require('mongoose');
    const Student = mongoose.models.Student || mongoose.model('Student');
    const query = user.role === 'student' ? { userId: user._id } : { parentEmail: user.email };
    const student = await Student.findOne(query);
    if (student) {
      baseUser.class = student.class;
      baseUser.section = student.section;
      baseUser.studentId = student._id;
    }
  } else if (user.role === 'teacher') {
    const mongoose = require('mongoose');
    const Teacher = require('../models/Teacher');
    const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
    
    // Find the teacher profile
    const teacher = await Teacher.findOne({ userId: user._id });
    if (teacher) {
      // Check if they are a class teacher
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

  res.status(200).json({
    success: true,
    user: baseUser,
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, avatar },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || null,
      isActive: user.isActive,
      phone: user.phone,
      avatar: user.avatar,
    },
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

/**
 * @desc    Reset another user's password (Admin only)
 * @route   PUT /api/auth/reset-password/:id
 * @access  Private (Super-Admin or School-Admin)
 */
const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const targetUserId = req.params.id;

  if (!newPassword) {
    throw new ApiError(400, 'Please provide a new password');
  }

  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  // Permission Check:
  // 1. Super-admin can reset anyone
  // 2. School-admin can only reset users in their own school
  if (req.user.role !== 'super-admin') {
    if (req.user.role !== 'school-admin') {
      throw new ApiError(403, 'Only administrators can reset passwords');
    }
    
    if (targetUser.schoolId?.toString() !== req.user.schoolId?.toString()) {
      throw new ApiError(403, 'You can only reset passwords for users in your own school');
    }
  }

  targetUser.password = newPassword;
  await targetUser.save();

  res.status(200).json({ 
    success: true, 
    message: `Password for ${targetUser.name} has been reset successfully` 
  });
});

module.exports = { login, onboard, getMe, updateProfile, changePassword, resetUserPassword };
