const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.login(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        role: user.role_name,
        role_name: user.role_name,
        school_id: user.school_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Login error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to database. Please try again later.'
      });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({
        success: false,
        message: 'Network error. Please check your connection.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Unable to process login. Please check your credentials and try again.'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new student under authenticated librarian's school
// @access  Private (Librarian Admin, Librarian)
router.post('/register', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const {
      role_id,
      student_number,
      employee_number,
      firstname,
      lastname,
      gender,
      contact_number,
      email,
      password
    } = req.body;

    if (!email || !password || !firstname || !lastname) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    const school_id = req.user?.school_id;

    if (!school_id) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine school. Please re-login and try again.'
      });
    }

    const user_id = await User.create({
      school_id,
      role_id: role_id || 4,
      student_number,
      employee_number,
      firstname,
      lastname,
      gender,
      contact_number,
      email,
      password
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user_id
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Registration error details:', error.message);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to database. Please try again later.'
      });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({
        success: false,
        message: 'Network error. Please check your connection.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Unable to complete registration. Please try again.'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const decoded = req.user;
    const user = await User.getById(decoded.user_id, true);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    await User.update(decoded.user_id, { password: new_password });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
