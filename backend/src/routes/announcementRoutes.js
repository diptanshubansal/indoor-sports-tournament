const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/announcements
// @desc    Get all announcements
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Viewers only see published announcements that are not scheduled for future
    if (req.user.role === 'viewer') {
      query.status = 'published';
      query.scheduledFor = { $lte: new Date() };
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name role')
      .sort({ isPinned: -1, scheduledFor: -1 });

    res.json({ success: true, count: announcements.length, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/announcements/dashboard
// @desc    Get recent and pinned announcements for dashboard widget
// @access  Private (All roles)
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Only published and active announcements
    const query = {
      status: 'published',
      scheduledFor: { $lte: new Date() }
    };

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name')
      .sort({ isPinned: -1, scheduledFor: -1 })
      .limit(5);

    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/announcements
// @desc    Create new announcement
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { title, content, scheduledFor, isPinned, status } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      scheduledFor: scheduledFor || new Date(),
      isPinned: isPinned || false,
      status: status || 'published',
      createdBy: req.user._id
    });

    await logAudit({
      req,
      action: 'create',
      details: `Created Announcement '${announcement.title}'`,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Update announcement
// @access  Private (Super Admin, Admin)
router.put('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      req,
      action: 'update',
      details: `Updated Announcement '${announcement.title}'`,
    });

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted Announcement '${announcement.title}'`,
    });

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
