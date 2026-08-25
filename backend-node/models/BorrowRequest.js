const supabase = require('../config/database');
const crypto = require('crypto');
const LibrarySettings = require('./LibrarySettings');

class BorrowRequest {
  static async create(data) {
    try {
      console.log('[BORROW REQUEST] Creating request:', data);
      
      // Generate request ID
      const { data: requestIdResult } = await supabase.rpc('generate_request_id');
      const request_id = requestIdResult || `LL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      
      // Don't generate QR token yet - only generate after approval
      const requestData = {
        request_id,
        student_id: data.student_id,
        home_school_id: data.home_school_id,
        request_type: data.request_type || 'HOME',
        status: 'pending',
        purpose: data.purpose ? data.purpose.substring(0, 500) : null, // Truncate to 500 chars
        contact_number: data.contact_number,
        address: data.address,
        id_picture_url: data.id_picture_url,
        qr_token: null, // Will be set after approval
        permission_letter_generated: false,
      };

      const { data: result, error } = await supabase
        .from('borrow_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;
      
      // Create request items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await this.createItem(request_id, item);
        }
      }

      console.log('[BORROW REQUEST] Created successfully:', request_id);
      return { request_id, ...result }; // Don't return qr_token
    } catch (error) {
      console.error('[BORROW REQUEST] Error creating request:', error);
      throw error;
    }
  }

  static async createItem(request_id, itemData) {
    try {
      const item = {
        request_id,
        book_id: itemData.book_id,
        owner_school_id: itemData.owner_school_id,
        partner_school_id: itemData.partner_school_id || null,
        borrow_type: itemData.borrow_type || 'HOME',
        status: 'pending',
      };

      console.log('[BORROW REQUEST] Creating item with data:', item);
      console.log('[BORROW REQUEST] owner_school_id:', item.owner_school_id, '(should be the school that owns the book)');
      console.log('[BORROW REQUEST] partner_school_id:', item.partner_school_id, '(should be the school requesting the book)');
      console.log('[BORROW REQUEST] borrow_type:', item.borrow_type);

      const { data, error } = await supabase
        .from('borrow_request_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      console.log('[BORROW REQUEST] Item created successfully:', data);
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error creating item:', error);
      throw error;
    }
  }

  static async getById(request_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .select('*')
        .eq('request_id', request_id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting request:', error);
      throw error;
    }
  }

  static async getByStudent(student_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          home_school:home_school_id(school_name, school_code),
          items:borrow_request_items(
            *,
            book:book_id(title, author)
          )
        `)
        .eq('student_id', student_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting student requests:', error);
      throw error;
    }
  }

