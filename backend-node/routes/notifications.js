const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

async function enrichNotifications(notifications) {
  const requestIds = [...new Set((notifications || [])
    .map(notification => getNotificationRequestId(notification))
    .filter(Boolean))];

  if (requestIds.length === 0) {
    return (notifications || []).map(normalizeNotification);
  }

  const { data: requests, error: requestError } = await supabase
    .from('borrow_requests')
    .select('request_id, student_id')
    .in('request_id', requestIds);

  if (requestError) throw requestError;

  const studentIds = [...new Set((requests || []).map(request => request.student_id).filter(Boolean))];
  const { data: students, error: studentError } = studentIds.length > 0
    ? await supabase.from('users').select('user_id, firstname, lastname, profile_image, school_id').in('user_id', studentIds)
    : { data: [], error: null };

  if (studentError) throw studentError;

  // Get school codes for students
  const schoolIds = [...new Set((students || []).map(s => s.school_id).filter(Boolean))];
  const { data: schools, error: schoolError } = schoolIds.length > 0
    ? await supabase.from('schools').select('school_id, school_code').in('school_id', schoolIds)
    : { data: [], error: null };

  if (schoolError) throw schoolError;

  const requestsById = new Map((requests || []).map(request => [request.request_id, request]));
  const studentsById = new Map((students || []).map(student => [student.user_id, student]));
  const schoolsById = new Map((schools || []).map(school => [school.school_id, school.school_code]));

  return (notifications || []).map(notification => {
    const relatedRequestId = getNotificationRequestId(notification);
    const request = requestsById.get(relatedRequestId);
    const student = request ? studentsById.get(request.student_id) : null;
    const schoolCode = student ? schoolsById.get(student.school_id) : null;
    
    return normalizeNotification({
      ...notification,
      related_request_id: relatedRequestId,
      sender_name: student ? [student.firstname, student.lastname].filter(Boolean).join(' ') : null,
      sender_role: student ? 'Student' : null,
      profile_picture: student?.profile_image || null,
      student_name: student ? [student.firstname, student.lastname].filter(Boolean).join(' ') : null,
      student_profile_picture: student?.profile_image || null,
      school_code: schoolCode || notification.school_code || null,
    });
  });
}

function extractRequestId(message = '') {
  return String(message).match(/LL-\d{4}-\d{6}/)?.[0] || null;
}

function getNotificationRequestId(notification = {}) {
  if (notification.related_request_id) return notification.related_request_id;
  if (typeof notification.related_id === 'string' && notification.related_id.startsWith('LL-')) {
    return notification.related_id;
  }
  return extractRequestId(notification.message);
}

function normalizeNotification(notification) {
  return {
    ...notification,
    notification_id: notification.notification_id || notification.id,
    id: notification.notification_id || notification.id,
    read: Boolean(notification.is_read ?? notification.read),
  };
}

async function ensureBorrowRequestNotification(user) {
  if (!user?.school_id || !user?.user_id) return;

  const { data: items, error: itemsError } = await supabase
    .from('borrow_request_items')
    .select('request_id, book_id')
    .eq('owner_school_id', user.school_id);

  if (itemsError) throw itemsError;
  const requestIds = [...new Set((items || []).map(item => item.request_id).filter(Boolean))];
  if (requestIds.length === 0) return;

  const { data: requests, error: requestsError } = await supabase
    .from('borrow_requests')
    .select('request_id, student_id, status, request_type, items:borrow_request_items(book:book_id(title))')
    .in('request_id', requestIds)
    .eq('status', 'pending');

  if (requestsError) throw requestsError;
  if (!requests || requests.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from('notifications')
    .select('message')
    .eq('user_id', user.user_id);

  if (existingError) throw existingError;
  const existingIds = new Set((existing || []).map(notification => extractRequestId(notification.message)).filter(Boolean));
  const studentIds = [...new Set(requests.map(request => request.student_id).filter(Boolean))];
  const { data: students, error: studentsError } = await supabase
    .from('users')
    .select('user_id, firstname, lastname')
    .in('user_id', studentIds);

  if (studentsError) throw studentsError;
  const studentsById = new Map((students || []).map(student => [student.user_id, student]));
  const missing = requests.filter(request => !existingIds.has(request.request_id)).map(request => {
    const student = studentsById.get(request.student_id);
    const studentName = [student?.firstname, student?.lastname].filter(Boolean).join(' ') || 'A student';
    const titles = (request.items || []).map(item => item.book?.title).filter(Boolean);
    return {
      user_id: user.user_id,
      school_id: user.school_id,
      type: 'request_submitted',
      title: request.request_type === 'INTER_SCHOOL' ? 'New Inter-School Borrow Request' : 'New Borrow Request',
      message: `${studentName} submitted request ${request.request_id} for: ${titles.join(', ') || 'a book'}. Please review the request.`,
      related_id: null,
      is_read: false,
      is_admin_notification: false,
    };
  });

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('notifications').insert(missing);
    if (insertError) throw insertError;
  }
}

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    await ensureBorrowRequestNotification(req.user);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: await enrichNotifications(data || []) });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/notifications/user/:user_id
// @desc    Get notifications by user ID
// @access  Private
router.get('/user/:user_id', auth, async (req, res) => {
  try {
    const currentUserId = req.user.user_id || req.user.id;
    if (String(currentUserId) !== String(req.params.user_id)) {
      return res.status(403).json({ success: false, message: 'You can only view your own notifications' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, data: await enrichNotifications(data || []) });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/notifications/admin
// @desc    Get all notifications (admin)
// @access  Private (Super Admin, Librarian Admin)
router.get('/admin', auth, requireRole(['Super Admin', 'Librarian Admin']), async (req, res) => {
  try {
    await ensureBorrowRequestNotification(req.user);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.user_id || req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    res.json({ success: true, data: await enrichNotifications(data || []) });
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications for user
// @access  Private
router.delete('/clear-all', auth, async (req, res) => {
  console.log('[NOTIFICATIONS] DELETE /clear-all called');
  try {
    const userId = req.user.user_id || req.user.id;
    console.log('[NOTIFICATIONS] Deleting all notifications for user:', userId);
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Supabase error deleting all:', error);
      throw error;
    }
    
    console.log('[NOTIFICATIONS] Successfully deleted all notifications');
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error deleting all notifications:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  console.log('[NOTIFICATIONS] DELETE /:id called with id:', req.params.id);
  try {
    const userId = req.user.user_id || req.user.id;
    console.log('[NOTIFICATIONS] User ID:', userId);
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', req.params.id)
      .eq('user_id', userId);

    if (error) {
      console.error('[NOTIFICATIONS] Supabase error deleting:', error);
      throw error;
    }
    
    console.log('[NOTIFICATIONS] Successfully deleted notification');
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('[NOTIFICATIONS] Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
