const mongoose = require('mongoose');

const bracketSchema = new mongoose.Schema(
  {
    tournamentGameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentGame',
      required: true,
    },
    structure: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bracket', bracketSchema);
