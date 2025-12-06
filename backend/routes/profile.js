import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { findUserById } from '../data/database.js';

const router = express.Router();

// Get courier profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved',
      data: {
        profile: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email || null,
          phone: user.phone || null,
          date_of_birth: user.date_of_birth || null
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

// Update courier profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const user = findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { email, phone, date_of_birth } = req.body;

    // Update user data (only provided fields)
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (date_of_birth !== undefined) user.date_of_birth = date_of_birth;
    user.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email || null,
          phone: user.phone || null,
          date_of_birth: user.date_of_birth || null
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

export default router;
