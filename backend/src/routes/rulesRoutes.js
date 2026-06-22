const express = require('express');
const router = express.Router();
const Rules = require('../models/Rules');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/rules
// @desc    Get rules (viewers only see published)
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'viewer') {
      query.status = 'published';
    }

    const rules = await Rules.find(query)
      .populate('updatedBy', 'name role')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/rules
// @desc    Create rule
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const rule = await Rules.create({
      title,
      content,
      status,
      updatedBy: req.user._id,
      version: 1,
      versionHistory: [{
        version: 1,
        content,
        updatedBy: req.user._id,
        updatedAt: new Date()
      }]
    });

    await logAudit({
      req,
      action: 'create',
      details: `Created Rule '${rule.title}'`,
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/rules/:id
// @desc    Update rule & save version history
// @access  Private (Super Admin, Admin)
router.put('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { title, content, status } = req.body;
    let rule = await Rules.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    const newVersion = rule.version + 1;
    const newHistoryItem = {
      version: newVersion,
      content: content || rule.content,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    rule.title = title || rule.title;
    rule.content = content || rule.content;
    rule.status = status || rule.status;
    rule.version = newVersion;
    rule.updatedBy = req.user._id;
    rule.versionHistory.push(newHistoryItem);

    await rule.save();

    await logAudit({
      req,
      action: 'update',
      details: `Updated Rule '${rule.title}' to Version ${newVersion}`,
    });

    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/rules/:id/publish
// @desc    Publish a draft rule
// @access  Private (Super Admin, Admin)
router.post('/:id/publish', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let rule = await Rules.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    rule.status = 'published';
    await rule.save();

    await logAudit({
      req,
      action: 'update',
      details: `Published Rule '${rule.title}'`,
    });

    res.json({ success: true, data: rule, message: 'Rule published successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/rules/:id
// @desc    Delete rule
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const rule = await Rules.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    await Rules.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted Rule '${rule.title}'`,
    });

    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
