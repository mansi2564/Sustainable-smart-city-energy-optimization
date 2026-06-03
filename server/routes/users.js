const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Debug route to view all users (remove in production)
router.get('/debug/all', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({
      total: users.length,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        location: user.location
      }))
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Debug route to view city planners only
router.get('/debug/planners', async (req, res) => {
  try {
    const planners = await User.find({ role: 'planner' }).select('-password').sort({ createdAt: -1 });
    res.json({
      total: planners.length,
      planners: planners.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        location: user.location
      }))
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ message: 'Error fetching planners' });
  }
});

// Get pending verification requests (for city planners)
router.get('/pending-verification', auth, async (req, res) => {
  try {
    // Only city planners and admins can access this
    if (req.user.role !== 'planner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only city planners can view pending verifications.' });
    }

    const pendingUsers = await User.find({ 
      role: 'resident', 
      isVerified: false,
      isActive: true 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      total: pendingUsers.length,
      pendingUsers: pendingUsers.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Pending verification fetch error:', error);
    res.status(500).json({ message: 'Error fetching pending verifications' });
  }
});

// Verify a user (for city planners)
router.post('/verify/:userId', auth, async (req, res) => {
  try {
    console.log('🔍 Verification attempt by user:', req.user);
    console.log('🔍 Verifying user ID:', req.userId);

    // Only city planners and admins can verify users
    if (req.user.role !== 'planner' && req.user.role !== 'admin') {
      console.log('❌ Access denied - user role:', req.user.role);
      return res.status(403).json({ message: 'Access denied. Only city planners can verify users.' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('📋 Target user:', { id: user._id, name: user.name, role: user.role, isVerified: user.isVerified });

    if (user.role !== 'resident') {
      console.log('❌ Wrong role - user role:', user.role);
      return res.status(400).json({ message: 'Only residents can be verified through this process' });
    }

    if (user.isVerified) {
      console.log('⚠️ User already verified');
      return res.status(400).json({ message: 'User is already verified' });
    }

    // Update user verification status
    user.isVerified = true;
    user.verifiedBy = req.user.userId;
    user.verifiedAt = new Date();
    await user.save();

    console.log('✅ User verified successfully:', user._id);

    res.json({
      message: 'User verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt
      }
    });
  } catch (error) {
    console.error('❌ User verification error:', error);
    res.status(500).json({ message: 'Error verifying user' });
  }
});

// Reject/Revoke user verification (for city planners)
router.post('/revoke-verification/:userId', auth, async (req, res) => {
  try {
    // Only city planners and admins can revoke verification
    if (req.user.role !== 'planner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only city planners can revoke verification.' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'resident') {
      return res.status(400).json({ message: 'Only residents can have verification revoked' });
    }

    // Update user verification status
    user.isVerified = false;
    user.verifiedBy = null;
    user.verifiedAt = null;
    await user.save();

    res.json({
      message: 'User verification revoked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('User verification revocation error:', error);
    res.status(500).json({ message: 'Error revoking user verification' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, location, preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, location, preferences },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Search users by city (for city planners and admins)
router.get('/search-by-city/:city', auth, async (req, res) => {
  try {
    // Only city planners and admins can search users
    if (req.user.role !== 'planner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only city planners can search users.' });
    }

    const { city } = req.params;
    const { role, isVerified, limit = 50, page = 1 } = req.query;

    // Build search query
    let query = {
      'location.city': { $regex: city, $options: 'i' }, // Case-insensitive search
      isActive: true
    };

    // Add optional filters
    if (role && role !== 'all') {
      query.role = role;
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          location: user.location,
          createdAt: user.createdAt,
          phone: user.phone
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          city,
          role: role || 'all',
          isVerified: isVerified === undefined ? 'all' : isVerified
        }
      }
    });
  } catch (error) {
    console.error('User search by city error:', error);
    res.status(500).json({ message: 'Error searching users by city' });
  }
});

// Get all cities with user counts (for city planners)
router.get('/cities-summary', auth, async (req, res) => {
  try {
    // Only city planners and admins can access this
    if (req.user.role !== 'planner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only city planners can view city summaries.' });
    }

    // Aggregate users by city
    const cityStats = await User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$location.city',
          totalUsers: { $sum: 1 },
          verifiedResidents: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$role', 'resident'] }, { $eq: ['$isVerified', true] }] },
                1, 0
              ]
            }
          },
          pendingResidents: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$role', 'resident'] }, { $eq: ['$isVerified', false] }] },
                1, 0
              ]
            }
          },
          cityPlanners: {
            $sum: {
              $cond: [{ $eq: ['$role', 'planner'] }, 1, 0]
            }
          },
          admins: {
            $sum: {
              $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { totalUsers: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        cities: cityStats.map(stat => ({
          city: stat._id || 'Unknown',
          totalUsers: stat.totalUsers,
          verifiedResidents: stat.verifiedResidents,
          pendingResidents: stat.pendingResidents,
          cityPlanners: stat.cityPlanners,
          admins: stat.admins,
          verificationRate: stat.totalUsers > 0 ?
            Math.round(((stat.verifiedResidents + stat.cityPlanners + stat.admins) / stat.totalUsers) * 100) : 0
        })),
        totalCities: cityStats.length
      }
    });
  } catch (error) {
    console.error('Cities summary error:', error);
    res.status(500).json({ message: 'Error fetching cities summary' });
  }
});

// Get verification statistics for today (for city planners)
router.get('/verification-stats', auth, async (req, res) => {
  try {
    // Only city planners and admins can access this
    if (req.user.role !== 'planner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only city planners can view verification statistics.' });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get verified users count for today
    const verifiedToday = await User.countDocuments({
      role: 'resident',
      isVerified: true,
      verifiedAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Get rejected/revoked users count for today (users who were verified but then revoked)
    // This is trickier - we need to track revocations. For now, we'll count users who are not verified
    // but were created recently. This is a simplified approach.
    const rejectedToday = await User.countDocuments({
      role: 'resident',
      isVerified: false,
      verifiedAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Get pending users count
    const pendingCount = await User.countDocuments({
      role: 'resident',
      isVerified: false,
      $or: [
        { verifiedAt: { $exists: false } },
        { verifiedAt: null }
      ]
    });

    console.log('📊 Verification stats:', {
      verifiedToday,
      rejectedToday,
      pendingCount,
      date: startOfDay.toISOString()
    });

    res.json({
      success: true,
      data: {
        verifiedToday,
        rejectedToday,
        pendingCount
      }
    });
  } catch (error) {
    console.error('❌ Verification stats error:', error);
    res.status(500).json({ message: 'Error fetching verification statistics' });
  }
});

module.exports = router;