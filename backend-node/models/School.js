const supabase = require('../config/database');

class School {
  static async getAll() {
    try {
      console.log('=== School.getAll() Query ===');
      const { data, error, status, statusText } = await supabase
        .from('schools')
        .select('*')
        .order('school_name');
      
      console.log('Supabase Response:');
      console.log('  Data:', data);
      console.log('  Error:', error);
      console.log('  Status:', status);
      console.log('  StatusText:', statusText);
      console.log('========================');
      
      if (error) {
        console.error('Supabase schools error:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error getting all schools:', error);
      throw error;
    }
  }

  static async getById(school_id) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('school_id', school_id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting school by ID:', error);
      throw error;
    }
  }

  static sanitizePayload(data) {
    const allowed = ['school_name', 'school_code', 'address', 'contact_number', 'email', 'logo', 'status', 'latitude', 'longitude'];
    const payload = {};
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === 'latitude' || key === 'longitude') {
          if (data[key] === null || data[key] === '' || data[key] === undefined) {
            payload[key] = null;
          } else {
            const num = Number(data[key]);
            payload[key] = Number.isFinite(num) ? num : null;
          }
        } else {
          payload[key] = data[key];
        }
      }
    }
    return payload;
  }

  static async create(data) {
    try {
      const cleanData = this.sanitizePayload(data);
      const { data: result, error } = await supabase
        .from('schools')
        .insert(cleanData)
        .select('school_id')
        .single();
      
      if (error) throw error;
      return result.school_id;
    } catch (error) {
      console.error('Error creating school:', error);
      throw error;
    }
  }

  static async update(school_id, data) {
    try {
      const cleanData = this.sanitizePayload(data);
      const { error } = await supabase
        .from('schools')
        .update(cleanData)
        .eq('school_id', school_id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating school:', error);
      throw error;
    }
  }

  static async delete(school_id) {
    try {
      // Check if school has users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school_id);

      if (userCount > 0) {
        return { success: false, message: 'Cannot delete school with existing users' };
      }

      // Check if school has books
      const { count: bookCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school_id);

      if (bookCount > 0) {
        return { success: false, message: 'Cannot delete school with existing books' };
      }

      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('school_id', school_id);

      if (error) throw error;
      return { success: true, message: 'School deleted successfully' };
    } catch (error) {
      console.error('Error deleting school:', error);
      return { success: false, message: 'Database error' };
    }
  }
}

module.exports = School;
