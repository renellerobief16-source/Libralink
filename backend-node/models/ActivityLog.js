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

  static async getBySchool(school_id, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          users (
            user_id,
            firstname,
            lastname,
            role,
            role_id,
            student_number,
            employee_number,
            profile_image,
            email,
            school_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      const targetSchool = String(school_id);
      const normalized = (data || []).map(log => {
        const u = Array.isArray(log.users) ? log.users[0] : log.users;
        return {
          ...log,
          users: u || null
        };
      });

      const filtered = normalized.filter(log => {
        if (log.school_id && String(log.school_id) === targetSchool) return true;
        if (log.users?.school_id && String(log.users.school_id) === targetSchool) return true;
        if (!log.school_id && !log.users?.school_id) return true;
        return false;
      });

      return filtered;
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
