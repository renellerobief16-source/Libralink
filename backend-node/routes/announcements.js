const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const supabase = require('../config/database');

/**
 * Helper: check whether the requesting user is a super admin by role name.
 */
function isSuperAdmin(req) {
  const role = String(req.user?.role_name || req.user?.role || '').toLowerCase();
  return role === 'super admin' || role === 'super_admin' || role === 'admin';
}

/**
 * After an announcement is created, fan-out notification rows to the
 * appropriate audience:
 *
 * - Super Admin creates → notifications for ALL active users across all schools
 * - Librarian Admin creates → notifications only for active users in that
 *   librarian admin's school.
 *
 * Notification rows are inserted in batches so we don't hit Postgres limits.
 */
async function broadcastAnnouncementNotifications(announcement, req) {
  const { announcement_id, title, content } = announcement;
  const targetAudience = req.body?.target_audience || announcement.target_audience || 'all';
  const priority = req.body?.priority || announcement.priority || 'normal';
  const scope = isSuperAdmin(req) ? 'global' : 'school';

  let userQuery = supabase
    .from('users')
    .select('user_id, school_id, role_id, role')
    .eq('status', 'active');

  if (scope !== 'global') {
    const schoolId = req.user?.school_id;
    if (!schoolId) return;
    userQuery = userQuery.eq('school_id', schoolId);
  }

  // Filter based on target_audience
  if (targetAudience === 'students') {
    // role_id 4 is student or role name includes student
    userQuery = userQuery.or('role_id.eq.4,role.ilike.%student%');
  } else if (targetAudience === 'librarians') {
    // role_id 2 or 3 or role name includes librarian
    userQuery = userQuery.or('role_id.eq.2,role_id.eq.3,role.ilike.%librarian%');
  }

  const { data: users, error } = await userQuery;
  if (error) {
    console.error('[ANNOUNCEMENTS] Error fetching users for broadcast:', error);
    return;
  }

  if (!users || users.length === 0) return;

  const creatorName = [req.user?.firstname, req.user?.lastname]
    .filter(Boolean)
    .join(' ') || 'Administrator';

  const isUrgent = priority === 'urgent';
  const notifTitle = isUrgent
    ? `🚨 URGENT: ${title}`
    : (scope === 'global' ? '📢 Global Announcement' : '📢 School Announcement');

  const notifications = users.map((user) => ({
    user_id: user.user_id,
    school_id: user.school_id,
    type: 'announcement',
    title: notifTitle,
    message: isUrgent
      ? `[URGENT] From ${creatorName}: "${title}" — ${content}`
      : `From ${creatorName}: "${title}" — ${content}`,
    related_id: announcement_id || null,
    is_read: false,
    is_global: scope === 'global',
    is_admin_notification: true,
    created_at: new Date().toISOString(),
  }));

  const BATCH = 200;
  for (let i = 0; i < notifications.length; i += BATCH) {
    const batch = notifications.slice(i, i + BATCH);
    const { error: batchErr } = await supabase.from('notifications').insert(batch);
    if (batchErr) {
      console.error('[ANNOUNCEMENTS] Error inserting notification batch:', batchErr);
    }
  }

  console.log(`[ANNOUNCEMENTS] Broadcast ${notifications.length} notifications (${scope}, audience: ${targetAudience}, priority: ${priority}) for announcement ${announcement_id}`);
}

// ────────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────────

// @route   GET /api/announcements
// @desc    Get announcements relevant to the current user's school
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const isSuper = isSuperAdmin(req);

    let query = supabase.from('announcements').select('*');

    if (isSuper) {
      query = query.order('created_at', { ascending: false });
    } else if (schoolId) {
      query = query.or(`school_id.eq.${schoolId},school_id.is.null`);
    } else {
      query = query.is('school_id', 'null');
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/announcements/school/:school_id
// @desc    Get announcements by school
// @access  Private
router.get('/school/:school_id', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('school_id', req.params.school_id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting school announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement
// @access  Private (Super Admin, Librarian Admin)
router.post('/', auth, requireRole(['Super Admin', 'Librarian Admin']), async (req, res) => {
  try {
    const { title, content, target_audience = 'all', priority = 'normal' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const isSuper = isSuperAdmin(req);
    const schoolId = isSuper ? null : (req.user?.school_id || null);

    // Try inserting with target_audience & priority, fallback gracefully if columns not present
    let insertData = {
      title,
      content,
      school_id: schoolId,
      created_by: req.user?.user_id || req.user?.id,
      created_at: new Date().toISOString(),
    };

    let result = await supabase
      .from('announcements')
      .insert({
        ...insertData,
        target_audience,
        priority
      })
      .select()
      .maybeSingle();

    if (result.error) {
      // Fallback in case table doesn't have target_audience / priority columns yet
      result = await supabase
        .from('announcements')
        .insert(insertData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    const createdRecord = result.data || insertData;

    // Fan out notification rows to every relevant user
    await broadcastAnnouncementNotifications(createdRecord, req);

    res.status(201).json({ success: true, data: createdRecord });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement (school-scoped for librarian admins)
// @access  Private (Super Admin, Librarian Admin)
router.delete('/:id', auth, requireRole(['Super Admin', 'Librarian Admin']), async (req, res) => {
  try {
    const isSuper = isSuperAdmin(req);
    let query = supabase.from('announcements').delete().eq('announcement_id', req.params.id);

    // Non-super-admins can only delete their own school's announcements
    if (!isSuper && req.user?.school_id) {
      query = query.eq('school_id', req.user.school_id);
    }

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
