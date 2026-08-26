const supabase = require('../config/supabase');

class Notification {
  static async create(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notificationData.user_id,
          school_id: notificationData.school_id || null,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          related_id: Number.isInteger(notificationData.related_id) ? notificationData.related_id : null,
          is_read: false,
          is_admin_notification: notificationData.is_admin_notification || false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[NOTIFICATION] Error creating notification:', error);
      throw error;
    }
  }

  static async getByUserId(user_id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[NOTIFICATION] Error getting notifications:', error);
      throw error;
    }
  }

  static async markAsRead(notification_id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', notification_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[NOTIFICATION] Error marking as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(user_id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user_id)
        .eq('is_read', false);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[NOTIFICATION] Error marking all as read:', error);
      throw error;
    }
  }

  static async getUnreadCount(user_id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('notification_id')
        .eq('user_id', user_id)
        .eq('is_read', false);

      if (error) throw error;
      return data.length;
    } catch (error) {
      console.error('[NOTIFICATION] Error getting unread count:', error);
      throw error;
    }
  }
}

module.exports = Notification;
