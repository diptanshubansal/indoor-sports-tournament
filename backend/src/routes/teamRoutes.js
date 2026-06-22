const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Participant = require('../models/Participant');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/teams
// @desc    Get all teams
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    const { tournamentId, search } = req.query;
    let query = {};

    if (tournamentId) {
      query.tournamentId = tournamentId;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const teams = await Team.find(query)
      .populate('tournamentId', 'name status gameType')
      .populate('members', 'participantId name collegeOrInstitute mobileNumber email status')
      .populate('captainId', 'participantId name');

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/teams/:id
// @desc    Get team by ID
// @access  Private (All roles)
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('tournamentId', 'name status gameType')
      .populate('members', 'participantId name collegeOrInstitute mobileNumber email status')
      .populate('captainId', 'participantId name');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    res.json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/teams
// @desc    Create new team
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const team = await Team.create(req.body);

    await logAudit({
      req,
      action: 'create',
      details: `Created team '${team.name}' in tournament (ID: ${team.tournamentId})`,
    });

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team details
// @access  Private (Super Admin, Admin)
router.put('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // If members were updated, let's update participants' teamName status
    if (req.body.members) {
      await Participant.updateMany(
        { _id: { $in: req.body.members } },
        { teamName: team.name }
      );
    }

    await logAudit({
      req,
      action: 'update',
      details: `Updated team '${team.name}' (ID: ${team._id})`,
    });

    res.json({ success: true, data: team });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Reset participant teamName values
    if (team.members && team.members.length > 0) {
      await Participant.updateMany(
        { _id: { $in: team.members } },
        { teamName: '' }
      );
    }

    await Team.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted team '${team.name}' (ID: ${team._id})`,
    });

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
