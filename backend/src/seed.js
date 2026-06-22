require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Settings = require('./models/Settings');

const seedData = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/indoor_sports_meet';
    await mongoose.connect(connStr);
    console.log('MongoDB connected for seeding...');

    // Clear existing if any
    const existingAdmin = await User.findOne({ userId: 'superadmin' });
    if (existingAdmin) {
      console.log('Super Admin user already exists. Skipping user seed...');
    } else {
      await User.create({
        userId: 'superadmin',
        name: 'Super Admin',
        email: 'superadmin@icai.org',
        mobileNumber: '9999999999',
        password: 'SuperAdmin@123', // will be hashed automatically by user pre-save hook
        role: 'super_admin',
        status: 'active'
      });
      console.log('Super Admin seeded successfully! ID: superadmin, Pass: SuperAdmin@123');
    }

    // Seed default settings
    const defaultSettings = [
      { key: 'app_name', value: 'ICAI Bathinda Indoor Sports Tournament' },
      { key: 'theme_primary', value: '#10b981' },
      { key: 'qr_verification_enabled', value: true }
    ];

    for (const setting of defaultSettings) {
      await Settings.findOneAndUpdate(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      );
    }
    console.log('Default settings seeded successfully!');

    mongoose.connection.close();
    console.log('Seeding complete. Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
