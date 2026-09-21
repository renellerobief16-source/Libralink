const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

async function enrichNotifications(notifications) {
  if (!notifications || notifications.length === 0) return [];

  const requestIds = [...new Set((notifications || [])
    .map(notification => getNotificationRequestId(notification))
    .filter(Boolean))];

  // 1. Fetch borrow requests if any requestIds exist
  let requests = [];
  if (requestIds.length > 0) {
    const { data, error: requestError } = await supabase
      .from('borrow_requests')
      .select('request_id, student_id')
      .in('request_id', requestIds);
    if (!requestError && data) requests = data;
  }

  // 1b. Fetch announcements if any announcement notifications exist
  const announcementIds = [...new Set((notifications || [])
    .filter(n => (n.type === 'announcement' || String(n.title || '').includes('Announcement')) && n.related_id)
    .map(n => Number(n.related_id) || n.related_id)
    .filter(Boolean))];

  let announcementsMap = new Map();
  if (announcementIds.length > 0) {
    const { data: annData } = await supabase
      .from('announcements')
      .select('announcement_id, created_by, title')
      .in('announcement_id', announcementIds);
    if (annData) {
      annData.forEach(a => announcementsMap.set(String(a.announcement_id), a));
    }
  }

  // 2. Collect student user IDs from borrow requests, direct notification user_ids, and announcement creators
  const studentIdsFromRequests = requests.map(r => r.student_id).filter(Boolean);
  const directUserIds = notifications.map(n => n.user_id || n.sender_id).filter(Boolean);
  const announcementCreatorIds = Array.from(announcementsMap.values()).map(a => a.created_by).filter(Boolean);
  const allUserIds = [...new Set([...studentIdsFromRequests, ...directUserIds, ...announcementCreatorIds])];

  // 3. Fetch all potential student/user accounts
  let usersList = [];
  if (allUserIds.length > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('user_id, firstname, lastname, profile_image, school_id, role_id, role')
      .in('user_id', allUserIds);
    if (!usersError && usersData) usersList = usersData;
  }

  // 4. Also fetch active staff and students to help match by name if lookup misses
  const namesInMessages = notifications.map(n => {
    const match = String(n.message || '').match(/(?:From\s+|has\s+)?([A-Za-z\s.]+?)(?:\s*:|\s+(?:has\s+)?(?:submitted|requested|borrowed|canceled|cancelled|returned|claimed))/i);
    return match ? match[1].trim() : null;
  }).filter(Boolean);

  if (namesInMessages.length > 0) {
    const { data: nameUsers } = await supabase
      .from('users')
      .select('user_id, firstname, lastname, profile_image, school_id, role_id, role')
      .limit(150);
    if (nameUsers) {
      const existingIds = new Set(usersList.map(u => u.user_id));
      nameUsers.forEach(nu => {
        if (!existingIds.has(nu.user_id)) {
          usersList.push(nu);
          existingIds.add(nu.user_id);
        }
      });
    }
  }

  // 5. Fetch school codes
  const schoolIds = [...new Set(usersList.map(s => s.school_id).filter(Boolean))];
  let schoolsList = [];
  if (schoolIds.length > 0) {
    const { data: schoolsData } = await supabase
      .from('schools')
      .select('school_id, school_code')
      .in('school_id', schoolIds);
    if (schoolsData) schoolsList = schoolsData;
  }

  const requestsById = new Map(requests.map(request => [request.request_id, request]));
  const studentsById = new Map(usersList.map(student => [student.user_id, student]));
  const schoolsById = new Map(schoolsList.map(school => [school.school_id, school.school_code]));

  return notifications.map(notification => {
    const relatedRequestId = getNotificationRequestId(notification);
    const request = requestsById.get(relatedRequestId);
    let matchedUser = request ? studentsById.get(request.student_id) : null;

    // Check if announcement
    const isAnn = notification.type === 'announcement' || String(notification.title || '').includes('Announcement');
    if (isAnn && notification.related_id) {
      const ann = announcementsMap.get(String(notification.related_id));
      if (ann?.created_by) {
        matchedUser = studentsById.get(ann.created_by);
      }
    }

    // If not found, check by notification.sender_id or user_id
    if (!matchedUser && notification.sender_id) {
      matchedUser = studentsById.get(notification.sender_id);
    }
    if (!matchedUser && !isAnn && notification.user_id) {
      matchedUser = studentsById.get(notification.user_id);
    }

    // Try matching by parsed name in message
    if (!matchedUser) {
      const parsedMatch = String(notification.message || '').match(/(?:From\s+|has\s+)?([A-Za-z\s.]+?)(?:\s*:|\s+(?:has\s+)?(?:submitted|requested|borrowed|canceled|cancelled|returned|claimed))/i);
      const parsedName = parsedMatch ? parsedMatch[1].trim() : null;
      if (parsedName) {
        matchedUser = usersList.find(u => {
          const full = `${u.firstname || ''} ${u.lastname || ''}`.trim().toLowerCase();
          return full === parsedName.toLowerCase() || full.includes(parsedName.toLowerCase()) || parsedName.toLowerCase().includes(full);
        });
      }
    }

    const schoolCode = matchedUser ? schoolsById.get(matchedUser.school_id) : null;
    const finalName = matchedUser
      ? [matchedUser.firstname, matchedUser.lastname].filter(Boolean).join(' ')
      : (isAnn ? 'Library Administration' : (notification.sender_name || notification.student_name || 'Library Patron'));

    const profilePic = matchedUser?.profile_image || notification.profile_picture || notification.sender_profile_picture || notification.student_profile_picture || null;

    return normalizeNotification({
      ...notification,
      related_request_id: relatedRequestId,
      sender_name: finalName,
      sender_role: matchedUser?.role || (isAnn ? 'Librarian Admin' : (notification.sender_role || 'User')),
      profile_picture: profilePic,
      sender_profile_picture: profilePic,
      student_name: finalName,
      student_profile_picture: profilePic,
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

/**
 * Determine whether a given role is a "super admin".
 * Super admins are global and may see announcements from every school,
 * whereas librarian / librarian-admin / student are scoped to a single school.
 */
function isSuperAdminRole(user) {
  const role = String(user?.role_name || user?.role || '').toLowerCase();
  return role === 'super admin' || role === 'super_admin' || role === 'admin';
}

/**
 * Build a reusable notification query that is scoped to the current user's
 * school by default. Super admins see all schools (global) so they can review
 * cross-school notifications and issue global announcements.
 *
 * @param {object} user  Decoded JWT payload (req.user)
 * @returns {object} { query, scopeLabel } where query is an executable Supabase builder
 */
function buildScopedNotificationsQuery(user, { limit = 50 } = {}) {
  const userId = user?.user_id || user?.id;
  const schoolId = user?.school_id || null;
  const isSuperAdmin = isSuperAdminRole(user);

  let query = supabase
    .from('notifications')
    .select('*');

  if (isSuperAdmin) {
    // Super admins get a global view: their own direct notifications plus
    // system-wide (global) announcements. They are not limited to one school.
    query = query.or(
      `user_id.eq.${userId},type.eq.announcement`
    );
  } else {
    // School-scoped staff and students see notifications addressed to them
    // OR global announcements broadcast to every school.
    query = query.or(
      `and(user_id.eq.${userId},or(school_id.eq.${schoolId},school_id.is.null,type.eq.announcement)),and(school_id.eq.${schoolId},type.eq.announcement)`
    );
  }

  return query.order('created_at', { ascending: false }).limit(limit);
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
// @desc    Get user notifications (school-scoped)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    await ensureBorrowRequestNotification(req.user);

    const query = buildScopedNotificationsQuery(req.user);
    const { data, error } = await query;

    if (error) {
      // Fallback: if the OR filter is not supported on this schema, fall back
      // to the simple user_id fetch to keep the UI functional.
      console.warn('[NOTIFICATIONS] Scoped query failed, falling back to user_id:', error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fallbackError) throw fallbackError;
      return res.json({ success: true, data: await enrichNotifications(fallbackData || []) });
    }

    res.json({ success: true, data: await enrichNotifications(data || []) });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/notifications/user/:user_id
// @desc    Get notifications by user ID (school-scoped)
// @access  Private
router.get('/user/:user_id', auth, async (req, res) => {
  try {
    const currentUserId = req.user.user_id || req.user.id;
    if (String(currentUserId) !== String(req.params.user_id)) {
      return res.status(403).json({ success: false, message: 'You can only view your own notifications' });
    }

    await ensureBorrowRequestNotification(req.user);
    const query = buildScopedNotificationsQuery(req.user);
    const { data, error } = await query;

    if (error) {
      console.warn('[NOTIFICATIONS] Scoped query failed, falling back:', error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', req.params.user_id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (fallbackError) throw fallbackError;
      return res.json({ success: true, data: await enrichNotifications(fallbackData || []) });
    }

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

    const query = buildScopedNotificationsQuery(req.user);
    const { data, error } = await query;

    if (error) {
      console.warn('[NOTIFICATIONS] Scoped admin query failed, falling back:', error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', req.user.user_id || req.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (fallbackError) throw fallbackError;
      return res.json({ success: true, data: await enrichNotifications(fallbackData || []) });
    }

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

// @route   POST /api/notifications/send-email
// @desc    Librarian sends direct email to a student
// @access  Private (Librarian Admin, Librarian)
router.post('/send-email', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const { recipient_email, recipient_name, subject, message, template_type } = req.body;
    if (!recipient_email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Recipient email, subject, and message are required' });
    }

    const { sendDirectLibrarianEmail } = require('../utils/email');
    const School = require('../models/School');
    const schoolId = req.user?.school_id;
    let schoolName = 'Library Institution';
    if (schoolId) {
      const school = await School.getById(schoolId);
      if (school?.school_name) schoolName = school.school_name;
    }

    const senderName = [req.user?.firstname, req.user?.lastname].filter(Boolean).join(' ') || 'Campus Librarian';
    const senderRole = req.user?.role_name || req.user?.role || 'Librarian Administrator';
    const senderProfilePicture = req.user?.profile_image || req.user?.profile_picture || null;

    const emailResult = await sendDirectLibrarianEmail({
      toEmail: recipient_email,
      recipientName: recipient_name || 'Library Patron',
      subject,
      messageBody: message,
      templateType: template_type || 'notice',
      schoolName,
      senderName,
      senderRole,
      senderProfilePicture
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: emailResult.error || 'Failed to dispatch email' });
    }

    res.json({
      success: true,
      message: 'Email dispatched successfully to ' + recipient_email,
      messageId: emailResult.messageId
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] Error sending direct email:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// @route   POST /api/notifications/reminder
// @desc    Send a due / overdue reminder notification to a student
// @access  Private (Librarian/Admin)
router.post('/reminder', auth, requireRole(['librarian', 'librarian admin', 'super admin', 'admin']), async (req, res) => {
  try {
    const { student_id, book_title, due_date, reminder_type = 'due_soon', days_left = 0, borrow_id = null } = req.body;

    if (!student_id) {
      return res.status(400).json({ success: false, message: 'student_id is required' });
    }

    // Resolve target user_id (checking if student_id is from students or users table)
    let targetUserId = student_id;
    const { data: studentRecord } = await supabase
      .from('students')
      .select('user_id, student_id')
      .or(`student_id.eq.${student_id},user_id.eq.${student_id}`)
      .limit(1)
      .maybeSingle();

    if (studentRecord?.user_id) {
      targetUserId = studentRecord.user_id;
    }

    const isOverdue = reminder_type === 'overdue' || Number(days_left) < 0;
    const title = isOverdue
      ? `⚠️ Overdue Notice: "${book_title || 'Book'}"`
      : `⏰ Due Date Reminder: "${book_title || 'Book'}"`;

    const message = isOverdue
      ? `Your borrowed book "${book_title || 'Book'}" was due on ${due_date || 'recently'}. Please return it to the campus library circulation counter immediately to avoid fine accumulation.`
      : `Friendly reminder: Your borrowed book "${book_title || 'Book'}" is due on ${due_date || 'soon'}. Please return or renew it at the library counter before the due date.`;

    const notificationPayload = {
      user_id: targetUserId,
      type: isOverdue ? 'overdue_reminder' : 'due_reminder',
      title,
      message,
      related_id: borrow_id ? String(borrow_id) : null,
      is_read: false,
      is_admin_notification: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationPayload])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data, message: 'Reminder notification sent successfully' });
  } catch (err) {
    console.error('[NOTIFICATIONS] Error sending reminder:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;
