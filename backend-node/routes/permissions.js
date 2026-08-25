const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/permissions
// @desc    Get all permissions
// @access  Private (Super Admin)
router.get('/', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    // For now, return role-based permissions since we don't have a permissions table
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*');
    
    if (error) throw error;
    
    // Map roles to permissions
    const permissions = roles.map(role => ({
      role_id: role.role_id,
      role_name: role.role_name,
      permissions: getRolePermissions(role.role_name)
    }));
    
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function getRolePermissions(roleName) {
  const permissions = {
    'Super Admin': [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'schools.create', 'schools.read', 'schools.update', 'schools.delete',
      'books.create', 'books.read', 'books.update', 'books.delete',
      'borrows.create', 'borrows.read', 'borrows.update', 'borrows.delete',
      'roles.read', 'roles.update',
      'activity_logs.read',
      'announcements.create', 'announcements.read', 'announcements.update', 'announcements.delete'
    ],
    'Librarian Admin': [
      'users.read', 'users.update',
      'schools.read',
      'books.create', 'books.read', 'books.update', 'books.delete',
      'borrows.create', 'borrows.read', 'borrows.update',
      'activity_logs.read',
      'announcements.create', 'announcements.read', 'announcements.update'
    ],
    'Librarian': [
      'books.read', 'books.update',
      'borrows.create', 'borrows.read', 'borrows.update',
      'activity_logs.read'
    ],
    'Student': [
      'books.read',
      'borrows.create', 'borrows.read'
    ]
  };
  
  return permissions[roleName] || [];
}

module.exports = router;
