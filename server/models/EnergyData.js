const mongoose = require('mongoose');

const energyDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  consumption: {
    type: Number,
    required: true // kWh
  },
  cost: {
    type: Number,
    required: true // USD
  },
  source: {
    type: String,
    enum: ['grid', 'solar', 'wind', 'battery'],
    default: 'grid'
  },
  deviceType: {
    type: String,
    enum: ['residential', 'commercial', 'industrial'],
    default: 'residential'
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  metadata: {
    temperature: Number,
    humidity: Number,
    weatherCondition: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
energyDataSchema.index({ userId: 1, timestamp: -1 });
energyDataSchema.index({ timestamp: -1 });
energyDataSchema.index({ source: 1 });

module.exports = mongoose.model('EnergyData', energyDataSchema);