/**
 * CLI Seed Script — run with: npm run seed
 * Creates the Super Admin user if not already present.
 */
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

const seedSuperAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const email = 'superadmin@supersmp.com';
    const existing = await User.findOne({ email });

    if (existing) {
      console.log('ℹ️  Super Admin already exists:', existing.email);
      process.exit(0);
    }

    const superAdmin = await User.create({
      name: 'Super Admin',
      email,
      password: 'admin123',
      role: 'super-admin',
      isActive: true,
    });

    console.log('🎉 Super Admin created successfully!');
    console.log(`   Email:    ${superAdmin.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role:     ${superAdmin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
