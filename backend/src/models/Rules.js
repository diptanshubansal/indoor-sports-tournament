const mongoose = require('mongoose');

const rulesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    version: {
      type: Number,
      default: 1,
    },
    versionHistory: [
      {
        version: {
          type: Number,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Rules', rulesSchema);
