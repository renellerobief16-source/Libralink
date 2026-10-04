const supabase = require('../config/database');

class Library {
  static async create(data) {
    const { school_id, name, library_type = 'college', description = '', status = 'active' } = data;

    if (!school_id || !name) {
      throw new Error('School ID and Library Name are required');
    }

    const { data: library, error } = await supabase
      .from('libraries')
      .insert({
        school_id: Number(school_id),
        name: name.trim(),
        library_type: library_type.toLowerCase().trim(),
        description: description?.trim() || null,
        status: status === 'inactive' ? 'inactive' : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return library;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('libraries')
      .select(`
        *,
        schools (school_id, school_name, school_code, logo)
      `)
      .eq('library_id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async findBySchool(schoolId, options = {}) {
    let query = supabase
      .from('libraries')
      .select(`
        *,
        schools (school_id, school_name, school_code)
      `)
      .eq('school_id', schoolId)
      .order('library_id', { ascending: true });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.library_type) {
      query = query.eq('library_type', options.library_type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async update(id, data) {
    const updateData = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.library_type !== undefined) updateData.library_type = data.library_type.toLowerCase().trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: library, error } = await supabase
      .from('libraries')
      .update(updateData)
      .eq('library_id', id)
      .select()
      .single();

    if (error) throw error;
    return library;
  }

  static async delete(id) {
    const libraryId = Number(id);

    // 1. SAFEGUARD: Check for active, pending, or unreturned borrow loans
    try {
      const { data: activeBorrows, error: borrowErr } = await supabase
        .from('borrow_requests')
        .select('request_id, status')
        .or(`home_library_id.eq.${libraryId},source_library_id.eq.${libraryId}`)
        .in('status', ['pending', 'approved', 'active', 'borrowed', 'overdue']);

      if (!borrowErr && activeBorrows && activeBorrows.length > 0) {
        return {
          success: false,
          blocked: true,
          message: `Cannot delete library: There are ${activeBorrows.length} active or unreturned book loans associated with this library unit. Please resolve or return them first.`
        };
      }
    } catch (bErr) {
      console.warn('[LIBRARIES] Could not check borrow requests before deletion:', bErr.message);
    }

    // 2. Unlink historical borrow requests so foreign key constraints don't block deletion
    try {
      await supabase.from('borrow_requests').update({ home_library_id: null }).eq('home_library_id', libraryId);
      await supabase.from('borrow_requests').update({ source_library_id: null }).eq('source_library_id', libraryId);
    } catch (unErr) {
      console.warn('[LIBRARIES] Could not unlink historical borrow requests:', unErr.message);
    }

    // 3. Delete unit books and copies belonging to this library
    try {
      await supabase.from('book_copies').delete().eq('library_id', libraryId);
      await supabase.from('books').delete().eq('library_id', libraryId);
    } catch (bkErr) {
      console.warn('[LIBRARIES] Could not clean up books for library:', bkErr.message);
    }

    // 4. Clean up users:
    // a. Keep student patrons safe: Unlink student patrons from this library so they remain active school students
    try {
      await supabase
        .from('users')
        .update({ library_id: null })
        .eq('library_id', libraryId)
        .in('role_id', [4, 6]);
    } catch (stErr) {
      console.warn('[LIBRARIES] Could not unlink students from library:', stErr.message);
    }

    // b. Remove dedicated Unit Librarians created specifically for this library unit
    try {
      await supabase
        .from('users')
        .delete()
        .eq('library_id', libraryId)
        .in('role_id', [3, 5]);
    } catch (libUserErr) {
      console.warn('[LIBRARIES] Could not delete dedicated unit librarian:', libUserErr.message);
    }

    // c. Unlink any remaining staff/admin assigned to this library
    try {
      await supabase
        .from('users')
        .update({ library_id: null })
        .eq('library_id', libraryId);
    } catch (remErr) {
      console.warn('[LIBRARIES] Could not unlink remaining users:', remErr.message);
    }

    // 5. Hard delete the library record itself
    const { error } = await supabase
      .from('libraries')
      .delete()
      .eq('library_id', libraryId);

    if (error) {
      console.error('[LIBRARIES] Error executing hard delete on library:', error);
      throw error;
    }

    return { 
      success: true, 
      message: 'Library and associated unit resources have been permanently deleted.' 
    };
  }

  static async getStats(schoolId) {
    // 1. Fetch all libraries under school
    const libraries = await this.findBySchool(schoolId);

    // 2. Fetch counts for each library
    const detailed = await Promise.all(
      libraries.map(async (lib) => {
        // Books count
        const { count: booksCount } = await supabase
          .from('books')
          .select('book_id', { count: 'exact', head: true })
          .eq('library_id', lib.library_id);

        // Students count (role_id = 4 or 6)
        const { count: studentsCount } = await supabase
          .from('users')
          .select('user_id', { count: 'exact', head: true })
          .eq('library_id', lib.library_id)
          .in('role_id', [4, 6]);

        // Librarians count (role_id = 3 or staff)
        const { count: librariansCount } = await supabase
          .from('users')
          .select('user_id', { count: 'exact', head: true })
          .eq('library_id', lib.library_id)
          .in('role_id', [2, 3, 5]);

        return {
          ...lib,
          total_books: booksCount || 0,
          total_students: studentsCount || 0,
          total_librarians: librariansCount || 0
        };
      })
    );

    return detailed;
  }
}

module.exports = Library;
