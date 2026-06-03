const express = require('express');
const EnergyData = require('../models/EnergyData');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user's energy data
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, source, limit = 100 } = req.query;
    
    let query = { userId: req.user.userId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    if (source) query.source = source;

    const energyData = await EnergyData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Calculate statistics
    const totalConsumption = energyData.reduce((sum, data) => sum + data.consumption, 0);
    const totalCost = energyData.reduce((sum, data) => sum + data.cost, 0);
    const avgConsumption = energyData.length > 0 ? totalConsumption / energyData.length : 0;

    res.json({
      data: energyData,
      statistics: {
        totalConsumption,
        totalCost,
        avgConsumption,
        dataPoints: energyData.length
      }
    });
  } catch (error) {
    console.error('Energy data fetch error:', error);
    res.status(500).json({ message: 'Error fetching energy data' });
  }
});

// Add energy data
router.post('/', auth, async (req, res) => {
  try {
    const { consumption, cost, source, deviceType, location, metadata } = req.body;

    const energyData = new EnergyData({
      userId: req.user.userId,
      consumption,
      cost,
      source,
      deviceType,
      location,
      metadata
    });

    await energyData.save();

    res.status(201).json({
      message: 'Energy data added successfully',
      data: energyData
    });
  } catch (error) {
    console.error('Energy data creation error:', error);
    res.status(500).json({ message: 'Error adding energy data' });
  }
});

// Get energy statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const stats = await EnergyData.aggregate([
      {
        $match: {
          userId: req.user.userId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$source',
          totalConsumption: { $sum: '$consumption' },
          totalCost: { $sum: '$cost' },
          avgConsumption: { $avg: '$consumption' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ stats, period });
  } catch (error) {
    console.error('Energy stats error:', error);
    res.status(500).json({ message: 'Error fetching energy statistics' });
  }
});

module.exports = router;