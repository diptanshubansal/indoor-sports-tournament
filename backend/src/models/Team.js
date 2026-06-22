const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
      },
    ],
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
    },
    teamManager: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a team name is unique within a single tournament
teamSchema.index({ name: 1, tournamentId: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
