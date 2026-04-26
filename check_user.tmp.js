const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'superadmin@supersmp.com';
    const user = await User.findOne({ email }).select('+password');

    if (user) {
      console.log('✅ User found:');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Hashed Password:', user.password);
      console.log('   Is Active:', user.isActive);
    } else {
      console.log('❌ User not found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
};

check();
