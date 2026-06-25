const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: true,
    },
    tournamentGameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentGame',
      required: true,
    },
    matchNumber: {
      type: Number,
      default: 1,
    },
    player1Id: {
      type: String,
      default: null, // participantId
    },
    player2Id: {
      type: String,
      default: null, // participantId
    },
    winnerId: {
      type: String,
      default: null, // participantId
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'walkover', 'disqualified', 'withdrawn'],
      default: 'scheduled',
    },
    disqualifiedPlayerId: {
      type: String,
      default: null,
    },
    withdrawnPlayerId: {
      type: String,
      default: null,
    },
    score: {
      type: String,
      default: '',
    },
    isBye: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Match', matchSchema);
