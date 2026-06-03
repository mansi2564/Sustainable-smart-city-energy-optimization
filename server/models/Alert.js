const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['high_usage', 'cost_warning', 'anomaly', 'maintenance', 'recommendation', 'user_registration'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  data: {
    consumption: Number,
    cost: Number,
    threshold: Number,
    recommendations: [String]
  }
}, {
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ type: 1 });
alertSchema.index({ severity: 1 });

module.exports = mongoose.model('Alert', alertSchema);