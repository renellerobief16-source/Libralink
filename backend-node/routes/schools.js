const express = require('express');
const router = express.Router();
const School = require('../models/School');
const { auth, requireRole } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

// @route   GET /api/schools
// @desc    Get all schools
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const schools = await School.getAll();
    res.json({ success: true, data: schools });
  } catch (error) {
    console.error('Error getting schools:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/schools/public
// @desc    Get the public identity of registered schools for the landing page
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const supabase = require('../config/database');
    const { data, error } = await supabase
      .from('schools')
      .select('school_id, school_name, school_code, logo')
      .order('school_name');

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting public schools:', error);
    res.status(500).json({ success: false, message: 'Unable to load registered schools' });
  }
});

// @route   GET /api/schools/:id
// @desc    Get school by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const school = await School.getById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    res.json({ success: true, data: school });
  } catch (error) {
    console.error('Error getting school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/schools
// @desc    Create new school
// @access  Private (Super Admin)
router.post('/', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const { school_name, school_code } = req.body;

    if (!school_name || !school_code) {
      return res.status(400).json({
        success: false,
        message: 'School name and code are required'
      });
    }

    const school_id = await School.create(req.body);
    res.status(201).json({
      success: true,
      message: 'School created successfully',
      school_id
    });
  } catch (error) {
    console.error('Error creating school:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'School code already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/schools/:id/logo
// @desc    Upload school logo
// @access  Private (Super Admin)
router.post('/:id/logo', auth, requireRole(['Super Admin']), uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    const result = await School.update(req.params.id, { logo: logoUrl });
    
    if (result) {
      res.json({ success: true, message: 'Logo uploaded successfully', logoUrl });
    } else {
      res.status(400).json({ success: false, message: 'Failed to update school logo' });
    }
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/schools/:id
// @desc    Update school
// @access  Private (Super Admin)
router.put('/:id', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const result = await School.update(req.params.id, req.body);
    if (result) {
      res.json({ success: true, message: 'School updated successfully' });
    } else {
      res.status(400).json({ success: false, message: 'No changes made' });
    }
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/schools/:id
// @desc    Delete school
// @access  Private (Super Admin)
router.delete('/:id', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const result = await School.delete(req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/schools/:id/partners
// @desc    Get partner schools with book availability
// @access  Private
router.get('/:id/partners', auth, async (req, res) => {
  try {
    const currentSchoolId = parseInt(req.params.id);
    const supabase = require('../config/database');

    // Get all schools except current school
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('school_id, school_name, school_code, address, logo')
      .neq('school_id', currentSchoolId);

    if (schoolsError) throw schoolsError;

    // Get book counts for each partner school
    const partnerData = await Promise.all(
      (schools || []).map(async (school) => {
        const { data: books, error: booksError } = await supabase
          .from('books')
          .select('book_id')
          .eq('school_id', school.school_id);

        if (booksError) {
          console.error(`Error getting books for school ${school.school_id}:`, booksError);
          return {
            school_id: school.school_id,
            name: school.school_name,
            available: 0,
            status: 'Available'
          };
        }

        // Count available copies for this school
        const bookIds = (books || []).map(b => b.book_id);
        let availableCount = 0;

        if (bookIds.length > 0) {
          const { data: copies, error: copiesError } = await supabase
            .from('book_copies')
            .select('status')
            .in('book_id', bookIds)
            .eq('status', 'available');

          if (!copiesError) {
            availableCount = (copies || []).length;
          }
        }

        return {
          school_id: school.school_id,
          name: school.school_name,
          school_code: school.school_code,
          logo: school.logo,
          available: availableCount,
          status: availableCount > 0 ? 'Available' : 'No copies available'
        };
      })
    );

    // Sort by available count (descending) and return top 3
    const sortedPartners = partnerData
      .filter(p => p.available > 0)
      .sort((a, b) => b.available - a.available)
      .slice(0, 3);

    res.json({ success: true, data: sortedPartners });
  } catch (error) {
    console.error('Error getting partner schools:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
