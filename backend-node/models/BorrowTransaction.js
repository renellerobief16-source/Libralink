const supabase = require('../config/database');

class BorrowTransaction {
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('borrow_transactions')
        .insert(data)
        .select('borrow_id')
        .single();
      
      if (error) throw error;
      
      // Update book copy status
      await supabase
        .from('book_copies')
        .update({ status: 'borrowed' })
        .eq('copy_id', data.copy_id);
      
      return result.borrow_id;
    } catch (error) {
      console.error('Error creating borrow transaction:', error);
      throw error;
    }
  }

  static async getById(borrow_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          student:student_id(firstname, lastname),
          librarian:librarian_id(firstname, lastname),
          book_copies(accession_number, books(title, isbn))
        `)
        .eq('borrow_id', borrow_id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting borrow transaction by ID:', error);
      throw error;
    }
  }

  static async getActiveByStudent(student_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          book_copies(accession_number, books(title, isbn, book_id, schools(school_name)))
        `)
        .eq('student_id', student_id)
        .eq('status', 'active')
        .order('borrow_date', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting active borrows by student:', error);
      throw error;
    }
  }

  static async getHistoryByStudent(student_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select('*')
        .eq('student_id', student_id)
        .in('status', ['returned', 'overdue'])
        .order('return_date', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting borrow history by student:', error);
      throw error;
    }
  }

  static async getActiveBySchool(school_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number),
          book_copies(accession_number, books(title, isbn, book_id, schools(school_name)))
        `)
        .eq('status', 'active')
        .order('borrow_date', { ascending: false });
      
      if (error) throw error;
      
      // Filter by school_id in JavaScript to avoid Supabase nested filter issues
      const filtered = (data || []).filter(
        borrow => borrow.book_copies?.books?.school_id === parseInt(school_id)
      );
      
      return filtered;
    } catch (error) {
      console.error('Error getting active borrows by school:', error);
      throw error;
    }
  }

  static async getAllActive() {
    try {
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number),
          book_copies(accession_number, books(title, isbn, book_id, schools(school_name)))
        `)
        .eq('status', 'active')
        .order('borrow_date', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting all active borrows:', error);
      throw error;
    }
  }

  static async returnBook(borrow_id) {
    try {
      // Get copy_id from borrow transaction
      const { data: borrow, error: borrowError } = await supabase
        .from('borrow_transactions')
        .select('copy_id, status')
        .eq('borrow_id', borrow_id)
        .single();

      if (borrowError || !borrow) {
        console.error('[RETURN BOOK] Borrow transaction not found:', borrow_id, borrowError);
        throw new Error('Borrow transaction not found');
      }

      if (borrow.status === 'returned') {
        return { alreadyReturned: true, message: 'Book was already returned' };
      }

      // Update borrow transaction
      const { error: updateError } = await supabase
        .from('borrow_transactions')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('borrow_id', borrow_id);

      if (updateError) {
        console.error('[RETURN BOOK] Error updating borrow transaction:', updateError);
        throw new Error('Failed to update borrow transaction');
      }

      // Update book copy status if copy_id exists
      if (borrow.copy_id) {
        const { error: copyError } = await supabase
          .from('book_copies')
          .update({ status: 'available' })
          .eq('copy_id', borrow.copy_id);

        if (copyError) {
          console.error('[RETURN BOOK] Error updating book copy:', copyError);
          // Don't throw here - the main transaction is already updated
        }
      } else {
        console.warn('[RETURN BOOK] No copy_id found for borrow transaction:', borrow_id);
      }

      return { success: true };
    } catch (error) {
      console.error('[RETURN BOOK] Error returning book:', error);
      throw error;
    }
  }

  static async getOverdue(school_id = null) {
    try {
      const today = new Date();
      
      let query = supabase
        .from('borrow_transactions')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number, email, contact_number),
          book_copies(accession_number, books(title, isbn, schools(school_name)))
        `)
        .eq('status', 'active')
        .lt('due_date', today.toISOString())
        .order('due_date', { ascending: true });

      if (school_id) {
        query = query.eq('book_copies.books.school_id', school_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate days overdue for each record
      const overdueData = (data || []).map(borrow => {
        const dueDate = new Date(borrow.due_date);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        return {
          ...borrow,
          days_overdue: daysOverdue > 0 ? daysOverdue : 0
        };
      });

      return overdueData;
    } catch (error) {
      console.error('Error getting overdue borrows:', error);
      throw error;
    }
  }

  static async update(borrow_id, data) {
    try {
      const { error } = await supabase
        .from('borrow_transactions')
        .update(data)
        .eq('borrow_id', borrow_id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating borrow transaction:', error);
      throw error;
    }
  }
}

module.exports = BorrowTransaction;
