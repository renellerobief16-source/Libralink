const express = require('express');
const router = express.Router();
const BorrowTransaction = require('../models/BorrowTransaction');
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/borrow/active
// @desc    Get all active borrows
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const borrows = await BorrowTransaction.getAllActive();
    res.json({ success: true, data: borrows });
  } catch (error) {
    console.error('Error getting active borrows:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/overdue
// @desc    Get all overdue borrows (any overdue books with days count)
// @access  Private
router.get('/overdue', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
    
    console.log('[OVERDUE API] Fetching overdue books, schoolId:', schoolId);
    
    // First, get all overdue books without school filter
    let query = supabase
      .from('borrow_transactions')
      .select(`
        *,
        student:student_id(firstname, lastname, student_number, email, contact_number),
        book_copies(accession_number, books(title, isbn, schools(school_name)))
      `)
      .eq('status', 'active')
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[OVERDUE API] Supabase error:', error);
      // Fallback: try without nested relationships
      let fallbackQuery = supabase
        .from('borrow_transactions')
        .select('*')
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true });

      const fallbackResult = await fallbackQuery;
      
      const overdueData = (fallbackResult.data || []).map(borrow => {
        const dueDate = new Date(borrow.due_date);
        const today = new Date();
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return {
          ...borrow,
          days_overdue: daysOverdue > 0 ? daysOverdue : 0
        };
      });
      
      res.json({ success: true, data: overdueData });
      return;
    }
    
    console.log('[OVERDUE API] Raw data count (before filter):', data?.length || 0);
    
    // Calculate days overdue and filter by school if needed
    let overdueData = (data || []).map(borrow => {
      const dueDate = new Date(borrow.due_date);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      return {
        ...borrow,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0
      };
    });
    
    // Filter by school_id in JavaScript if provided
    if (schoolId) {
      overdueData = overdueData.filter(borrow => 
        borrow.book_copies?.books?.schools?.school_id === parseInt(schoolId)
      );
      console.log('[OVERDUE API] After school filter:', overdueData.length);
    }
    
    console.log('[OVERDUE API] Processed overdue books:', overdueData.length);
    
    res.json({ success: true, data: overdueData });
  } catch (error) {
    console.error('Error getting overdue borrows:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/active/school
// @desc    Get active borrows by school via query string
// @access  Private
router.get('/active/school', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id query parameter is required' });
    }

    const borrows = await BorrowTransaction.getActiveBySchool(schoolId);
    res.json({ success: true, data: borrows });
  } catch (error) {
    console.error('Error getting active borrows by school (query):', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/active/school/:school_id
// @desc    Get active borrows by school
// @access  Private
router.get('/active/school/:school_id', auth, async (req, res) => {
  try {
    const borrows = await BorrowTransaction.getActiveBySchool(req.params.school_id);
    res.json({ success: true, data: borrows });
  } catch (error) {
    console.error('Error getting active borrows by school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/history
// @desc    Get current user's borrow history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const studentId = req.user.user_id;
    console.log('[BORROW HISTORY] Getting history for student:', studentId);
    
    const borrows = await BorrowTransaction.getHistoryByStudent(studentId);
    res.json({ success: true, data: borrows });
  } catch (error) {
    console.error('[BORROW HISTORY] Error getting borrow history:', error);
    console.error('[BORROW HISTORY] Error details:', error.message);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/borrow/student/:student_id/active
// @desc    Get active borrows by student
// @access  Private
router.get('/student/:student_id/active', auth, async (req, res) => {
  try {
    const borrows = await BorrowTransaction.getActiveByStudent(req.params.student_id);
    res.json({ success: true, data: borrows });
  } catch (error) {
    console.error('Error getting active borrows by student:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/student/:student_id/history
// @desc    Get borrow history by student
// @access  Private
router.get('/student/:student_id/history', auth, async (req, res) => {
  try {
    const borrows = await BorrowTransaction.getHistoryByStudent(req.params.student_id);
    res.json({ success: true, data: borrows });
  } catch (error) {
    console.error('Error getting borrow history by student:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/student/:student_id
// @desc    Get all borrows (active and history) by student
// @access  Private
router.get('/student/:student_id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrow_transactions')
      .select(`
        *,
        book_copies(
          copy_id,
          accession_number,
          books(
            title,
            isbn,
            authors,
            schools(school_name)
          )
        )
      `)
      .eq('student_id', req.params.student_id)
      .order('borrow_date', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting student borrows:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/:id
// @desc    Get borrow transaction by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const borrow = await BorrowTransaction.getById(req.params.id);
    if (!borrow) {
      return res.status(404).json({ success: false, message: 'Borrow transaction not found' });
    }
    res.json({ success: true, data: borrow });
  } catch (error) {
    console.error('Error getting borrow transaction:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/borrow
// @desc    Create borrow request
// @access  Private (Student)
router.post('/', auth, requireRole(['Student']), async (req, res) => {
  try {
    const { copy_id, student_id, due_date } = req.body;
    if (!copy_id || !student_id || !due_date) {
      return res.status(400).json({ success: false, message: 'copy_id, student_id, and due_date are required' });
    }
    const borrow_id = await BorrowTransaction.create(req.body);
    res.status(201).json({ success: true, message: 'Book borrowed successfully', borrow_id });
  } catch (error) {
    console.error('Error creating borrow:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow/:id/return
// @desc    Return book
// @access  Private (Librarian Admin, Librarian)
router.put('/:id/return', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const result = await BorrowTransaction.returnBook(req.params.id);
    res.json({ success: true, message: 'Book returned successfully', data: result });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PUT /api/borrow/:id
// @desc    Update borrow transaction
// @access  Private (Librarian Admin, Librarian)
router.put('/:id', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const result = await BorrowTransaction.update(req.params.id, req.body);
    if (result) {
      res.json({ success: true, message: 'Borrow transaction updated successfully' });
    } else {
      res.status(400).json({ success: false, message: 'No changes made' });
    }
  } catch (error) {
    console.error('Error updating borrow transaction:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/borrow/overdue/report
// @desc    Report overdue book to admin-librarian
// @access  Private (Librarian)
router.post('/overdue/report', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    const { borrow_id, librarian_id, school_id, notes } = req.body;
    
    if (!borrow_id || !librarian_id || !school_id) {
      return res.status(400).json({ success: false, message: 'borrow_id, librarian_id, and school_id are required' });
    }

    // Check if already reported
    const { data: existingReport } = await supabase
      .from('reported_overdue_books')
      .select('*')
      .eq('borrow_id', borrow_id)
      .single();

    if (existingReport) {
      return res.status(400).json({ success: false, message: 'This book has already been reported' });
    }

    // Insert report
    const { data: report, error } = await supabase
      .from('reported_overdue_books')
      .insert({
        borrow_id,
        reported_by: librarian_id,
        school_id,
        notes: notes || null,
        status: 'pending',
        reported_at: new Date().toISOString()
      })
      .select('report_id')
      .single();

    if (error) throw error;

    res.json({ success: true, message: 'Overdue book reported successfully', report_id: report.report_id });
  } catch (error) {
    console.error('Error reporting overdue book:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/overdue/reported
// @desc    Get reported overdue books for admin-librarian
// @access  Private (Librarian Admin)
router.get('/overdue/reported', auth, requireRole(['Librarian Admin']), async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
    
    console.log('[REPORTED OVERDUE] Fetching reported overdue books, schoolId:', schoolId);
    
    let query = supabase
      .from('reported_overdue_books')
      .select(`
        *,
        borrow_transactions!inner(
          student:student_id(firstname, lastname, student_number, email, contact_number),
          book_copies!inner(accession_number, books!inner(title, isbn, schools!inner(school_name))),
          due_date
        )
      `)
      .order('reported_at', { ascending: false });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[REPORTED OVERDUE] Supabase error:', error);
      throw error;
    }

    console.log('[REPORTED OVERDUE] Raw data count:', data?.length || 0);

    // Calculate days overdue for each reported book
    const reportedData = (data || []).map(report => {
      const dueDate = new Date(report.borrow_transactions?.due_date);
      const today = new Date();
      const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
      return {
        ...report,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0
      };
    });

    console.log('[REPORTED OVERDUE] Processed reported overdue books:', reportedData.length);

    res.json({ success: true, data: reportedData });
  } catch (error) {
    console.error('[REPORTED OVERDUE] Error getting reported overdue books:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow/overdue/reported/:report_id
// @desc    Update reported overdue book status and action
// @access  Private (Librarian Admin)
router.put('/overdue/reported/:report_id', auth, requireRole(['Librarian Admin']), async (req, res) => {
  try {
    const { status, action, notes } = req.body;
    
    const { error } = await supabase
      .from('reported_overdue_books')
      .update({
        status,
        action,
        notes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: req.user.user_id
      })
      .eq('report_id', req.params.report_id);

    if (error) throw error;

    res.json({ success: true, message: 'Report updated successfully' });
  } catch (error) {
    console.error('Error updating reported overdue book:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow/returned
// @desc    Get returned books by date range
// @access  Private
router.get('/returned', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    console.log('[RETURNED BOOKS] Fetching returned books, schoolId:', schoolId, 'startDate:', startDate, 'endDate:', endDate);

    // Simplified query without nested joins
    let query = supabase
      .from('borrow_transactions')
      .select('*')
      .eq('status', 'returned')
      .order('return_date', { ascending: false });

    if (startDate) {
      query = query.gte('return_date', startDate);
    }

    if (endDate) {
      query = query.lte('return_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RETURNED BOOKS] Supabase error:', error);
      // Return empty array instead of 500 to prevent UI blocking
      res.json({ success: true, data: [] });
      return;
    }

    console.log('[RETURNED BOOKS] Raw data count:', data?.length || 0);

    let filteredData = data || [];

    // Filter by school_id in JavaScript after fetching
    if (schoolId) {
      filteredData = filteredData.filter(
        borrow => borrow.school_id === parseInt(schoolId)
      );
      console.log('[RETURNED BOOKS] After school filter:', filteredData.length);
    }

    res.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('[RETURNED BOOKS] Error getting returned books:', error);
    console.error('[RETURNED BOOKS] Error details:', error.message);
    // Return empty array instead of 500 to prevent UI blocking
    res.json({ success: true, data: [] });
  }
});

// @route   GET /api/borrow/history/school
// @desc    Get borrow history by school with date range
// @access  Private
router.get('/history/school', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id is required' });
    }

    let query = supabase
      .from('borrow_transactions')
      .select(`
        *,
        student:student_id(firstname, lastname, student_number),
        book_copies(
          copy_id,
          status,
          books(
            book_id,
            title,
            isbn,
            school_id,
            schools(school_id, school_name)
          )
        )
      `)
      .order('borrow_date', { ascending: false });

    if (startDate) {
      query = query.gte('borrow_date', startDate);
    }

    if (endDate) {
      query = query.lte('borrow_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[HISTORY SCHOOL] Supabase error:', error);
      // Fallback: try without nested relationships
      let fallbackQuery = supabase
        .from('borrow_transactions')
        .select('*')
        .order('borrow_date', { ascending: false });

      if (startDate) {
        fallbackQuery = fallbackQuery.gte('borrow_date', startDate);
      }

      if (endDate) {
        fallbackQuery = fallbackQuery.lte('borrow_date', endDate);
      }

      const fallbackResult = await fallbackQuery;
      res.json({ success: true, data: fallbackResult.data || [] });
      return;
    }

    // Filter by school_id in JavaScript after fetching
    const filteredData = (data || []).filter(
      borrow => borrow.book_copies?.books?.school_id === parseInt(schoolId)
    );

    res.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('Error getting school borrow history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
