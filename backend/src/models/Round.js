const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema(
  {
    tournamentGameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentGame',
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed'],
      default: 'pending',
    },
    byePlayerId: {
      type: String,
      default: null, // participantId who got the bye
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Round', roundSchema);
