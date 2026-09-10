const express = require('express');
const router = express.Router();
const LibrarySettings = require('../models/LibrarySettings');
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');

// Get all settings for a school
router.get('/school/:school_id', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const settings = await LibrarySettings.getAllSettings(req.params.school_id);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error getting settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get settings', error: error.message });
  }
});

// Get a specific setting
router.get('/school/:school_id/:setting_key', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const setting = await LibrarySettings.getSetting(req.params.school_id, req.params.setting_key);
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error getting setting:', error);
    res.status(500).json({ success: false, message: 'Failed to get setting', error: error.message });
  }
});

// Update a setting
router.put('/school/:school_id/:setting_key', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const { setting_value } = req.body;
    const setting = await LibrarySettings.updateSetting(req.params.school_id, req.params.setting_key, setting_value);
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error updating setting:', error);
    res.status(500).json({ success: false, message: 'Failed to update setting', error: error.message });
  }
});

// Get fine policy for a school
router.get('/fine-policy/:school_id', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const policy = await LibrarySettings.getFinePolicy(req.params.school_id);
    res.json({ success: true, data: policy });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error getting fine policy:', error);
    res.status(500).json({ success: false, message: 'Failed to get fine policy', error: error.message });
  }
});

// Update fine policy for a school
router.put('/fine-policy/:school_id', auth, requireRole(['Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const policy = await LibrarySettings.updateFinePolicy(req.params.school_id, req.body);
    res.json({ success: true, data: policy });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error updating fine policy:', error);
    res.status(500).json({ success: false, message: 'Failed to update fine policy', error: error.message });
  }
});

// Get full borrowing and fine policy for a school (available to Student, Librarian, Admin)
router.get('/policy/:school_id', auth, async (req, res) => {
  try {
    const policy = await LibrarySettings.getBorrowingPolicy(req.params.school_id);
    res.json({ success: true, data: policy });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error getting borrowing policy:', error);
    res.status(500).json({ success: false, message: 'Failed to get policy', error: error.message });
  }
});

// Update full borrowing and fine policy for a school (Admin only)
router.put('/policy/:school_id', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const userRole = String(req.user.role_name || req.user.role || '').toLowerCase().replace(/[-_]/g, ' ').trim();
    const userRoleId = Number(req.user.role_id || 0);
    const isSuperAdmin = userRoleId === 1 || userRole === 'super admin';
    if (!isSuperAdmin && req.user.school_id && String(req.user.school_id) !== String(req.params.school_id)) {
      return res.status(403).json({ success: false, message: 'You can only update policy for your own school' });
    }
    const policy = await LibrarySettings.updateBorrowingPolicy(req.params.school_id, req.body);
    
    // Record in activity log
    try {
      if (req.user && req.user.user_id) {
        await ActivityLog.create({
          user_id: req.user.user_id,
          activity: `Updated borrowing policy: Max ${policy.max_borrow_limit} books, ${policy.home_borrowing_days} days loan${policy.enable_fines ? `, ₱${policy.fine_amount_per_day}/day fine` : ', fine-free'}`,
          created_at: new Date().toISOString()
        });
      }
    } catch (logErr) {
      console.warn('[LIBRARY SETTINGS] Could not record activity log:', logErr.message);
    }

    res.json({ success: true, data: policy });
  } catch (error) {
    console.error('[LIBRARY SETTINGS] Error updating borrowing policy:', error);
    res.status(500).json({ success: false, message: 'Failed to update policy', error: error.message });
  }
});

module.exports = router;
