const express = require('express');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const User = require('../models/User');

const router = express.Router();

// Get user alerts
router.get('/', auth, async (req, res) => {
  try {
    const { isRead, type, limit = 50 } = req.query;
    
    let query = { userId: req.user.userId };
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = type;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Alert.countDocuments({
      userId: req.user.userId,
      isRead: false
    });

    res.json({
      alerts,
      unreadCount
    });
  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ message: 'Error fetching alerts' });
  }
});

// Mark alert as read
router.put('/:alertId/read', auth, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.alertId, userId: req.user.userId },
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json({
      message: 'Alert marked as read',
      alert
    });
  } catch (error) {
    console.error('Alert update error:', error);
    res.status(500).json({ message: 'Error updating alert' });
  }
});

// Create alert (for system use)
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, message, severity, data, sendEmail = true } = req.body;

    const alert = new Alert({
      userId: req.user.userId,
      type,
      title,
      message,
      severity,
      data
    });

    await alert.save();

    // Send email alert if requested
    if (sendEmail) {
      try {
        const user = await User.findById(req.user.userId);
        if (user && user.preferences.emailAlerts) {
          await emailService.sendEnergyAlert(user.email, {
            type,
            title,
            message,
            severity,
            consumption: data?.consumption,
            cost: data?.cost
          });
          
          alert.isEmailSent = true;
          await alert.save();
        }
      } catch (emailError) {
        console.error('Failed to send email alert:', emailError);
        // Don't fail the alert creation if email fails
      }
    }

    res.status(201).json({
      message: 'Alert created successfully',
      alert
    });
  } catch (error) {
    console.error('Alert creation error:', error);
    res.status(500).json({ message: 'Error creating alert' });
  }
});

// Trigger energy usage alert
router.post('/energy-usage', auth, async (req, res) => {
  try {
    const { consumption, cost, threshold } = req.body;
    
    if (consumption > threshold) {
      const alert = new Alert({
        userId: req.user.userId,
        type: 'high_usage',
        title: 'High Energy Consumption Alert',
        message: `Your current energy consumption (${consumption} kWh) has exceeded your threshold of ${threshold} kWh. Consider reducing usage to save costs.`,
        severity: consumption > threshold * 1.5 ? 'high' : 'medium',
        data: { consumption, cost, threshold }
      });
      
      await alert.save();
      
      // Send email alert
      const user = await User.findById(req.user.userId);
      if (user && user.preferences.emailAlerts) {
        await emailService.sendEnergyAlert(user.email, {
          type: 'high_usage',
          title: 'High Energy Consumption Alert',
          message: alert.message,
          severity: alert.severity,
          consumption,
          cost
        });
        
        alert.isEmailSent = true;
        await alert.save();
      }
      
      res.status(201).json({
        message: 'Energy usage alert created',
        alert
      });
    } else {
      res.json({
        message: 'Energy usage within normal limits',
        consumption,
        threshold
      });
    }
  } catch (error) {
    console.error('Energy usage alert error:', error);
    res.status(500).json({ message: 'Error processing energy usage alert' });
  }
});

module.exports = router;