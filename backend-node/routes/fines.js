const express = require('express');
const router = express.Router();
const Fine = require('../models/Fine');
const { auth, requireRole } = require('../middleware/auth');

// @route   GET /api/fines/school/:school_id
// @desc    Get fines by school
// @access  Private (Librarian Admin, Librarian)
router.get('/school/:school_id', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const fines = await Fine.getBySchool(req.params.school_id);
    res.json({ success: true, data: fines });
  } catch (error) {
    console.error('Error getting fines by school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/fines/:id
// @desc    Get fine by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const fine = await Fine.getById(req.params.id);
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine not found' });
    }
    res.json({ success: true, data: fine });
  } catch (error) {
    console.error('Error getting fine:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/fines
// @desc    Create new fine
// @access  Private (Librarian Admin)
router.post('/', auth, requireRole(['Librarian Admin']), async (req, res) => {
  try {
    const fine_id = await Fine.create(req.body);
    res.status(201).json({ success: true, message: 'Fine created successfully', fine_id });
  } catch (error) {
    console.error('Error creating fine:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/fines/:id/status
// @desc    Update fine status
// @access  Private (Librarian Admin)
router.put('/:id/status', auth, requireRole(['Librarian Admin']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    const result = await Fine.updateStatus(req.params.id, status);
    if (result) {
      res.json({ success: true, message: 'Fine status updated successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to update fine status' });
    }
  } catch (error) {
    console.error('Error updating fine status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/fines/:id
// @desc    Delete fine
// @access  Private (Librarian Admin)
router.delete('/:id', auth, requireRole(['Librarian Admin']), async (req, res) => {
  try {
    const result = await Fine.delete(req.params.id);
    if (result) {
      res.json({ success: true, message: 'Fine deleted successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to delete fine' });
    }
  } catch (error) {
    console.error('Error deleting fine:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
