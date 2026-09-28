/**
 * returnQrScheduler.js
 *
 * Runs once daily. For every active borrow request whose due_date falls on
 * today, sends a notification to the student that includes the request's
 * QR token — which they show when returning the book to the librarian.
 *
 * The return QR is intentionally NOT sent at approval time. The physical
 * Permission Letter (with its embedded QR) is the only access credential.
 * This scheduler fires on the due date so the student has the QR ready.
 */

const supabase = require('../config/database');

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function sendReturnQrNotifications() {
  try {
    const now = new Date();
    // Build date range covering today (midnight → midnight+1 in UTC)
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    console.log(`[RETURN QR SCHEDULER] Running at ${now.toISOString()} — checking due dates between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);

    // Fetch active borrow requests due today that have a qr_token
    const { data: dueRequests, error } = await supabase
      .from('borrow_requests')
      .select(`
        request_id,
        student_id,
        home_school_id,
        due_date,
        qr_token,
        status,
        student:student_id(firstname, lastname, email),
        items:borrow_request_items(book_id, book:book_id(title))
      `)
      .in('status', ['borrowed', 'active'])
      .gte('due_date', todayStart.toISOString())
      .lte('due_date', todayEnd.toISOString())
      .not('qr_token', 'is', null);

    if (error) {
      console.error('[RETURN QR SCHEDULER] Error fetching due requests:', error);
      return;
    }

    if (!dueRequests || dueRequests.length === 0) {
      console.log('[RETURN QR SCHEDULER] No requests due today — nothing to do.');
      return;
    }

    console.log(`[RETURN QR SCHEDULER] Found ${dueRequests.length} request(s) due today.`);

    for (const req of dueRequests) {
      const studentName = [req.student?.firstname, req.student?.lastname].filter(Boolean).join(' ') || 'Student';
      const bookTitles = (req.items || [])
        .map(i => i.book?.title || 'a book')
        .filter(Boolean)
        .join(', ');

      const formattedDue = new Date(req.due_date).toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      // The QR token that the student shows for book return
      const returnQrPayload = req.qr_token;

      const notifPayload = {
        user_id: req.student_id,
        school_id: req.home_school_id,
        type: 'return_qr_ready',
        title: '📦 Return QR Code — Book Due Today',
        message: `Hi ${studentName}, your loan of "${bookTitles}" is due today (${formattedDue}). ` +
          `Please return it to the library. Show this QR code to the librarian when returning: ${returnQrPayload}`,
        related_id: null,
        is_read: false,
        is_admin_notification: false,
        created_at: new Date().toISOString(),
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifPayload);

      if (notifError) {
        console.warn(`[RETURN QR SCHEDULER] Failed to notify student ${req.student_id} for request ${req.request_id}:`, notifError.message);
      } else {
        console.log(`[RETURN QR SCHEDULER] Sent return QR notification → student ${req.student_id} (request ${req.request_id})`);
      }
    }
  } catch (err) {
    console.error('[RETURN QR SCHEDULER] Unexpected error:', err);
  }
}

/**
 * Starts the scheduler.
 * Fires once immediately (for today's due dates), then every 24 hours.
 */
function startReturnQrScheduler() {
  console.log('[RETURN QR SCHEDULER] Starting — will run daily to send return QR codes on due dates.');
  // Run immediately on startup to handle current day
  sendReturnQrNotifications();
  // Then repeat every 24 hours
  setInterval(sendReturnQrNotifications, INTERVAL_MS);
}

module.exports = { startReturnQrScheduler };
