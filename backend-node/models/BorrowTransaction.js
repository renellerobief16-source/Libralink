const supabase = require('../config/database');
const LibrarySettings = require('./LibrarySettings');

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
          student:student_id(firstname, lastname, student_number, email, contact_number, profile_image, school_id),
          book_copies(copy_id, accession_number, books(book_id, title, author, isbn, cover_image, school_id, schools(school_id, school_name)))
        `)
        .eq('status', 'active')
        .order('borrow_date', { ascending: false });
      
      if (error) throw error;
      
      // Filter by school_id in JavaScript to match book owner school OR borrower home school
      const parsedSchoolId = parseInt(school_id);
      const filtered = (data || []).filter(
        borrow => 
          borrow.book_copies?.books?.school_id === parsedSchoolId ||
          borrow.book_copies?.books?.schools?.school_id === parsedSchoolId ||
          borrow.student?.school_id === parsedSchoolId
      ).map(borrow => ({
        ...borrow,
        book_id: borrow.book_id || borrow.book_copies?.books?.book_id
      }));
      
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
          student:student_id(firstname, lastname, student_number, email, contact_number, profile_image),
          book_copies(copy_id, accession_number, books(book_id, title, author, isbn, cover_image, school_id, schools(school_id, school_name)))
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
      // Get borrow transaction details with book and copy info
      const { data: borrow, error: borrowError } = await supabase
        .from('borrow_transactions')
        .select(`
          copy_id,
          status,
          due_date,
          student_id,
          book_copies(copy_id, book_id, books(school_id, title))
        `)
        .eq('borrow_id', borrow_id)
        .single();

      if (borrowError || !borrow) {
        console.error('[RETURN BOOK] Borrow transaction not found:', borrow_id, borrowError);
        throw new Error('Borrow transaction not found');
      }

      if (borrow.status === 'returned') {
        return { alreadyReturned: true, message: 'Book was already returned' };
      }

      const returnTime = new Date().toISOString();

      // Update borrow transaction
      const { error: updateError } = await supabase
        .from('borrow_transactions')
        .update({ status: 'returned', return_date: returnTime })
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
        }

        // Also synchronize corresponding borrow_request_items if any
        await supabase
          .from('borrow_request_items')
          .update({
            status: 'returned',
            item_status: 'returned',
            returned_at: returnTime
          })
          .eq('copy_id', borrow.copy_id)
          .eq('status', 'borrowed');
      } else {
        console.warn('[RETURN BOOK] No copy_id found for borrow transaction:', borrow_id);
      }

      // Calculate fine if overdue
      let fineAssessed = 0;
      let daysOverdue = 0;
      const schoolId = borrow.book_copies?.books?.school_id;

      if (schoolId && borrow.due_date) {
        try {
          const finePolicy = await LibrarySettings.getFinePolicy(schoolId);
          if (finePolicy.enable_fines) {
            // Calculate overdue using Philippine calendar day bounds (UTC+8)
            const manilaDateOptions = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
            const todayStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date());
            let dueStr = '';
            if (typeof borrow.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(borrow.due_date.trim())) {
              dueStr = borrow.due_date.trim();
            } else {
              dueStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date(borrow.due_date));
            }

            if (todayStr > dueStr) {
              const todayMs = new Date(todayStr + 'T00:00:00+08:00').getTime();
              const dueMs = new Date(dueStr + 'T00:00:00+08:00').getTime();
              const calendarDiffDays = Math.max(1, Math.round((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
              daysOverdue = Math.max(0, calendarDiffDays - (finePolicy.grace_period_days || 0));

              if (daysOverdue > 0) {
                const rawFine = daysOverdue * finePolicy.fine_amount_per_day;
                fineAssessed = Math.min(rawFine, finePolicy.max_fine_cap);

                // Prevent duplicate fines
                const { data: existingFine } = await supabase
                  .from('fines')
                  .select('fine_id')
                  .eq('student_id', borrow.student_id)
                  .eq('borrow_id', borrow_id)
                  .maybeSingle();

                if (!existingFine && fineAssessed > 0) {
                  await supabase
                    .from('fines')
                    .insert({
                      student_id: borrow.student_id,
                      school_id: schoolId,
                      borrow_id: borrow_id,
                      amount: fineAssessed,
                      reason: `Overdue return (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} late)`,
                      status: 'pending',
                      created_at: new Date().toISOString()
                    });
                  console.log(`[BORROW TRANSACTION] Generated fine: ₱${fineAssessed} for borrow_id: ${borrow_id}`);
                }
              }
            }
          }
        } catch (fineErr) {
          console.error('[RETURN BOOK] Error calculating fine:', fineErr);
        }
      }

      return { success: true, fineAssessed, daysOverdue };
    } catch (error) {
      console.error('[RETURN BOOK] Error returning book:', error);
      throw error;
    }
  }

  static async getOverdue(school_id = null) {
    try {
      const manilaDateOptions = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
      const todayStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date());
      
      const { data, error } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number, email, contact_number, profile_image),
          book_copies(copy_id, accession_number, books(book_id, title, author, isbn, cover_image, school_id, schools(school_id, school_name)))
        `)
        .eq('status', 'active')
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Filter by school if provided
      let filtered = data || [];
      if (school_id) {
        const parsedSchoolId = parseInt(school_id);
        filtered = filtered.filter(
          b => b.book_copies?.books?.school_id === parsedSchoolId ||
               b.book_copies?.books?.schools?.school_id === parsedSchoolId
        );
      }

      // Fetch fine policy for school if known
      let finePolicy = null;
      if (school_id) {
        try {
          finePolicy = await LibrarySettings.getFinePolicy(school_id);
        } catch {
          // fallback
        }
      }

      // Calculate days overdue and estimated accrued fine for each record
      const overdueData = filtered.map(borrow => {
        let dueStr = '';
        if (typeof borrow.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(borrow.due_date.trim())) {
          dueStr = borrow.due_date.trim();
        } else {
          dueStr = new Intl.DateTimeFormat('en-CA', manilaDateOptions).format(new Date(borrow.due_date));
        }

        let daysOverdue = 0;
        if (todayStr > dueStr) {
          const todayMs = new Date(todayStr + 'T00:00:00+08:00').getTime();
          const dueMs = new Date(dueStr + 'T00:00:00+08:00').getTime();
          daysOverdue = Math.max(1, Math.round((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
        }
        let accruedFine = 0;

        if (finePolicy && finePolicy.enable_fines && daysOverdue > 0) {
          const chargeableDays = Math.max(0, daysOverdue - (finePolicy.grace_period_days || 0));
          accruedFine = Math.min(chargeableDays * finePolicy.fine_amount_per_day, finePolicy.max_fine_cap);
        }

        return {
          ...borrow,
          days_overdue: daysOverdue,
          accrued_fine: accruedFine
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
