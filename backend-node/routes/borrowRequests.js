const express = require('express');
const router = express.Router();
const BorrowRequest = require('../models/BorrowRequest');
const LibrarySettings = require('../models/LibrarySettings');
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   GET /api/borrow-requests
// @desc    Get all borrow requests (Super Admin overview / system-wide queries)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, school_id } = req.query;
    let query = supabase
      .from('borrow_requests')
      .select(`
        *,
        student:student_id(firstname, lastname, student_number, email, profile_image),
        home_school:home_school_id(school_name, school_code),
        items:borrow_request_items(
          *,
          book:book_id(title, author),
          owner_school:owner_school_id(school_name, school_code),
          partner_school:partner_school_id(school_name, school_code)
        )
      `)
      .order('created_at', { ascending: false });

    if (school_id) {
      query = query.eq('home_school_id', school_id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error fetching all borrow requests:', error);
    res.status(500).json({ success: false, message: 'Server error fetching borrow requests' });
  }
});

/**
 * Check if a student has an unreturned overdue book at their home library.
 * Inter-school loans or non-overdue loans are not considered blockers for home campus.
 */
async function checkStudentHomeOverdue(studentId, homeSchoolId) {
  try {
    const now = new Date();

    // 1. Check borrow_transactions for active/overdue loans belonging to the student's home school
    const { data: activeTx, error: txError } = await supabase
      .from('borrow_transactions')
      .select(`
        borrow_id,
        due_date,
        status,
        school_id,
        book_copies(copy_id, book_id, books(book_id, school_id))
      `)
      .eq('student_id', studentId)
      .in('status', ['active', 'overdue']);

    if (activeTx && activeTx.length > 0) {
      for (const tx of activeTx) {
        const bookSchoolId = tx.book_copies?.books?.school_id || tx.school_id;
        const isHomeBook = !bookSchoolId || Number(bookSchoolId) === Number(homeSchoolId);
        if (isHomeBook) {
          if (tx.status === 'overdue') return true;
          if (tx.due_date && new Date(tx.due_date) < now) return true;
        }
      }
    }

    // 2. Also check active borrow_requests that are marked borrowed/active/overdue
    const { data: activeRequests, error: reqError } = await supabase
      .from('borrow_requests')
      .select(`
        request_id,
        due_date,
        status,
        home_school_id,
        items:borrow_request_items(owner_school_id, borrow_type, status)
      `)
      .eq('student_id', studentId)
      .in('status', ['borrowed', 'active', 'overdue']);

    if (activeRequests && activeRequests.length > 0) {
      for (const req of activeRequests) {
        const isOverdue = req.status === 'overdue' || (req.due_date && new Date(req.due_date) < now);
        if (isOverdue) {
          const hasHomeItem = (req.items || []).some(
            item => Number(item.owner_school_id) === Number(homeSchoolId) || item.borrow_type === 'HOME'
          );
          if (hasHomeItem || Number(req.home_school_id) === Number(homeSchoolId)) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (err) {
    console.error('[BORROW REQUESTS] Error in checkStudentHomeOverdue:', err);
    return false;
  }
}

// @route   GET /api/borrow-requests/student-overdue-status
// @desc    Check if current student has an overdue book at their home library
// @access  Private (Student)
router.get('/student-overdue-status', auth, requireRole(['Student']), async (req, res) => {
  try {
    const hasHomeOverdue = await checkStudentHomeOverdue(req.user.user_id, req.user.school_id);
    res.json({
      success: true,
      has_home_overdue: hasHomeOverdue,
      message: hasHomeOverdue 
        ? 'Borrowing Suspended (Home Campus): You have an overdue book at your home library. Please return it to borrow home books. (Inter-school borrowing is still available).'
        : null
    });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting student overdue status:', error);
    res.json({ success: true, has_home_overdue: false });
  }
});

// @route   POST /api/borrow-requests
// @desc    Create a new borrowing request
// @access  Private (Student)
router.post('/', auth, requireRole(['Student']), async (req, res) => {
  try {
    console.log('[BORROW REQUESTS] Creating new request for student:', req.user.user_id);

    // 0. Check if student has an overdue book at their home library
    // If student is requesting any HOME library book, block if they have an overdue home book
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const isRequestingHomeBook = items.some(item => {
      const ownerSchool = Number(item.owner_school_id);
      const borrowType = (item.borrow_type || '').toUpperCase();
      return (!ownerSchool || ownerSchool === Number(req.user.school_id)) && borrowType !== 'INTER_SCHOOL_LIBRARY_USE';
    });

    if (isRequestingHomeBook) {
      const hasHomeOverdue = await checkStudentHomeOverdue(req.user.user_id, req.user.school_id);
      if (hasHomeOverdue) {
        console.warn(`[BORROW REQUESTS] Blocked student ${req.user.user_id} due to overdue book at home library`);
        return res.status(400).json({
          success: false,
          is_home_overdue: true,
          message: 'Borrowing Suspended (Home Campus): You have an overdue book at your home library. Please return it to borrow home books. (Inter-school borrowing is still available).'
        });
      }
    }

    // 1. Quota check for Home Library books
    // The home library limit ONLY applies when borrowing home library books.
    // If the student is requesting partner school books, home library quota does not block them!
    const homeSchoolId = Number(req.user.school_id);
    const requestedHomeItems = items.filter(item => {
      const ownerSchool = Number(item.owner_school_id);
      const borrowType = (item.borrow_type || '').toUpperCase();
      return (!ownerSchool || ownerSchool === homeSchoolId) && borrowType !== 'INTER_SCHOOL_LIBRARY_USE';
    });

    if (requestedHomeItems.length > 0) {
      const maxHomeBorrowLimit = await LibrarySettings.getMaxBorrowLimit(homeSchoolId);

      // Count active physically borrowed books from home library
      const { data: activeLoans, error: countErr } = await supabase
        .from('borrow_transactions')
        .select(`
          borrow_id,
          school_id,
          book_copies(copy_id, book_id, books(book_id, school_id))
        `)
        .eq('student_id', req.user.user_id)
        .eq('status', 'active');

      const activeHomeLoansCount = (activeLoans || []).filter(tx => {
        const bSchool = tx.book_copies?.books?.school_id || tx.school_id;
        return !bSchool || Number(bSchool) === homeSchoolId;
      }).length;

      // Count pending or approved unreleased requests from home library
      const { data: activeRequests } = await supabase
        .from('borrow_requests')
        .select(`
          request_id,
          status,
          home_school_id,
          items:borrow_request_items(item_id, item_status, owner_school_id, borrow_type)
        `)
        .eq('student_id', req.user.user_id)
        .in('status', ['pending', 'approved', 'ready_for_pickup', 'permission_ready']);

      let pendingHomeItemsCount = 0;
      if (activeRequests) {
        for (const reqObj of activeRequests) {
          const unreleasedHome = (reqObj.items || []).filter(item => {
            const isUnreleased = item.item_status === 'pending' || item.item_status === 'approved';
            const ownerSchool = Number(item.owner_school_id);
            const isHome = (!ownerSchool || ownerSchool === homeSchoolId) && item.borrow_type !== 'INTER_SCHOOL_LIBRARY_USE';
            return isUnreleased && isHome;
          });
          pendingHomeItemsCount += unreleasedHome.length;
        }
      }

      const currentHomeCommitment = activeHomeLoansCount + pendingHomeItemsCount;
      if (currentHomeCommitment + requestedHomeItems.length > maxHomeBorrowLimit) {
        console.warn(`[BORROW REQUESTS] Home limit reached: Student has ${currentHomeCommitment}, requesting ${requestedHomeItems.length}, limit is ${maxHomeBorrowLimit}`);
        return res.status(400).json({
          success: false,
          is_home_limit_reached: true,
          message: `Home library borrowing limit reached. You currently have ${currentHomeCommitment} active home loan(s)/pending request(s). Your home campus allows a maximum of ${maxHomeBorrowLimit} book(s) simultaneously. (You can still borrow books from partner schools in the consortium).`
        });
      }
    }

    const requestData = {
      ...req.body,
      student_id: req.user.user_id,
      home_school_id: req.user.school_id,
      home_library_id: req.user.library_id || null,
    };

    const result = await BorrowRequest.create(requestData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error creating request:', error);
    console.error('[BORROW REQUESTS] Error details:', error.message);

    if (error.message && error.message.includes('database')) {
      return res.status(500).json({ success: false, message: 'Unable to connect to database. Please try again later.' });
    }

    if (error.message && error.message.includes('network')) {
      return res.status(500).json({ success: false, message: 'Network error. Please check your connection.' });
    }

    res.status(500).json({ success: false, message: error.message || 'Unable to create borrowing request. Please try again.' });
  }
});

// @route   GET /api/borrow-requests/student/:student_id
// @desc    Get borrowing requests by student ID
// @access  Private (Student, Librarian, Librarian Admin)
router.get('/student/:student_id', auth, async (req, res) => {
  try {
    const requests = await BorrowRequest.getByStudent(req.params.student_id);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting student requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow-requests/my-requests
// @desc    Get current student's borrowing requests
// @access  Private (Student)
router.get('/my-requests', auth, requireRole(['Student']), async (req, res) => {
  try {
    const requests = await BorrowRequest.getByStudent(req.user.user_id);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting student requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow-requests/inter-school-status
// @desc    Get all inter-school request statuses for badge checking
// @access  Private
router.get('/inter-school-status', auth, async (req, res) => {
  try {
    console.log('[BORROW REQUESTS] Fetching inter-school status for student:', req.user?.user_id);
    const requests = await BorrowRequest.getInterSchoolStatusesByStudent(req.user.user_id);
    res.json({ success: true, data: requests || [] });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting inter-school status:', error);
    // Return empty array instead of 500 to prevent UI blocking
    res.json({ success: true, data: [] });
  }
});

// @route   GET /api/borrow-requests/school/:school_id
// @desc    Get borrowing requests by school (for librarians)
// @access  Private (Librarian, Librarian Admin)
router.get('/school/:school_id', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const { status, library_id } = req.query;

    const userRoleId = Number(req.user?.role_id || 0);
    const userRole = String(req.user?.role_name || req.user?.role || '').toLowerCase();
    const isRegularLibrarian = userRoleId === 3 || userRole === 'librarian';

    let effectiveLibraryId = null;
    if (isRegularLibrarian && req.user?.library_id) {
      effectiveLibraryId = req.user.library_id;
    } else if (library_id && library_id !== 'all') {
      effectiveLibraryId = parseInt(library_id, 10);
    }

    const requests = await BorrowRequest.getBySchool(req.params.school_id, status, effectiveLibraryId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting school requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow-requests/partner/:school_id
// @desc    Get inter-school borrow requests for a specific school (owner school)
// @access  Private (Librarian, Librarian Admin)
router.get('/partner/:school_id', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    const { status, library_id } = req.query;

    const userRoleId = Number(req.user?.role_id || 0);
    const userRole = String(req.user?.role_name || req.user?.role || '').toLowerCase();
    const isRegularLibrarian = userRoleId === 3 || userRole === 'librarian';

    let effectiveLibraryId = null;
    if (isRegularLibrarian && req.user?.library_id) {
      effectiveLibraryId = req.user.library_id;
    } else if (library_id && library_id !== 'all') {
      effectiveLibraryId = parseInt(library_id, 10);
    }

    console.log('[BORROW REQUESTS] Fetching partner school requests for school_id:', req.params.school_id, 'library_id:', effectiveLibraryId);
    const requests = await BorrowRequest.getByPartnerSchool(req.params.school_id, status, effectiveLibraryId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting partner school requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow-requests/partner-schools/:book_id
// @desc    Get partner schools that have a specific book available
// @access  Private (Student)
router.get('/partner-schools/:book_id', auth, requireRole(['Student']), async (req, res) => {
  try {
    const home_school_id = req.user.school_id;
    const schools = await BorrowRequest.getPartnerSchoolsForBook(req.params.book_id, home_school_id);
    res.json({ success: true, data: schools });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting partner schools:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow-requests/:id
// @desc    Get borrowing request by ID
// @access  Private
router.get('/:id', auth, async (req, res, next) => {
  try {
    // Guard against non-ID sub-paths
    const reservedSubpaths = ['inter-school-status', 'school', 'partner', 'partner-schools', 'my-requests', 'student', 'scan', 'active-loans', 'returned-items'];
    if (reservedSubpaths.includes(req.params.id)) {
      return next();
    }

    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check authorization
    const userRole = (req.user.role_name || req.user.role || '').toLowerCase();
    const isStudent = userRole === 'student';
    const isLibrarian = userRole === 'librarian' || userRole === 'librarian admin';
    const isSuperAdmin = userRole === 'super admin';

    if (isStudent && request.student_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (isLibrarian && request.home_school_id !== req.user.school_id) {
      // Check if librarian is from partner school
      const hasPartnerItems = request.items?.some(item => String(item.partner_school_id) === String(req.user.school_id));
      if (!hasPartnerItems) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/approve
// @desc    Approve a borrowing request
// @access  Private (Librarian, Librarian Admin)
router.put('/:id/approve', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    console.log('[APPROVE] Request ID:', req.params.id);
    console.log('[APPROVE] User:', req.user);

    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    console.log('[APPROVE] Request school_id:', request.home_school_id);
    console.log('[APPROVE] User school_id:', req.user.school_id);

    // Enhanced security: Check if this is an inter-school request and if librarian is from owner school
    const { data: requestItems } = await supabase
      .from('borrow_request_items')
      .select('owner_school_id, partner_school_id')
      .eq('request_id', req.params.id);

    if (!requestItems || requestItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No items found in request' });
    }

    const isInterSchool = request.request_type === 'INTER_SCHOOL' ||
      requestItems?.some(item => item.owner_school_id !== request.home_school_id);
    const isHomeSchool = String(request.home_school_id) === String(req.user.school_id);
    const isOwnerSchool = requestItems?.some(item => String(item.owner_school_id) === String(req.user.school_id));

    // Security: Librarian can only approve if:
    // 1. It's a home school request and librarian is from that school, OR
    // 2. It's an inter-school request and librarian is from the owner school
    if ((isInterSchool && !isOwnerSchool) || (!isInterSchool && !isHomeSchool)) {
      console.error('[APPROVE] Authorization failed - isInterSchool:', isInterSchool, 'isOwnerSchool:', isOwnerSchool, 'isHomeSchool:', isHomeSchool);
      return res.status(403).json({ success: false, message: 'Unauthorized - You can only approve requests for your library' });
    }

    const result = await BorrowRequest.approve(req.params.id, req.user.user_id);

    // NOTE: No notification or QR code is sent to the student upon approval.
    // The physical Permission Letter (generated by the librarian) serves as
    // the student's access credential. The QR code is embedded directly in
    // the permission letter, which the librarian scans at the partner library.
    // A return QR code will be sent to the student only when the due date arrives.

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error approving request:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/borrow-requests/:id/reject
// @desc    Reject a borrowing request
// @access  Private (Librarian, Librarian Admin)
router.put('/:id/reject', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    console.log('[REJECT] Request ID:', req.params.id);
    console.log('[REJECT] User:', req.user);

    const { remarks } = req.body;
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    console.log('[REJECT] Request school_id:', request.home_school_id);
    console.log('[REJECT] User school_id:', req.user.school_id);

    // Enhanced security: Check if this is an inter-school request and if librarian is from owner school
    const { data: requestItems } = await supabase
      .from('borrow_request_items')
      .select('owner_school_id, partner_school_id')
      .eq('request_id', req.params.id);

    const isHomeSchool = String(request.home_school_id) === String(req.user.school_id);
    const isSuperAdmin = req.user.role === 'Super Admin' || req.user.role_id === 1;
    const hasItems = Array.isArray(requestItems) && requestItems.length > 0;

    if (!hasItems) {
      // If request has no items, allow home school librarian or admin to reject/clean it up
      if (!isHomeSchool && !isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized - You can only reject requests for your library' });
      }
    } else {
      const isInterSchool = request.request_type === 'INTER_SCHOOL' ||
        requestItems?.some(item => item.owner_school_id !== request.home_school_id);
      const isOwnerSchool = requestItems?.some(item => String(item.owner_school_id) === String(req.user.school_id));

      // Security: Librarian can only reject if:
      // 1. It's a home school request and librarian is from that school, OR
      // 2. It's an inter-school request and librarian is from the owner school
      if ((isInterSchool && !isOwnerSchool) || (!isInterSchool && !isHomeSchool)) {
        console.error('[REJECT] Authorization failed - isInterSchool:', isInterSchool, 'isOwnerSchool:', isOwnerSchool, 'isHomeSchool:', isHomeSchool);
        return res.status(403).json({ success: false, message: 'Unauthorized - You can only reject requests for your library' });
      }
    }

    const result = await BorrowRequest.reject(req.params.id, remarks);

    // Notify the student that their request was rejected (persisted to DB).
    const rejectorName = [req.user.firstname, req.user.lastname]
      .filter(Boolean)
      .join(' ') || 'Librarian';
    await supabase
      .from('notifications')
      .insert({
        user_id: request.student_id,
        school_id: request.home_school_id,
        type: 'request_rejected',
        title: 'Borrow Request Rejected ❌',
        message: `Your borrow request ${req.params.id} was declined by ${rejectorName}.${remarks ? ` Reason: ${remarks}` : ''}`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
        created_at: new Date().toISOString(),
      });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error rejecting request:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/borrow-requests/:id/permission-letter
// @desc    Generate permission letter for inter-school request
// @access  Private (Librarian, Librarian Admin)
router.post('/:id/permission-letter', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    const { letter_url } = req.body;
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if librarian is from home school
    if (request.home_school_id !== req.user.school_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not your school' });
    }

    // Check if it's an inter-school request
    if (request.request_type !== 'INTER_SCHOOL') {
      return res.status(400).json({ success: false, message: 'Permission letter only for inter-school requests' });
    }

    const result = await BorrowRequest.generatePermissionLetter(req.params.id, letter_url);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error generating permission letter:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/borrow-requests/scan
// @desc    Scan QR code to get request details
// @access  Private (Librarian, Librarian Admin)
router.post('/scan', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    const { qr_token } = req.body;
    let qrToken = typeof qr_token === 'string' ? qr_token.trim() : '';
    console.log('[SCAN QR] User:', req.user);

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token is required' });
    }

    // QRCodeDisplay stores a JSON payload, while manual/device scanners may
    // provide only the token. Accept both formats for the same QR code.
    let requestIdFallback = null;
    try {
      const qrPayload = JSON.parse(qrToken);
      const payloadToken = qrPayload?.token || qrPayload?.qr_token || qrPayload?.data?.token || qrPayload?.data?.qr_token;
      requestIdFallback = qrPayload?.request_id || qrPayload?.data?.request_id || null;
      if (typeof payloadToken === 'string' && payloadToken.trim()) {
        qrToken = payloadToken.trim();
      } else if (typeof requestIdFallback === 'string' && requestIdFallback.trim()) {
        qrToken = requestIdFallback.trim();
      }
    } catch {
      // The input is already a raw token or request id string.
    }

    console.log('[SCAN QR] Resolved search key:', qrToken);
    let request;
    try {
      request = await BorrowRequest.getByQRToken(qrToken);
      if (!request && requestIdFallback && requestIdFallback !== qrToken) {
        request = await BorrowRequest.getByQRToken(requestIdFallback);
      }
    } catch (error) {
      if (error.code === 'PGRST116' || error.status === 406) {
        return res.status(404).json({ success: false, message: 'Invalid QR token or request not found' });
      }
      throw error;
    }
    if (!request) {
      return res.status(404).json({ success: false, message: 'Invalid QR token or request not found' });
    }

    console.log('[SCAN QR] Request found:', request.request_id);

    // Check if request is in a valid state for scanning
    if (request.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'This request has been rejected' });
    }

    if (request.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This request has been cancelled' });
    }

    if (request.status === 'returned') {
      return res.status(400).json({ success: false, message: 'This request has already been returned' });
    }

    // Check school involvement authorization
    const involvedSchoolIds = new Set([
      String(request.home_school_id),
      ...(request.items || []).map(item => item.owner_school_id).filter(Boolean),
      ...(request.items || []).map(item => item.partner_school_id).filter(Boolean)
    ].map(String));

    const isSuperAdmin = req.user.role === 'Super Admin' || req.user.role_id === 1;
    const isAuthorizedSchool = !req.user.school_id || isSuperAdmin || involvedSchoolIds.has(String(req.user.school_id));

    console.log('[SCAN QR] Involved schools:', [...involvedSchoolIds]);
    console.log('[SCAN QR] Authorized check:', isAuthorizedSchool);

    if (!isAuthorizedSchool) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not involved in this request' });
    }

    const alreadyReleasedItems = (request.items || []).filter(item =>
      item.item_status === 'borrowed' || item.status === 'borrowed' || item.released_at
    );
    const unreleasedItems = (request.items || []).filter(item =>
      !item.released_at && item.item_status !== 'borrowed' && item.status !== 'borrowed' && item.status !== 'returned'
    );

    let warning = null;
    if (alreadyReleasedItems.length > 0 && unreleasedItems.length > 0) {
      warning = `${alreadyReleasedItems.length} of ${request.items.length} items have already been released. ${unreleasedItems.length} awaiting release.`;
    }

    res.json({ 
      success: true, 
      data: request,
      warning,
      unreleased_count: unreleasedItems.length,
      released_count: alreadyReleasedItems.length
    });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error scanning QR:', error);
    console.error('[BORROW REQUESTS] Error message:', error.message);
    console.error('[BORROW REQUESTS] Error details:', error.details);
    console.error('[BORROW REQUESTS] Error hint:', error.hint);
    console.error('[BORROW REQUESTS] Error code:', error.code);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/borrow-requests/items/:item_id/release
// @desc    Release a book item
// @access  Private (Librarian, Librarian Admin)
router.put('/items/:item_id/release', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    console.log('[RELEASE ROUTE] item_id:', req.params.item_id);
    console.log('[RELEASE ROUTE] user:', req.user);
    console.log('[RELEASE ROUTE] body:', req.body);

    const { copy_id } = req.body;

    // 1. Fetch item details
    const { data: itemDetails } = await supabase
      .from('borrow_request_items')
      .select('request_id, book_id, item_id, owner_school_id')
      .eq('item_id', req.params.item_id)
      .single();

    const result = await BorrowRequest.releaseBook(req.params.item_id, req.user.user_id, copy_id);

    // 2. Notify student with due date and book title (wrapped in try/catch to never block release)
    try {
      if (itemDetails) {
        const { data: request } = await supabase
          .from('borrow_requests')
          .select('student_id, request_id, due_date')
          .eq('request_id', itemDetails.request_id)
          .single();

        if (request && request.student_id) {
          const { data: book } = await supabase
            .from('books')
            .select('title')
            .eq('book_id', itemDetails.book_id)
            .single();

          const rawDueDate = result?.due_date || request.due_date;
          const formattedDueDate = rawDueDate
            ? new Date(rawDueDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : '7 days from release';

          await supabase
            .from('notifications')
            .insert({
              user_id: request.student_id,
              school_id: req.user.school_id || itemDetails.owner_school_id || null,
              type: 'book_borrowed',
              title: `Book Released: "${book?.title || 'Book'}" 📚`,
              message: `Your copy of "${book?.title || 'the book'}" has been released at the counter. Return Due Date: ${formattedDueDate}. Please return the book on or before the due date to avoid late fees.`,
              related_id: parseInt(itemDetails.item_id, 10) || null,
              is_read: false,
              is_admin_notification: false,
              created_at: new Date().toISOString(),
            });

          console.log('[RELEASE NOTIFICATION] Sent notification to student:', request.student_id, 'Due Date:', formattedDueDate);
        }
      }
    } catch (notifErr) {
      console.warn('[RELEASE NOTIFICATION] Non-fatal notification error:', notifErr.message);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error releasing book:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error releasing book', error: error.message });
  }
});

// @route   PUT /api/borrow-requests/items/:item_id/return
// @desc    Return a book item
// @access  Private (Librarian, Librarian Admin)
router.put('/items/:item_id/return', auth, requireRole(['Librarian', 'Librarian Admin']), async (req, res) => {
  try {
    console.log('[RETURN ROUTE] item_id:', req.params.item_id);
    console.log('[RETURN ROUTE] user:', req.user);

    // Get item details with request information for authorization check
    const { data: itemDetails } = await supabase
      .from('borrow_request_items')
      .select(`
        request_id,
        book_id,
        owner_school_id,
        partner_school_id,
        assigned_copy_id,
        item_status
      `)
      .eq('item_id', req.params.item_id)
      .single();

    if (!itemDetails) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Get request details for authorization
    const { data: request } = await supabase
      .from('borrow_requests')
      .select('student_id, home_school_id, request_type')
      .eq('request_id', itemDetails.request_id)
      .single();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Enhanced security: Check if librarian is authorized to return this book
    const isInterSchool = request.request_type === 'INTER_SCHOOL' ||
      (itemDetails.owner_school_id !== request.home_school_id);
    const isHomeSchool = String(request.home_school_id) === String(req.user.school_id);
    const isOwnerSchool = String(itemDetails.owner_school_id) === String(req.user.school_id);

    // Librarian can return if:
    // 1. It's a home school request and librarian is from that school, OR
    // 2. It's an inter-school request and librarian is from the owner school
    if ((isInterSchool && !isOwnerSchool) || (!isInterSchool && !isHomeSchool)) {
      console.error('[RETURN] Authorization failed - isInterSchool:', isInterSchool, 'isOwnerSchool:', isOwnerSchool, 'isHomeSchool:', isHomeSchool);
      return res.status(403).json({ success: false, message: 'Unauthorized - You can only return books for your library' });
    }

    const { condition = 'good', remarks = '', fine_amount = null, damage_fee = 0, is_paid = true } = req.body || {};
    const result = await BorrowRequest.returnBook(req.params.item_id, req.user.user_id, {
      condition,
      remarks,
      fine_amount,
      damage_fee,
      is_paid
    });

    // Notify student that book has been returned (wrapped safely)
    try {
      if (request && request.student_id) {
        const { data: book } = await supabase
          .from('books')
          .select('title')
          .eq('book_id', itemDetails.book_id)
          .single();

        const bookTitle = book?.title || 'the book';
        const assessedFine = fine_amount !== null && fine_amount !== undefined 
          ? (Number(fine_amount) + Number(damage_fee || 0)) 
          : (result?.fineAssessed || 0);
        let notifTitle = 'Book Returned Successfully ✅';
        let notifMessage = `You have successfully returned "${bookTitle}". Condition: ${condition.toUpperCase()}. Thank you for returning your library book on time!`;
        let notifType = 'book_returned';

        if (assessedFine > 0) {
          if (is_paid) {
            notifTitle = 'Book Returned & Fine Cleared ✅';
            notifMessage = `Isinauli ang aklat na "${bookTitle}". Ang multa na ₱${Number(assessedFine).toFixed(2)} ay nabayaran at na-clear na sa circulation desk. Official library return clearance signed.`;
          } else {
            notifType = 'clearance_hold';
            notifTitle = 'Library Clearance Hold: Unpaid Penalty ⚠️';
            notifMessage = `May naiwang hindi nabayarang ${Number(damage_fee) > 0 ? 'damage penalty' : 'penalty'} (Kabuuang ₱${Number(assessedFine).toFixed(2)}) para sa aklat na "${bookTitle}". Hindi mapipirmahan ang iyong clearance hangga't hindi ito nababayaran sa circulation counter.`;
          }
        }

        await supabase
          .from('notifications')
          .insert({
            user_id: request.student_id,
            school_id: req.user.school_id || itemDetails.owner_school_id || null,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            related_id: parseInt(itemDetails.item_id, 10) || null,
            is_read: false,
            is_admin_notification: false,
            created_at: new Date().toISOString(),
          });

        console.log('[RETURN NOTIFICATION] Sent return notification to student:', request.student_id);
      }
    } catch (notifErr) {
      console.warn('[RETURN NOTIFICATION] Non-fatal notification error:', notifErr.message);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error returning book:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/cancel
// @desc    Cancel a pending borrowing request (Instant for pending)
// @access  Private (Student)
router.put('/:id/cancel', auth, requireRole(['Student']), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if student owns the request
    if (request.student_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Can only instantly cancel pending requests
    if (request.status !== 'pending') {
      if (request.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'This request is already approved. Please submit a cancellation request for librarian review.'
        });
      }
      return res.status(400).json({ success: false, message: `Cannot cancel request with status "${request.status}"` });
    }

    const cancellationReason = reason || 'Cancelled by student before approval';
    const result = await BorrowRequest.cancel(req.params.id, cancellationReason);

    // Notify librarians about cancellation
    const { data: staff } = await supabase
      .from('users')
      .select('user_id, school_id')
      .eq('school_id', request.home_school_id)
      .in('role_id', [2, 3])
      .eq('status', 'active');

    if (staff && staff.length > 0) {
      const studentName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'A student';
      const bookTitles = (request.items || [])
        .map(item => item.book?.title)
        .filter(Boolean)
        .join(', ');

      const notifications = staff.map(member => ({
        user_id: member.user_id,
        school_id: member.school_id,
        type: 'request_cancelled',
        title: 'Borrow Request Cancelled',
        message: `${studentName} cancelled pending request ${req.params.id} for: ${bookTitles || 'books'}.${reason ? ` Reason: ${reason}` : ''}`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    res.json({ success: true, message: 'Request cancelled successfully', data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error cancelling request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/request-cancellation
// @desc    Student requests cancellation of an approved borrowing request
// @access  Private (Student)
router.put('/:id/request-cancellation', auth, requireRole(['Student']), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(request.student_id) !== String(req.user.user_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const cancellableStatuses = ['pending', 'approved'];
    if (!cancellableStatuses.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cancellation requests can only be submitted for pending or approved requests. Current status: "${request.status}"`
      });
    }

    const cancellationReason = reason?.trim() || 'No longer needed';
    const result = await BorrowRequest.requestCancellation(req.params.id, cancellationReason);

    // Notify library staff to confirm cancellation
    const targetSchools = [...new Set([request.home_school_id, ...(request.items || []).map(i => i.owner_school_id)])].filter(Boolean);
    const { data: staff } = await supabase
      .from('users')
      .select('user_id, school_id')
      .in('school_id', targetSchools)
      .in('role_id', [2, 3])
      .eq('status', 'active');

    if (staff && staff.length > 0) {
      const studentName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'A student';
      const requestTypeDesc = request.status === 'approved' ? 'approved hold' : 'pending request';
      const notifications = staff.map(member => ({
        user_id: member.user_id,
        school_id: member.school_id,
        type: 'cancel_requested',
        title: 'Cancellation Request Submitted ⚠️',
        message: `${studentName} requested to cancel ${requestTypeDesc} ${req.params.id}. Reason: ${cancellationReason}. Please confirm or decline.`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.json({ success: true, message: 'Cancellation request submitted for librarian review', data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error requesting cancellation:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/confirm-cancellation
// @desc    Librarian confirms student cancellation, restores book copy, and marks as cancelled
// @access  Private (Librarian, Librarian Admin, Super Admin)
router.put('/:id/confirm-cancellation', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const validStatuses = ['cancel_requested', 'cancellation_requested', 'approved', 'pending'];
    if (!validStatuses.includes(request.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel request with status "${request.status}"` });
    }

    const reason = request.cancellation_reason || 'Cancellation confirmed by library staff';
    const result = await BorrowRequest.cancel(req.params.id, reason);

    // Notify student that request is cancelled and quota restored
    await supabase.from('notifications').insert({
      user_id: request.student_id,
      school_id: request.home_school_id,
      type: 'request_cancelled',
      title: 'Hold Cancellation Confirmed ✅',
      message: `Your borrow request ${req.params.id} has been cancelled by library staff. Your borrowing quota has been restored.`,
      related_id: null,
      is_read: false,
      is_admin_notification: false,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Cancellation confirmed and copy restocked', data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error confirming cancellation:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/decline-cancellation
// @desc    Librarian declines student cancellation request, keeping the reservation active
// @access  Private (Librarian, Librarian Admin, Super Admin)
router.put('/:id/decline-cancellation', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const { remarks } = req.body || {};
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'cancel_requested' && request.status !== 'cancellation_requested') {
      return res.status(400).json({ success: false, message: 'Request is not in cancel_requested status' });
    }

    const result = await BorrowRequest.declineCancellation(req.params.id, remarks);

    // Notify student
    const librarianName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'The librarian';
    await supabase.from('notifications').insert({
      user_id: request.student_id,
      school_id: request.home_school_id,
      type: 'cancel_declined',
      title: 'Cancellation Request Declined ℹ️',
      message: `${librarianName} reviewed your cancellation request for ${req.params.id}. Your book reservation remains active for pickup.${remarks ? ` Note: ${remarks}` : ''}`,
      related_id: null,
      is_read: false,
      is_admin_notification: false,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Cancellation request declined, reservation remains active', data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error declining cancellation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/request-renewal
// @desc    Student requests renewal/extension for an active home library loan
// @access  Private (Student)
router.put('/:id/request-renewal', auth, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const result = await BorrowRequest.requestRenewal(req.params.id, {
      student_id: req.user.user_id,
      reason,
    });

    // Notify library staff of home school
    try {
      const studentName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'A student';
      const { data: staffMembers } = await supabase
        .from('users')
        .select('user_id')
        .eq('school_id', result.home_school_id)
        .in('role_id', [2, 3, 4]); // Librarian, Librarian Admin, Super Admin

      if (staffMembers && staffMembers.length > 0) {
        const notifs = staffMembers.map(staff => ({
          user_id: staff.user_id,
          school_id: result.home_school_id,
          type: 'renewal_requested',
          title: 'Book Renewal Request 🔄',
          message: `${studentName} requested a loan renewal for request #${req.params.id}.${reason ? ` Reason: "${reason}"` : ''}`,
          related_id: null,
          is_read: false,
          is_admin_notification: true,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('notifications').insert(notifs);
      }
    } catch (notifErr) {
      console.warn('[BORROW REQUESTS] Could not dispatch staff renewal notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Renewal request submitted successfully and is awaiting librarian review.',
      data: result,
    });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error requesting renewal:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to request renewal.' });
  }
});

// @route   PUT /api/borrow-requests/:id/approve-renewal
// @desc    Librarian approves renewal, extending loan due date and incrementing renewal count
// @access  Private (Librarian, Librarian Admin, Super Admin)
router.put('/:id/approve-renewal', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const { daysToExtend } = req.body || {};
    const result = await BorrowRequest.approveRenewal(req.params.id, {
      librarian_id: req.user.user_id,
      daysToExtend: Number(daysToExtend) || undefined,
    });

    // Notify student of renewal approval
    try {
      const librarianName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'The librarian';
      await supabase.from('notifications').insert({
        user_id: result.student_id,
        school_id: result.home_school_id,
        type: 'renewal_approved',
        title: 'Loan Renewal Approved! 📅',
        message: `${librarianName} approved your renewal request for #${req.params.id}. Your new return due date is ${result.newDueDate}.`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('[BORROW REQUESTS] Could not dispatch student renewal approval notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Renewal approved. Due date extended to ${result.newDueDate}.`,
      data: result,
    });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error approving renewal:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to approve renewal.' });
  }
});

// @route   PUT /api/borrow-requests/:id/decline-renewal
// @desc    Librarian declines renewal, keeping existing loan and due date intact
// @access  Private (Librarian, Librarian Admin, Super Admin)
router.put('/:id/decline-renewal', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const { remarks } = req.body || {};
    const result = await BorrowRequest.declineRenewal(req.params.id, remarks);

    // Notify student of renewal decline
    try {
      const librarianName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'The librarian';
      await supabase.from('notifications').insert({
        user_id: result.student_id,
        school_id: result.home_school_id,
        type: 'renewal_declined',
        title: 'Renewal Request Declined ℹ️',
        message: `${librarianName} declined your renewal request for #${req.params.id}.${remarks ? ` Reason: "${remarks}".` : ''} Please return the book by the scheduled due date.`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('[BORROW REQUESTS] Could not dispatch student renewal decline notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Renewal request declined. Existing loan remains active.',
      data: result,
    });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error declining renewal:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to decline renewal.' });
  }
});

// @route   GET /api/borrow-requests/returned-items
// @desc    Get returned items sourced from borrow_request_items (item_status='returned')
//          Authoritative per-item history for Quick Scan returns — powers Circulation History tab
//          Supports partial-return tracking (one book returned while others still active)
// @access  Private (Librarian, Librarian Admin, Super Admin)
router.get('/returned-items', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId;
    const libraryId = req.query.library_id || req.query.libraryId || null;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id query parameter is required' });
    }

    const userRoleId = Number(req.user?.role_id || 0);
    const userRole = String(req.user?.role_name || req.user?.role || '').toLowerCase();
    const isRegularLibrarian = userRoleId === 3 || userRole === 'librarian';

    let effectiveLibraryId = null;
    if (isRegularLibrarian && req.user?.library_id) {
      effectiveLibraryId = req.user.library_id;
    } else if (libraryId && libraryId !== 'all') {
      effectiveLibraryId = parseInt(libraryId, 10);
    }

    // Query borrow_request_items with item_status='returned'
    const { data, error } = await supabase
      .from('borrow_request_items')
      .select(`
        item_id,
        request_id,
        book_id,
        copy_id,
        assigned_copy_id,
        item_status,
        status,
        released_at,
        returned_at,
        owner_school_id,
        borrow_request:request_id(
          request_id,
          student_id,
          home_school_id,
          borrow_date,
          due_date,
          status,
          purpose,
          student:student_id(
            user_id,
            firstname,
            lastname,
            student_number,
            email,
            contact_number,
            profile_image,
            school_id
          )
        ),
        book:book_id(
          book_id,
          title,
          author,
          isbn,
          cover_image,
          library_id,
          school_id,
          library:library_id(name, library_type)
        ),
        copy:copy_id(
          copy_id,
          accession_number,
          barcode
        )
      `)
      .eq('item_status', 'returned')
      .not('returned_at', 'is', null)
      .order('returned_at', { ascending: false });

    if (error) throw error;

    const parsedSchoolId = parseInt(schoolId, 10);

    // Filter by school: either the book owner school or the student's home school
    let filtered = (data || []).filter(item => {
      const bookSchoolId = item.book?.school_id;
      const homeSchoolId = item.borrow_request?.home_school_id;
      const studentSchoolId = item.borrow_request?.student?.school_id;
      const ownerSchoolId = item.owner_school_id;

      return (
        Number(bookSchoolId) === parsedSchoolId ||
        Number(homeSchoolId) === parsedSchoolId ||
        Number(studentSchoolId) === parsedSchoolId ||
        Number(ownerSchoolId) === parsedSchoolId
      );
    });

    // Further filter by library if applicable
    if (effectiveLibraryId) {
      filtered = filtered.filter(item => {
        const libId = item.book?.library_id;
        return libId !== null && libId !== undefined
          ? Number(libId) === Number(effectiveLibraryId)
          : false;
      });
    }

    // Normalize shape for the Circulation History table
    const normalized = filtered.map(item => {
      const student = item.borrow_request?.student || {};
      const book = item.book || {};
      const copy = item.copy || {};
      const req = item.borrow_request || {};
      const totalFine = (parseFloat(item.fine_amount) || 0) + (parseFloat(item.damage_fee) || 0);

      return {
        // Identification
        item_id: item.item_id,
        request_id: item.request_id,
        _historyId: `returned-item-${item.item_id}`,
        _source: 'returned_item',

        // Student info (flat)
        student_id: req.student_id,
        student: {
          id: student.user_id || student.id,
          user_id: student.user_id || student.id,
          firstname: student.firstname,
          lastname: student.lastname,
          student_number: student.student_number,
          email: student.email,
          contact_number: student.contact_number,
          profile_image: student.profile_image,
          school_id: student.school_id,
        },

        // Book info
        book_id: item.book_id,
        book: {
          book_id: book.book_id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          cover_image: book.cover_image,
          library_id: book.library_id,
          school_id: book.school_id,
        },
        book_copies: {
          copy_id: item.copy_id || item.assigned_copy_id,
          accession_number: copy.accession_number || null,
          barcode: copy.barcode || null,
          books: {
            book_id: book.book_id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            cover_image: book.cover_image,
          },
        },

        // Dates
        borrow_date: item.released_at || req.borrow_date,
        due_date: req.due_date,
        returned_at: item.returned_at,
        released_at: item.released_at,
        return_date: item.returned_at,

        // Return metadata
        condition: 'good',
        remarks: '',
        fine_amount: null,
        is_paid: true,
        item_status: item.item_status,
        status: 'returned',

        // Purpose
        purpose: req.purpose,
      };
    });

    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error fetching returned items:', error);
    res.status(500).json({ success: false, message: 'Server error fetching returned items' });
  }
});

// @route   GET /api/borrow-requests/active-loans
// @desc    Get currently borrowed items sourced from borrow_request_items (item_status='borrowed')
//          This is the authoritative source for Quick Scan releases — more reliable than borrow_transactions
// @access  Private (Librarian, Librarian Admin, Super Admin)
router.get('/active-loans', auth, async (req, res) => {
  try {
    const schoolId = req.query.school_id || req.query.schoolId;
    const libraryId = req.query.library_id || req.query.libraryId || null;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'school_id query parameter is required' });
    }

    const userRoleId = Number(req.user?.role_id || 0);
    const userRole = String(req.user?.role_name || req.user?.role || '').toLowerCase();
    const isRegularLibrarian = userRoleId === 3 || userRole === 'librarian';

    let effectiveLibraryId = null;
    if (isRegularLibrarian && req.user?.library_id) {
      effectiveLibraryId = req.user.library_id;
    } else if (libraryId && libraryId !== 'all') {
      effectiveLibraryId = parseInt(libraryId, 10);
    }

    // Query borrow_request_items with item_status='borrowed' (unreturned)
    const { data, error } = await supabase
      .from('borrow_request_items')
      .select(`
        item_id,
        request_id,
        book_id,
        copy_id,
        assigned_copy_id,
        item_status,
        status,
        released_at,
        returned_at,
        owner_school_id,
        borrow_request:request_id(
          request_id,
          student_id,
          home_school_id,
          borrow_date,
          due_date,
          status,
          student:student_id(
            user_id,
            firstname,
            lastname,
            student_number,
            email,
            contact_number,
            profile_image,
            school_id
          )
        ),
        book:book_id(
          book_id,
          title,
          author,
          isbn,
          cover_image,
          library_id,
          school_id,
          library:library_id(name, library_type)
        ),
        copy:copy_id(
          copy_id,
          accession_number,
          barcode
        )
      `)
      .eq('item_status', 'borrowed')
      .is('returned_at', null)
      .order('released_at', { ascending: false });

    if (error) throw error;

    const parsedSchoolId = parseInt(schoolId, 10);

    // Filter by school: either the book owner school or the student's home school
    let filtered = (data || []).filter(item => {
      const bookSchoolId = item.book?.school_id;
      const homeSchoolId = item.borrow_request?.home_school_id;
      const studentSchoolId = item.borrow_request?.student?.school_id;
      const ownerSchoolId = item.owner_school_id;

      return (
        Number(bookSchoolId) === parsedSchoolId ||
        Number(homeSchoolId) === parsedSchoolId ||
        Number(studentSchoolId) === parsedSchoolId ||
        Number(ownerSchoolId) === parsedSchoolId
      );
    });

    // Further filter by library if applicable
    if (effectiveLibraryId) {
      filtered = filtered.filter(item => {
        const libId = item.book?.library_id;
        return libId !== null && libId !== undefined
          ? Number(libId) === Number(effectiveLibraryId)
          : false;
      });
    }

    // Normalize shape to be compatible with the existing Active Loans table
    const normalized = filtered.map(item => {
      const student = item.borrow_request?.student || {};
      const book = item.book || {};
      const copy = item.copy || {};
      const req = item.borrow_request || {};

      return {
        // Loan identification
        borrow_id: `req-item-${item.item_id}`,
        item_id: item.item_id,
        request_id: item.request_id,

        // Student info (flat — same shape as borrow_transactions)
        student_id: req.student_id,
        student: {
          id: student.user_id || student.id,
          user_id: student.user_id || student.id,
          firstname: student.firstname,
          lastname: student.lastname,
          student_number: student.student_number,
          email: student.email,
          contact_number: student.contact_number,
          profile_image: student.profile_image,
          school_id: student.school_id,
        },

        // Book info via book_copies shape the UI expects
        book_id: item.book_id,
        book_copies: {
          copy_id: item.copy_id || item.assigned_copy_id,
          accession_number: copy.accession_number || null,
          barcode: copy.barcode || null,
          books: {
            book_id: book.book_id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            cover_image: book.cover_image,
            library_id: book.library_id,
            school_id: book.school_id,
          },
        },

        // Dates
        borrow_date: item.released_at || req.borrow_date,
        due_date: req.due_date,
        returned_at: item.returned_at,
        released_at: item.released_at,

        status: 'active',
        item_status: item.item_status,
        _source: 'borrow_request_item',
      };
    });

    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error fetching active loans from items:', error);
    res.status(500).json({ success: false, message: 'Server error fetching active loans' });
  }
});

module.exports = router;

