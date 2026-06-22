const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
    },
    userType: {
      type: String,
      enum: ['committee', 'participant'],
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    qrCodeScanned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one attendance log per user/participant per day
attendanceSchema.index({ date: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $exists: true } } });
attendanceSchema.index({ date: 1, participantId: 1 }, { unique: true, partialFilterExpression: { participantId: { $exists: true } } });

module.exports = mongoose.model('Attendance', attendanceSchema);
