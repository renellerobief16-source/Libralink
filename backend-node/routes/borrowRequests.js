const express = require('express');
const router = express.Router();
const BorrowRequest = require('../models/BorrowRequest');
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

// @route   POST /api/borrow-requests
// @desc    Create a new borrowing request
// @access  Private (Student)
router.post('/', auth, requireRole(['Student']), async (req, res) => {
  try {
    console.log('[BORROW REQUESTS] Creating new request');
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
    
    res.status(500).json({ success: false, message: 'Unable to create borrowing request. Please try again.' });
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

    // Check if this is an inter-school request and if librarian is from owner school
    const { data: requestItems } = await supabase
      .from('borrow_request_items')
      .select('owner_school_id')
      .eq('request_id', req.params.id);

    const isInterSchool = request.request_type === 'INTER_SCHOOL' ||
      requestItems?.some(item => item.owner_school_id !== request.home_school_id);
    const isHomeSchool = String(request.home_school_id) === String(req.user.school_id);
    const isOwnerSchool = requestItems?.some(item => String(item.owner_school_id) === String(req.user.school_id));

    if ((isInterSchool && !isOwnerSchool) || (!isInterSchool && !isHomeSchool)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not your school' });
    }

    const result = await BorrowRequest.approve(req.params.id, req.user.user_id);
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

    // Check if this is an inter-school request and if librarian is from owner school
    const { data: requestItems } = await supabase
      .from('borrow_request_items')
      .select('owner_school_id')
      .eq('request_id', req.params.id);

    const isInterSchool = request.request_type === 'INTER_SCHOOL' ||
      requestItems?.some(item => item.owner_school_id !== request.home_school_id);
    const isHomeSchool = String(request.home_school_id) === String(req.user.school_id);
    const isOwnerSchool = requestItems?.some(item => String(item.owner_school_id) === String(req.user.school_id));

    if ((isInterSchool && !isOwnerSchool) || (!isInterSchool && !isHomeSchool)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Not your school' });
    }

    const result = await BorrowRequest.reject(req.params.id, remarks);
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
    const result = await BorrowRequest.releaseBook(req.params.item_id, req.user.user_id, copy_id);
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
    const result = await BorrowRequest.returnBook(req.params.item_id, req.user.user_id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error returning book:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/borrow-requests/:id/cancel
// @desc    Cancel a borrowing request
// @access  Private (Student)
router.put('/:id/cancel', auth, requireRole(['Student']), async (req, res) => {
  try {
    const request = await BorrowRequest.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if student owns the request
    if (request.student_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Can only cancel pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending requests' });
    }

    const result = await BorrowRequest.cancel(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BORROW REQUESTS] Error cancelling request:', error);
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
