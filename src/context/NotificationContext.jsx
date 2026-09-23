import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  getUserNotifications, 
  markNotificationAsRead as apiMarkAsRead, 
  markAllNotificationsAsRead as apiMarkAllAsRead, 
  deleteNotificationApi,
  deleteAllNotifications as apiClearAll 
} from '../utils/api';

const NotificationContext = createContext();

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.08, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

function getStoredUserId() {
  const storedUserId = localStorage.getItem('currentUserId');
  if (storedUserId) return storedUserId;
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    return currentUser?.user_id || currentUser?.id || currentUser?.sub || null;
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
  const [loading, setLoading] = useState(false);
  const prevUnreadCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const fetchLiveNotifications = useCallback(async (silent = false) => {
    const userId = getStoredUserId();
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!userId || !token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const response = await getUserNotifications(userId);
      const rawData = Array.isArray(response?.data) 
        ? response.data 
        : (Array.isArray(response) ? response : (response?.data?.data || []));

      const normalized = rawData.map(n => ({
        id: n.notification_id || n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        type: n.type || 'general',
        read: Boolean(n.read || n.is_read),
        createdAt: n.created_at || n.createdAt || new Date().toISOString(),
        created_at: n.created_at || n.createdAt || new Date().toISOString(),
        related_id: n.related_id,
        related_request_id: n.related_request_id,
        sender_name: n.sender_name || n.student_name || 'Library System',
        sender_role: n.sender_role || 'System',
        profile_picture: n.profile_picture || n.sender_profile_picture || n.student_profile_picture || '',
        student_profile_picture: n.student_profile_picture || n.profile_picture || '',
        school_code: n.school_code || '',
      }));

      const unread = normalized.filter(n => !n.read).length;

      // Play audio chime if new unread notification arrived after initial load
      if (!isInitialLoadRef.current && unread > prevUnreadCountRef.current) {
        playNotificationChime();
      }
      isInitialLoadRef.current = false;
      prevUnreadCountRef.current = unread;

      setNotifications(normalized);
      setUnreadCount(unread);
    } catch (err) {
      console.warn('[NotificationProvider] Failed to fetch live notifications:', err?.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load and user change listener
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevUnreadCountRef.current = 0;
    fetchLiveNotifications(false);

    const onUserChanged = () => {
      isInitialLoadRef.current = true;
      fetchLiveNotifications(false);
    };

    window.addEventListener('libralink-user-changed', onUserChanged);
    return () => window.removeEventListener('libralink-user-changed', onUserChanged);
  }, [fetchLiveNotifications]);

  // Dual Realtime: 15-second polling fallback + focus refresher
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveNotifications(true);
    }, 15000);

    const onWindowFocus = () => {
      fetchLiveNotifications(true);
    };

    window.addEventListener('focus', onWindowFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [fetchLiveNotifications]);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...notification
    };
    
    playNotificationChime();
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true, is_read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await apiMarkAsRead(notificationId);
    } catch (err) {
      console.warn('[NotificationProvider] Failed to mark as read on server:', err?.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await apiMarkAllAsRead();
    } catch (err) {
      console.warn('[NotificationProvider] Failed to mark all as read on server:', err?.message);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await apiClearAll();
    } catch (err) {
      console.warn('[NotificationProvider] Failed to clear notifications on server:', err?.message);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    setNotifications(prev => {
      const notificationToDelete = prev.find(n => n.id === notificationId);
      const updated = prev.filter(n => n.id !== notificationId);
      if (notificationToDelete && !notificationToDelete.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return updated;
    });

    try {
      await deleteNotificationApi(notificationId);
    } catch (err) {
      console.warn('[NotificationProvider] Failed to delete notification on server:', err?.message);
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    return fetchLiveNotifications(true);
  }, [fetchLiveNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    deleteNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
