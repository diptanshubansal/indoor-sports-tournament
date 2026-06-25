const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Models
const Tournament = require('../models/Tournament');
const TournamentGame = require('../models/TournamentGame');
const Round = require('../models/Round');
const Match = require('../models/Match');
const Bracket = require('../models/Bracket');
const Participant = require('../models/Participant');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');
const { createKnockoutRound } = require('../games/knockoutEngine');

// Middlewares
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

const completedMatchStatuses = ['completed', 'walkover', 'disqualified', 'withdrawn'];

const isMatchComplete = (match) => completedMatchStatuses.includes(match.status);

const assertChessGame = (game, res) => {
  if (game.gameName !== 'Chess') {
    res.status(400).json({ success: false, message: 'Phase 4A supports Chess fixtures only' });
    return false;
  }
  return true;
};

const buildPlayerMap = async (gameName) => {
  const participants = await Participant.find({ enrolledGames: gameName });
  const playerMap = {};
  participants.forEach((p) => {
    playerMap[p.participantId] = p.name;
  });
  return playerMap;
};

// @route   POST /api/tournament-engine/games
// @desc    Associate a game with a tournament
// @access  Private (Super Admin, Admin)
router.post('/games', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { tournamentId, gameName } = req.body;
    if (!tournamentId || !gameName) {
      return res.status(400).json({ success: false, message: 'tournamentId and gameName are required' });
    }
    if (gameName !== 'Chess') {
      return res.status(400).json({ success: false, message: 'Only Chess engine is available in Phase 4A' });
    }

    // Check if association already exists
    let tourneyGame = await TournamentGame.findOne({ tournamentId, gameName });
    if (tourneyGame) {
      return res.json({ success: true, data: tourneyGame });
    }

    tourneyGame = await TournamentGame.create({
      tournamentId,
      gameName,
      status: 'Draft'
    });

    await logAudit({
      req,
      action: 'create',
      details: `Associated game '${gameName}' with tournament ID: ${tournamentId}`,
    });

    res.status(201).json({ success: true, data: tourneyGame });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tournament-engine/games/:tournamentId
// @desc    Get all games associated with a tournament
// @access  Private (All roles)
router.get('/games/:tournamentId', protect, async (req, res) => {
  try {
    const games = await TournamentGame.find({ tournamentId: req.params.tournamentId });
    res.json({ success: true, data: games });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tournament-engine/game-details/:id
// @desc    Get details of a single tournament game
// @access  Private (All roles)
router.get('/game-details/:id', protect, async (req, res) => {
  try {
    const game = await TournamentGame.findById(req.params.id).populate('tournamentId');
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }
    res.json({ success: true, data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tournament-engine/games/:id/eligible-players
// @desc    Get active participants eligible for this tournament game
// @access  Private (All roles)
router.get('/games/:id/eligible-players', protect, async (req, res) => {
  try {
    const game = await TournamentGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }

    const participants = await Participant.find({
      enrolledGames: game.gameName,
      status: 'active',
    }).sort({ participantId: 1 });

    res.json({
      success: true,
      count: participants.length,
      data: participants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/tournament-engine/games/:id/status
// @desc    Update tournament game status
// @access  Private (Super Admin, Admin)
router.put('/games/:id/status', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const game = await TournamentGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }

    const oldStatus = game.status;
    game.status = status;
    await game.save();

    await logAudit({
      req,
      action: 'update',
      details: `Updated game '${game.gameName}' status from '${oldStatus}' to '${status}'`,
    });

    res.json({ success: true, data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tournament-engine/games/:id/generate-fixtures
// @desc    Generate Round 1 fixtures
// @access  Private (Super Admin, Admin)
router.post('/games/:id/generate-fixtures', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const game = await TournamentGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }
    if (!assertChessGame(game, res)) return;

    // Pick all participants enrolled in this game
    const participants = await Participant.find({
      enrolledGames: 'Chess',
      status: 'active'
    });

    if (participants.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 registered participants are required to generate fixtures' });
    }

    // Delete existing rounds and matches for this game to allow regeneration
    const oldRounds = await Round.find({ tournamentGameId: game._id });
    for (const r of oldRounds) {
      await Match.deleteMany({ roundId: r._id });
    }
    await Round.deleteMany({ tournamentGameId: game._id });
    await Bracket.deleteMany({ tournamentGameId: game._id });

    const roundSetup = createKnockoutRound({
      players: participants.map(p => p.participantId),
      byeHistory: [],
    });
    game.byeHistory = roundSetup.byePlayerId ? [roundSetup.byePlayerId] : [];
    game.champion = null;
    game.runnerUp = null;
    await game.save();

    // Create Round 1
    const round = await Round.create({
      tournamentGameId: game._id,
      roundNumber: 1,
      status: 'running',
      byePlayerId: roundSetup.byePlayerId
    });

    // Create matches
    const matchesToCreate = roundSetup.matches.map((match) => ({
      ...match,
      roundId: round._id,
      tournamentGameId: game._id,
    }));

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    game.status = 'Tournament Running';
    await game.save();

    await logAudit({
      req,
      action: 'create',
      details: `Generated Round 1 fixtures for '${game.gameName}'. Total players: ${participants.length}. Bye: ${roundSetup.byePlayerId || 'None'}`,
    });

    res.json({ success: true, message: 'Round 1 fixtures generated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tournament-engine/matches/:id/winner
// @desc    Enter winner for a match
// @access  Private (Super Admin, Admin)
router.post('/matches/:id/winner', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { winnerId, score } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    const game = await TournamentGame.findById(match.tournamentGameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }
    if (!assertChessGame(game, res)) return;

    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      return res.status(400).json({ success: false, message: 'Winner must be one of the match participants' });
    }

    match.winnerId = winnerId;
    match.score = score || '';
    match.status = 'completed';
    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Match ${match._id}: Set winner to ${winnerId} (Score: ${score || 'N/A'})`,
    });

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tournament-engine/games/:id/next-round
// @desc    Generate next knockout round fixtures
// @access  Private (Super Admin, Admin)
router.post('/games/:id/next-round', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const game = await TournamentGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }
    if (!assertChessGame(game, res)) return;

    // Find current active round
    const activeRound = await Round.findOne({ tournamentGameId: game._id }).sort({ roundNumber: -1 });
    if (!activeRound) {
      return res.status(400).json({ success: false, message: 'No active rounds found' });
    }

    // Check if all matches in active round are completed
    const roundMatches = await Match.find({ roundId: activeRound._id }).sort({ matchNumber: 1, createdAt: 1 });
    const incompleteMatches = roundMatches.filter((match) => !isMatchComplete(match));
    if (incompleteMatches.length > 0) {
      return res.status(400).json({ success: false, message: 'Please complete all matches in the current round first' });
    }

    // Collect all winners from active round
    const winners = roundMatches.map(m => m.winnerId).filter(Boolean);

    // Add Bye player if there was one
    if (activeRound.byePlayerId) {
      winners.push(activeRound.byePlayerId);
    }

    // If only 1 player remains, we have a champion!
    if (winners.length === 1) {
      const championId = winners[0];
      
      // Determine runner-up (the other finalist)
      // The last match of the last round contains the champion and the runner-up
      const lastMatch = roundMatches.find(m => m.winnerId === championId);
      let runnerUpId = null;
      if (lastMatch) {
        runnerUpId = lastMatch.player1Id === championId ? lastMatch.player2Id : lastMatch.player1Id;
      }

      game.status = 'Tournament Completed';
      game.champion = championId;
      game.runnerUp = runnerUpId;
      await game.save();

      // Close the round status
      activeRound.status = 'completed';
      await activeRound.save();

      // Store in Leaderboards
      const pChamp = await Participant.findOne({ participantId: championId });
      const pRun = await Participant.findOne({ participantId: runnerUpId });

      // Save to Leaderboard DB
      await Leaderboard.findOneAndUpdate(
        { tournamentId: game.tournamentId, gameName: game.gameName },
        {
          goldWinner: pChamp ? pChamp.name : championId,
          silverWinner: pRun ? pRun.name : runnerUpId,
        },
        { upsert: true }
      );

      await logAudit({
        req,
        action: 'update',
        details: `Tournament game '${game.gameName}' completed. Champion: ${championId}, Runner-up: ${runnerUpId}`,
      });

      return res.json({
        success: true,
        completed: true,
        champion: championId,
        runnerUp: runnerUpId,
        message: 'Tournament Completed! Champion and Runner-up are finalized.'
      });
    }

    const roundSetup = createKnockoutRound({
      players: winners,
      byeHistory: game.byeHistory || [],
    });

    if (roundSetup.byePlayerId) {
      game.byeHistory = [...(game.byeHistory || []), roundSetup.byePlayerId];
      await game.save();
    }

    // Complete current round
    activeRound.status = 'completed';
    await activeRound.save();

    // Create next Round
    const nextRoundNumber = activeRound.roundNumber + 1;
    const nextRound = await Round.create({
      tournamentGameId: game._id,
      roundNumber: nextRoundNumber,
      status: 'running',
      byePlayerId: roundSetup.byePlayerId
    });

    // Create matches
    const matchesToCreate = roundSetup.matches.map((match) => ({
      ...match,
      roundId: nextRound._id,
      tournamentGameId: game._id,
    }));

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    await logAudit({
      req,
      action: 'create',
      details: `Generated Round ${nextRoundNumber} for '${game.gameName}'. Advancing: ${winners.length}. Bye: ${roundSetup.byePlayerId || 'None'}`,
    });

    res.json({ success: true, message: `Round ${nextRoundNumber} generated successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tournament-engine/games/:id/bracket
// @desc    Get bracket tree data (all rounds & matches)
// @access  Private (All roles)
router.get('/games/:id/bracket', protect, async (req, res) => {
  try {
    const game = await TournamentGame.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game not found' });
    }
    
    // For non-Chess games in Phase 4A, return an empty bracket tree instead of throwing an error
    if (game.gameName !== 'Chess') {
      return res.json({ success: true, data: [] });
    }

    const rounds = await Round.find({ tournamentGameId: req.params.id }).sort({ roundNumber: 1 });
    const matches = await Match.find({ tournamentGameId: req.params.id }).sort({ matchNumber: 1, createdAt: 1 });

    // Fetch participant info for rendering names
    const playerMap = await buildPlayerMap(game.gameName);

    const roundsWithMatches = rounds.map(r => {
      const roundMatches = matches.filter(m => m.roundId.toString() === r._id.toString());
      return {
        _id: r._id,
        roundNumber: r.roundNumber,
        status: r.status,
        byePlayerId: r.byePlayerId,
        byePlayerName: playerMap[r.byePlayerId] || null,
        matches: roundMatches.map(m => ({
          _id: m._id,
          matchNumber: m.matchNumber,
          player1Id: m.player1Id,
          player1Name: playerMap[m.player1Id] || m.player1Id || 'TBD',
          player2Id: m.player2Id,
          player2Name: playerMap[m.player2Id] || m.player2Id || 'TBD',
          winnerId: m.winnerId,
          status: m.status,
          score: m.score,
          isBye: m.isBye,
          disqualifiedPlayerId: m.disqualifiedPlayerId,
          withdrawnPlayerId: m.withdrawnPlayerId,
        }))
      };
    });

    res.json({ success: true, data: roundsWithMatches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SUPER ADMIN OVERRIDE ENDPOINTS (AUDITED)
// ==========================================

// 1. Swap two players in fixtures
router.post('/override/swap-players', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { match1Id, match2Id, player1Id, player2Id } = req.body;
    
    const m1 = await Match.findById(match1Id);
    const m2 = await Match.findById(match2Id);

    if (!m1 || !m2) {
      return res.status(404).json({ success: false, message: 'Matches not found' });
    }

    // Perform swap logic
    if (m1.player1Id === player1Id) m1.player1Id = player2Id;
    else if (m1.player2Id === player1Id) m1.player2Id = player2Id;

    if (m2.player1Id === player2Id) m2.player1Id = player1Id;
    else if (m2.player2Id === player2Id) m2.player2Id = player1Id;

    await m1.save();
    await m2.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin swapped player ${player1Id} with ${player2Id} between Match ${match1Id} and Match ${match2Id}`,
    });

    res.json({ success: true, message: 'Players swapped successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Replace a player in a fixture
router.post('/override/replace-player', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, oldPlayerId, newPlayerId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.player1Id === oldPlayerId) {
      match.player1Id = newPlayerId;
    } else if (match.player2Id === oldPlayerId) {
      match.player2Id = newPlayerId;
    } else {
      return res.status(400).json({ success: false, message: 'Player to replace is not in this match' });
    }

    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin replaced player ${oldPlayerId} with ${newPlayerId} in Match ${matchId}`,
    });

    res.json({ success: true, message: 'Player replaced successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Remove a player from a match
router.post('/override/remove-player', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, playerId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.player1Id === playerId) {
      match.player1Id = null;
    } else if (match.player2Id === playerId) {
      match.player2Id = null;
    } else {
      return res.status(400).json({ success: false, message: 'Player not in this match' });
    }

    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin removed player ${playerId} from Match ${matchId}`,
    });

    res.json({ success: true, message: 'Player removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Add player to a match in the current round
router.post('/override/add-player', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, playerId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!match.player1Id) {
      match.player1Id = playerId;
    } else if (!match.player2Id) {
      match.player2Id = playerId;
    } else {
      return res.status(400).json({ success: false, message: 'Match is already full' });
    }

    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin added player ${playerId} to Match ${matchId}`,
    });

    res.json({ success: true, message: 'Player added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Change the bye player of the current round
router.post('/override/change-bye', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { roundId, newByePlayerId } = req.body;
    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    const oldBye = round.byePlayerId;
    round.byePlayerId = newByePlayerId;
    await round.save();

    // Add to game byeHistory
    const game = await TournamentGame.findById(round.tournamentGameId);
    if (game) {
      const roundsWithByes = await Round.find({
        tournamentGameId: game._id,
        _id: { $ne: round._id },
        byePlayerId: { $ne: null },
      });
      game.byeHistory = [...new Set([
        ...roundsWithByes.map((item) => item.byePlayerId).filter(Boolean),
        newByePlayerId,
      ])];
      await game.save();
    }

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin changed Round ${round.roundNumber} bye from ${oldBye || 'None'} to ${newByePlayerId}`,
    });

    res.json({ success: true, message: 'Bye player changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Regenerate fixtures for a specific round
router.post('/override/regenerate-round', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { roundId } = req.body;
    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    const game = await TournamentGame.findById(round.tournamentGameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game association not found' });
    }
    if (!assertChessGame(game, res)) return;

    const existingMatches = await Match.find({ roundId: round._id });
    if (existingMatches.some((match) => isMatchComplete(match))) {
      return res.status(400).json({ success: false, message: 'Current round can only be regenerated before result entry' });
    }

    // Get list of players who should be in this round
    let players = [];
    if (round.roundNumber === 1) {
      // All enrolled active players
      const allParts = await Participant.find({ enrolledGames: game.gameName, status: 'active' });
      players = allParts.map(p => p.participantId);
    } else {
      // Winners from previous round
      const prevRound = await Round.findOne({ tournamentGameId: game._id, roundNumber: round.roundNumber - 1 });
      if (!prevRound) {
        return res.status(400).json({ success: false, message: 'Previous round not found to fetch players' });
      }
      const prevMatches = await Match.find({ roundId: prevRound._id });
      players = prevMatches.map(m => m.winnerId).filter(Boolean);
      if (prevRound.byePlayerId) {
        players.push(prevRound.byePlayerId);
      }
    }

    if (players.length < 2) {
      return res.status(400).json({ success: false, message: 'Not enough players to regenerate fixtures' });
    }

    const previousByeRounds = await Round.find({
      tournamentGameId: game._id,
      _id: { $ne: round._id },
      byePlayerId: { $ne: null },
    });
    const previousByeHistory = previousByeRounds.map((item) => item.byePlayerId).filter(Boolean);
    const roundSetup = createKnockoutRound({
      players,
      byeHistory: previousByeHistory,
    });

    // Delete existing matches for this round
    await Match.deleteMany({ roundId: round._id });

    round.byePlayerId = roundSetup.byePlayerId;
    round.status = 'running';
    await round.save();

    // Create matches
    const matchesToCreate = roundSetup.matches.map((match) => ({
      ...match,
      roundId: round._id,
      tournamentGameId: game._id,
    }));

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    game.byeHistory = [...new Set([
      ...previousByeHistory,
      roundSetup.byePlayerId,
    ].filter(Boolean))];
    game.champion = null;
    game.runnerUp = null;
    game.status = 'Tournament Running';
    await game.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin regenerated Round ${round.roundNumber} fixtures for '${game.gameName}'`,
    });

    res.json({ success: true, message: `Round ${round.roundNumber} regenerated successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Edit winner manually or correct match details
router.post('/override/edit-winner', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, winnerId, score } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const oldWinner = match.winnerId;
    match.winnerId = winnerId;
    match.score = score || '';
    match.status = 'completed';
    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin overrode match winner for Match ${matchId} from ${oldWinner || 'None'} to ${winnerId}`,
    });

    res.json({ success: true, message: 'Match winner overrode successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Reopen a completed match
router.post('/override/reopen-match', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.winnerId = null;
    match.status = 'scheduled';
    match.score = '';
    await match.save();

    // Reopen corresponding round if it was completed
    const round = await Round.findById(match.roundId);
    if (round && round.status === 'completed') {
      round.status = 'running';
      await round.save();
    }

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin reopened completed Match ${matchId}`,
    });

    res.json({ success: true, message: 'Match reopened successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Reopen a completed round (sets status to running/pending and clears future rounds)
router.post('/override/reopen-round', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { roundId } = req.body;
    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }

    const game = await TournamentGame.findById(round.tournamentGameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Delete future rounds and matches
    const futureRounds = await Round.find({
      tournamentGameId: game._id,
      roundNumber: { $gt: round.roundNumber }
    });

    for (const fr of futureRounds) {
      await Match.deleteMany({ roundId: fr._id });
    }
    await Round.deleteMany({
      tournamentGameId: game._id,
      roundNumber: { $gt: round.roundNumber }
    });

    round.status = 'running';
    await round.save();

    // Revert game status if completed
    if (game.status === 'Tournament Completed') {
      game.status = 'Tournament Running';
      game.champion = null;
      game.runnerUp = null;
      await game.save();
    }

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin reopened completed Round ${round.roundNumber} and deleted subsequent rounds.`,
    });

    res.json({ success: true, message: `Round ${round.roundNumber} reopened successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 10. Walkover winner assignment
router.post('/override/walkover', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, winnerId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.winnerId = winnerId;
    match.status = 'walkover';
    match.score = 'Walkover';
    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin assigned Walkover victory to player ${winnerId} in Match ${matchId}`,
    });

    res.json({ success: true, message: 'Walkover assigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 11. Mark participant as Disqualified
router.post('/override/disqualify', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, disqualifiedPlayerId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    let winnerId = null;
    if (match.player1Id === disqualifiedPlayerId) {
      winnerId = match.player2Id;
    } else if (match.player2Id === disqualifiedPlayerId) {
      winnerId = match.player1Id;
    }

    match.winnerId = winnerId;
    match.disqualifiedPlayerId = disqualifiedPlayerId;
    match.status = 'disqualified';
    match.score = 'Disqualification';
    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin disqualified player ${disqualifiedPlayerId} in Match ${matchId}. Winner: ${winnerId}`,
    });

    res.json({ success: true, message: 'Disqualification recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 12. Mark participant as Withdrawn
router.post('/override/withdraw', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { matchId, withdrawnPlayerId } = req.body;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    await logAudit({
      req,
      action: 'update',
      details: `Super Admin marked player ${withdrawnPlayerId} as withdrawn in Match ${matchId}. Winner: ${winnerId}`,
    });

    res.json({ success: true, message: 'Withdrawal recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// CHESS KO TOURNAMENT ENGINE SPECIFIC APIs
// ==========================================

// 1. GET /api/tournament-engine/chess/participants
// Return all active participants where enrolledGames includes Chess
router.get('/chess/participants', protect, async (req, res) => {
  try {
    const participants = await Participant.find({
      enrolledGames: 'Chess',
      status: 'active',
    }).sort({ participantId: 1 });

    res.json({
      success: true,
      count: participants.length,
      data: participants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/tournament-engine/chess/generate-fixtures
// Input: tournamentId
router.post('/chess/generate-fixtures', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'tournamentId is required' });
    }

    let game = await TournamentGame.findOne({ tournamentId, gameName: 'Chess' });
    if (!game) {
      game = await TournamentGame.create({
        tournamentId,
        gameName: 'Chess',
        status: 'Draft',
        byeHistory: []
      });
    }

    const participants = await Participant.find({
      enrolledGames: 'Chess',
      status: 'active'
    });

    if (participants.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 registered participants are required to generate fixtures' });
    }

    // Delete existing rounds and matches for this game to allow regeneration
    const oldRounds = await Round.find({ tournamentGameId: game._id });
    for (const r of oldRounds) {
      await Match.deleteMany({ roundId: r._id });
    }
    await Round.deleteMany({ tournamentGameId: game._id });
    await Bracket.deleteMany({ tournamentGameId: game._id });

    // Shuffling is handled inside createKnockoutRound helper by default
    const roundSetup = createKnockoutRound({
      players: participants.map(p => p.participantId),
      byeHistory: [],
    });

    game.byeHistory = roundSetup.byePlayerId ? [roundSetup.byePlayerId] : [];
    game.champion = null;
    game.runnerUp = null;
    game.status = 'Tournament Running';
    await game.save();

    // Create Round 1
    const round = await Round.create({
      tournamentGameId: game._id,
      roundNumber: 1,
      status: 'running',
      byePlayerId: roundSetup.byePlayerId
    });

    // Create matches
    const matchesToCreate = roundSetup.matches.map((match) => ({
      ...match,
      roundId: round._id,
      tournamentGameId: game._id,
    }));

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    await logAudit({
      req,
      action: 'create',
      details: `Generated Round 1 Chess fixtures. Total players: ${participants.length}. Bye: ${roundSetup.byePlayerId || 'None'}`,
    });

    res.json({
      success: true,
      message: 'Round 1 fixtures generated successfully',
      tournamentGameId: game._id
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/tournament-engine/chess/match/:matchId/winner
// Input: winnerParticipantId
router.post('/chess/match/:matchId/winner', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { winnerParticipantId, score } = req.body;
    if (!winnerParticipantId) {
      return res.status(400).json({ success: false, message: 'winnerParticipantId is required' });
    }

    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const game = await TournamentGame.findById(match.tournamentGameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game space not found' });
    }
    if (!assertChessGame(game, res)) return;

    if (winnerParticipantId !== match.player1Id && winnerParticipantId !== match.player2Id) {
      return res.status(400).json({ success: false, message: 'Winner must be one of the match participants' });
    }

    match.winnerId = winnerParticipantId;
    match.score = score || '';
    match.status = 'completed';
    await match.save();

    await logAudit({
      req,
      action: 'update',
      details: `Match ${match._id}: Set Chess winner to ${winnerParticipantId} (Score: ${score || 'N/A'})`,
    });

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /api/tournament-engine/chess/generate-next-round
// Input: tournamentId, currentRoundNumber
router.post('/chess/generate-next-round', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { tournamentId, currentRoundNumber } = req.body;
    if (!tournamentId || !currentRoundNumber) {
      return res.status(400).json({ success: false, message: 'tournamentId and currentRoundNumber are required' });
    }

    const game = await TournamentGame.findOne({ tournamentId, gameName: 'Chess' });
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game space not found for Chess' });
    }

    // Find the current active round
    const activeRound = await Round.findOne({
      tournamentGameId: game._id,
      roundNumber: currentRoundNumber
    });
    if (!activeRound) {
      return res.status(400).json({ success: false, message: `Round ${currentRoundNumber} not found` });
    }

    // Check if all matches in active round are completed
    const roundMatches = await Match.find({ roundId: activeRound._id });
    const incompleteMatches = roundMatches.filter((match) => !isMatchComplete(match));
    if (incompleteMatches.length > 0) {
      return res.status(400).json({ success: false, message: 'Please complete all matches in the current round first' });
    }

    // Collect all winners from active round
    const winners = roundMatches.map(m => m.winnerId).filter(Boolean);

    // Add bye player if there was one
    if (activeRound.byePlayerId) {
      winners.push(activeRound.byePlayerId);
    }

    // If only 1 player remains, we have a champion!
    if (winners.length === 1) {
      const championId = winners[0];
      
      // Determine runner-up (the other finalist)
      const lastMatch = roundMatches.find(m => m.winnerId === championId);
      let runnerUpId = null;
      if (lastMatch) {
        runnerUpId = lastMatch.player1Id === championId ? lastMatch.player2Id : lastMatch.player1Id;
      }

      game.status = 'Tournament Completed';
      game.champion = championId;
      game.runnerUp = runnerUpId;
      await game.save();

      // Close the round status
      activeRound.status = 'completed';
      await activeRound.save();

      // Store in Leaderboards
      const pChamp = await Participant.findOne({ participantId: championId });
      const pRun = await Participant.findOne({ participantId: runnerUpId });

      await Leaderboard.findOneAndUpdate(
        { tournamentId: game.tournamentId, gameName: game.gameName },
        {
          goldWinner: pChamp ? pChamp.name : championId,
          silverWinner: pRun ? pRun.name : runnerUpId,
        },
        { upsert: true }
      );

      await logAudit({
        req,
        action: 'update',
        details: `Tournament game Chess completed. Champion: ${championId}, Runner-up: ${runnerUpId}`,
      });

      return res.json({
        success: true,
        completed: true,
        champion: championId,
        runnerUp: runnerUpId,
        message: 'Tournament Completed! Champion and Runner-up are finalized.'
      });
    }

    const roundSetup = createKnockoutRound({
      players: winners,
      byeHistory: game.byeHistory || [],
    });

    if (roundSetup.byePlayerId) {
      game.byeHistory = [...(game.byeHistory || []), roundSetup.byePlayerId];
      await game.save();
    }

    // Complete current round
    activeRound.status = 'completed';
    await activeRound.save();

    // Create next Round
    const nextRoundNumber = activeRound.roundNumber + 1;
    const nextRound = await Round.create({
      tournamentGameId: game._id,
      roundNumber: nextRoundNumber,
      status: 'running',
      byePlayerId: roundSetup.byePlayerId
    });

    // Create matches
    const matchesToCreate = roundSetup.matches.map((match) => ({
      ...match,
      roundId: nextRound._id,
      tournamentGameId: game._id,
    }));

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    await logAudit({
      req,
      action: 'create',
      details: `Generated Round ${nextRoundNumber} Chess fixtures. Advancing: ${winners.length}. Bye: ${roundSetup.byePlayerId || 'None'}`,
    });

    res.json({ success: true, message: `Round ${nextRoundNumber} generated successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. GET /api/tournament-engine/chess/bracket/:tournamentId
router.get('/chess/bracket/:tournamentId', protect, async (req, res) => {
  try {
    const game = await TournamentGame.findOne({ tournamentId: req.params.tournamentId, gameName: 'Chess' });
    if (!game) {
      return res.status(404).json({ success: false, message: 'Tournament game space not found for Chess' });
    }

    const rounds = await Round.find({ tournamentGameId: game._id }).sort({ roundNumber: 1 });
    const matches = await Match.find({ tournamentGameId: game._id }).sort({ matchNumber: 1, createdAt: 1 });

    const playerMap = await buildPlayerMap(game.gameName);

    const roundBrackets = rounds.map((round) => {
      const roundMatches = matches
        .filter((m) => m.roundId.toString() === round._id.toString())
        .map((m) => ({
          _id: m._id,
          matchNumber: m.matchNumber,
          player1Id: m.player1Id,
          player1Name: playerMap[m.player1Id] || m.player1Id,
          player2Id: m.player2Id,
          player2Name: playerMap[m.player2Id] || m.player2Id,
          winnerId: m.winnerId,
          winnerName: m.winnerId ? (playerMap[m.winnerId] || m.winnerId) : null,
          score: m.score,
          status: m.status,
          isBye: m.isBye,
        }));

      return {
        _id: round._id,
        roundNumber: round.roundNumber,
        status: round.status,
        byePlayerId: round.byePlayerId,
        byePlayerName: round.byePlayerId ? (playerMap[round.byePlayerId] || round.byePlayerId) : null,
        matches: roundMatches,
      };
    });

    res.json({
      success: true,
      data: {
        rounds: roundBrackets,
        byeHistory: game.byeHistory || [],
        status: game.status,
        champion: game.champion,
        championName: game.champion ? (playerMap[game.champion] || game.champion) : null,
        runnerUp: game.runnerUp,
        runnerUpName: game.runnerUp ? (playerMap[game.runnerUp] || game.runnerUp) : null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. GET /api/tournament-engine/chess/my-status
router.get('/chess/my-status', protect, async (req, res) => {
  try {
    const playerID = req.user.userId.toUpperCase();
    const participant = await Participant.findOne({ participantId: playerID });
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant record not found' });
    }

    const game = await TournamentGame.findOne({ gameName: 'Chess' });
    if (!game) {
      return res.json({
        success: true,
        data: {
          currentRound: 0,
          opponent: null,
          matchStatus: 'Not Scheduled',
          byeStatus: 'No Bye',
          resultStatus: 'Pending'
        }
      });
    }

    const participantMatches = await Match.find({
      tournamentGameId: game._id,
      $or: [
        { player1Id: playerID },
        { player2Id: playerID }
      ]
    }).populate('roundId');

    let currentRound = 0;
    let opponent = null;
    let matchStatus = 'Not Scheduled';
    let byeStatus = 'No Bye';
    let resultStatus = 'Pending';

    const activeRound = await Round.findOne({ tournamentGameId: game._id }).sort({ roundNumber: -1 });
    
    const sortedMatches = participantMatches.sort((a, b) => {
      const aNum = a.roundId ? a.roundId.roundNumber : 0;
      const bNum = b.roundId ? b.roundId.roundNumber : 0;
      return bNum - aNum;
    });

    const latestMatch = sortedMatches[0];

    if (activeRound && activeRound.byePlayerId === playerID) {
      currentRound = activeRound.roundNumber;
      matchStatus = 'Bye';
      byeStatus = 'Bye - Advanced to next round';
      resultStatus = game.champion === playerID ? 'Champion' : 'Advanced';
    } else if (latestMatch && latestMatch.roundId) {
      currentRound = latestMatch.roundId.roundNumber;
      const opponentId = latestMatch.player1Id === playerID ? latestMatch.player2Id : latestMatch.player1Id;
      
      let opponentName = 'TBD';
      if (opponentId) {
        const opponentDoc = await Participant.findOne({ participantId: opponentId });
        opponentName = opponentDoc ? opponentDoc.name : opponentId;
      }
      opponent = opponentId ? `${opponentId} (${opponentName})` : 'TBD';

      if (latestMatch.winnerId) {
        if (latestMatch.winnerId === playerID) {
          matchStatus = 'Completed';
          resultStatus = game.champion === playerID ? 'Champion' : 'Won';
        } else {
          matchStatus = 'Completed';
          resultStatus = game.runnerUp === playerID ? 'Runner-Up' : 'Eliminated';
        }
      } else {
        matchStatus = 'Upcoming';
        resultStatus = 'Pending';
      }
    }

    if (game.status === 'Tournament Completed') {
      if (game.champion === playerID) {
        resultStatus = 'Champion';
        matchStatus = 'Completed';
      } else if (game.runnerUp === playerID) {
        resultStatus = 'Runner-Up';
        matchStatus = 'Completed';
      } else if (participantMatches.length > 0) {
        resultStatus = 'Eliminated';
        matchStatus = 'Completed';
      }
    }

    res.json({
      success: true,
      data: {
        currentRound,
        opponent,
        matchStatus,
        byeStatus,
        resultStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
