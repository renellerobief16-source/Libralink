const supabase = require('../config/database');

class ActivityLog {
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('activity_logs')
        .insert(data)
        .select('log_id')
        .single();
      
      if (error) throw error;
      return result.log_id;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  static async getAll(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, users(firstname, lastname, email, schools(school_name))')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting all activity logs:', error);
      throw error;
    }
  }

  static async getByUser(user_id, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, users(firstname, lastname)')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting activity logs by user:', error);
      throw error;
    }
  }

  static async getBySchool(school_id, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, users(firstname, lastname, schools(school_name, school_code))')
        .eq('users.school_id', school_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting activity logs by school:', error);
      throw error;
    }
  }

  static async getRecent(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, users(firstname, lastname, schools(school_name))')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting recent activity logs:', error);
      throw error;
    }
  }

  static async deleteOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const { error } = await supabase
        .from('activity_logs')
        .lt('created_at', cutoffDate.toISOString())
        .delete();
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting old activity logs:', error);
      return { success: false, message: 'Database error' };
    }
  }
}

module.exports = ActivityLog;
