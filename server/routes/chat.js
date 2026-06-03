const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Chat endpoint - proxy requests to Python Rasa service
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user ? req.user._id.toString() : 'test_user';

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get Python service URL from environment
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

    // Forward the request to the Python Rasa service
    const response = await axios.post(`${pythonServiceUrl}/chat`, {
      message: message.trim(),
      user_id: userId
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Return the response from the Python service
    res.json({
      response: response.data.response,
      status: response.data.status || 'success'
    });

  } catch (error) {
    console.error('Chat service error:', error);

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'AI assistant service is currently unavailable. Please try again later.',
        status: 'error'
      });
    }

    if (error.response) {
      // Python service returned an error
      return res.status(error.response.status).json({
        message: error.response.data.message || 'AI service error',
        status: 'error'
      });
    }

    // General error
    res.status(500).json({
      message: 'An error occurred while processing your request.',
      status: 'error'
    });
  }
});

// Health check endpoint for the chat service
router.get('/health', async (req, res) => {
  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

    const response = await axios.get(`${pythonServiceUrl}/health`, {
      timeout: 5000
    });

    res.json({
      status: 'healthy',
      python_service: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      python_service: 'unavailable'
    });
  }
});

module.exports = router;