import { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

function getNotificationStorageKey() {
  const storedUserId = localStorage.getItem('currentUserId');
  if (storedUserId) return `libralink_notifications_${storedUserId}`;

  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const userId = currentUser?.user_id || currentUser?.id || currentUser?.sub;
    return userId ? `libralink_notifications_${userId}` : null;
  } catch {
    return null;
  }
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [storageKey, setStorageKey] = useState(getNotificationStorageKey);

  useEffect(() => {
    const syncUserNotifications = () => {
      setNotifications([]);
      setUnreadCount(0);
      setStorageKey(getNotificationStorageKey());
    };

    window.addEventListener('libralink-user-changed', syncUserNotifications);
    return () => window.removeEventListener('libralink-user-changed', syncUserNotifications);
  }, []);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [storageKey]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (storageKey && notifications.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    }
  }, [notifications, storageKey]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => {
      const notificationToDelete = prev.find(n => n.id === notificationId);
      const updated = prev.filter(n => n.id !== notificationId);
      
      // Update unread count based on whether the deleted notification was unread
      if (notificationToDelete && !notificationToDelete.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return updated;
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
