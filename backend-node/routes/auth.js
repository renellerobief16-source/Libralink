const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { sendVerificationEmail } = require('../utils/email');
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
    
    if (error.message && error.message.toLowerCase().includes('database')) {
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to database. Please try again later.'
      });
    }
    
    if (error.message && error.message.toLowerCase().includes('network')) {
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

// @route   POST /api/auth/send-verification-code
// @desc    Send verification code to recovery email
// @access  Private
router.post('/send-verification-code', auth, async (req, res) => {
  try {
    console.log('[AUTH] Send verification code - req.user:', req.user);
    console.log('[AUTH] Send verification code - Authorization header:', req.header('Authorization')?.substring(0, 20) + '...');
    
    const { recovery_email } = req.body;
    const user_id = req.user?.user_id;
    const normalizedEmail = String(recovery_email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recovery email is required'
      });
    }

    if (!user_id) {
      console.error('[AUTH] No user_id in req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User not authenticated - missing user_id'
      });
    }

    // Create verification code
    const verification = await VerificationCode.create({
      user_id,
      email: normalizedEmail,
      type: 'email_verification'
    });

    console.log(`[AUTH] Verification code created for ${normalizedEmail}: ${verification.code}`);

    // Send actual email with the code
    const emailResult = await sendVerificationEmail(recovery_email, verification.code);

    if (!emailResult.success) {
      console.error('[AUTH] Failed to send verification email:', emailResult.error);
      // Return the code in response for fallback if email fails
      return res.json({
        success: true,
        message: 'Verification code generated. Email delivery failed - please use the code below.',
        code: verification.code,
        emailError: emailResult.error
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your recovery email',
      // Always return code for development/testing
      code: verification.code
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
});

// @route   POST /api/auth/verify-code
// @desc    Verify email verification code
// @access  Private
router.post('/verify-code', auth, async (req, res) => {
  try {
    const { recovery_email, email, code } = req.body;
    const user_id = req.user?.user_id;
    const normalizedEmail = String(recovery_email || email || '').trim().toLowerCase();
    const normalizedCode = String(code || '').trim();

    if (!normalizedEmail || !normalizedCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const result = await VerificationCode.verify({
      user_id,
      email: normalizedEmail,
      code: normalizedCode,
      type: 'email_verification'
    });

    if (result.success) {
      await User.update(user_id, { recovery_email: normalizedEmail });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code'
    });
  }
});

// @route   POST /api/auth/find-account
// @desc    Find account by email or username
// @access  Public
router.post('/find-account', async (req, res) => {
  try {
    const { email, username } = req.body;

    if (!email && !username) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required'
      });
    }

    let user = null;

    if (email) {
      user = await User.getByEmail(email);
    } else if (username) {
      // Find by username - need to add this method or use existing
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .eq('username', username)
        .eq('status', 'active')
        .single();

      if (!error && users) {
        user = {
          ...users,
          school_name: users.schools?.school_name,
          school_code: users.schools?.school_code,
          role_name: users.roles?.role_name
        };
        delete user.password;
        delete user.schools;
        delete user.roles;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email or username.'
      });
    }

    // Mask the email for security (show first 2 chars and domain)
    const maskedEmail = user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';

    res.json({
      success: true,
      message: 'Account found',
      email: user.email,
      recovery_email: user.recovery_email,
      masked_email: maskedEmail,
      username: user.username
    });
  } catch (error) {
    console.error('Find account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find account'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset code to user's recovery_email (1-to-1 verification)
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // First, find user by login email to get user_id
    const user = await User.getByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please use your login email.'
      });
    }

    // Check if user has a recovery_email set
    if (!user.recovery_email) {
      return res.status(400).json({
        success: false,
        message: 'No recovery email set for this account. Please contact your school administrator.'
      });
    }

    // Create verification code for password reset using the user's recovery_email
    const verification = await VerificationCode.create({
      user_id: user.user_id,
      email: user.recovery_email,
      type: 'password_reset'
    });

    console.log(`[AUTH] Password reset for user_id ${user.user_id}, sending code to recovery_email: ${user.recovery_email}`);

    // Send actual email with the code to the recovery_email
    const emailResult = await sendVerificationEmail(user.recovery_email, verification.code);

    if (!emailResult.success) {
      console.error('[AUTH] Failed to send password reset email:', emailResult.error);
      // Log the code for fallback
      console.log(`[PASSWORD RESET] Code for ${user.recovery_email}: ${verification.code}`);
    }

    res.json({
      success: true,
      message: `Password reset code has been sent to your recovery email (${user.recovery_email}).`,
      recovery_email: user.recovery_email,
      // For development only - remove in production
      code: process.env.NODE_ENV === 'development' ? verification.code : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset code'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with verification code
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, new_password } = req.body;

    if (!email || !code || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Email, code, and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get user by login email to get user_id and recovery_email
    const user = await User.getByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    if (!user.recovery_email) {
      return res.status(400).json({
        success: false,
        message: 'No recovery email set for this account'
      });
    }

    // Verify the reset code against the user's recovery_email
    const verificationResult = await VerificationCode.verify({
      user_id: user.user_id,
      email: user.recovery_email,
      code: code,
      type: 'password_reset'
    });

    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Update user's password
    await User.update(user.user_id, { password: new_password });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
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
