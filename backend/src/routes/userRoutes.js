const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// @route   GET /api/users
// @desc    Get all committee members (Admins & Viewers)
// @access  Private (Super Admin Only)
router.get('/', protect, authorize('super_admin'), async (req, res) => {
  try {
    const users = await User.find({ userId: { $ne: 'superadmin' } }).select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users
// @desc    Create a new admin/viewer user
// @access  Private (Super Admin Only)
router.post('/', protect, authorize('super_admin'), async (req, res) => {
  try {
    const { userId, name, email, mobileNumber, password, role } = req.body;

    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(400).json({ success: false, message: 'User ID is already taken' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email address is already in use' });
    }

    const user = await User.create({
      userId,
      name,
      email,
      mobileNumber,
      password,
      role: role || 'viewer',
    });

    await logAudit({
      req,
      action: 'create',
      details: `Created new user ${user.userId} with role ${user.role}`,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user details (Role/Status for Super Admin, Profile details for self)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Authorization: Super Admin can update anyone. Other users can only update themselves.
    const isSelf = req.user._id.toString() === req.params.id;
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isSelf && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }

    // If not Super Admin, prevent modifying role or status
    if (!isSuperAdmin) {
      delete req.body.role;
      delete req.body.status;
      delete req.body.userId;
    }

    // Hash password if updating password
    if (req.body.password) {
      // pre-save hook will hash it automatically when calling save()
      user.password = req.body.password;
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.mobileNumber) user.mobileNumber = req.body.mobileNumber;
    if (isSuperAdmin && req.body.role) user.role = req.body.role;
    if (isSuperAdmin && req.body.status) user.status = req.body.status;

    await user.save();

    await logAudit({
      req,
      action: 'update',
      details: `Updated user profile/details for ${user.userId}`,
    });

    res.json({
      success: true,
      data: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Super Admin Only)
router.delete('/:id', protect, authorize('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.userId === 'superadmin') {
      return res.status(400).json({ success: false, message: 'Cannot delete the primary Super Admin account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted user ${user.userId}`,
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
