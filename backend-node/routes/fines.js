const express = require('express');
const router = express.Router();
const Fine = require('../models/Fine');
const LibrarySettings = require('../models/LibrarySettings');
const supabase = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

// @route   GET /api/fines/student/:student_id
// @desc    Get active overdue accrued fines and unpaid fine records for a student
// @access  Private (Student, Librarian, Librarian Admin)
router.get('/student/:student_id', auth, async (req, res) => {
  try {
    const studentId = req.params.student_id === 'me' ? req.user.user_id : req.params.student_id;
    
    // Resolve school ID
    const schoolId = req.user.school_id || req.query.school_id || '1';

    // Get fine policy for school
    let finePolicy = {
      enable_fines: true,
      fine_amount_per_day: 5.00,
      max_fine_cap: 500.00,
      grace_period_days: 0
    };
    try {
      if (schoolId) {
        const policy = await LibrarySettings.getFinePolicy(schoolId);
        if (policy) finePolicy = policy;
      }
    } catch (policyErr) {
      console.warn('[FINES ROUTE] Using default fine policy:', policyErr.message);
    }

    const fineRate = Number(finePolicy.fine_amount_per_day) || 5.00;
    const graceDays = Number(finePolicy.grace_period_days) || 0;
    const maxCap = Number(finePolicy.max_fine_cap) || 500.00;

    const manilaDateOptions = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
    const todayStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date());

    const overdueBooks = [];

    // 1. Check borrow_transactions for active loans with elapsed due_date
    const { data: activeTx, error: txError } = await supabase
      .from('borrow_transactions')
      .select(`
        borrow_id,
        due_date,
        borrow_date,
        status,
        book_copies(accession_number, books(book_id, title, author, cover_image))
      `)
      .eq('student_id', studentId)
      .in('status', ['active', 'overdue']);

    if (activeTx && activeTx.length > 0) {
      activeTx.forEach(tx => {
        if (!tx.due_date) return;
        let dueStr = '';
        if (typeof tx.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.due_date.trim())) {
          dueStr = tx.due_date.trim();
        } else {
          dueStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date(tx.due_date));
        }

        if (todayStr > dueStr) {
          const todayMs = new Date(todayStr + 'T00:00:00+08:00').getTime();
          const dueMs = new Date(dueStr + 'T00:00:00+08:00').getTime();
          const daysOverdue = Math.max(1, Math.round((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
          const chargeableDays = Math.max(0, daysOverdue - graceDays);
          const fineAmount = Math.min(chargeableDays * fineRate, maxCap);

          overdueBooks.push({
            id: tx.borrow_id,
            source: 'borrow_transaction',
            title: tx.book_copies?.books?.title || 'Borrowed Book',
            author: tx.book_copies?.books?.author || '',
            cover_image: tx.book_copies?.books?.cover_image || '',
            accession_number: tx.book_copies?.accession_number || '',
            borrow_date: tx.borrow_date,
            due_date: tx.due_date,
            days_overdue: daysOverdue,
            chargeable_days: chargeableDays,
            daily_rate: fineRate,
            fine_amount: fineAmount,
          });
        }
      });
    }

    // 2. Also check active borrow_requests that are marked borrowed/active/overdue
    const { data: activeReqs, error: reqsError } = await supabase
      .from('borrow_requests')
      .select(`
        request_id,
        due_date,
        created_at,
        status,
        items:borrow_request_items(
          item_id,
          status,
          book:book_id(book_id, title, author, cover_image)
        )
      `)
      .eq('student_id', studentId)
      .in('status', ['borrowed', 'active', 'overdue']);

    if (activeReqs && activeReqs.length > 0) {
      activeReqs.forEach(req => {
        if (!req.due_date) return;
        let dueStr = '';
        if (typeof req.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.due_date.trim())) {
          dueStr = req.due_date.trim();
        } else {
          dueStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date(req.due_date));
        }

        if (todayStr > dueStr) {
          const todayMs = new Date(todayStr + 'T00:00:00+08:00').getTime();
          const dueMs = new Date(dueStr + 'T00:00:00+08:00').getTime();
          const daysOverdue = Math.max(1, Math.round((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
          const chargeableDays = Math.max(0, daysOverdue - graceDays);
          const fineAmount = Math.min(chargeableDays * fineRate, maxCap);

          const items = Array.isArray(req.items) && req.items.length > 0 ? req.items : [{}];
          items.forEach(item => {
            const itemStatus = String(item.status || req.status || '').toLowerCase();
            if (['borrowed', 'active', 'overdue'].includes(itemStatus)) {
              const bookTitle = item.book?.title || 'Borrowed Book';
              const alreadyListed = overdueBooks.some(b => b.title === bookTitle && b.due_date === req.due_date);
              if (!alreadyListed) {
                overdueBooks.push({
                  id: item.item_id || req.request_id,
                  source: 'borrow_request',
                  title: bookTitle,
                  author: item.book?.author || '',
                  cover_image: item.book?.cover_image || '',
                  borrow_date: req.created_at,
                  due_date: req.due_date,
                  days_overdue: daysOverdue,
                  chargeable_days: chargeableDays,
                  daily_rate: fineRate,
                  fine_amount: fineAmount,
                });
              }
            }
          });
        }
      });
    }

    // 3. Check unpaid recorded fines from 'fines' table
    let recordedUnpaidFines = [];
    try {
      const { data: finesData, error: finesErr } = await supabase
        .from('fines')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['pending', 'unpaid'])
        .order('created_at', { ascending: false });

      if (!finesErr && Array.isArray(finesData)) {
        recordedUnpaidFines = finesData;
      }
    } catch (_) {
      // safe fallback if table does not exist
    }

    const accruedOverdueFines = overdueBooks.reduce((acc, b) => acc + (b.fine_amount || 0), 0);
    const recordedFinesTotal = recordedUnpaidFines.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
    const totalFines = accruedOverdueFines + recordedFinesTotal;

    const maxDaysOverdue = overdueBooks.reduce((max, b) => Math.max(max, b.days_overdue || 0), 0);

    res.json({
      success: true,
      data: {
        student_id: studentId,
        total_fines: totalFines,
        total_fines_formatted: `₱${totalFines.toFixed(2)}`,
        has_fines: totalFines > 0,
        overdue_books_count: overdueBooks.length,
        max_days_overdue: maxDaysOverdue,
        fine_rate_per_day: fineRate,
        overdue_books: overdueBooks,
        unpaid_fines: recordedUnpaidFines
      }
    });
  } catch (error) {
    console.error('[FINES ROUTE] Error getting student fines:', error);
    res.status(500).json({ success: false, message: 'Server error fetching student fines' });
  }
});

// @route   GET /api/fines/school/:school_id
// @desc    Get fines by school
// @access  Private (Librarian Admin, Librarian)
router.get('/school/:school_id', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const fines = await Fine.getBySchool(req.params.school_id);
    res.json({ success: true, data: fines || [] });
  } catch (error) {
    console.warn('[FINES ROUTE] Handled error getting fines by school:', error.message);
    res.json({ success: true, data: [] });
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
