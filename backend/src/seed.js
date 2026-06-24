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

    // Seed Visitor User: visitor01 / Visitor@123
    const visitor = await User.findOne({ userId: 'visitor01' });
    if (!visitor) {
      await User.create({
        userId: 'visitor01',
        name: 'Visitor 01',
        email: 'visitor01@icai-sports.com',
        mobileNumber: '7009291467',
        password: 'Visitor@123',
        role: 'visitor',
        status: 'active'
      });
      console.log('Visitor user seeded successfully! ID: visitor01, Pass: Visitor@123');
    }

    // Seed Committee User: committee01 / Committee@123
    const committee = await User.findOne({ userId: 'committee01' });
    if (!committee) {
      await User.create({
        userId: 'committee01',
        name: 'Committee 01',
        email: 'committee01@icai-sports.com',
        mobileNumber: '7009291467',
        password: 'Committee@123',
        role: 'viewer',
        status: 'active'
      });
      console.log('Committee user seeded successfully! ID: committee01, Pass: Committee@123');
    }

    // Seed Admin User: admin01 / Admin@123
    const admin = await User.findOne({ userId: 'admin01' });
    if (!admin) {
      await User.create({
        userId: 'admin01',
        name: 'Admin 01',
        email: 'admin01@icai-sports.com',
        mobileNumber: '7009291467',
        password: 'Admin@123',
        role: 'admin',
        status: 'active'
      });
      console.log('Admin user seeded successfully! ID: admin01, Pass: Admin@123');
    }

    // Seed default settings
    const defaultSettings = [
      { key: 'app_name', value: 'Indoor Sports Tournament' },
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
