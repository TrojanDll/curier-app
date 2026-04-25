import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByUsername, createUser, findUserById, database } from '../data/database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Register new courier
router.post('/register', async (req, res) => {
  try {
    const { username, password, full_name, phone } = req.body;

    // Validate input
    if (!username || !password || !full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    if (findUserByUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = createUser({
      username,
      password: hashedPassword,
      full_name,
      phone
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token
    database.tokens.set(refreshToken, newUser.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 86400,
        courier: {
          id: newUser.id,
          username: newUser.username,
          full_name: newUser.full_name
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user
    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token
    database.tokens.set(refreshToken, user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 86400,
        courier: {
          id: user.id,
          username: user.username,
          full_name: user.full_name
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    // In production, add token to blacklist
    database.tokens.delete(token);
  }

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Refresh token
router.post('/refresh', (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, JWT_SECRET);
    const userId = database.tokens.get(refresh_token);

    if (!userId || userId !== decoded.id) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = findUserById(userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        access_token: accessToken,
        refresh_token: refresh_token,
        expires_in: 86400
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

export default router;
