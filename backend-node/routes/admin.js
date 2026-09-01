const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/admin/analytics
// @desc    Get analytics data for dashboard
// @access  Private (Super Admin)
router.get('/analytics', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const now = new Date();
    const monthLabels = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthLabels.push(monthDate.toLocaleString('en-US', { month: 'short' }));
    }

    const { data: borrowRows, error: borrowError } = await supabase
      .from('borrow_transactions')
      .select('borrow_date');

    if (borrowError) throw borrowError;

    const monthlyCounts = monthLabels.reduce((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});

    (borrowRows || []).forEach((row) => {
      if (!row.borrow_date) return;
      const date = new Date(row.borrow_date);
      const monthLabel = date.toLocaleString('en-US', { month: 'short' });
      if (monthlyCounts[monthLabel] !== undefined) {
        monthlyCounts[monthLabel] += 1;
      }
    });

    const monthlyBorrows = monthLabels.map((month) => ({
      month,
      count: monthlyCounts[month] || 0,
    }));

    const [{ data: schools, error: schoolError }, { data: books, error: bookError }, { data: activeBorrows, error: borrowActiveError }, { data: categories, error: categoryError }] = await Promise.all([
      supabase.from('schools').select('school_id, school_name'),
      supabase.from('books').select('book_id, school_id, category_id'),
      supabase.from('borrow_transactions').select('book_copies(book_id)').eq('status', 'active'),
      supabase.from('categories').select('category_id, category_name'),
    ]);

    if (schoolError) throw schoolError;
    if (bookError) throw bookError;
    if (borrowActiveError) throw borrowActiveError;
    if (categoryError) throw categoryError;

    const bookMap = (books || []).reduce((acc, book) => {
      acc[book.book_id] = book;
      return acc;
    }, {});

    const schoolWiseData = (schools || []).map((school) => ({
      school_name: school.school_name,
      total_books: (books || []).filter((book) => book.school_id === school.school_id).length,
      active_borrows: (activeBorrows || []).filter((borrow) => bookMap[borrow.book_copies?.book_id]?.school_id === school.school_id).length,
    }));

    const categoryWiseData = (categories || []).map((category) => ({
      category: category.category_name,
      count: (books || []).filter((book) => book.category_id === category.category_id).length,
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    res.json({
      success: true,
      data: {
        monthlyBorrows,
        schoolWiseData,
        categoryWiseData,
      },
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs
// @access  Private (Super Admin)
router.get('/audit-logs', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    console.log('[AUDIT LOGS] Fetching audit logs with limit:', limit);
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select('log_id as id, activity as action, users(firstname, lastname, schools(school_name)), created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AUDIT LOGS] Supabase error:', error);
      console.error('[AUDIT LOGS] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('[AUDIT LOGS] Successfully fetched', data?.length || 0, 'logs');
    
    const transformedData = (data || []).map((log) => ({
      id: log.id,
      action: log.action,
      user: log.users ? `${log.users.firstname} ${log.users.lastname}` : 'System',
      target: log.users?.schools?.school_name || 'System',
      timestamp: log.created_at,
    }));

    res.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('[AUDIT LOGS] Error getting audit logs:', error);
    console.error('[AUDIT LOGS] Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/system-health
// @desc    Get system health status
// @access  Private (Super Admin)
router.get('/system-health', auth, requireRole(['Super Admin']), async (req, res) => {
  try {
    // Check database connection
    const dbStart = Date.now();
    await supabase.from('users').select('count', { count: 'exact', head: true });
    const dbResponseTime = Date.now() - dbStart;

    // Get database stats
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalBooks } = await supabase.from('books').select('*', { count: 'exact', head: true });
    const { count: activeBorrows } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: overdueBorrows } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('status', 'active').lt('due_date', new Date().toISOString());

    res.json({
      success: true,
      data: {
        apiStatus: 'online',
        dbStatus: 'connected',
        apiResponseTime: Math.floor(Math.random() * 50) + 20, // Simulated API response time
        dbResponseTime: dbResponseTime,
        cpuUsage: Math.floor(Math.random() * 40) + 30, // Simulated CPU usage
        memoryUsage: Math.floor(Math.random() * 30) + 50, // Simulated memory usage
        diskUsage: Math.floor(Math.random() * 20) + 40, // Simulated disk usage
        stats: {
          total_users: totalUsers || 0,
          total_books: totalBooks || 0,
          active_borrows: activeBorrows || 0,
          overdue_borrows: overdueBorrows || 0
        },
      },
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ 
      success: false, 
      data: {
        apiStatus: 'online',
        dbStatus: 'disconnected',
        apiResponseTime: 0,
        dbResponseTime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
      },
    });
  }
});

module.exports = router;
