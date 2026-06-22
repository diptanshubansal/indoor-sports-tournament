const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Participant = require('../models/Participant');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// Get Date formatted without time
const getNormalizedDate = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    const { date, userType } = req.query;
    let query = {};

    if (date) {
      query.date = getNormalizedDate(date);
    }
    if (userType) {
      query.userType = userType;
    }

    const records = await Attendance.find(query)
      .populate('userId', 'name role userId')
      .populate('participantId', 'name participantId collegeOrInstitute teamName')
      .populate('recordedBy', 'name');

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/attendance
// @desc    Save/update manual attendance for multiple entries
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { date, records } = req.body; // records: [{ id, userType, status }] (id is either participantId or userId)
    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid payload parameters' });
    }

    const targetDate = getNormalizedDate(date);
    const savedRecords = [];

    for (let record of records) {
      const { id, userType, status } = record;
      let query = { date: targetDate, userType };
      let updateDoc = { status, recordedBy: req.user._id };

      if (userType === 'committee') {
        query.userId = id;
        updateDoc.userId = id;
      } else {
        query.participantId = id;
        updateDoc.participantId = id;
      }

      // Upsert attendance record
      const updated = await Attendance.findOneAndUpdate(
        query,
        { $set: updateDoc },
        { upsert: true, new: true }
      );
      savedRecords.push(updated);
    }

    await logAudit({
      req,
      action: 'update',
      details: `Recorded attendance for ${records.length} items on ${targetDate.toISOString().split('T')[0]}`,
    });

    res.json({ success: true, count: savedRecords.length, data: savedRecords });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/attendance/qr
// @desc    Record individual attendance via QR scan ready structure
// @access  Private (Super Admin, Admin)
router.post('/qr', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { scanData, date } = req.body; // scanData: string (e.g. participantId or user ID value)
    if (!scanData) {
      return res.status(400).json({ success: false, message: 'No QR scan code provided' });
    }

    const targetDate = getNormalizedDate(date);
    let participant = await Participant.findOne({ participantId: scanData });
    let user = null;
    let userType = 'participant';

    if (!participant) {
      user = await User.findOne({ userId: scanData });
      if (!user) {
        return res.status(404).json({ success: false, message: 'No matching participant or user found for this QR code' });
      }
      userType = 'committee';
    }

    let query = { date: targetDate, userType };
    let updateDoc = { status: 'present', recordedBy: req.user._id, qrCodeScanned: true };

    if (userType === 'committee') {
      query.userId = user._id;
      updateDoc.userId = user._id;
    } else {
      query.participantId = participant._id;
      updateDoc.participantId = participant._id;
    }

    const record = await Attendance.findOneAndUpdate(
      query,
      { $set: updateDoc },
      { upsert: true, new: true }
    );

    const name = user ? user.name : participant.name;
    const typeLabel = user ? 'Committee Member' : 'Participant';

    await logAudit({
      req,
      action: 'update',
      details: `QR Code Check-in: Recorded ${name} (${typeLabel}) as present on ${targetDate.toISOString().split('T')[0]}`,
    });

    res.json({
      success: true,
      message: `${name} checked in successfully!`,
      data: record
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/attendance/stats
// @desc    Get summary metrics for attendance charts
// @access  Private (All roles)
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Attendance.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format output
    const formatted = stats.map(item => {
      const presentItem = item.statuses.find(s => s.status === 'present');
      const absentItem = item.statuses.find(s => s.status === 'absent');
      const present = presentItem ? presentItem.count : 0;
      const absent = absentItem ? absentItem.count : 0;
      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        date: item._id,
        present,
        absent,
        percentage
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
