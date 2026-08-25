const supabase = require('../config/supabase');

class Notification {
  static async create(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notificationData.user_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          related_request_id: notificationData.related_request_id || null,
          read: false,
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
        .update({ read: true })
        .eq('id', notification_id)
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
        .eq('read', false);

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
        .select('id')
        .eq('user_id', user_id)
        .eq('read', false);

      if (error) throw error;
      return data.length;
    } catch (error) {
      console.error('[NOTIFICATION] Error getting unread count:', error);
      throw error;
    }
  }
}

module.exports = Notification;
