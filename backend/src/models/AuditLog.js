const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'create', 'update', 'delete'],
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  role: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
