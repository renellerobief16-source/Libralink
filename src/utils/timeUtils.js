/**
 * Time and Date Utilities for LibraLink
 * Standardized on Philippine Standard Time (Asia/Manila, UTC+8)
 */

const MANILA_TZ = 'Asia/Manila';

/**
 * Parses any incoming date representation safely and normalizes UTC database timestamps
 * @param {string|number|Date} dateInput 
 * @returns {Date|null}
 */
export function safeParseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'string') {
    let s = dateInput.trim();
    if (!s) return null;
    // If format is YYYY-MM-DD (date only), treat as midday to avoid UTC timezone rollback
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    // If format has timestamp but lacks timezone offset (e.g. from PostgreSQL '2026-09-12T03:26:07.793' or '2026-09-12 03:26:07.793')
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(s) && !/[Zz]|[+-]\d{2}(:?\d{2})?$/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date to Philippine local date & 12-hour time with AM/PM
 * Example: "Sep 10, 2026 • 10:00 PM"
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatPhilippineDateTime(dateInput, fallback = '—') {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;

  try {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${dateFormatter.format(d)} • ${timeFormatter.format(d)}`;
  } catch (err) {
    console.warn('formatPhilippineDateTime error:', err);
    return d.toLocaleString();
  }
}

/**
 * Formats a date to Philippine date only
 * Example: "Sep 10, 2026"
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatPhilippineDate(dateInput, fallback = '—') {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Formats a time to Philippine 12-hour time only
 * Example: "10:00 PM"
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatPhilippineTime(dateInput, fallback = '—') {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

/**
 * Formats a timestamp into human-friendly relative time
 * Example: "Just now", "5m ago", "2h ago", "3d ago"
 * @param {string|number|Date} dateInput 
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  const d = safeParseDate(dateInput);
  if (!d) return '';

  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSeconds < 45) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  
  return formatPhilippineDate(d);
}

/**
 * Formats a timestamp into Smart Contextual Relative Time
 * - < 60s: "Just now"
 * - < 60m: "X mins ago"
 * - Today: "Today at 2:30 PM"
 * - Yesterday: "Yesterday at 10:15 AM"
 * - This year: "Sep 23 at 2:30 PM"
 * - Older: "Sep 23, 2025 at 2:30 PM"
 * 
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatSmartTime(dateInput, fallback = '—') {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;

  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  // Very recent
  if (diffSeconds < 45) return 'Just now';
  if (diffSeconds < 3600) {
    const mins = Math.max(1, Math.floor(diffSeconds / 60));
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }

  const timeStr = formatPhilippineTime(d);
  const todayStr = getManilaDateString(now);
  const dateStr = getManilaDateString(d);

  if (todayStr === dateStr) {
    return `Today at ${timeStr}`;
  }

  // Calculate yesterday in Manila
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getManilaDateString(yesterdayDate);
  if (yesterdayStr === dateStr) {
    return `Yesterday at ${timeStr}`;
  }

  // Same year check
  try {
    const dYear = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, year: 'numeric' }).format(d);
    const nowYear = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, year: 'numeric' }).format(now);
    const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, month: 'short', day: 'numeric' }).format(d);

    if (dYear === nowYear) {
      return `${monthDay} at ${timeStr}`;
    }
    return `${monthDay}, ${dYear} at ${timeStr}`;
  } catch {
    return `${formatPhilippineDate(d)} at ${timeStr}`;
  }
}

/**
 * Returns a high-precision Philippine Standard Time description for title tooltips
 * Example: "Wednesday, September 23, 2026 at 2:30:15 PM (PST / UTC+8)"
 * @param {string|number|Date} dateInput 
 * @returns {string}
 */
export function formatPhilippineFullTooltip(dateInput) {
  const d = safeParseDate(dateInput);
  if (!d) return '';

  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: MANILA_TZ,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);

    return `${formatted} (PST / UTC+8)`;
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Combines Philippine date-time with relative indicator
 * Example: "Sep 10, 2026 • 10:00 PM (2h ago)"
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatDateTimeWithRelative(dateInput, fallback = '—') {
  return formatSmartTime(dateInput, fallback);
}

/**
 * Formats time only with relative indicator (for table cells that already show the date)
 * Example: "4:40 PM (1h ago)"
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatTimeWithRelative(dateInput, fallback = '—') {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;

  const timeStr = formatPhilippineTime(d, fallback);
  const rel = formatRelativeTime(d);

  if (rel && rel !== 'Just now' && !rel.includes(',') && !rel.includes(d.getFullYear().toString())) {
    return `${timeStr} • ${rel}`;
  }
  return timeStr;
}

/**
 * Gets calendar date string (YYYY-MM-DD) in Philippine Standard Time
 * @param {Date} d 
 * @returns {string}
 */
export function getManilaDateString(dateInput) {
  const d = safeParseDate(dateInput);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: MANILA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

/**
 * Accurately determines loan due status according to Philippine calendar day
 * Cutoff: Books remain 'due_today' until 11:59:59 PM PHT of the due date.
 * Only become 'overdue' on the following calendar day (at least 1d overdue).
 * 
 * @param {string|number|Date} dueDateInput 
 * @returns {{
 *   status: 'overdue' | 'due_today' | 'due_soon' | 'active',
 *   label: string,
 *   badgeClass: string,
 *   textClass: string,
 *   isOverdue: boolean,
 *   isDueToday: boolean,
 *   isDueSoon: boolean,
 *   daysOverdue: number,
 *   daysRemaining: number
 * }}
 */
export function getDueStatusDetails(dueDateInput) {
  const dueDate = safeParseDate(dueDateInput);
  if (!dueDate) {
    return {
      status: 'active',
      label: 'Active',
      badgeClass: 'bg-slate-50 border-slate-200 text-slate-700',
      textClass: 'text-slate-700',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
      daysOverdue: 0,
      daysRemaining: 0,
    };
  }

  const todayStr = getManilaDateString(new Date());
  const dueStr = getManilaDateString(dueDate);

  if (todayStr === dueStr) {
    return {
      status: 'due_today',
      label: 'Due Today',
      badgeClass: 'bg-amber-50 border-amber-300 text-amber-800 ring-1 ring-amber-400/30',
      textClass: 'text-amber-700 font-bold',
      isOverdue: false,
      isDueToday: true,
      isDueSoon: true,
      daysOverdue: 0,
      daysRemaining: 0,
    };
  }

  if (todayStr > dueStr) {
    const todayEpoch = new Date(todayStr + 'T00:00:00+08:00').getTime();
    const dueEpoch = new Date(dueStr + 'T00:00:00+08:00').getTime();
    const daysOverdue = Math.max(1, Math.round((todayEpoch - dueEpoch) / (1000 * 60 * 60 * 24)));

    return {
      status: 'overdue',
      label: `${daysOverdue}d Overdue`,
      badgeClass: 'bg-rose-50 border-rose-200 text-rose-700 ring-1 ring-rose-400/20',
      textClass: 'text-rose-600 font-bold',
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
      daysOverdue,
      daysRemaining: 0,
    };
  }

  // Future due date
  const todayEpoch = new Date(todayStr + 'T00:00:00+08:00').getTime();
  const dueEpoch = new Date(dueStr + 'T00:00:00+08:00').getTime();
  const daysRemaining = Math.max(1, Math.round((dueEpoch - todayEpoch) / (1000 * 60 * 60 * 24)));

  if (daysRemaining === 1) {
    return {
      status: 'due_soon',
      label: 'Due Tomorrow',
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
      textClass: 'text-amber-600 font-semibold',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysOverdue: 0,
      daysRemaining: 1,
    };
  }

  if (daysRemaining <= 2) {
    return {
      status: 'due_soon',
      label: `Due in ${daysRemaining}d`,
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
      textClass: 'text-amber-600 font-semibold',
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysOverdue: 0,
      daysRemaining,
    };
  }

  return {
    status: 'active',
    label: 'Active',
    badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    textClass: 'text-emerald-700 font-medium',
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    daysOverdue: 0,
    daysRemaining,
  };
}
