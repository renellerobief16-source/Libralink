const supabase = require('../config/database');

class Fine {
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('fines')
        .insert(data)
        .select('fine_id')
        .single();
      
      if (error) throw error;
      return result.fine_id;
    } catch (error) {
      console.error('Error creating fine:', error);
      throw error;
    }
  }

  static async getBySchool(school_id) {
    try {
      const { data, error } = await supabase
        .from('fines')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number),
          borrow_transactions(
            book_copies(accession_number, books(title))
          )
        `)
        .eq('school_id', school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting fines by school:', error);
      throw error;
    }
  }

  static async getById(fine_id) {
    try {
      const { data, error } = await supabase
        .from('fines')
        .select('*')
        .eq('fine_id', fine_id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting fine by ID:', error);
      throw error;
    }
  }

  static async updateStatus(fine_id, status) {
    try {
      const { error } = await supabase
        .from('fines')
        .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
        .eq('fine_id', fine_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating fine status:', error);
      throw error;
    }
  }

  static async delete(fine_id) {
    try {
      const { error } = await supabase
        .from('fines')
        .delete()
        .eq('fine_id', fine_id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting fine:', error);
      throw error;
    }
  }
}

module.exports = Fine;
