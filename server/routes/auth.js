const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { body, validationResult } = require('express-validator');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Register (handles both JSON and FormData)
router.post('/register', upload.single('idProof'), async (req, res) => {
  try {
    let { name, email, phone, password, role, location, department, employeeId } = req.body;

    // Handle FormData vs JSON parsing
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        location = {};
      }
    }

    // Basic validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Please provide a valid email' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!role || !['resident', 'planner', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      password,
      role,
      location
    };

    // Set verification status based on role
    if (role === 'resident') {
      userData.isVerified = false; // Residents need admin approval - set to pending
    } else if (role === 'planner' || role === 'admin') {
      userData.isVerified = true; // Auto-verify planners and admins
      userData.verifiedAt = new Date();
      if (department) userData.department = department.trim();
      if (employeeId) userData.employeeId = employeeId.trim();
      if (req.file) {
        userData.idProof = {
          filename: req.file.filename,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size
        };
      }
    }

    const user = new User(userData);
    await user.save();

    // Notify all admins about new resident registration
    if (role === 'resident') {
      try {
        const admins = await User.find({ role: { $in: ['admin', 'planner'] }, isActive: true });
        const alertPromises = admins.map(admin => {
          const alert = new Alert({
            userId: admin._id,
            type: 'user_registration',
            title: 'New Resident Registration',
            message: `${user.name} (${user.email}) has registered as a resident and requires verification.`,
            severity: 'medium',
            data: {
              newUserId: user._id,
              newUserName: user.name,
              newUserEmail: user.email,
              newUserRole: user.role
            }
          });
          return alert.save();
        });
        await Promise.all(alertPromises);
        console.log(`✅ Registration alerts sent to ${admins.length} admin(s)`);
      } catch (alertError) {
        console.error('❌ Failed to create registration alerts:', alertError);
        // Don't fail registration if alert creation fails
      }
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('Only image and PDF files are allowed')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('File too large')) {
      return res.status(400).json({ message: 'File size must be less than 5MB' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required'),
  body('role').optional().isIn(['resident', 'planner', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role } = req.body;

    // Find user with optional role filter
    const userQuery = { email, isActive: true };
    if (role) {
      userQuery.role = role;
    }
    
    const user = await User.findOne(userQuery);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password check:', {
      email: user.email,
      providedPassword: password,
      isValid: isPasswordValid,
      storedHash: user.password.substring(0, 20) + '...' // Partial hash for debugging
    });
    if (!isPasswordValid) {
      console.log('❌ Password invalid for user:', user.email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check verification status - residents need admin approval, planners/admins are auto-verified
    console.log('🔐 Login attempt for user:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Only verified users can login
    if (!user.isVerified) {
      console.log('❌ Access denied - user not verified');
      return res.status(403).json({
        message: 'Access not granted. Your account is pending verification by a city planner.',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        location: user.location
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;