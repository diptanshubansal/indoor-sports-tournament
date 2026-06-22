const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    rank: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    draws: {
      type: Number,
      default: 0,
    },
    matchesPlayed: {
      type: Number,
      default: 0,
    },
    netScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    customStats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique team entry per tournament
leaderboardSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
