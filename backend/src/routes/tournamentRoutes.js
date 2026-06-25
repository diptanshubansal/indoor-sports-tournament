const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/tournaments
// @desc    Get all tournaments (filtered by query)
// @access  Private (All Roles: Super Admin, Admin, Viewer)
router.get('/', protect, async (req, res) => {
  try {
    const { status, gameType, includeArchived, search } = req.query;
    let query = {};

    if (!includeArchived || includeArchived === 'false') {
      query.isArchived = false;
    }
    if (status) {
      query.status = status;
    }
    if (gameType) {
      query.gameType = gameType;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const tournaments = await Tournament.find(query).sort({ startDate: 1 });
    res.json({ success: true, count: tournaments.length, data: tournaments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/tournaments/:id
// @desc    Get tournament by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tournaments
// @desc    Create new tournament
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const endDate = req.body.endDate ? new Date(req.body.endDate) : startDate;
    const registrationStartDate = req.body.registrationStartDate ? new Date(req.body.registrationStartDate) : new Date();
    const registrationEndDate = req.body.registrationEndDate ? new Date(req.body.registrationEndDate) : startDate;

    const tournament = await Tournament.create({
      ...req.body,
      name: req.body.name || 'Indoor Sports Tournament',
      venue: req.body.venue || 'ICAI Bathinda Branch',
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      status: req.body.status || 'Draft',
      gameType: req.body.gameType || 'chess',
    });

    await logAudit({
      req,
      action: 'create',
      details: `Created tournament '${tournament.name}' (ID: ${tournament._id})`,
    });

    res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/tournaments/:id
// @desc    Update tournament
// @access  Private (Super Admin, Admin)
router.put('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAudit({
      req,
      action: 'update',
      details: `Updated tournament '${tournament.name}' (ID: ${tournament._id})`,
    });

    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/tournaments/:id/archive
// @desc    Archive tournament
// @access  Private (Super Admin, Admin)
router.post('/:id/archive', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    tournament.isArchived = true;
    await tournament.save();

    await logAudit({
      req,
      action: 'update',
      details: `Archived tournament '${tournament.name}' (ID: ${tournament._id})`,
    });

    res.json({ success: true, data: tournament, message: 'Tournament archived successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/tournaments/:id
// @desc    Delete tournament
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    await Tournament.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted tournament '${tournament.name}' (ID: ${tournament._id})`,
    });

    res.json({ success: true, message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
