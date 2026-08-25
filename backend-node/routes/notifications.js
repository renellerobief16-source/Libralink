const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/notifications/user/:user_id
// @desc    Get notifications by user ID
// @access  Private
router.get('/user/:user_id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/notifications/admin
// @desc    Get all notifications (admin)
// @access  Private (Super Admin, Librarian Admin)
router.get('/admin', auth, requireRole(['Super Admin', 'Librarian Admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        users(firstname, lastname, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
