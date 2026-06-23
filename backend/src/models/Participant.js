const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    participantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'Not Specified'],
      default: 'Not Specified',
    },
    collegeOrInstitute: {
      type: String,
      trim: true,
      default: 'Not Specified',
    },
    enrolledGames: {
      type: [String],
      default: [],
    },
    temporaryPassword: {
      type: String,
      default: '',
    },
    teamName: {
      type: String,
      trim: true,
      default: '',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Participant', participantSchema);
