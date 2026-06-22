const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// @route   GET /api/audit-logs
// @desc    Get all audit logs
// @access  Private (Super Admin Only)
router.get('/', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { action, role, search } = req.query;
    let query = {};

    if (action) {
      query.action = action;
    }
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { details: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name userId email')
      .sort({ timestamp: -1 })
      .limit(100); // safety threshold

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
