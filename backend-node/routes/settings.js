const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const Setting = require('../models/Setting');

// @route   GET /api/settings
// @desc    Get all system settings
// @access  Private (Super Admin)
router.get('/', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/settings/batch
// @desc    Update multiple system settings
// @access  Private (Super Admin)
router.post('/batch', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || (typeof settings !== 'object' && !Array.isArray(settings))) {
      return res.status(400).json({ success: false, message: 'Settings payload is required' });
    }

    const updatedSettings = await Setting.upsertMany(settings);
    res.json({ success: true, data: updatedSettings, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/settings/reset
// @desc    Reset settings to default values
// @access  Private (Super Admin)
router.post('/reset', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const settings = await Setting.resetDefaults();
    res.json({ success: true, data: settings, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
