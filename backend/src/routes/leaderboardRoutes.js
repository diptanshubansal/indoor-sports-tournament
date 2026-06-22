const express = require('express');
const router = express.Router();
const Leaderboard = require('../models/Leaderboard');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { getStrategy } = require('../games/gameRegistry');
const { logAudit } = require('../middleware/auditLogger');

// Helper to recalculate ranks inside a tournament
const updateRanks = async (tournamentId) => {
  const standings = await Leaderboard.find({ tournamentId })
    .sort({ points: -1, wins: -1, netScore: -1 });

  for (let i = 0; i < standings.length; i++) {
    standings[i].rank = i + 1;
    await standings[i].save();
  }
};

// @route   GET /api/leaderboard
// @desc    Get leaderboard for a tournament
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID parameter is required' });
    }

    const leaderboard = await Leaderboard.find({ tournamentId })
      .populate('teamId', 'name members captainId teamManager')
      .sort({ rank: 1 });

    res.json({ success: true, count: leaderboard.length, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leaderboard/match-result
// @desc    Post match score outcome to update standings
// @access  Private (Super Admin, Admin)
router.post('/match-result', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { tournamentId, teamAId, teamBId, scoreA, scoreB, winnerId, isDraw } = req.body;

    if (!tournamentId || !teamAId || !teamBId) {
      return res.status(400).json({ success: false, message: 'Please provide tournament and team references' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const strategy = getStrategy(tournament.gameType);
    const winResult = winnerId === teamAId ? 'A' : (winnerId === teamBId ? 'B' : 'draw');
    const drawFlag = isDraw || winResult === 'draw';

    const pointsAlloc = strategy.calculatePoints(winResult, drawFlag);
    const netScores = strategy.calculateNetScore(Number(scoreA || 0), Number(scoreB || 0));

    // Get or Create team standings
    let standingA = await Leaderboard.findOne({ tournamentId, teamId: teamAId });
    if (!standingA) standingA = await Leaderboard.create({ tournamentId, teamId: teamAId });

    let standingB = await Leaderboard.findOne({ tournamentId, teamId: teamBId });
    if (!standingB) standingB = await Leaderboard.create({ tournamentId, teamId: teamBId });

    // Update standing A
    standingA.matchesPlayed += 1;
    standingA.points += pointsAlloc.pointsA;
    standingA.wins += pointsAlloc.winsA;
    standingA.losses += pointsAlloc.lossesA;
    standingA.draws += pointsAlloc.drawsA;
    standingA.netScore += netScores.netA;
    if (standingA.customStats) {
      standingA.customStats.lastScore = scoreA;
    } else {
      standingA.customStats = { lastScore: scoreA };
    }
    standingA.markModified('customStats');
    await standingA.save();

    // Update standing B
    standingB.matchesPlayed += 1;
    standingB.points += pointsAlloc.pointsB;
    standingB.wins += pointsAlloc.winsB;
    standingB.losses += pointsAlloc.lossesB;
    standingB.draws += pointsAlloc.drawsB;
    standingB.netScore += netScores.netB;
    if (standingB.customStats) {
      standingB.customStats.lastScore = scoreB;
    } else {
      standingB.customStats = { lastScore: scoreB };
    }
    standingB.markModified('customStats');
    await standingB.save();

    // Recalculate ranks
    await updateRanks(tournamentId);

    const teamA = await Team.findById(teamAId);
    const teamB = await Team.findById(teamBId);
    const teamAName = teamA ? teamA.name : 'Team A';
    const teamBName = teamB ? teamB.name : 'Team B';

    await logAudit({
      req,
      action: 'create',
      details: `Reported Match: ${teamAName} vs ${teamBName} (${scoreA}-${scoreB}) in tournament ${tournament.name}`,
    });

    res.json({
      success: true,
      message: 'Match results successfully recorded and leaderboard updated!',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leaderboard/initialize/:tournamentId
// @desc    Initialize leaderboard entries for all teams in tournament
// @access  Private (Super Admin, Admin)
router.post('/initialize/:tournamentId', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const teams = await Team.find({ tournamentId });

    for (let team of teams) {
      await Leaderboard.findOneAndUpdate(
        { tournamentId, teamId: team._id },
        {
          $setOnInsert: {
            rank: 0,
            points: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            matchesPlayed: 0,
            netScore: 0,
            customStats: {}
          }
        },
        { upsert: true }
      );
    }

    await updateRanks(tournamentId);

    res.json({ success: true, message: 'Leaderboard initialized/synced for all teams' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leaderboard/reset/:tournamentId
// @desc    Reset points/matches for all teams in tournament
// @access  Private (Super Admin, Admin)
router.post('/reset/:tournamentId', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await Leaderboard.updateMany(
      { tournamentId },
      {
        $set: {
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          matchesPlayed: 0,
          netScore: 0,
          customStats: {}
        }
      }
    );

    await updateRanks(tournamentId);

    await logAudit({
      req,
      action: 'update',
      details: `Reset leaderboard statistics for tournament ID: ${tournamentId}`,
    });

    res.json({ success: true, message: 'Leaderboard standings reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
