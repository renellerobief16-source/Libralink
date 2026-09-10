/**
 * Time and Date Utilities for LibraLink
 * Standardized on Philippine Standard Time (Asia/Manila, UTC+8)
 */

const MANILA_TZ = 'Asia/Manila';

/**
 * Parses any incoming date representation safely
 * @param {string|number|Date} dateInput 
 * @returns {Date|null}
 */
export function safeParseDate(dateInput) {
  if (!dateInput) return null;
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
 * Combines Philippine date-time with relative indicator
 * Example: "Sep 10, 2026 • 10:00 PM (2h ago)"
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatDateTimeWithRelative(dateInput, fallback = '—') {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;

  const fullTime = formatPhilippineDateTime(d, fallback);
  const rel = formatRelativeTime(d);

  if (rel && rel !== 'Just now' && !rel.includes(',')) {
    return `${fullTime} (${rel})`;
  }
  return fullTime;
}
