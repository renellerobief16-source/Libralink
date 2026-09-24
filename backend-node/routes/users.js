const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { uploadProfile, uploadBorrowingId } = require('../middleware/upload');

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

// @route   POST /api/users/borrowing-id
// @desc    Upload an ID image for one borrowing request without changing the user's profile image
// @access  Private
router.post('/borrowing-id', auth, uploadBorrowingId.single('id_picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No ID image uploaded' });
    }

    return res.status(201).json({
      success: true,
      message: 'Borrowing ID uploaded successfully',
      id_picture_url: `/uploads/borrowing-ids/${req.file.filename}`,
    });
  } catch (error) {
    console.error('[BORROWING ID] Upload error:', error);
    return res.status(500).json({ success: false, message: 'Unable to upload borrowing ID. Please try again.' });
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

// @route   GET /api/users/school?school_id=1
// @desc    Get users by school using a query parameter
// @access  Private
router.get('/school', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id is required' });
    }

    const users = await User.getBySchool(schoolId, req.query.role_id);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error getting users by school:', error);
    res.status(500).json({ success: false, message: 'Unable to retrieve school users. Please try again.' });
  }
});
// @route   GET /api/users/head-librarian/:school_id
// @desc    Get the Head Librarian / Librarian Admin for a specific school
// @access  Private
router.get('/head-librarian/:school_id', auth, async (req, res) => {
  try {
    const schoolId = req.params.school_id;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id is required' });
    }

    const supabase = require('../config/database');
    // Look for users with 'Librarian Admin' or 'Super Admin' role in this school
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        user_id,
        firstname,
        middle_name,
        lastname,
        email,
        contact_number,
        position,
        profile_image,
        roles!inner(role_name)
      `)
      .eq('school_id', schoolId)
      .in('roles.role_name', ['Librarian Admin', 'Super Admin'])
      .limit(1);

    if (error) throw error;

    if (users && users.length > 0) {
      const u = users[0];
      return res.json({
        success: true,
        data: {
          user_id: u.user_id,
          name: `${u.firstname || ''} ${u.lastname || ''}`.trim(),
          firstname: u.firstname,
          lastname: u.lastname,
          email: u.email,
          contact_number: u.contact_number,
          position: u.position || 'Head Librarian',
          role_name: u.roles?.role_name || 'Librarian Admin',
          profile_image: u.profile_image
        }
      });
    }

    // Fallback: look for any Librarian in the school
    const { data: fallbackUsers } = await supabase
      .from('users')
      .select(`
        user_id,
        firstname,
        middle_name,
        lastname,
        email,
        contact_number,
        position,
        profile_image,
        roles!inner(role_name)
      `)
      .eq('school_id', schoolId)
      .in('roles.role_name', ['Librarian'])
      .limit(1);

    if (fallbackUsers && fallbackUsers.length > 0) {
      const u = fallbackUsers[0];
      return res.json({
        success: true,
        data: {
          user_id: u.user_id,
          name: `${u.firstname || ''} ${u.lastname || ''}`.trim(),
          firstname: u.firstname,
          lastname: u.lastname,
          email: u.email,
          contact_number: u.contact_number,
          position: u.position || 'Librarian In-Charge',
          role_name: u.roles?.role_name || 'Librarian',
          profile_image: u.profile_image
        }
      });
    }

    return res.json({
      success: true,
      data: null,
      message: 'No head librarian found for this school'
    });
  } catch (error) {
    console.error('Error fetching head librarian:', error);
    res.status(500).json({ success: false, message: 'Server error fetching head librarian' });
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
router.post('/', auth, uploadProfile.single('profile_image'), async (req, res) => {
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

    const userData = { ...req.body };
    if (req.file) {
      userData.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    const result = await User.create(userData);
    res.json({ success: true, data: result, message: 'User created successfully', profile_image: userData.profile_image });
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
router.put('/:id', auth, uploadProfile.single('profile_image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    const result = await User.update(req.params.id, updateData);
    if (result) {
      res.json({ success: true, message: 'User updated successfully', profile_image: updateData.profile_image });
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