  static async getBySchool(school_id, status = null) {
    try {
      // ONLY get home school requests (student from this school requesting books)
      // DO NOT include inter-school requests - those should be fetched separately
      let query = supabase
        .from('borrow_requests')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number, email),
          home_school:home_school_id(school_name, school_code),
          items:borrow_request_items(
            *,
            book:book_id(title, author),
            owner_school:owner_school_id(school_name, school_code)
          )
        `)
        .eq('home_school_id', school_id);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to match component expectations
      return (data || []).map(request => ({
        ...request,
        items: (request.items || []).map(item => ({
          ...item,
          owner_school: item.owner_school || item.book?.schools || null
        }))
      }));
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting school requests:', error);
      throw error;
    }
  }

  static async getAllInterSchoolRequests() {
    try {
      console.log('[BORROW REQUEST] Fetching all inter-school requests');
      const { data, error } = await supabase
        .from('borrow_request_items')
        .select('*')
        .eq('borrow_type', 'INTER_SCHOOL_LIBRARY_USE');

      console.log('[BORROW REQUEST] Inter-school requests data:', data);
      console.log('[BORROW REQUEST] Inter-school requests error:', error);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting all inter-school requests:', error);
      throw error;
    }
  }

  static async getByPartnerSchool(school_id, status = null) {
    try {
      console.log('[BORROW REQUEST] Fetching partner school requests for school_id:', school_id);
      
      let query = supabase
        .from('borrow_request_items')
        .select(`
          *,
          borrow_request:borrow_request_id(
            *,
            student:student_id(firstname, lastname, student_number, email, contact_number),
            home_school:home_school_id(school_name, school_code),
            items:borrow_request_items(
              *,
              book:book_id(title, author),
              owner_school:owner_school_id(school_name, school_code)
            )
          ),
          book:book_id(title, author, isbn),
          owner_school:owner_school_id(school_name, school_code),
          partner_school:partner_school_id(school_name, school_code)
        `)
        .eq('owner_school_id', school_id)
        .eq('borrow_type', 'INTER_SCHOOL_LIBRARY_USE');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      console.log('[BORROW REQUEST] Filtered requests for owner_school_id:', school_id, ':', data);
      console.log('[BORROW REQUEST] Filtered requests error:', error);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting partner school requests:', error);
      throw error;
    }
  }

  static async getByQRToken(qr_token) {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          student:student_id(firstname, lastname, student_number, email, contact_number),
          home_school:home_school_id(school_name, school_code, address),
          items:borrow_request_items(
            *,
            book:book_id(title, author, isbn, call_number),
            owner_school:owner_school_id(school_name, school_code),
            partner_school:partner_school_id(school_name, school_code, address)
          )
        `)
        .eq('qr_token', qr_token)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting request by QR token:', error);
      throw error;
    }
  }

  static async approve(request_id, approved_by) {
    try {
      console.log('[BORROW REQUEST] Approving request:', request_id, 'by user:', approved_by);
      
      // Get request details to determine borrow type
      const { data: requestData, error: fetchError } = await supabase
        .from('borrow_requests')
        .select('request_type')
        .eq('request_id', request_id)
        .single();

      if (fetchError) {
        console.error('[BORROW REQUEST] Error fetching request:', fetchError);
        throw fetchError;
      }

      // Calculate due date based on request type
      let due_date = null;
      if (requestData.request_type === 'HOME') {
        // Get custom borrowing days from library settings
        const borrowingDays = await LibrarySettings.getHomeBorrowingDays(requestData.home_school_id);
        
        // Calculate due date based on custom days
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + borrowingDays);
        due_date = dueDate.toISOString();
        console.log('[BORROW REQUEST] Set', borrowingDays, '-day due date for HOME borrowing:', due_date);
      } else {
        // INTER_SCHOOL borrowing - library use only, no due date needed
        console.log('[BORROW REQUEST] INTER_SCHOOL borrowing - library use only');
      }
      
      // Generate QR token first
      const qr_token = `LL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      console.log('[BORROW REQUEST] Generated QR token:', qr_token);
      
      // Simple status update with QR token generation and due date
      const updateData = {
        status: 'approved',
        qr_token: qr_token,
        approved_by: approved_by,
        approved_at: new Date().toISOString()
      };

      if (due_date) {
        updateData.due_date = due_date;
      }

      const { error } = await supabase
        .from('borrow_requests')
        .update(updateData)
        .eq('request_id', request_id);

      if (error) {
        console.error('[BORROW REQUEST] Supabase error:', error);
        throw error;
      }

      console.log('[BORROW REQUEST] Request status updated successfully with QR token');

      // Update items status
      const { error: itemsError } = await supabase
        .from('borrow_request_items')
        .update({ status: 'approved' })
        .eq('request_id', request_id);

      if (itemsError) {
        console.error('[BORROW REQUEST] Error updating items:', itemsError);
      }

      console.log('[BORROW REQUEST] Approval completed with QR code generation');
      return { success: true, qr_token, due_date };
    } catch (error) {
      console.error('[BORROW REQUEST] Error approving request:', error);
      throw error;
    }
  }

  static async reject(request_id, remarks = '') {
    try {
      console.log('[BORROW REQUEST] Rejecting request:', request_id, 'with remarks:', remarks);
      
      // Simple status update without .select().single()
      const { error } = await supabase
        .from('borrow_requests')
        .update({ status: 'rejected' })
        .eq('request_id', request_id);

      if (error) {
        console.error('[BORROW REQUEST] Supabase error:', error);
        throw error;
      }

      console.log('[BORROW REQUEST] Request status updated successfully');

      // Update items status
      const { error: itemsError } = await supabase
        .from('borrow_request_items')
        .update({ status: 'cancelled' })
        .eq('request_id', request_id);

      if (itemsError) {
        console.error('[BORROW REQUEST] Error updating items:', itemsError);
      }

      console.log('[BORROW REQUEST] Rejection completed');
      return { success: true };
    } catch (error) {
      console.error('[BORROW REQUEST] Error rejecting request:', error);
      throw error;
    }
  }

  static async generatePermissionLetter(request_id, letter_url) {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .update({
          permission_letter_generated: true,
          permission_letter_url: letter_url,
          status: 'permission_ready',
        })
        .eq('request_id', request_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error generating permission letter:', error);
      throw error;
    }
  }

  static async releaseBook(item_id, released_by, copy_id = null) {
    try {
      const { data: existingItem, error: checkError } = await supabase
        .from('borrow_request_items')
        .select('item_id, status, copy_id, book_id')
        .eq('item_id', item_id)
        .single();

      if (checkError || !existingItem) {
        const message = checkError?.message || 'Item not found';
        throw new Error(`Item ${item_id} not found: ${message}`);
      }

      const updateData = {
        status: 'released',
      };

      if (released_by) {
        updateData.released_by = released_by;
        updateData.released_at = new Date().toISOString();
      }

      if (copy_id) {
        updateData.copy_id = copy_id;
      }

      const { data, error } = await supabase
        .from('borrow_request_items')
        .update(updateData)
        .eq('item_id', item_id)
        .select()
        .single();

      if (error) {
        const isMissingColumn = /column .* does not exist/i.test(error.message || '');
        if (isMissingColumn) {
          const fallbackData = { status: 'released' };
          if (copy_id) fallbackData.copy_id = copy_id;

          const fallbackResult = await supabase
            .from('borrow_request_items')
            .update(fallbackData)
            .eq('item_id', item_id)
            .select()
            .single();

          if (fallbackResult.error) throw fallbackResult.error;
          return fallbackResult.data;
        }

        throw error;
      }

      // Update book copy status to borrowed
      const finalCopyId = copy_id || existingItem.copy_id;
      if (finalCopyId) {
        await supabase
          .from('book_copies')
          .update({ status: 'borrowed' })
          .eq('copy_id', finalCopyId);
      }

      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error releasing book:', error);
      throw error;
    }
  }

  static async returnBook(item_id, returned_by) {
    try {
      const { data: existingItem, error: checkError } = await supabase
        .from('borrow_request_items')
        .select('item_id, status, copy_id, request_id')
        .eq('item_id', item_id)
        .single();

      if (checkError || !existingItem) {
        const message = checkError?.message || 'Item not found';
        throw new Error(`Item ${item_id} not found: ${message}`);
      }

      const updateData = {
        status: 'returned',
      };

      if (returned_by) {
        updateData.returned_by = returned_by;
        updateData.returned_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('borrow_request_items')
        .update(updateData)
        .eq('item_id', item_id)
        .select()
        .single();

      if (error) {
        const isMissingColumn = /column .* does not exist/i.test(error.message || '');
        if (isMissingColumn) {
          const fallbackResult = await supabase
            .from('borrow_request_items')
            .update({ status: 'returned' })
            .eq('item_id', item_id)
            .select()
            .single();

          if (fallbackResult.error) throw fallbackResult.error;
          data = fallbackResult.data;
        } else {
          throw error;
        }
      }

      if (data?.copy_id) {
        await supabase
          .from('book_copies')
          .update({ status: 'available' })
          .eq('copy_id', data.copy_id);
      }

      const { data: request } = await supabase
        .from('borrow_requests')
        .select('request_id, items:borrow_request_items(status)')
        .eq('request_id', data.request_id)
        .single();

      const allReturned = request.items.every(item => item.status === 'returned');
      if (allReturned) {
        await supabase
          .from('borrow_requests')
          .update({ status: 'returned', returned_at: new Date().toISOString() })
          .eq('request_id', data.request_id);
      }

      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error returning book:', error);
      throw error;
    }
  }

  static async cancel(request_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .update({ status: 'cancelled' })
        .eq('request_id', request_id)
        .select()
        .single();

      if (error) throw error;

      // Update items status
      await supabase
        .from('borrow_request_items')
        .update({ status: 'cancelled' })
        .eq('request_id', request_id);

      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error cancelling request:', error);
      throw error;
    }
  }

  static async getPartnerSchoolsForBook(book_id, home_school_id) {
    try {
      const { data, error } = await supabase
        .from('book_copies')
        .select(`
          copy_id,
          book_id,
          status,
          books(
            *,
            schools(school_id, school_name, school_code, address, latitude, longitude, borrowing_requirements)
          )
        `)
        .eq('book_id', book_id)
        .eq('status', 'available')
        .not('books.school_id', 'eq', home_school_id);

      if (error) throw error;

      // Group by school and count available copies
      const schoolMap = {};
      data.forEach(copy => {
        const school = copy.books.schools;
        if (school) {
          if (!schoolMap[school.school_id]) {
            schoolMap[school.school_id] = {
              school_id: school.school_id,
              school_name: school.school_name,
              school_code: school.school_code,
              address: school.address,
              latitude: school.latitude,
              longitude: school.longitude,
              borrowing_requirements: school.borrowing_requirements,
              available_copies: 0,
              book: copy.books,
            };
          }
          schoolMap[school.school_id].available_copies++;
        }
      });

      return Object.values(schoolMap);
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting partner schools:', error);
      throw error;
    }
  }
}

module.exports = BorrowRequest;
