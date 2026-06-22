const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/participants
// @desc    Get all participants with filters
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    const { search, gender, status, college } = req.query;
    let query = {};

    if (gender) query.gender = gender;
    if (status) query.status = status;
    if (college) query.collegeOrInstitute = { $regex: college, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { participantId: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const participants = await Participant.find(query).sort({ name: 1 });
    res.json({ success: true, count: participants.length, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/participants
// @desc    Create new participant
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { participantId } = req.body;
    const existing = await Participant.findOne({ participantId });
    if (existing) {
      return res.status(400).json({ success: false, message: `Participant ID ${participantId} already exists` });
    }

    const participant = await Participant.create(req.body);

    await logAudit({
      req,
      action: 'create',
      details: `Created participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.status(201).json({ success: true, data: participant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/participants/:id
// @desc    Update participant details
// @access  Private (Super Admin, Admin)
router.put('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    participant = await Participant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAudit({
      req,
      action: 'update',
      details: `Updated participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/participants/:id
// @desc    Delete participant
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    await Participant.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.json({ success: true, message: 'Participant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
