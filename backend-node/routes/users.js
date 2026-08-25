const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { uploadProfile } = require('../middleware/upload');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Super Admin, Librarian Admin, Librarian)
router.get('/', auth, requireRole(['Super Admin', 'Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error getting users:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to retrieve users. Please try again.' });
  }
});

// @route   POST /api/users/profile-picture
// @desc    Upload current user's profile picture
// @access  Private
router.post('/profile-picture', auth, uploadProfile.single('profile_picture'), async (req, res) => {
  try {
    console.log('[PROFILE PICTURE] Upload request received');
    console.log('[PROFILE PICTURE] File:', req.file);
    console.log('[PROFILE PICTURE] User ID from token:', req.user.user_id);
    
    if (!req.file) {
      console.log('[PROFILE PICTURE] No file uploaded');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
    console.log('[PROFILE PICTURE] Profile picture URL:', profilePictureUrl);

    const result = await User.update(req.user.user_id, { profile_image: profilePictureUrl });
    console.log('[PROFILE PICTURE] Update result:', result);

    if (result) {
      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profile_picture: profilePictureUrl,
        profile_image: profilePictureUrl,
      });
    } else {
      res.status(400).json({ success: false, message: 'Failed to update profile picture' });
    }
  } catch (error) {
    console.error('[PROFILE PICTURE] Error uploading profile picture:', error);
    console.error('[PROFILE PICTURE] Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to upload profile picture. Please try again.' });
  }
});

// @route   GET /api/users/student/:student_id
// @desc    Get student by student ID (student_number)
// @access  Private (Librarian, Librarian Admin)
router.get('/student/:student_id', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    const user = await User.getByStudentNumber(req.params.student_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting student by student ID:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to retrieve student information. Please try again.' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting user:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to retrieve user information. Please try again.' });
  }
});

// @route   GET /api/users/school/:school_id
// @desc    Get users by school
// @access  Private
router.get('/school/:school_id', auth, async (req, res) => {
  try {
    const { role_id } = req.query;
    const users = await User.getBySchool(req.params.school_id, role_id);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error getting users by school:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to retrieve school users. Please try again.' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Super Admin, Librarian Admin for their school)
router.post('/', auth, async (req, res) => {
  try {
    const { role_id } = req.body;
    const userRole = req.user.role_name || req.user.role;

    console.log('Create user request - User role:', userRole);
    console.log('Create user request - User school_id:', req.user.school_id);
    console.log('Create user request - Request body school_id:', req.body.school_id);
    console.log('Create user request - Request body role_id:', role_id);

    // Librarian Admin can create users for their school
    if (userRole === 'Librarian Admin') {
      // Librarian Admin can create users with any role for their school
      // Use the school_id from request body (from localStorage)
    } else if (userRole !== 'Super Admin') {
      console.log('Unauthorized - User role:', userRole);
      return res.status(403).json({ success: false, message: 'Unauthorized to create users' });
    }

    const result = await User.create(req.body);
    res.json({ success: true, data: result, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error details:', error.message);
    
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to create user. Please try again.' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await User.update(req.params.id, req.body);
    if (result) {
      res.json({ success: true, message: 'User updated successfully' });
    } else {
      res.status(400).json({ success: false, message: 'No changes made' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to update user. Please try again.' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Super Admin)
router.delete('/:id', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const result = await User.delete(req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to delete user. Please try again.' });
  }
});

// @route   POST /api/users/:id/profile-image
// @desc    Upload user profile image
// @access  Private
router.post('/:id/profile-image', auth, uploadProfile.single('profile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const profileImageUrl = `/uploads/profiles/${req.file.filename}`;

    const result = await User.update(req.params.id, { profile_image: profileImageUrl });

    if (result) {
      res.json({ success: true, message: 'Profile image uploaded successfully', profileImageUrl });
    } else {
      res.status(400).json({ success: false, message: 'Failed to update profile image' });
    }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to upload profile image. Please try again.' });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Change user password
// @access  Private
router.put('/:id/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    const result = await User.changePassword(req.params.id, currentPassword, newPassword);
    
    if (result.success) {
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error changing password:', error);
    console.error('Error details:', error.message);
    
    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }
    
    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }
    
    res.status(500).json({ success: false, message: 'Unable to change password. Please try again.' });
  }
});

module.exports = router;
