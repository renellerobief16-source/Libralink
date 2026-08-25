const supabase = require('../config/database');

class Book {
  static async create(data) {
    try {
      const { data: result, error } = await supabase
        .from('books')
        .insert(data)
        .select('book_id')
        .single();

      if (error) throw error;
      return result.book_id;
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code),
          categories(category_name)
        `)
        .eq('book_id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting book by ID:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      console.log('[BOOKS] Fetching all books with pagination...');
      let allBooks = [];
      let hasMore = true;
      let from = 0;
      const to = 999;
      
      while (hasMore) {
        console.log(`[BOOKS] Fetching batch ${from}-${to}...`);
        const { data, error } = await supabase
          .from('books')
          .select(`
            book_id,
            title,
            author,
            isbn,
            call_number,
            shelf_location,
            edition,
            physical_description,
            series_title,
            general_note,
            status,
            school_id,
            schools(school_name, school_code),
            categories(category_name)
          `)
          .order('title')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allBooks = allBooks.concat(data);
          console.log(`[BOOKS] Batch fetched: ${data.length}, Total so far: ${allBooks.length}`);
          from += 1000;
          hasMore = data.length === 1000; // Continue if we got a full page
        } else {
          hasMore = false;
        }
        
        // Safety limit to prevent infinite loops
        if (allBooks.length >= 100000) {
          console.log('[BOOKS] Reached safety limit of 100,000 books');
          hasMore = false;
        }
      }
      
      console.log('[BOOKS] Total books fetched:', allBooks.length);
      return allBooks;
    } catch (error) {
      console.error('Error getting all books:', error);
      throw error;
    }
  }

  static async getCount() {
    try {
      console.log('[BOOK COUNT] Using Supabase count function...');
      const { count, error } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[BOOK COUNT] Supabase error:', error);
        throw error;
      }
      console.log('[BOOK COUNT] Result:', count);
      
      // Fallback: use getAll if count fails or returns null
      if (!count || count === 0) {
        console.log('[BOOK COUNT] Count returned null or 0, using getAll as fallback...');
        const books = await this.getAll();
        const fallbackCount = books?.length || 0;
        console.log('[BOOK COUNT] Fallback count:', fallbackCount);
        return fallbackCount;
      }
      
      return count;
    } catch (error) {
      console.error('[BOOK COUNT] Error:', error);
      // Fallback to getAll on error
      console.log('[BOOK COUNT] Error occurred, using getAll as fallback...');
      const books = await this.getAll();
      const fallbackCount = books?.length || 0;
      console.log('[BOOK COUNT] Fallback count:', fallbackCount);
      return fallbackCount;
    }
  }

  static async getBySchool(school_id) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code),
          categories(category_name)
        `)
        .eq('school_id', school_id)
        .order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting books by school:', error);
      throw error;
    }
  }

  static async search(search_term, user_school_id = null) {
    try {
      let query = supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code),
          categories(category_name)
        `)
        .or(`title.ilike.%${search_term}%,subtitle.ilike.%${search_term}%,author.ilike.%${search_term}%,isbn.ilike.%${search_term}%,call_number.ilike.%${search_term}%,keywords.ilike.%${search_term}%`);

      if (user_school_id) {
        query = query.eq('school_id', user_school_id);
      }

      const { data, error } = await query.order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching books:', error);
      throw error;
    }
  }

  static async fullTextSearch(search_term, user_school_id = null) {
    try {
      let query = supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code),
          categories(category_name)
        `)
        .textSearch('title', search_term, {
          type: 'websearch',
          config: 'english'
        });

      if (user_school_id) {
        query = query.eq('school_id', user_school_id);
      }

      const { data, error } = await query.order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error full-text searching books:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      console.log('[BOOK MODEL] Update ID:', id);
      console.log('[BOOK MODEL] Update data:', data);
      
      const { error } = await supabase
        .from('books')
        .update(data)
        .eq('book_id', id);
      
      if (error) {
        console.error('[BOOK MODEL] Supabase error:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if book has active borrows
      const { count: borrowCount } = await supabase
        .from('borrow_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', id)
        .eq('status', 'active');

      if (borrowCount > 0) {
        return { success: false, message: 'Cannot delete book with active borrows' };
      }

      // Delete book copies first
      await supabase.from('book_copies').delete().eq('book_id', id);

      // Delete book
      const { error } = await supabase.from('books').delete().eq('book_id', id);

      if (error) throw error;
      return { success: true, message: 'Book deleted successfully' };
    } catch (error) {
      console.error('Error deleting book:', error);
      return { success: false, message: 'Database error' };
    }
  }

  static async archive(id) {
    try {
      console.log('[ARCHIVE MODEL] Archiving book:', id);
      
      // Archive book by setting status to 'archived'
      const { error } = await supabase
        .from('books')
        .update({ status: 'archived' })
        .eq('book_id', id);

      if (error) {
        console.error('[ARCHIVE MODEL] Supabase error:', error);
        throw error;
      }
      
      return { success: true, message: 'Book archived successfully' };
    } catch (error) {
      console.error('Error archiving book:', error);
      return { success: false, message: 'Database error', error: error.message };
    }
  }

  static async getPopularBooks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code)
        `)
        .order('borrowed_quantity', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting popular books:', error);
      throw error;
    }
  }

  static async getByCategory(category_id, school_id = null) {
    try {
      let query = supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code),
          categories(category_name)
        `)
        .eq('category_id', category_id);

      if (school_id) {
        query = query.eq('school_id', school_id);
      }

      const { data, error } = await query.order('title');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting books by category:', error);
      throw error;
    }
  }

  static async getByStatus(status, school_id = null) {
    try {
      let query = supabase
        .from('books')
        .select(`
          *,
          schools(school_name, school_code)
        `)
        .eq('status', status);

      if (school_id) {
        query = query.eq('school_id', school_id);
      }

      const { data, error } = await query.order('title');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting books by status:', error);
      throw error;
    }
  }

  static async generateAccessionNumber() {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('accession_number')
        .order('accession_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      let lastNumber = 0;
      if (data && data.accession_number) {
        const match = data.accession_number.match(/ACC-(\d+)/);
        if (match) {
          lastNumber = parseInt(match[1], 10);
        }
      }

      const newNumber = lastNumber + 1;
      return `ACC-${String(newNumber).padStart(8, '0')}`;
    } catch (error) {
      console.error('Error generating accession number:', error);
      throw error;
    }
  }

  static async getAuthors(bookId) {
    try {
      const { data, error } = await supabase
        .from('book_authors')
        .select(`
          authors(author_id, author_name)
        `)
        .eq('book_id', bookId);
      
      if (error) throw error;
      return data?.map(ba => ba.authors) || [];
    } catch (error) {
      console.error('Error getting book authors:', error);
      throw error;
    }
  }
}

module.exports = Book;
