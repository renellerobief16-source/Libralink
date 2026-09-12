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

      await this.notifyOwnerSchoolStaff(request_id, data, result);

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

  static async notifyOwnerSchoolStaff(request_id, requestData, request) {
    try {
      const ownerSchoolIds = [...new Set((requestData.items || [])
        .map(item => Number(item.owner_school_id))
        .filter(Number.isInteger))];

      // The student's home school staff should also be notified so that the
      // local librarian / admin-librarian is aware of the request (especially
      // important for cross-school borrowing).
      const homeSchoolId = Number(requestData.home_school_id) || Number(request.home_school_id);
      const schoolIdsToNotify = [...new Set(ownerSchoolIds)];
      if (homeSchoolId && Number.isInteger(homeSchoolId) && !schoolIdsToNotify.includes(homeSchoolId)) {
        schoolIdsToNotify.push(homeSchoolId);
      }

      if (schoolIdsToNotify.length === 0) return;

      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('firstname, lastname, student_number')
        .eq('user_id', request.student_id)
        .single();

      if (studentError) throw studentError;

      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('user_id, school_id')
        .in('school_id', schoolIdsToNotify)
        .in('role_id', [2, 3])
        .eq('status', 'active');

      if (staffError) throw staffError;
      if (!staff || staff.length === 0) return;

      const studentName = [student?.firstname, student?.lastname].filter(Boolean).join(' ') || 'A student';
      const bookCount = requestData.items?.length || 0;
      const bookTitles = (requestData.items || [])
        .map(item => item.title)
        .filter(Boolean);
      const bookSummary = bookTitles.length > 0
        ? bookTitles.join(', ')
        : `${bookCount} ${bookCount === 1 ? 'book' : 'books'}`;
      const notifications = staff.map(member => ({
        user_id: member.user_id,
        school_id: member.school_id,
        type: 'request_submitted',
        title: requestData.request_type === 'INTER_SCHOOL'
          ? 'New Inter-School Borrow Request'
          : 'New Borrow Request',
        message: `${studentName} submitted request ${request_id} for: ${bookSummary}. Please review the request.`,
        // related_id is an integer in the existing database; the request ID is kept in the message.
        related_id: null,
        is_read: false,
        is_admin_notification: false,
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;
      console.log('[BORROW REQUEST] Staff notifications created:', notifications.length);
    } catch (error) {
      // A notification failure must not invalidate a successfully created request.
      console.error('[BORROW REQUEST] Error creating staff notifications:', error);
    }
  }

  static async getById(request_id) {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          home_school:home_school_id(school_name, school_code),
          items:borrow_request_items(
            *,
            book:book_id(title, author),
            owner_school:owner_school_id(school_name, school_code),
            partner_school:partner_school_id(school_name, school_code)
          )
        `)
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
            book:book_id(title, author),
            owner_school:owner_school_id(school_name, school_code),
            partner_school:partner_school_id(school_name, school_code)
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
          student:student_id(firstname, lastname, student_number, email, profile_image),
          home_school:home_school_id(school_name, school_code),
          items:borrow_request_items(
            *,
            book:book_id(title, author),
            owner_school:owner_school_id(school_name, school_code)
          )
        `)
        .eq('home_school_id', school_id)
        .eq('request_type', 'HOME');

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

  static async getInterSchoolStatusesByStudent(student_id) {
    const { data: requests, error: requestError } = await supabase
      .from('borrow_requests')
      .select('request_id')
      .eq('student_id', student_id);

    if (requestError) throw requestError;
    const requestIds = (requests || []).map(request => request.request_id).filter(Boolean);
    if (requestIds.length === 0) return [];

    const { data, error } = await supabase
      .from('borrow_request_items')
      .select('item_id, request_id, book_id, owner_school_id, status, borrow_type')
      .in('request_id', requestIds)
      .eq('borrow_type', 'INTER_SCHOOL_LIBRARY_USE');

    if (error) throw error;
    return data || [];
  }

  static async getByPartnerSchool(school_id, status = null) {
    try {
      console.log('[BORROW REQUEST] Fetching partner school requests for school_id:', school_id);
      
      let query = supabase
        .from('borrow_request_items')
        .select(`
          *,
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

      const requestIds = [...new Set((data || []).map(item => item.request_id).filter(Boolean))];
      if (requestIds.length === 0) return [];

      const { data: requests, error: requestsError } = await supabase
        .from('borrow_requests')
        .select(`
          *,
            student:student_id(firstname, lastname, student_number, email, contact_number, profile_image),
          home_school:home_school_id(school_name, school_code),
          items:borrow_request_items(
            *,
            book:book_id(title, author),
            owner_school:owner_school_id(school_name, school_code)
          )
        `)
        .in('request_id', requestIds);

      if (requestsError) throw requestsError;

      const requestsById = new Map((requests || []).map(request => [request.request_id, request]));
      return (data || []).map(item => ({
        ...item,
        borrow_request: requestsById.get(item.request_id) || null,
      }));
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting partner school requests:', error);
      throw error;
    }
  }

  static async getByQRToken(qr_token) {
    try {
      const cleanToken = String(qr_token || '').trim();
      if (!cleanToken) return null;

      let request = null;
      const { data: directReq, error: requestError } = await supabase
        .from('borrow_requests')
        .select('*')
        .or(`qr_token.eq."${cleanToken}",request_id.eq."${cleanToken}"`)
        .maybeSingle();

      if (directReq) {
        request = directReq;
      } else {
        const { data: fallbackReq } = await supabase
          .from('borrow_requests')
          .select('*')
          .eq('qr_token', cleanToken)
          .maybeSingle();
        
        if (fallbackReq) {
          request = fallbackReq;
        } else {
          const { data: reqById } = await supabase
            .from('borrow_requests')
            .select('*')
            .eq('request_id', cleanToken)
            .maybeSingle();
          if (reqById) {
            request = reqById;
          }
        }
      }

      if (!request) return null;

      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('firstname, lastname, student_number, email, contact_number')
        .eq('user_id', request.student_id)
        .maybeSingle();
      if (studentError) throw studentError;

      const { data: homeSchool, error: homeSchoolError } = await supabase
        .from('schools')
        .select('school_id, school_name, school_code, address')
        .eq('school_id', request.home_school_id)
        .maybeSingle();
      if (homeSchoolError) throw homeSchoolError;

      const { data: items, error: itemsError } = await supabase
        .from('borrow_request_items')
        .select('*')
        .eq('request_id', request.request_id);
      if (itemsError) throw itemsError;

      const bookIds = [...new Set((items || []).map(item => item.book_id).filter(Boolean))];
      const schoolIds = [...new Set((items || [])
        .flatMap(item => [item.owner_school_id, item.partner_school_id])
        .filter(Boolean))];

      const [{ data: books, error: booksError }, { data: schools, error: schoolsError }] = await Promise.all([
        bookIds.length > 0
          ? supabase.from('books').select('book_id, title, author, isbn, call_number').in('book_id', bookIds)
          : Promise.resolve({ data: [], error: null }),
        schoolIds.length > 0
          ? supabase.from('schools').select('school_id, school_name, school_code, address').in('school_id', schoolIds)
          : Promise.resolve({ data: [], error: null })
      ]);
      if (booksError) throw booksError;
      if (schoolsError) throw schoolsError;

      const booksById = new Map((books || []).map(book => [String(book.book_id), book]));
      const schoolsById = new Map((schools || []).map(school => [String(school.school_id), school]));
      return {
        ...request,
        student,
        home_school: homeSchool,
        items: (items || []).map(item => ({
          ...item,
          book: booksById.get(String(item.book_id)) || null,
          owner_school: schoolsById.get(String(item.owner_school_id)) || null,
          partner_school: schoolsById.get(String(item.partner_school_id)) || null,
        }))
      };
    } catch (error) {
      console.error('[BORROW REQUEST] Error getting request by QR token:', error);
      throw error;
    }
  }

  static async approve(request_id, approved_by) {
    try {
      console.log('[BORROW REQUEST] Approving request:', request_id, 'by user:', approved_by);
      
      // Get request details with items for availability validation
      const { data: requestData, error: fetchError } = await supabase
        .from('borrow_requests')
        .select(`
          request_type,
          home_school_id,
          items:borrow_request_items(
            item_id,
            book_id,
            owner_school_id,
            status
          )
        `)
        .eq('request_id', request_id)
        .single();

      if (fetchError) {
        console.error('[BORROW REQUEST] Error fetching request:', fetchError);
        throw fetchError;
      }

      // Validate availability for each item before approving
      for (const item of requestData.items || []) {
        let availabilityCheck = true;
        try {
          const { data: availability } = await supabase.rpc('get_book_availability', {
            p_book_id: item.book_id
          });

          if (!availability || availability.length === 0 || availability[0].available_copies <= 0) {
            console.warn('[BORROW REQUEST] No available copies for book:', item.book_id, '- will approve without copy assignment');
            availabilityCheck = false;
          } else {
            console.log('[BORROW REQUEST] Availability check passed for book:', item.book_id,
              'Available:', availability[0].available_copies, '/', availability[0].total_copies);
          }
        } catch (rpcError) {
          console.warn('[BORROW REQUEST] get_book_availability RPC not available, skipping check:', rpcError.message);
          availabilityCheck = false;
        }
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
      
      // Update status to approved with proper lifecycle
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

      // Update items status and assign available copies
      for (const item of requestData.items || []) {
        // Use atomic copy assignment to handle concurrent requests safely
        let copy_id;
        try {
          const { data: assignedCopy } = await supabase.rpc('assign_available_copy', {
            p_book_id: item.book_id,
            p_request_item_id: item.item_id
          });
          copy_id = assignedCopy;
          console.log('[BORROW REQUEST] Atomically assigned copy:', copy_id, 'to item:', item.item_id);
        } catch (rpcError) {
          console.warn('[BORROW REQUEST] Atomic copy assignment failed:', rpcError.message);
          // Fallback to manual assignment if RPC not available
          try {
            const { data: availableCopy } = await supabase
              .from('book_copies')
              .select('copy_id')
              .eq('book_id', item.book_id)
              .eq('status', 'available')
              .limit(1)
              .single();

            if (availableCopy) {
              copy_id = availableCopy.copy_id;
              // Update copy status to reserved
              await supabase
                .from('book_copies')
                .update({ status: 'reserved' })
                .eq('copy_id', copy_id);
              console.log('[BORROW REQUEST] Manually assigned copy:', copy_id, 'to item:', item.item_id);
            } else {
              console.warn('[BORROW REQUEST] No available copies for book:', item.book_id, '- approving without copy assignment');
            }
          } catch (manualError) {
            console.warn('[BORROW REQUEST] Manual copy assignment failed:', manualError.message, '- approving without copy assignment');
          }
        }

        // Update item status to approved (with or without copy assignment)
        const updateData = {
          status: 'approved',
          item_status: 'approved'
        };
        if (copy_id) {
          updateData.assigned_copy_id = copy_id;
        }

        await supabase
          .from('borrow_request_items')
          .update(updateData)
          .eq('item_id', item.item_id);

        console.log('[BORROW REQUEST] Updated item:', item.item_id, 'with copy:', copy_id || 'none');
      }

      console.log('[BORROW REQUEST] Approval completed with QR code generation and copy assignment');
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
        .select('item_id, status, copy_id, book_id, assigned_copy_id, request_id, owner_school_id')
        .eq('item_id', item_id)
        .single();

      if (checkError || !existingItem) {
        const message = checkError?.message || 'Item not found';
        throw new Error(`Item ${item_id} not found: ${message}`);
      }

      // Check if item is already released (prevent duplicate transactions)
      if (existingItem.item_status === 'borrowed' || existingItem.released_at) {
        throw new Error(`Item ${item_id} has already been released`);
      }

      let actualCopyId = copy_id || existingItem.assigned_copy_id || existingItem.copy_id;
      
      if (!actualCopyId) {
        // Automatically find an available copy for this book
        const { data: availableCopy } = await supabase
          .from('book_copies')
          .select('copy_id')
          .eq('book_id', existingItem.book_id)
          .eq('status', 'available')
          .limit(1)
          .maybeSingle();

        if (availableCopy) {
          actualCopyId = availableCopy.copy_id;
        } else {
          // If no copy is marked 'available', pick any existing copy for this book
          const { data: anyCopy } = await supabase
            .from('book_copies')
            .select('copy_id')
            .eq('book_id', existingItem.book_id)
            .limit(1)
            .maybeSingle();
          if (anyCopy) {
            actualCopyId = anyCopy.copy_id;
          } else {
            // Auto-create a tracked copy for this book copy inventory
            const { data: newCopy } = await supabase
              .from('book_copies')
              .insert({
                book_id: existingItem.book_id,
                school_id: existingItem.owner_school_id || 1,
                accession_number: `ACC-${Date.now().toString().slice(-6)}`,
                status: 'borrowed',
                condition: 'good'
              })
              .select('copy_id')
              .single();
            if (newCopy) {
              actualCopyId = newCopy.copy_id;
            }
          }
        }
      }

      if (!actualCopyId) {
        throw new Error(`Unable to assign a book copy for item ${item_id}`);
      }

      // Update item status to borrowed with proper lifecycle
      const updateData = {
        status: 'borrowed',
        item_status: 'borrowed',
        copy_id: actualCopyId,
        assigned_copy_id: actualCopyId,
        released_at: new Date().toISOString(),
      };

      if (released_by) {
        updateData.released_by = released_by;
      }

      // Update the item
      const { error: itemError } = await supabase
        .from('borrow_request_items')
        .update(updateData)
        .eq('item_id', item_id);

      if (itemError) {
        throw new Error(`Failed to update item: ${itemError.message}`);
      }

      // Update the book copy status to borrowed
      const { error: copyError } = await supabase
        .from('book_copies')
        .update({ status: 'borrowed' })
        .eq('copy_id', actualCopyId);

      if (copyError) {
        console.warn(`[BORROW REQUEST] Note on updating copy status: ${copyError.message}`);
      }

      // Synchronize with borrow_transactions table
      const { data: parentRequest } = await supabase
        .from('borrow_requests')
        .select('request_id, student_id, due_date, home_school_id, request_type')
        .eq('request_id', existingItem.request_id)
        .single();

      let computedDueDate = null;
      const releaseTimestamp = new Date();
      if (parentRequest) {
        // Automatically calculate due date from the exact moment of librarian counter release
        const schoolForDays = existingItem.owner_school_id || parentRequest.home_school_id;
        const borrowingDays = await LibrarySettings.getHomeBorrowingDays(schoolForDays);
        const d = new Date(releaseTimestamp);
        d.setDate(d.getDate() + (borrowingDays || 7));
        computedDueDate = d.toISOString().split('T')[0];

        // Check if an active transaction already exists for this copy & student
        const { data: existingTx } = await supabase
          .from('borrow_transactions')
          .select('borrow_id')
          .eq('copy_id', actualCopyId)
          .eq('status', 'active')
          .maybeSingle();

        if (!existingTx) {
          const { error: insertTxError } = await supabase
            .from('borrow_transactions')
            .insert({
              student_id: parentRequest.student_id,
              copy_id: actualCopyId,
              librarian_id: released_by || null,
              borrow_date: releaseTimestamp.toISOString(),
              due_date: computedDueDate,
              status: 'active'
            });

          if (insertTxError) {
            console.warn('[BORROW REQUEST] Error inserting borrow_transaction sync:', insertTxError);
          } else {
            console.log('[BORROW REQUEST] Synchronized active loan to borrow_transactions with due date:', computedDueDate);
          }
        }

        // Update parent borrow_requests status to 'borrowed'
        await supabase
          .from('borrow_requests')
          .update({
            status: 'borrowed',
            borrow_date: releaseTimestamp.toISOString(),
            due_date: computedDueDate
          })
          .eq('request_id', existingItem.request_id);
      }

      console.log('[BORROW REQUEST] Book released successfully:', item_id, 'copy:', actualCopyId, 'due:', computedDueDate);
      return { success: true, copy_id: actualCopyId, due_date: computedDueDate };
    } catch (error) {
      console.error('[BORROW REQUEST] Error releasing book:', error);
      throw error;
    }
  }

  static async returnBook(item_id, returned_by) {
    try {
      const { data: existingItem, error: checkError } = await supabase
        .from('borrow_request_items')
        .select('item_id, status, copy_id, request_id, assigned_copy_id, owner_school_id, book_id')
        .eq('item_id', item_id)
        .single();

      if (checkError || !existingItem) {
        const message = checkError?.message || 'Item not found';
        throw new Error(`Item ${item_id} not found: ${message}`);
      }

      // Check if item is already returned
      if (existingItem.item_status === 'returned' || existingItem.returned_at) {
        throw new Error(`Item ${item_id} has already been returned`);
      }

      const actualCopyId = existingItem.assigned_copy_id || existingItem.copy_id;
      
      if (!actualCopyId) {
        throw new Error(`No copy associated with item ${item_id}. Cannot return.`);
      }

      const returnTime = new Date().toISOString();

      // Update item status to returned with proper lifecycle
      const updateData = {
        status: 'returned',
        item_status: 'returned',
        returned_at: returnTime,
      };

      if (returned_by) {
        updateData.returned_by = returned_by;
      }

      // Update the item
      const { error: itemError } = await supabase
        .from('borrow_request_items')
        .update(updateData)
        .eq('item_id', item_id);

      if (itemError) {
        throw new Error(`Failed to update item: ${itemError.message}`);
      }

      // Update the book copy status back to available
      const { error: copyError } = await supabase
        .from('book_copies')
        .update({ status: 'available' })
        .eq('copy_id', actualCopyId);

      if (copyError) {
        console.warn(`[BORROW REQUEST] Note on updating copy status: ${copyError.message}`);
      }

      // Get parent request details
      const { data: parentRequest } = await supabase
        .from('borrow_requests')
        .select('student_id, home_school_id, due_date, request_id')
        .eq('request_id', existingItem.request_id)
        .single();

      // Synchronize with borrow_transactions table
      const { data: activeTx } = await supabase
        .from('borrow_transactions')
        .select('borrow_id, due_date, borrow_date, student_id')
        .eq('copy_id', actualCopyId)
        .eq('status', 'active')
        .order('borrow_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeTx) {
        await supabase
          .from('borrow_transactions')
          .update({
            status: 'returned',
            return_date: returnTime
          })
          .eq('borrow_id', activeTx.borrow_id);
        console.log('[BORROW REQUEST] Synchronized return to borrow_transactions:', activeTx.borrow_id);
      }

      // Check remaining items for parent request status update
      const { data: siblingItems } = await supabase
        .from('borrow_request_items')
        .select('item_status')
        .eq('request_id', existingItem.request_id);

      const hasUnreturned = (siblingItems || []).some(
        it => it.item_status === 'borrowed' || it.item_status === 'approved' || it.item_status === 'pending'
      );

      if (!hasUnreturned && parentRequest) {
        await supabase
          .from('borrow_requests')
          .update({
            status: 'returned',
            return_date: returnTime
          })
          .eq('request_id', existingItem.request_id);
      }

      // Overdue fine calculation
      let fineAssessed = 0;
      let daysOverdue = 0;
      const schoolId = existingItem.owner_school_id || parentRequest?.home_school_id;
      const dueDateStr = activeTx?.due_date || parentRequest?.due_date;

      if (schoolId && dueDateStr) {
        try {
          const finePolicy = await LibrarySettings.getFinePolicy(schoolId);
          if (finePolicy.enable_fines) {
            const dueDate = new Date(dueDateStr);
            const now = new Date();
            if (now > dueDate) {
              const diffMs = now.getTime() - dueDate.getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              daysOverdue = Math.max(0, diffDays - (finePolicy.grace_period_days || 0));

              if (daysOverdue > 0) {
                const rawFine = daysOverdue * finePolicy.fine_amount_per_day;
                fineAssessed = Math.min(rawFine, finePolicy.max_fine_cap);

                // Prevent duplicate fines for the same borrow transaction / student
                const studentId = parentRequest?.student_id || activeTx?.student_id;
                const { data: existingFine } = await supabase
                  .from('fines')
                  .select('fine_id')
                  .eq('student_id', studentId)
                  .eq('borrow_id', activeTx?.borrow_id || null)
                  .maybeSingle();

                if (!existingFine && fineAssessed > 0) {
                  await supabase
                    .from('fines')
                    .insert({
                      student_id: studentId,
                      school_id: schoolId,
                      borrow_id: activeTx?.borrow_id || null,
                      amount: fineAssessed,
                      reason: `Overdue return (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} late)`,
                      status: 'pending',
                      created_at: new Date().toISOString()
                    });
                  console.log(`[BORROW REQUEST] Generated overdue fine: ₱${fineAssessed} for student ${studentId}`);
                }
              }
            }
          }
        } catch (fineErr) {
          console.error('[BORROW REQUEST] Error calculating fine on return:', fineErr);
        }
      }

      console.log('[BORROW REQUEST] Book returned successfully:', item_id, 'copy:', actualCopyId, 'fine:', fineAssessed);
      return { success: true, copy_id: actualCopyId, fineAssessed, daysOverdue };
    } catch (error) {
      console.error('[BORROW REQUEST] Error returning book:', error);
      throw error;
    }
  }

  static async cancel(request_id, reason = '') {
    try {
      const updatePayload = {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      };
      if (reason) {
        updatePayload.cancellation_reason = reason;
      }

      const { data, error } = await supabase
        .from('borrow_requests')
        .update(updatePayload)
        .eq('request_id', request_id)
        .select()
        .single();

      if (error) throw error;

      // Release any reserved book copies back to available
      const { data: items } = await supabase
        .from('borrow_request_items')
        .select('item_id, assigned_copy_id')
        .eq('request_id', request_id);

      if (items && items.length > 0) {
        for (const itm of items) {
          if (itm.assigned_copy_id) {
            await supabase
              .from('book_copies')
              .update({ status: 'available' })
              .eq('copy_id', itm.assigned_copy_id);
          }
        }
      }

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

  static async requestCancellation(request_id, reason = '') {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .update({
          status: 'cancel_requested',
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id)
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('borrow_request_items')
        .update({ status: 'cancel_requested' })
        .eq('request_id', request_id);

      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error requesting cancellation:', error);
      throw error;
    }
  }

  static async declineCancellation(request_id, remarks = '') {
    try {
      // Check whether this request was previously approved (has qr_token) or pending
      const { data: existingReq } = await supabase
        .from('borrow_requests')
        .select('qr_token')
        .eq('request_id', request_id)
        .single();

      const restoredStatus = existingReq?.qr_token ? 'approved' : 'pending';

      const { data, error } = await supabase
        .from('borrow_requests')
        .update({
          status: restoredStatus,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id)
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('borrow_request_items')
        .update({ status: restoredStatus })
        .eq('request_id', request_id);

      return data;
    } catch (error) {
      console.error('[BORROW REQUEST] Error declining cancellation:', error);
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
