const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/settings
// @desc    Get all system settings keys
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    const settings = await Settings.find({});
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/settings
// @desc    Upsert system settings value
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide settings key and value' });
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      { $set: { value, updatedBy: req.user._id } },
      { upsert: true, new: true }
    );

    await logAudit({
      req,
      action: 'update',
      details: `Updated settings key '${key}' to value: ${JSON.stringify(value)}`,
    });

    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
