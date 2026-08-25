const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');

// @route   GET /api/activity-logs
// @desc    Get all activity logs
// @access  Private (Super Admin, Librarian Admin, Librarian)
router.get('/', auth, requireRole(['Super Admin', 'Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await ActivityLog.getAll(limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/activity-logs/recent
// @desc    Get recent activity logs
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const logs = await ActivityLog.getRecent(limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting recent activity logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/activity-logs/user/:user_id
// @desc    Get activity logs by user
// @access  Private
router.get('/user/:user_id', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await ActivityLog.getByUser(req.params.user_id, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting activity logs by user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/activity-logs/school
// @desc    Get activity logs by school via query param
// @access  Private
router.get('/school', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id query parameter is required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const logs = await ActivityLog.getBySchool(schoolId, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting activity logs by school (query):', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/activity-logs/school/:school_id
// @desc    Get activity logs by school
// @access  Private
router.get('/school/:school_id', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await ActivityLog.getBySchool(req.params.school_id, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting activity logs by school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/activity-logs
// @desc    Create activity log
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { user_id, activity } = req.body;
    if (!activity) {
      return res.status(400).json({ success: false, message: 'Activity description is required' });
    }
    const log_id = await ActivityLog.create(req.body);
    res.status(201).json({ success: true, message: 'Activity log created', log_id });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/activity-logs/old
// @desc    Delete old activity logs
// @access  Private (Super Admin)
router.delete('/old', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const daysToKeep = parseInt(req.query.days) || 30;
    const result = await ActivityLog.deleteOldLogs(daysToKeep);
    res.json(result);
  } catch (error) {
    console.error('Error deleting old activity logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
