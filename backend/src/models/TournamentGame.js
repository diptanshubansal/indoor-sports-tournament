const mongoose = require('mongoose');

const tournamentGameSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    gameName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Registration Open', 'Registration Closed', 'Tournament Running', 'Tournament Completed'],
      default: 'Draft',
    },
    champion: {
      type: String,
      default: null, // participantId
    },
    runnerUp: {
      type: String,
      default: null, // participantId
    },
    byeHistory: {
      type: [String],
      default: [], // participantIds who got byes
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TournamentGame', tournamentGameSchema);
