const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Indoor Sports Tournament',
    },
    description: {
      type: String,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      default: 'ICAI Bathinda Branch',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    registrationStartDate: {
      type: Date,
      required: true,
    },
    registrationEndDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Registration Open', 'Registration Closed', 'Tournament Running', 'Tournament Completed'],
      default: 'Draft',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    gameType: {
      type: String,
      required: true,
      default: 'generic',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Tournament', tournamentSchema);
