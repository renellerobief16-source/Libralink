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
  const scope = isSuperAdmin(req) ? 'global' : 'school';

  let users = [];
  if (scope === 'global') {
    // All active users across every school
    const { data, error } = await supabase
      .from('users')
      .select('user_id, school_id')
      .eq('status', 'active');
    if (error) {
      console.error('[ANNOUNCEMENTS] Error fetching users for broadcast:', error);
      return;
    }
    users = data || [];
  } else {
    // Only users within the librarian admin's school
    const schoolId = req.user?.school_id;
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('users')
      .select('user_id, school_id')
      .eq('school_id', schoolId)
      .eq('status', 'active');
    if (error) {
      console.error('[ANNOUNCEMENTS] Error fetching school users:', error);
      return;
    }
    users = data || [];
  }

  if (users.length === 0) return;

  const creatorName = [req.user?.firstname, req.user?.lastname]
    .filter(Boolean)
    .join(' ') || 'Administrator';

  const notifications = users.map((user) => ({
    user_id: user.user_id,
    school_id: user.school_id,
    type: 'announcement',
    title: scope === 'global' ? '📢 Global Announcement' : '📢 School Announcement',
    message: `New announcement from ${creatorName}: "${title}" — ${content}`,
    related_id: null,
    is_read: false,
    is_global: scope === 'global',
    is_admin_notification: true,
    created_at: new Date().toISOString(),
  }));

  const BATCH = 200;
  for (let i = 0; i < notifications.length; i += BATCH) {
    const batch = notifications.slice(i, i + BATCH);
    const { error } = await supabase.from('notifications').insert(batch);
    if (error) {
      console.error('[ANNOUNCEMENTS] Error inserting notification batch:', error);
    }
  }

  console.log(`[ANNOUNCEMENTS] Broadcast ${notifications.length} notifications (${scope}) for announcement ${announcement_id}`);
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
      // Super admins see everything
      query = query.order('created_at', { ascending: false });
    } else if (schoolId) {
      // Their school's announcements + global (school_id IS NULL)
      query = query.or(`school_id.eq.${schoolId},school_id.is.null`);
    } else {
      query = query.is('school_id', 'null');
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

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
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error getting school announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement
//          - Super Admin → global (school_id = null, visible to all schools)
//          - Librarian Admin → school-scoped (their own school_id)
//          Notification rows are broadcast to the appropriate audience.
// @access  Private (Super Admin, Librarian Admin)
router.post('/', auth, requireRole(['Super Admin', 'Librarian Admin']), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const isSuper = isSuperAdmin(req);
    // Super admin → school_id NULL (global); librarian admin → their school
    const schoolId = isSuper ? null : (req.user?.school_id || null);

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        school_id: schoolId,
        created_by: req.user?.user_id || req.user?.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Fan out notification rows to every relevant user
    await broadcastAnnouncementNotifications(data, req);

    res.status(201).json({ success: true, data });
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
