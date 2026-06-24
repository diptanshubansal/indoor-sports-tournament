const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Participant = require('../models/Participant');
const Team = require('../models/Team');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const Leaderboard = require('../models/Leaderboard');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// @route   GET /api/reports/tournaments
// @desc    Get tournaments summary report
// @access  Private (All roles)
router.get('/tournaments', protect, async (req, res) => {
  try {
    const summary = await Tournament.aggregate([
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: 'tournamentId',
          as: 'teams'
        }
      },
      {
        $project: {
          name: 1,
          venue: 1,
          startDate: 1,
          endDate: 1,
          status: 1,
          gameType: 1,
          isArchived: 1,
          teamCount: { $size: '$teams' }
        }
      },
      { $sort: { startDate: -1 } }
    ]);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/attendance
// @desc    Get attendance stats summary
// @access  Private (All roles)
router.get('/attendance', protect, async (req, res) => {
  try {
    const summary = await Attendance.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            userType: '$userType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          stats: {
            $push: {
              userType: '$_id.userType',
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/participation
// @desc    Get participants game enrollment distribution statistics
// @access  Private (All roles)
router.get('/participation', protect, async (req, res) => {
  try {
    const gameDistribution = await Participant.aggregate([
      { $unwind: '$enrolledGames' },
      {
        $group: {
          _id: '$enrolledGames',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, data: gameDistribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/committee
// @desc    Get committee members audit activity count
// @access  Private (All roles)
router.get('/committee', protect, async (req, res) => {
  try {
    const activities = await AuditLog.aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            role: '$role',
            action: '$action'
          },
          actionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          userLabel: { $ifNull: ['$userDetails.name', 'System / Deleted User'] },
          role: '$_id.role',
          action: '$_id.action',
          count: '$actionCount'
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/leaderboard
// @desc    Get general tournament standings summary
// @access  Private (All roles)
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const standings = await Leaderboard.find({})
      .populate('tournamentId', 'name gameType status')
      .populate('teamId', 'name')
      .sort({ rank: 1 });
    res.json({ success: true, data: standings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
