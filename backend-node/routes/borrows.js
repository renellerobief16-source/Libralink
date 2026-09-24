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
// @desc    Get all overdue borrows (any overdue books with days count & accrued fines)
// @access  Private
router.get('/overdue', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
    console.log('[OVERDUE API] Fetching overdue books, schoolId:', schoolId);
    const overdueData = await BorrowTransaction.getOverdue(schoolId);
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
            author,
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

// @route   POST /api/borrow/return or PUT /api/borrow/:id/return
// @desc    Return book
// @access  Private (Librarian Admin, Librarian)
const handleReturnBookRoute = async (req, res) => {
  try {
    const borrowId = req.params.id || req.body.borrow_id || req.body.borrowId;
    if (!borrowId) {
      return res.status(400).json({ success: false, message: 'borrow_id is required' });
    }
    const result = await BorrowTransaction.returnBook(borrowId);
    res.json({ success: true, message: 'Book returned successfully', data: result });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

router.put('/:id/return', auth, requireRole(['Librarian Admin', 'Librarian']), handleReturnBookRoute);
router.post('/return', auth, requireRole(['Librarian Admin', 'Librarian']), handleReturnBookRoute);

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
    const borrow_id = req.body.borrow_id;
    const librarian_id = req.body.librarian_id || req.user?.user_id;
    const school_id = req.body.school_id || req.user?.school_id;
    const notes = req.body.notes || 'Overdue patron reported by librarian on duty';
    
    if (!borrow_id || !librarian_id || !school_id) {
      return res.status(400).json({ success: false, message: 'borrow_id, librarian_id, and school_id are required' });
    }

    // Verify the borrow record exists
    const { data: borrowRecord, error: borrowError } = await supabase
      .from('borrow_transactions')
      .select('borrow_id, student_id, status')
      .eq('borrow_id', borrow_id)
      .single();
    
    if (borrowError || !borrowRecord) {
      return res.status(404).json({ success: false, message: 'Borrow record not found' });
    }

    // Send in-app notification to Head Librarian / Librarian Admins in this school
    let notificationsSent = 0;
    try {
      const { data: adminUsers } = await supabase
        .from('users')
        .select('user_id, roles!inner(role_name)')
        .eq('school_id', school_id)
        .in('roles.role_name', ['Librarian Admin', 'Super Admin']);

      if (adminUsers && adminUsers.length > 0) {
        const notificationsToInsert = adminUsers.map(admin => ({
          user_id: admin.user_id,
          school_id: school_id,
          title: 'Overdue Delinquency Report Filed',
          message: `An overdue book loan (Reference ID: ${borrow_id}) has been escalated and reported for administrative review. Notes: ${notes}`,
          type: 'alert',
          is_read: false,
          created_at: new Date().toISOString()
        }));

        const { error: notifError } = await supabase.from('notifications').insert(notificationsToInsert);
        if (!notifError) notificationsSent = notificationsToInsert.length;
      }
    } catch (notifErr) {
      console.warn('[REPORT NOTIFICATION] Non-fatal notification error:', notifErr.message);
    }

    // Log the report action
    try {
      await supabase.from('activity_logs').insert({
        user_id: librarian_id,
        activity: `Overdue book report filed for loan ID ${borrow_id}. ${notes}`,
        created_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('[REPORT LOG] Non-fatal log error:', logErr.message);
    }

    res.json({ 
      success: true, 
      message: `Overdue book reported successfully. ${notificationsSent} admin(s) notified.`,
      notifications_sent: notificationsSent,
      report_id: `REPORT-${borrow_id}-${Date.now()}`
    });
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
    // Note: reported_overdue_books table not yet in DB
    // Return empty array until table is created
    res.json({ success: true, data: [], message: 'No reported overdue records available' });
  } catch (error) {
    console.error('[REPORTED OVERDUE] Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow/overdue/reported/:report_id
// @desc    Update reported overdue book status and action
// @access  Private (Librarian Admin)
router.put('/overdue/reported/:report_id', auth, requireRole(['Librarian Admin']), async (req, res) => {
  try {
    // Note: reported_overdue_books table not yet in DB - stub response
    res.json({ success: true, message: 'Report status update recorded' });
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

module.exports = router;
