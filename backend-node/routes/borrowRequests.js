const express = require('express');
const router = express.Router();
const BorrowRequest = require('../models/BorrowRequest');
const LibrarySettings = require('../models/LibrarySettings');
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   POST /api/borrow-requests
// @desc    Create a new borrowing request
// @access  Private (Student)
router.post('/', auth, requireRole(['Student']), async (req, res) => {
  try {
    console.log('[BORROW REQUESTS] Creating new request for student:', req.user.user_id);

    // 1. Get library max borrowing limit
    const maxBorrowLimit = await LibrarySettings.getMaxBorrowLimit(req.user.school_id);

    // 2. Count active physically borrowed books from borrow_transactions
    const { count: activeLoansCount, error: countErr } = await supabase
      .from('borrow_transactions')
      .select('borrow_id', { count: 'exact', head: true })
      .eq('student_id', req.user.user_id)
      .eq('status', 'active');

    // 3. Count pending or approved unreleased requests
    const { data: activeRequests } = await supabase
      .from('borrow_requests')
      .select(`
        request_id,
        status,
        items:borrow_request_items(item_id, item_status)
      `)
      .eq('student_id', req.user.user_id)
      .in('status', ['pending', 'approved', 'ready_for_pickup', 'permission_ready']);

    let pendingItemsCount = 0;
    if (activeRequests) {
      for (const reqObj of activeRequests) {
        const unreleased = (reqObj.items || []).filter(
          item => item.item_status === 'pending' || item.item_status === 'approved'
        );
        pendingItemsCount += unreleased.length;
      }
    }

    const currentCommitment = (activeLoansCount || 0) + pendingItemsCount;
    const requestedCount = Array.isArray(req.body.items) && req.body.items.length > 0 ? req.body.items.length : 1;

    if (currentCommitment + requestedCount > maxBorrowLimit) {
      console.warn(`[BORROW REQUESTS] Limit exceeded: Student has ${currentCommitment}, requesting ${requestedCount}, limit is ${maxBorrowLimit}`);
      return res.status(400).json({
        success: false,
        message: `Borrowing limit reached. You currently have ${currentCommitment} active loan(s)/pending request(s). Your library allows a maximum of ${maxBorrowLimit} book(s) simultaneously.`
      });
    }

    const requestData = {
      ...req.body,
      student_id: req.user.user_id,
      home_school_id: req.user.school_id,
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

// @route   GET /api/borrow-requests/:id
// @desc    Get borrowing request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
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

// @route   GET /api/borrow-requests/school/:school_id
// @desc    Get borrowing requests by school (for librarians)
// @access  Private (Librarian, Librarian Admin)
router.get('/school/:school_id', auth, requireRole(['Librarian', 'Librarian Admin', 'Super Admin']), async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await BorrowRequest.getBySchool(req.params.school_id, status);
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
    console.log('[BORROW REQUESTS] Fetching partner school requests for school_id:', req.params.school_id);
    const requests = await BorrowRequest.getByPartnerSchool(req.params.school_id);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting partner school requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/borrow-requests/inter-school-status
// @desc    Get all inter-school request statuses for badge checking
// @access  Private
router.get('/inter-school-status', auth, async (req, res) => {
  try {
    console.log('[BORROW REQUESTS] Fetching inter-school status');
    const requests = await BorrowRequest.getInterSchoolStatusesByStudent(req.user.user_id);
    console.log('[BORROW REQUESTS] Inter-school status fetched:', requests);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error getting inter-school status:', error);
    console.error('[BORROW REQUESTS] Error details:', error.message);
    // Return empty array instead of 500 to prevent UI blocking
    res.json({ success: true, data: [] });
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

    // Notify the student that their request was approved (persisted to DB
    // so it also shows up in the student's header notification bell).
    const approverName = [req.user.firstname, req.user.lastname]
      .filter(Boolean)
      .join(' ') || 'Librarian';
    await supabase
      .from('notifications')
      .insert({
        user_id: request.student_id,
        school_id: request.home_school_id,
        type: 'request_approved',
        title: 'Borrow Request Approved ✅',
        message: `Your borrow request ${req.params.id} has been approved by ${approverName}. Please bring your School ID and permission letter to the library to pick up your book(s).`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
        created_at: new Date().toISOString(),
      });

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

    if (!requestItems || requestItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No items found in request' });
    }

    const isInterSchool = request.request_type === 'INTER_SCHOOL' ||
      requestItems?.some(item => item.owner_school_id !== request.home_school_id);
    const isHomeSchool = String(request.home_school_id) === String(req.user.school_id);
    const isOwnerSchool = requestItems?.some(item => String(item.owner_school_id) === String(req.user.school_id));

    // Security: Librarian can only reject if:
    // 1. It's a home school request and librarian is from that school, OR
    // 2. It's an inter-school request and librarian is from the owner school
    if ((isInterSchool && !isOwnerSchool) || (!isInterSchool && !isHomeSchool)) {
      console.error('[REJECT] Authorization failed - isInterSchool:', isInterSchool, 'isOwnerSchool:', isOwnerSchool, 'isHomeSchool:', isHomeSchool);
      return res.status(403).json({ success: false, message: 'Unauthorized - You can only reject requests for your library' });
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
    try {
      const qrPayload = JSON.parse(qrToken);
      const payloadToken = qrPayload?.token || qrPayload?.qr_token || qrPayload?.data?.token || qrPayload?.data?.qr_token;
      if (typeof payloadToken === 'string') qrToken = payloadToken.trim();
    } catch {
      // The input is already a raw token.
    }

    console.log('[SCAN QR] QR Token:', qrToken);
    let request;
    try {
      request = await BorrowRequest.getByQRToken(qrToken);
    } catch (error) {
      // A missing token is a client scan error, not a server failure.
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

    // Check if any items have already been released (prevent duplicate transactions)
    const alreadyReleasedItems = (request.items || []).filter(item =>
      item.item_status === 'borrowed' || item.released_at
    );

    if (alreadyReleasedItems.length > 0) {
      console.log('[SCAN QR] Warning: Some items already released:', alreadyReleasedItems.map(i => i.item_id));
      // Still return the request but with a warning
      return res.json({
        success: true,
        data: request,
        warning: 'Some items in this request have already been released'
      });
    }

    // Check if librarian is authorized for either side of an inter-school request.
    // The owning library (book owner) and the requesting school (student home school)
    // are both involved in the request, so the scan should work for either side.
    const involvedSchoolIds = new Set([
      String(request.home_school_id),
      ...(request.items || []).map(item => item.owner_school_id).filter(Boolean),
      ...(request.items || []).map(item => item.partner_school_id).filter(Boolean)
    ].map(String));

    const isAuthorizedSchool = involvedSchoolIds.has(String(req.user.school_id));

    console.log('[SCAN QR] Involved schools:', [...involvedSchoolIds]);
    console.log('[SCAN QR] Authorized school check:', isAuthorizedSchool);

    if (!isAuthorizedSchool) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not involved in this request' });
    }

    res.json({ success: true, data: request });
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

    // Get request details for notification
    const { data: itemDetails } = await supabase
      .from('borrow_request_items')
      .select(`
        request_id,
        book_id,
        borrow_request_items(
          request_id,
          student_id
        )
      `)
      .eq('item_id', req.params.item_id)
      .single();

    const result = await BorrowRequest.releaseBook(req.params.item_id, req.user.user_id, copy_id);

    // Notify student that book has been borrowed
    if (itemDetails) {
      const { data: request } = await supabase
        .from('borrow_requests')
        .select('student_id, request_id')
        .eq('request_id', itemDetails.request_id)
        .single();

      if (request) {
        const { data: book } = await supabase
          .from('books')
          .select('title')
          .eq('book_id', itemDetails.book_id)
          .single();

        const librarianName = [req.user.firstname, req.user.lastname].filter(Boolean).join(' ') || 'Librarian';

        await supabase
          .from('notifications')
          .insert({
            user_id: request.student_id,
            school_id: req.user.school_id,
            type: 'book_borrowed',
            title: 'Book Borrowed Successfully 📚',
            message: `You have successfully borrowed "${book?.title || 'the book'}". Please return it by the due date.`,
            related_id: null,
            is_read: false,
            is_admin_notification: false,
            created_at: new Date().toISOString(),
          });
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error releasing book:', error);
    console.error('[BORROW REQUESTS] Error details:', error.message);
    console.error('[BORROW REQUESTS] Error stack:', error.stack);
    console.error('[BORROW REQUESTS] Full error object:', JSON.stringify(error, null, 2));
    res.status(500).json({ success: false, message: 'Server error', error: error.message, details: error.toString() });
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

    const result = await BorrowRequest.returnBook(req.params.item_id, req.user.user_id);

    // Notify student that book has been returned
    if (request && request.student_id) {
      const { data: book } = await supabase
        .from('books')
        .select('title')
        .eq('book_id', itemDetails.book_id)
        .single();

      const bookTitle = book?.title || 'the book';
      let notifTitle = 'Book Returned Successfully ✅';
      let notifMessage = `You have successfully returned "${bookTitle}". Thank you for using the library.`;

      if (result.fineAssessed > 0) {
        notifTitle = 'Book Returned with Overdue Fine ⚠️';
        notifMessage = `You returned "${bookTitle}" ${result.daysOverdue} day(s) late. An overdue fine of ₱${Number(result.fineAssessed).toFixed(2)} has been recorded. Please settle it at the library circulation desk.`;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: request.student_id,
          school_id: req.user.school_id,
          type: 'book_returned',
          title: notifTitle,
          message: notifMessage,
          related_id: null,
          is_read: false,
          is_admin_notification: false,
          created_at: new Date().toISOString(),
        });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error returning book:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

module.exports = router;
