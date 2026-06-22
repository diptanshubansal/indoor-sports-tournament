const AuditLog = require('../models/AuditLog');

const logAudit = async ({ req, userId, action, details }) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'system';
    const role = req && req.user ? req.user.role : 'system';
    const userRef = userId || (req && req.user ? req.user._id : null);

    await AuditLog.create({
      userId: userRef,
      action,
      details,
      ipAddress: ip,
      role: role,
    });
  } catch (error) {
    console.error('Audit Log saving failed:', error.message);
  }
};

module.exports = { logAudit };
