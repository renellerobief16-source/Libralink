const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/announcements
// @desc    Get all announcements
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/announcements/school/:school_id
// @desc    Get announcements by school
// @access  Private
router.get('/school/:school_id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('school_id', req.params.school_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting school announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement
// @access  Private (Admin)
router.post('/', auth, requireRole(['Admin', 'Super Admin']), async (req, res) => {
  try {
    const { title, content, school_id, created_by } = req.body;
    
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        school_id,
        created_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
