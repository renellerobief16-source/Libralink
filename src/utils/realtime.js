import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yacrlfcbeltxtiztvwgo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhY3JsZmNiZWx0eHRpenR2d2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzg4OTEsImV4cCI6MjEwMTYxNDg5MX0.uPeq0KVwdcCzAJVdOnqg9RKPFZcj365_usM2sHxZ63I';

// Create Supabase client for realtime
export const supabaseRealtime = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Subscribe to borrowing requests changes
 * @param {Function} callback - Function to call when changes occur
 * @param {string} schoolId - Optional school ID to filter requests
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBorrowRequests(callback, schoolId = null) {
  let query = supabaseRealtime
    .channel('borrow_requests_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'borrow_requests',
        ...(schoolId && { filter: `home_school_id=eq.${schoolId}` })
      },
      (payload) => {
        console.log('[REALTIME] Borrow request change:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Borrow requests subscription status:', status);
    });

  return () => {
    supabaseRealtime.removeChannel(query);
  };
}

/**
 * Subscribe to borrow request items changes
 * @param {Function} callback - Function to call when changes occur
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBorrowRequestItems(callback) {
  let query = supabaseRealtime
    .channel('borrow_request_items_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'borrow_request_items'
      },
      (payload) => {
        console.log('[REALTIME] Borrow request item change:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Borrow request items subscription status:', status);
    });

  return () => {
    supabaseRealtime.removeChannel(query);
  };
}

/**
 * Subscribe to book copies changes (for availability updates)
 * @param {Function} callback - Function to call when changes occur
 * @param {string} schoolId - Optional school ID to filter copies
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBookCopies(callback, schoolId = null) {
  let query = supabaseRealtime
    .channel('book_copies_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Focus on status changes
        schema: 'public',
        table: 'book_copies',
        ...(schoolId && { filter: `school_id=eq.${schoolId}` })
      },
      (payload) => {
        console.log('[REALTIME] Book copy change:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Book copies subscription status:', status);
    });

  return () => {
    supabaseRealtime.removeChannel(query);
  };
}

/**
 * Subscribe to notifications for a specific user
 * @param {string} userId - User ID to filter notifications
 * @param {Function} callback - Function to call when changes occur
 * @returns {Function} Unsubscribe function
 */
export function subscribeToNotifications(userId, callback) {
  let query = supabaseRealtime
    .channel(`notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[REALTIME] New notification:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Notifications subscription status:', status);
    });

  return () => {
    supabaseRealtime.removeChannel(query);
  };
}

/**
 * Subscribe to all changes for a specific school (for librarians)
 * @param {string} schoolId - School ID
 * @param {Function} callback - Function to call when changes occur
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSchoolChanges(schoolId, callback) {
  const channels = [];

  // Subscribe to borrow requests for this school
  const requestChannel = supabaseRealtime
    .channel(`school_requests_${schoolId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'borrow_requests',
        filter: `home_school_id=eq.${schoolId}`
      },
      (payload) => callback({ type: 'borrow_request', payload })
    )
    .subscribe();
  channels.push(requestChannel);

  // Subscribe to borrow request items for books owned by this school
  const itemChannel = supabaseRealtime
    .channel(`school_items_${schoolId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'borrow_request_items',
        filter: `owner_school_id=eq.${schoolId}`
      },
      (payload) => callback({ type: 'borrow_request_item', payload }))
    .subscribe();
  channels.push(itemChannel);

  // Subscribe to book copies for this school
  const copiesChannel = supabaseRealtime
    .channel(`school_copies_${schoolId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'book_copies',
        filter: `school_id=eq.${schoolId}`
      },
      (payload) => callback({ type: 'book_copy', payload }))
    .subscribe();
  channels.push(copiesChannel);

  return () => {
    channels.forEach(channel => supabaseRealtime.removeChannel(channel));
  };
}

/**
 * React hook for subscribing to borrowing requests
 */
export function useBorrowRequestsRealtime(schoolId = null, onDataChange) {
  useEffect(() => {
    const unsubscribe = subscribeToBorrowRequests(onDataChange, schoolId);
    return () => unsubscribe();
  }, [schoolId, onDataChange]);
}

/**
 * React hook for subscribing to book copies (availability)
 */
export function useBookCopiesRealtime(schoolId = null, onDataChange) {
  useEffect(() => {
    const unsubscribe = subscribeToBookCopies(onDataChange, schoolId);
    return () => unsubscribe();
  }, [schoolId, onDataChange]);
}

/**
 * React hook for subscribing to notifications
 */
export function useNotificationsRealtime(userId, onNotification) {
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(userId, onNotification);
    return () => unsubscribe();
  }, [userId, onNotification]);
}
