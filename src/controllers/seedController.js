const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

/**
 * @desc    Seed the database with Super Admin credentials
 * @route   POST /api/seed
 * @access  Public (only in development, or idempotent in production)
 */
const seedDatabase = asyncHandler(async (req, res) => {
  const superAdminEmail = 'superadmin@supersmp.com';
  const superAdminPassword = 'admin123';

  // Check if super admin already exists
  const existing = await User.findOne({ email: superAdminEmail });

  if (existing) {
    return res.status(200).json({
      success: true,
      message: 'Super Admin already exists',
      user: {
        id: existing._id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
      },
    });
  }

  // Create the Super Admin
  const superAdmin = await User.create({
    name: 'Super Admin',
    email: superAdminEmail,
    password: superAdminPassword,
    role: 'super-admin',
    phone: '',
    isActive: true,
    // No schoolId for super-admin
  });

  res.status(201).json({
    success: true,
    message: 'Super Admin created successfully',
    user: {
      id: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
    },
  });
});

module.exports = { seedDatabase };
