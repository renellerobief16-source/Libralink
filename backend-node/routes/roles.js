const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/roles
// @desc    Get all roles
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('role_id');
    
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/roles/statistics
// @desc    Get role statistics
// @access  Private (Super Admin)
router.get('/statistics', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        role_id,
        role_name,
        users(count)
      `);
    
    if (error) throw error;
    res.json({ success: true, data: roles || [] });
  } catch (error) {
    console.error('Error getting role statistics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/roles/:id
// @desc    Get role by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('role_id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting role:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
