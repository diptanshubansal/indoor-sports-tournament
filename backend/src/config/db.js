const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/indoor_sports_meet';
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed sample test users if they do not exist
    const User = require('../models/User');

    // Visitor: visitor01 / Visitor@123
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
      console.log('Test User visitor01 seeded successfully.');
    }

    // Committee: committee01 / Committee@123
    const committee = await User.findOne({ userId: 'committee01' });
    if (!committee) {
      await User.create({
        userId: 'committee01',
        name: 'Committee 01',
        email: 'committee01@icai-sports.com',
        mobileNumber: '7009291467',
        password: 'Committee@123',
        role: 'viewer', // Viewer role represents committee staff members
        status: 'active'
      });
      console.log('Test User committee01 seeded successfully.');
    }

    // Admin: admin01 / Admin@123
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
      console.log('Test User admin01 seeded successfully.');
    }

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
