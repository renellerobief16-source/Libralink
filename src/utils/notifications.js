const STORAGE_KEY = 'libralink_notifications'

function readNotificationStore() {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function notifyNotificationStoreChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent('libralink-notifications-updated'))
}

function writeNotificationStore(store) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  notifyNotificationStoreChanged()
}

function normalizeNotification(notification, fallbackId = Date.now().toString()) {
  return {
    id: notification?.id || fallbackId,
    type: notification?.type || 'info',
    title: notification?.title || 'Library Update',
    message: notification?.message || '',
    fullMessage: notification?.fullMessage || notification?.message || '',
    date: notification?.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: notification?.time || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    read: Boolean(notification?.read),
    color: notification?.color || 'blue',
    iconType: notification?.iconType || 'bell',
    sender: notification?.sender || 'Library System',
    priority: notification?.priority || 'medium',
    hasQRCode: Boolean(notification?.hasQRCode),
    qrCodeData: notification?.qrCodeData || '',
    bookDetails: notification?.bookDetails || null,
    createdAt: notification?.createdAt || new Date().toISOString(),
  }
}

export function getNotificationsForUser(userId) {
  if (!userId) {
    return []
  }

  const store = readNotificationStore()
  const notifications = Array.isArray(store[userId]) ? store[userId] : []
  return notifications
    .map((notification) => normalizeNotification(notification, `${userId}-${Date.now()}-${Math.random()}`))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function setNotificationsForUser(userId, notifications) {
  if (!userId) {
    return
  }

  const store = readNotificationStore()
  const normalizedNotifications = Array.isArray(notifications)
    ? notifications.map((notification) => normalizeNotification(notification, `${userId}-${Date.now()}-${Math.random()}`))
    : []

  store[userId] = normalizedNotifications
  writeNotificationStore(store)
}

export function addNotification(userId, notification) {
  const list = getNotificationsForUser(userId)
  const nextNotification = normalizeNotification(notification, `${userId}-${Date.now()}-${Math.random()}`)
  const nextList = [nextNotification, ...list].slice(0, 50)
  setNotificationsForUser(userId, nextList)
  return nextNotification
}

export function markNotificationAsRead(userId, notificationId) {
  const notifications = getNotificationsForUser(userId).map((notification) => (
    notification.id === notificationId
      ? { ...notification, read: true }
      : notification
  ))

  setNotificationsForUser(userId, notifications)
  return notifications
}

export function getUnreadNotificationCount(userId) {
  return getNotificationsForUser(userId).filter((notification) => !notification.read).length
}

export function createNotificationEntry({
  type = 'info',
  title,
  message,
  fullMessage,
  sender = 'Library System',
  priority = 'medium',
  color = 'blue',
  iconType = 'bell',
  hasQRCode = false,
  qrCodeData = '',
  bookDetails = null,
}) {
  return normalizeNotification({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    fullMessage,
    sender,
    priority,
    color,
    iconType,
    hasQRCode,
    qrCodeData,
    bookDetails,
    createdAt: new Date().toISOString(),
  })
}

export function seedSampleNotificationsForUser(userId) {
  const existing = getNotificationsForUser(userId)
  if (existing.length > 0) {
    return existing
  }

  const seedNotifications = [
    {
      id: `sample-${userId}-reminder`,
      type: 'reminder',
      title: 'Book Return Reminder',
      message: 'Your borrowed book "Introduction to Algorithms" is due in 3 days. Please return it to avoid late fees.',
      fullMessage: 'This is a friendly reminder that your borrowed book "Introduction to Algorithms" by Thomas H. Cormen is due on July 11, 2026. Please return it to the Main Library circulation desk before the due date to avoid late fees of $0.50 per day. If you need to extend the loan period, please visit the library or use our online renewal system.',
      date: 'July 8, 2026',
      time: '10:30 AM',
      read: false,
      color: 'orange',
      iconType: 'clock',
      sender: 'Library System',
      priority: 'high',
      hasQRCode: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: `sample-${userId}-success`,
      type: 'success',
      title: 'Book Available for Pickup',
      message: 'Good news! "Design Patterns" is now available for pickup at the Engineering Library.',
      fullMessage: 'Good news! The book "Design Patterns: Elements of Reusable Object-Oriented Software" by Erich Gamma that you requested is now available for pickup at the Engineering Library circulation desk. Please collect it within 3 days (by July 10, 2026) or your reservation will be cancelled. Bring your student ID for verification.',
      date: 'July 7, 2026',
      time: '2:15 PM',
      read: false,
      color: 'green',
      iconType: 'book',
      sender: 'Library System',
      priority: 'medium',
      hasQRCode: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: `sample-${userId}-approved`,
      type: 'approved',
      title: 'Book Borrowing Approved',
      message: 'Your request to borrow "Artificial Intelligence: A Modern Approach" has been approved.',
      fullMessage: 'Congratulations! Your request to borrow "Artificial Intelligence: A Modern Approach" by Stuart Russell has been approved by the library administration. Please show the QR code below at the circulation desk to collect your book. The loan period is 14 days from the pickup date.',
      date: 'July 6, 2026',
      time: '11:00 AM',
      read: false,
      color: 'green',
      iconType: 'book',
      sender: 'Library Administration',
      priority: 'high',
      hasQRCode: true,
      qrCodeData: 'LIB-2026-789456-AI-APPROVED',
      bookDetails: {
        title: 'Artificial Intelligence: A Modern Approach',
        author: 'Stuart Russell',
        pickupLocation: 'Main Library, Circulation Desk',
        pickupDeadline: 'July 9, 2026',
        loanPeriod: '14 days',
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: `sample-${userId}-info`,
      type: 'info',
      title: 'Library Hours Update',
      message: 'The library will be closed on July 15, 2026 for maintenance. Regular hours resume on July 16.',
      fullMessage: 'Please note that the library will be closed on July 15, 2026 for scheduled maintenance and system upgrades. Regular operating hours will resume on July 16, 2026 at 8:00 AM. We apologize for any inconvenience this may cause. During this closure, digital resources will remain accessible through our online portal.',
      date: 'July 6, 2026',
      time: '9:00 AM',
      read: true,
      color: 'blue',
      iconType: 'bell',
      sender: 'Library Administration',
      priority: 'low',
      hasQRCode: false,
      createdAt: new Date().toISOString(),
    },
  ]

  setNotificationsForUser(userId, seedNotifications)
  return seedNotifications
}
