const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// Helper function to generate next Visitor ID
const generateNextVisitorId = async () => {
  const visitors = await Visitor.find({ visitorId: /^V\d+$/ }, 'visitorId');
  let maxIdNum = 0;
  for (const v of visitors) {
    const match = v.visitorId.match(/^V(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) {
        maxIdNum = num;
      }
    }
  }
  const nextNum = maxIdNum + 1;
  return `V${String(nextNum).padStart(3, '0')}`;
};

// Helper function to generate random password
const generateTempPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let tempPass = '';
  for (let i = 0; i < 8; i++) {
    tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tempPass;
};

// @route   GET /api/visitors
// @desc    Get all visitor accounts
// @access  Private (Super Admin, Admin)
router.get('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const visitors = await Visitor.find({}).sort({ visitorId: 1 });
    res.json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/visitors
// @desc    Generate new visitor credentials
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const visitorId = await generateNextVisitorId();
    const username = visitorId.toLowerCase();
    const tempPassword = generateTempPassword();

    // Create Visitor entry
    const visitor = await Visitor.create({
      visitorId,
      username,
      temporaryPassword: tempPassword
    });

    // Create corresponding User credentials for login
    await User.create({
      userId: username,
      name: `Visitor ${visitorId}`,
      email: `${username}@icai-sports.com`,
      mobileNumber: '0000000000',
      password: tempPassword,
      role: 'visitor',
      isTempPassword: false, // Visitors do not force password change
      status: 'active'
    });

    await logAudit({
      req,
      action: 'create',
      details: `Generated visitor credentials for '${visitorId}'`,
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/visitors/:id/reset-password
// @desc    Reset visitor password
// @access  Private (Super Admin, Admin)
router.post('/:id/reset-password', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor account not found' });
    }

    const tempPassword = generateTempPassword();
    visitor.temporaryPassword = tempPassword;
    await visitor.save();

    // Sync with corresponding User
    await User.findOneAndUpdate(
      { userId: visitor.username },
      {
        password: tempPassword,
        isTempPassword: false
      }
    );

    await logAudit({
      req,
      action: 'update',
      details: `Reset visitor password for '${visitor.visitorId}'`,
    });

    res.json({
      success: true,
      message: `Password reset successfully. New password: ${tempPassword}`,
      data: {
        temporaryPassword: tempPassword
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/visitors/:id
// @desc    Delete visitor account
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor account not found' });
    }

    // Delete corresponding User
    await User.findOneAndDelete({ userId: visitor.username });

    await Visitor.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted visitor credentials for '${visitor.visitorId}'`,
    });

    res.json({ success: true, message: 'Visitor credentials deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/visitors/dashboard
// @desc    Get visitor dashboard overview
// @access  Private (Visitor)
router.get('/dashboard', protect, authorize('visitor'), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        title: 'Visitor Hub',
        announcementsCount: 5,
        tournamentDetails: 'ICAI Bathinda Branch Indoor Sports Meet 2026',
        message: 'Welcome! You have read-only access to view tournament status, rules, and results.'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
