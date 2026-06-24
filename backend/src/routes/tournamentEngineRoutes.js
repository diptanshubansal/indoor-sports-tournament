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

// Middlewares
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// Helper to shuffle array
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

    // Pick all participants enrolled in this game
    const participants = await Participant.find({
      enrolledGames: game.gameName,
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

    // Shuffled participants
    const playerIds = shuffle(participants.map(p => p.participantId));
    let byePlayerId = null;

    if (playerIds.length % 2 !== 0) {
      // Assign one random Bye
      const randomIndex = Math.floor(Math.random() * playerIds.length);
      byePlayerId = playerIds.splice(randomIndex, 1)[0];
      game.byeHistory = [byePlayerId];
      await game.save();
    } else {
      game.byeHistory = [];
      await game.save();
    }

    // Create Round 1
    const round = await Round.create({
      tournamentGameId: game._id,
      roundNumber: 1,
      status: 'running',
      byePlayerId
    });

    // Create matches
    const matchesToCreate = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      matchesToCreate.push({
        roundId: round._id,
        tournamentGameId: game._id,
        player1Id: playerIds[i],
        player2Id: playerIds[i + 1],
        winnerId: null,
        status: 'scheduled'
      });
    }

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    game.status = 'Tournament Running';
    await game.save();

    await logAudit({
      req,
      action: 'create',
      details: `Generated Round 1 fixtures for '${game.gameName}'. Total players: ${participants.length}. Bye: ${byePlayerId || 'None'}`,
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

    // Find current active round
    const activeRound = await Round.findOne({ tournamentGameId: game._id }).sort({ roundNumber: -1 });
    if (!activeRound) {
      return res.status(400).json({ success: false, message: 'No active rounds found' });
    }

    // Check if all matches in active round are completed
    const incompleteMatches = await Match.find({ roundId: activeRound._id, status: 'scheduled' });
    if (incompleteMatches.length > 0) {
      return res.status(400).json({ success: false, message: 'Please complete all matches in the current round first' });
    }

    // Collect all winners from active round
    const completedMatches = await Match.find({ roundId: activeRound._id });
    const winners = completedMatches.map(m => m.winnerId).filter(Boolean);

    // Add Bye player if there was one
    if (activeRound.byePlayerId) {
      winners.push(activeRound.byePlayerId);
    }

    // If only 1 player remains, we have a champion!
    if (winners.length === 1) {
      const championId = winners[0];
      
      // Determine runner-up (the other finalist)
      // The last match of the last round contains the champion and the runner-up
      const lastMatch = completedMatches.find(m => m.winnerId === championId);
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

    // Shuffle winners for random matchups
    const advancingPlayers = shuffle(winners);
    let byePlayerId = null;

    if (advancingPlayers.length % 2 !== 0) {
      // Pick random bye, checking bye history to avoid consecutive if possible
      const lastByeId = activeRound.byePlayerId;
      let eligibleForBye = advancingPlayers;
      if (lastByeId && advancingPlayers.includes(lastByeId) && advancingPlayers.length > 1) {
        eligibleForBye = advancingPlayers.filter(id => id !== lastByeId);
      }

      const randomIndex = Math.floor(Math.random() * eligibleForBye.length);
      byePlayerId = eligibleForBye[randomIndex];
      
      // Remove bye player from matching list
      const idxInAdvancing = advancingPlayers.indexOf(byePlayerId);
      advancingPlayers.splice(idxInAdvancing, 1);

      // Save to bye history
      game.byeHistory.push(byePlayerId);
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
      byePlayerId
    });

    // Create matches
    const matchesToCreate = [];
    for (let i = 0; i < advancingPlayers.length; i += 2) {
      matchesToCreate.push({
        roundId: nextRound._id,
        tournamentGameId: game._id,
        player1Id: advancingPlayers[i],
        player2Id: advancingPlayers[i + 1],
        winnerId: null,
        status: 'scheduled'
      });
    }

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

    await logAudit({
      req,
      action: 'create',
      details: `Generated Round ${nextRoundNumber} for '${game.gameName}'. Advancing: ${winners.length}. Bye: ${byePlayerId || 'None'}`,
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
    const rounds = await Round.find({ tournamentGameId: req.params.id }).sort({ roundNumber: 1 });
    const matches = await Match.find({ tournamentGameId: req.params.id });

    // Fetch participant info for rendering names
    const participants = await Participant.find({
      enrolledGames: (await TournamentGame.findById(req.params.id)).gameName
    });
    const playerMap = {};
    participants.forEach(p => {
      playerMap[p.participantId] = p.name;
    });

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
          player1Id: m.player1Id,
          player1Name: playerMap[m.player1Id] || m.player1Id || 'TBD',
          player2Id: m.player2Id,
          player2Name: playerMap[m.player2Id] || m.player2Id || 'TBD',
          winnerId: m.winnerId,
          status: m.status,
          score: m.score,
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
      game.byeHistory.push(newByePlayerId);
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

    // Delete existing matches for this round
    await Match.deleteMany({ roundId: round._id });

    // Shuffle and assign bye if odd
    const playerIds = shuffle(players);
    let byePlayerId = null;

    if (playerIds.length % 2 !== 0) {
      const randomIndex = Math.floor(Math.random() * playerIds.length);
      byePlayerId = playerIds.splice(randomIndex, 1)[0];
      game.byeHistory.push(byePlayerId);
      await game.save();
    }

    round.byePlayerId = byePlayerId;
    round.status = 'running';
    await round.save();

    // Create matches
    const matchesToCreate = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      matchesToCreate.push({
        roundId: round._id,
        tournamentGameId: game._id,
        player1Id: playerIds[i],
        player2Id: playerIds[i + 1],
        winnerId: null,
        status: 'scheduled'
      });
    }

    if (matchesToCreate.length > 0) {
      await Match.insertMany(matchesToCreate);
    }

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

    let winnerId = null;
    if (match.player1Id === withdrawnPlayerId) {
      winnerId = match.player2Id;
    } else if (match.player2Id === withdrawnPlayerId) {
      winnerId = match.player1Id;
    }

    match.winnerId = winnerId;
    match.withdrawnPlayerId = withdrawnPlayerId;
    match.status = 'withdrawn';
    match.score = 'Withdrawn';
    await match.save();

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

module.exports = router;
