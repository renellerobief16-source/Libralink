const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { auth, requireRole } = require('../middleware/auth');
const { bulkImportBooks } = require('../controllers/bookImportController');
const { uploadBookCover } = require('../middleware/upload');
const supabase = require('../config/database');

// @route   GET /api/books/count
// @desc    Get total books count
// @access  Private
router.get('/count', auth, async (req, res) => {
  try {
    console.log('[ROUTE] Getting books count...');
    const count = await Book.getCount();
    console.log('[ROUTE] Returning count:', count);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting books count:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/books
// @desc    Get a paginated public catalog page with grouping and availability. Clients can use total to load
//          the complete catalog without relying on a hidden default limit.
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('[PUBLIC BOOKS] Route hit');
    const requestedLimit = parseInt(req.query.limit, 10) || 100;
    const limit = Math.min(Math.max(requestedLimit, 1), 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const searchTerm = String(req.query.q || '').trim().replace(/[(),]/g, ' ');
    const groupBooks = req.query.group === 'true'; // Enable grouping
    
    console.log('[PUBLIC BOOKS] Fetching with limit:', limit, 'offset:', offset, 'group:', groupBooks);
    
    let query = supabase
      .from('books')
      .select(`
        book_id,
        title,
        author,
        isbn,
        shelf_location,
        call_number,
        school_id,
        cover_image,
        schools(school_name, school_code),
        categories(category_name)
      `, { count: 'exact' })
      .order('title');

    if (searchTerm) {
      const searchPattern = `%${searchTerm.replace(/[%_]/g, '')}%`;
      query = query.or([
        `title.ilike.${searchPattern}`,
        `author.ilike.${searchPattern}`,
        `isbn.ilike.${searchPattern}`,
        `call_number.ilike.${searchPattern}`,
        `shelf_location.ilike.${searchPattern}`,
      ].join(','));
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[PUBLIC BOOKS] Supabase error:', error);
      throw error;
    }
    
    console.log('[PUBLIC BOOKS] Books fetched:', data?.length || 0);
    
    // If grouping is enabled, group books by title/author/ISBN and calculate availability
    let processedData = data || [];
    if (groupBooks && processedData.length > 0) {
      const bookMap = new Map();
      
      for (const book of processedData) {
        const key = `${book.title}-${book.author || ''}-${book.isbn || ''}`;
        
        if (!bookMap.has(key)) {
          bookMap.set(key, {
            ...book,
            grouped_book_ids: [book.book_id],
            total_copies: 0,
            available_copies: 0,
            borrowed_copies: 0,
          });
        } else {
          const grouped = bookMap.get(key);
          grouped.grouped_book_ids.push(book.book_id);
        }
      }
      
      // Calculate availability for each grouped book
      for (const [key, groupedBook] of bookMap) {
        try {
          let availabilityData;
          try {
            const result = await supabase.rpc('get_book_availability', { 
              p_book_id: groupedBook.book_id 
            });
            availabilityData = result.data;
          } catch (rpcError) {
            // Fallback: count copies directly
            const { data: copies } = await supabase
              .from('book_copies')
              .select('status')
              .eq('book_id', groupedBook.book_id);
            
            const totalCopies = copies?.length || 0;
            const availableCopies = copies?.filter(c => c.status === 'available').length || 0;
            const borrowedCopies = copies?.filter(c => c.status === 'borrowed').length || 0;
            
            availabilityData = [{
              total_copies: totalCopies,
              available_copies: availableCopies,
              borrowed_copies: borrowedCopies
            }];
          }
          
          if (availabilityData && availabilityData.length > 0) {
            groupedBook.total_copies = availabilityData[0].total_copies;
            groupedBook.available_copies = availabilityData[0].available_copies;
            groupedBook.borrowed_copies = availabilityData[0].borrowed_copies;
            groupedBook.availability_ratio = `${availabilityData[0].available_copies}/${availabilityData[0].total_copies}`;
            groupedBook.is_available = availabilityData[0].available_copies > 0;
          }
        } catch (err) {
          console.error('[PUBLIC BOOKS] Error getting availability for book:', groupedBook.book_id, err);
          groupedBook.total_copies = 0;
          groupedBook.available_copies = 0;
          groupedBook.borrowed_copies = 0;
          groupedBook.availability_ratio = '0/0';
          groupedBook.is_available = false;
        }
      }
      
      processedData = Array.from(bookMap.values());
    }
    
    res.json({
      success: true,
      data: processedData,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: offset + (data?.length || 0) < (count || 0),
      },
    });
  } catch (error) {
    console.error('[PUBLIC BOOKS] Error getting books:', error);
    console.error('[PUBLIC BOOKS] Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/books/popular
// @desc    Get popular books
// @access  Private
router.get('/popular', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const books = await Book.getPopularBooks(limit);
    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Error getting popular books:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/books/search
// @desc    Search books
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, school_id } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    const books = await Book.search(q, school_id);
    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/books/school
// @desc    Get books by school via query string with real-time status and grouping
// @access  Private
router.get('/school', auth, async (req, res) => {
  const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
  const currentStudentId = req.user?.student_id; // Get current logged-in student ID
  const groupBooks = req.query.group === 'true'; // Enable grouping
  
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'school_id query parameter is required' });
  }

  try {
    // Supabase caps a single response at 1,000 rows. Count first, then fetch pages concurrently.
    const pageSize = 1000;

    const { count, error: countError } = await supabase
      .from('books')
      .select('book_id', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    if (countError) throw countError;

    const pageStarts = Array.from(
      { length: Math.ceil((count || 0) / pageSize) },
      (_, index) => index * pageSize,
    );

    const pages = await Promise.all(pageStarts.map(async (pageStart) => {
      const { data: page, error } = await supabase
        .from('books')
        .select(`
          book_id,
          title,
          author,
          isbn,
          shelf_location,
          call_number,
          school_id,
          cover_image,
          categories(category_name),
          schools(school_id, school_name, address, latitude, longitude),
          book_copies(copy_id, status)
        `)
        .eq('school_id', schoolId)
        .order('book_id', { ascending: true })
        .range(pageStart, pageStart + pageSize - 1);

      if (error) throw error;
      return page || [];
    }));

    const books = pages.flat();

    // Get active borrow requests for these books to determine real-time status
    const bookIds = books.map(b => b.book_id);
    const borrowBatches = [];
    for (let index = 0; index < bookIds.length; index += 500) {
      borrowBatches.push(bookIds.slice(index, index + 500));
    }

    const borrowResults = await Promise.all(borrowBatches.map(async (bookIdBatch) => {
      const { data: batch, error: borrowError } = await supabase
        .from('borrow_request_items')
        .select(`
          book_id,
          status,
          released_at,
          borrow_requests(request_id, student_id, status, due_date, users!borrow_requests_student_id_fkey(username))
        `)
        .in('book_id', bookIdBatch)
        .in('status', ['pending', 'approved', 'released']);

      if (borrowError) throw borrowError;
      return batch || [];
    }));

    const borrowItems = borrowResults.flat();

    // Map borrow items by book_id
    const borrowStatusMap = {};
    borrowItems.forEach(item => {
      if (!borrowStatusMap[item.book_id]) {
        borrowStatusMap[item.book_id] = [];
      }
      borrowStatusMap[item.book_id].push(item);
    });

    let processedData = books;

    // Group books if requested
    if (groupBooks) {
      const bookMap = new Map();

      for (const book of books) {
        const key = `${book.title}-${book.author}-${book.isbn || ''}`;
        
        if (!bookMap.has(key)) {
          bookMap.set(key, {
            ...book,
            grouped_book_ids: [book.book_id],
            total_copies: 0,
            available_copies: 0,
            borrowed_copies: 0
          });
        } else {
          const grouped = bookMap.get(key);
          grouped.grouped_book_ids.push(book.book_id);
        }
      }

      // Calculate availability for each grouped book
      for (const [key, groupedBook] of bookMap) {
        try {
          let totalCopies = 0;
          let availableCopies = 0;
          let borrowedCopies = 0;

          // Get borrow items for this grouped book
          const borrowItemsForBook = borrowItems.filter(i => groupedBook.grouped_book_ids.includes(i.book_id));

          // Aggregate copies from all grouped books
          for (const bookId of groupedBook.grouped_book_ids) {
            const book = books.find(b => b.book_id === bookId);
            if (book && book.book_copies) {
              totalCopies += book.book_copies.length || 0;
              availableCopies += book.book_copies.filter(c => c.status === 'available').length || 0;
              borrowedCopies += book.book_copies.filter(c => c.status === 'borrowed').length || 0;
            }
          }

          // Also count pending and approved requests as reducing availability
          const pendingApprovedCount = borrowItemsForBook.filter(i => i.status === 'pending' || i.status === 'approved').length || 0;
          availableCopies -= pendingApprovedCount;

          groupedBook.total_copies = totalCopies;
          groupedBook.available_copies = availableCopies;
          groupedBook.borrowed_copies = borrowedCopies;
          groupedBook.availability_ratio = `${availableCopies}/${totalCopies}`;
          groupedBook.is_available = availableCopies > 0;
        } catch (err) {
          console.error('[SCHOOL BOOKS] Error getting availability for grouped book:', groupedBook.book_id, err);
          groupedBook.total_copies = 0;
          groupedBook.available_copies = 0;
          groupedBook.borrowed_copies = 0;
          groupedBook.availability_ratio = '0/0';
          groupedBook.is_available = false;
        }
      }

      processedData = Array.from(bookMap.values());
    }

    // Add real-time status to each book (or grouped book)
    const booksWithStatus = processedData.map(book => {
      const borrowItemsForBook = book.grouped_book_ids 
        ? borrowItems.filter(i => book.grouped_book_ids.includes(i.book_id))
        : (borrowStatusMap[book.book_id] || []);
      
      const availableCopies = book.available_copies || (book.book_copies?.filter(c => c.status === 'available')?.length || 0);
      const totalCopies = book.total_copies || (book.book_copies?.length || 0);
      const borrowedCopies = book.borrowed_copies || (book.book_copies?.filter(c => c.status === 'borrowed')?.length || 0);
      
      // Determine overall status
      let status = 'available';
      let statusDetails = null;
      let dueDate = null;

      // FIX: Only mark as borrowed if ALL copies are borrowed, not if ANY copy is borrowed
      if (availableCopies === 0 && totalCopies > 0) {
        status = 'borrowed';
        statusDetails = 'All copies borrowed';
      } else if (borrowedCopies > 0 && availableCopies > 0) {
        // Some copies borrowed, some available - still show as available
        status = 'available';
        statusDetails = `${availableCopies}/${totalCopies} available`;
      } else if (borrowItemsForBook.length > 0) {
        // Check borrow request status as secondary indicator
        const hasPending = borrowItemsForBook.some(i => i.status === 'pending');
        const hasApproved = borrowItemsForBook.some(i => i.status === 'approved');
        const hasReleased = borrowItemsForBook.some(i => i.status === 'released');

        // Only show detailed status if it's the current user's request
        const myPending = borrowItemsForBook.some(i => i.status === 'pending' && i.borrow_requests?.student_id === currentStudentId);
        const myApproved = borrowItemsForBook.some(i => i.status === 'approved' && i.borrow_requests?.student_id === currentStudentId);
        const myReleased = borrowItemsForBook.some(i => i.status === 'released' && i.borrow_requests?.student_id === currentStudentId);

        if (myReleased) {
          status = 'borrowed';
          if (borrowItemsForBook[0].borrow_requests?.due_date) {
            dueDate = borrowItemsForBook[0].borrow_requests.due_date;
            const dueDateObj = new Date(dueDate);
            const formattedDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            statusDetails = `Due: ${formattedDate}`;
          } else {
            statusDetails = 'Currently borrowed';
          }
        } else if (myApproved) {
          status = 'waiting_pickup';
          statusDetails = 'Waiting for pickup';
        } else if (myPending) {
          status = 'requested';
          statusDetails = 'Requested';
        } else if (hasReleased) {
          status = 'borrowed';
          statusDetails = 'Currently borrowed';
        } else if (hasApproved) {
          status = 'waiting_pickup';
          statusDetails = 'Waiting for pickup';
        } else if (hasPending) {
          status = 'requested';
          statusDetails = 'Requested';
        }
      }

      return {
        ...book,
        real_time_status: status,
        status_details: statusDetails,
        due_date: dueDate,
        available_copies: availableCopies,
        total_copies: totalCopies,
        is_available: availableCopies > 0,
        current_borrowers: borrowItemsForBook
          .filter(i => i.status === 'released' || i.status === 'approved')
          .map(i => ({
            username: i.borrow_requests?.users?.username || i.borrow_requests?.users?.name || 'Student',
            status: i.status === 'released' ? 'borrowed' : 'waiting_pickup'
          }))
      };
    });

    res.json({ 
      success: true, 
      data: {
        books: booksWithStatus,
        total_books: count || 0, // Original total count before grouping
        grouped_count: booksWithStatus.length // Count after grouping
      }
    });
  } catch (error) {
    console.error('Error getting books by school (query):', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/books/school/:school_id
// @desc    Get books by school
// @access  Private
router.get('/school/:school_id', auth, async (req, res) => {
  try {
    const books = await Book.getBySchool(req.params.school_id);
    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Error getting books by school:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/books/search-other-schools
// @desc    Search for book in other schools (inter-school availability)
// @access  Private
router.get('/search-other-schools', auth, async (req, res) => {
  try {
    console.log('[INTER-SCHOOL SEARCH] Route hit');
    const { title, exclude_school_id } = req.query;
    console.log('[INTER-SCHOOL SEARCH] Query params:', { title, exclude_school_id });

    if (!title) {
      console.log('[INTER-SCHOOL SEARCH] No title provided');
      return res.status(400).json({ success: false, message: 'Book title is required' });
    }

    const normalizedTitle = String(title).trim();
    console.log('[INTER-SCHOOL SEARCH] Normalized title:', normalizedTitle);
    
    if (!normalizedTitle) {
      console.log('[INTER-SCHOOL SEARCH] Empty normalized title');
      return res.json({ success: true, data: [] });
    }

    const excludeId = String(exclude_school_id || '').trim();
    console.log('[INTER-SCHOOL SEARCH] Exclude school ID:', excludeId);

    console.log('[INTER-SCHOOL SEARCH] Querying books...');
    const { data: books, error } = await supabase
      .from('books')
      .select('book_id, title, author, isbn, school_id, cover_image, shelf_location, call_number, copyright_year')
      .ilike('title', '%' + normalizedTitle + '%');

    if (error) {
      console.error('[INTER-SCHOOL SEARCH] Error searching books:', error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }

    console.log('[INTER-SCHOOL SEARCH] Books found:', books?.length || 0);

    let filtered = books || [];
    if (excludeId) {
      console.log('[INTER-SCHOOL SEARCH] Filtering out school:', excludeId);
      filtered = filtered.filter(book => String(book.school_id) !== excludeId);
    }

    console.log('[INTER-SCHOOL SEARCH] After filter:', filtered.length);

    if (filtered.length === 0) {
      console.log('[INTER-SCHOOL SEARCH] No books after filter');
      return res.json({ success: true, data: [] });
    }

    const schoolIds = [...new Set(filtered.map(book => book.school_id))];
    console.log('[INTER-SCHOOL SEARCH] School IDs:', schoolIds);

    // Get borrow items for these books to show current borrowers
    const bookIds = filtered.map(book => book.book_id);
    const { data: borrowItems, error: borrowError } = await supabase
      .from('borrow_request_items')
      .select(`
        book_id,
        status,
        borrow_requests(request_id, student_id, status, due_date, users!borrow_requests_student_id_fkey(username))
      `)
      .in('book_id', bookIds)
      .in('status', ['pending', 'approved', 'released']);

    if (borrowError) {
      console.error('[INTER-SCHOOL SEARCH] Error fetching borrow items:', borrowError);
    }

    const borrowItemsByBook = {};
    if (borrowItems) {
      borrowItems.forEach(item => {
        if (!borrowItemsByBook[item.book_id]) {
          borrowItemsByBook[item.book_id] = [];
        }
        borrowItemsByBook[item.book_id].push(item);
      });
    }

    console.log('[INTER-SCHOOL SEARCH] Querying schools...');
    const { data: schools } = await supabase
      .from('schools')
      .select('school_id, school_name, address, school_code, latitude, longitude')
      .in('school_id', schoolIds);

    console.log('[INTER-SCHOOL SEARCH] Schools found:', schools?.length || 0);

    // Fetch partner school policies and visiting fees
    const { data: schoolSettings } = await supabase
      .from('library_settings')
      .select('school_id, setting_key, setting_value')
      .in('school_id', schoolIds)
      .in('setting_key', [
        'enable_visiting_fee',
        'visiting_fee_amount',
        'visiting_fee_type',
        'visiting_policy_notes',
        'inter_school_library_use_only'
      ]);

    const settingsBySchool = {};
    if (schoolSettings) {
      schoolSettings.forEach(s => {
        const sid = String(s.school_id);
        if (!settingsBySchool[sid]) settingsBySchool[sid] = {};
        settingsBySchool[sid][s.setting_key] = s.setting_value;
      });
    }

    const schoolMap = new Map();
    if (schools) {
      schools.forEach(school => schoolMap.set(String(school.school_id), school));
    }

    const result = filtered.map(book => {
      const school = schoolMap.get(String(book.school_id));
      const schoolSetting = settingsBySchool[String(book.school_id)] || {};
      const enableVisitingFee = schoolSetting.enable_visiting_fee === true || schoolSetting.enable_visiting_fee === 'true';
      const visitingFeeAmount = parseFloat(schoolSetting.visiting_fee_amount) || 0.00;
      const visitingFeeType = schoolSetting.visiting_fee_type || 'per_visit';
      const visitingPolicyNotes = schoolSetting.visiting_policy_notes || 'Visiting students from other consortium schools may review, read, and research this book on-site inside library premises.';
      const interSchoolLibraryUseOnly = schoolSetting.inter_school_library_use_only !== undefined 
        ? (schoolSetting.inter_school_library_use_only === true || schoolSetting.inter_school_library_use_only === 'true')
        : true;

      const bookBorrowItems = borrowItemsByBook[book.book_id] || [];
      const currentBorrowers = bookBorrowItems
        .filter(i => i.status === 'released' || i.status === 'approved')
        .map(i => ({
          username: i.borrow_requests?.users?.username || 'Student',
          status: i.status === 'released' ? 'borrowed' : 'waiting_pickup'
        }));

      return {
        school_id: book.school_id,
        school_name: school?.school_name || 'Unknown School',
        address: school?.address || 'Unknown Address',
        school_code: school?.school_code,
        latitude: school?.latitude || null,
        longitude: school?.longitude || null,
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        shelf_location: book.shelf_location || null,
        call_number: book.call_number || null,
        publication_year: book.copyright_year || null,
        copyright_year: book.copyright_year || null,
        cover_image: book.cover_image || null,
        available_copies: 1,
        total_copies: 1,
        current_borrowers: currentBorrowers,
        real_time_status: 'available',
        enable_visiting_fee: enableVisitingFee,
        visiting_fee_amount: visitingFeeAmount,
        visiting_fee_type: visitingFeeType,
        visiting_policy_notes: visitingPolicyNotes,
        inter_school_library_use_only: interSchoolLibraryUseOnly,
      };
    });

    const grouped = new Map();
    result.forEach(book => {
      if (!grouped.has(book.school_id)) {
        grouped.set(book.school_id, book);
      }
    });

    const finalResult = Array.from(grouped.values());
    console.log('[INTER-SCHOOL SEARCH] Final result count:', finalResult.length);
    console.log('[INTER-SCHOOL SEARCH] Final result sample:', JSON.stringify(finalResult[0] || null));
    console.log('[INTER-SCHOOL SEARCH] Sending response:', JSON.stringify({ success: true, data: finalResult }));
    res.json({ success: true, data: finalResult });
  } catch (error) {
    console.error('[INTER-SCHOOL SEARCH] Server error:', error);
    console.error('[INTER-SCHOOL SEARCH] Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/books/:id/archive
// @desc    Archive book
// @access  Private (Librarian Admin, Librarian)
router.put('/:id/archive', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    console.log('[ARCHIVE] User:', req.user);
    console.log('[ARCHIVE] Attempting to archive book:', req.params.id);
    const result = await Book.archive(req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error archiving book:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/books/:id
// @desc    Get book by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const book = await Book.getById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Error getting book:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/books
// @desc    Create new book
// @access  Private (Librarian Admin, Librarian)
router.post('/', auth, requireRole(['Librarian Admin', 'Librarian']), uploadBookCover.single('cover_image'), async (req, res) => {
  try {
    console.log('[CREATE BOOK] Request body:', req.body);
    console.log('[CREATE BOOK] Request file:', req.file);

    // Handle both JSON and FormData
    let bookData;
    if (req.body instanceof Object && !req.body.constructor.name.includes('FormData')) {
      // JSON request
      bookData = req.body;
    } else {
      // FormData request
      bookData = {
        title: req.body.title,
        author: req.body.author,
        school_id: req.body.school_id ? parseInt(req.body.school_id) : null,
        quantity: req.body.quantity ? parseInt(req.body.quantity) : 1,
        isbn: req.body.isbn || null,
        publisher: req.body.publisher || null,
        edition: req.body.edition || null,
        copyright_year: req.body.copyright_year ? parseInt(req.body.copyright_year) : null,
        physical_description: req.body.physical_description || null,
        series_title: req.body.series_title || null,
        general_note: req.body.general_note || null,
        shelf_location: req.body.shelf_location || null,
        cover_image: req.file ? `/uploads/book-covers/${req.file.filename}` : null
      };
    }

    const { title, school_id, quantity } = bookData;
    if (!title || !school_id) {
      console.log('[CREATE BOOK] Validation failed - title:', title, 'school_id:', school_id);
      return res.status(400).json({ success: false, message: 'Title and school_id are required' });
    }

    const book_id = await Book.create(bookData);
    
    // If quantity > 1, create book copies
    if (quantity && quantity > 1) {
      console.log('[CREATE BOOK] Creating', quantity, 'copies for book:', book_id);
      const { error: copiesError } = await supabase
        .from('book_copies')
        .insert(
          Array.from({ length: quantity }, (_, i) => ({
            book_id: book_id,
            status: 'available',
            copy_number: i + 1
          }))
        );
      
      if (copiesError) {
        console.error('[CREATE BOOK] Error creating copies:', copiesError);
        // Don't fail the request if copies fail, just log it
      }
    }

    res.status(201).json({ success: true, message: 'Book created successfully', book_id });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/books/:id
// @desc    Update book
// @access  Private (Librarian Admin, Librarian)
router.put('/:id', auth, requireRole(['Librarian Admin', 'Librarian']), uploadBookCover.single('cover_image'), async (req, res) => {
  try {
    console.log('[UPDATE] User:', req.user);
    console.log('[UPDATE] Book ID:', req.params.id);
    console.log('[UPDATE] Request body:', req.body);
    console.log('[UPDATE] Request file:', req.file);

    // Handle FormData with file upload
    let updateData;
    if (req.file) {
      // FormData with file
      updateData = {
        title: req.body.title,
        author: req.body.author,
        isbn: req.body.isbn || null,
        call_number: req.body.call_number || null,
        edition: req.body.edition || null,
        copyright_year: req.body.copyright_year ? parseInt(req.body.copyright_year) : null,
        physical_description: req.body.physical_description || null,
        series_title: req.body.series_title || null,
        general_note: req.body.general_note || null,
        cover_image: req.file ? `/uploads/book-covers/${req.file.filename}` : null
      };
    } else {
      // Regular JSON or FormData without file
      updateData = req.body;
    }

    console.log('[UPDATE] Update data:', updateData);
    const result = await Book.update(req.params.id, updateData);
    if (result) {
      res.json({ success: true, message: 'Book updated successfully' });
    } else {
      res.status(400).json({ success: false, message: 'No changes made' });
    }
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/books/:id
// @desc    Delete book
// @access  Private (Super Admin, Librarian Admin, Librarian)
router.delete('/:id', auth, requireRole(['Super Admin', 'Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    console.log('[DELETE] User:', req.user);
    console.log('[DELETE] Book ID:', req.params.id);
    const result = await Book.delete(req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/books/:id/availability
// @desc    Get real-time availability for a specific book
// @access  Public
router.get('/:id/availability', async (req, res) => {
  try {
    console.log('[AVAILABILITY] Getting availability for book:', req.params.id);
    
    // Try to use the new availability function
    let data, error;
    try {
      const result = await supabase.rpc('get_book_availability', { p_book_id: req.params.id });
      data = result.data;
      error = result.error;
    } catch (rpcError) {
      console.log('[AVAILABILITY] RPC function not available, using fallback');
      error = rpcError;
    }
    
    // Fallback: Count copies directly if function doesn't exist
    if (error || !data || data.length === 0) {
      console.log('[AVAILABILITY] Using fallback method');
      const { data: copies, error: copiesError } = await supabase
        .from('book_copies')
        .select('status')
        .eq('book_id', req.params.id);
      
      if (copiesError) {
        console.error('[AVAILABILITY] Fallback error:', copiesError);
        return res.status(500).json({ success: false, message: 'Server error', error: copiesError.message });
      }
      
      const totalCopies = copies?.length || 0;
      const availableCopies = copies?.filter(c => c.status === 'available').length || 0;
      const borrowedCopies = copies?.filter(c => c.status === 'borrowed').length || 0;
      
      return res.json({ 
        success: true, 
        data: {
          total_copies: totalCopies,
          available_copies: availableCopies,
          borrowed_copies: borrowedCopies,
          reserved_copies: 0,
          unavailable_copies: 0,
          availability_ratio: `${availableCopies}/${totalCopies}`,
          is_available: availableCopies > 0
        }
      });
    }
    
    const availability = data[0];
    const availabilityRatio = `${availability.available_copies}/${availability.total_copies}`;
    const isAvailable = availability.available_copies > 0;
    
    res.json({ 
      success: true, 
      data: {
        ...availability,
        availability_ratio: availabilityRatio,
        is_available: isAvailable
      }
    });
  } catch (error) {
    console.error('[AVAILABILITY] Error getting book availability:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/books/:id/borrowers
// @desc    Get active borrowers and requests for a specific book (publicly visible across consortium)
// @access  Public
router.get('/:id/borrowers', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    if (!bookId) {
      return res.status(400).json({ success: false, message: 'Invalid book ID' });
    }

    // 1. Fetch active items from borrow_request_items + borrow_requests + student info
    const { data: requestItems, error: reqErr } = await supabase
      .from('borrow_request_items')
      .select(`
        item_id,
        status,
        borrow_type,
        created_at,
        borrow_requests (
          request_id,
          student_id,
          status,
          created_at,
          borrow_date,
          due_date,
          student:student_id (
            user_id,
            username,
            firstname,
            lastname,
            school_id,
            schools:school_id (
              school_name,
              school_code
            )
          )
        )
      `)
      .eq('book_id', bookId)
      .in('status', ['pending', 'cancel_requested', 'approved', 'permission_ready', 'borrowed', 'active', 'picked_up'])
      .order('created_at', { ascending: false });

    if (reqErr) {
      console.error('[BOOK BORROWERS] Error fetching request items:', reqErr);
    }

    // 2. Fetch active transactions for direct loans
    const { data: transactions, error: transErr } = await supabase
      .from('borrow_transactions')
      .select(`
        borrow_id,
        status,
        borrow_date,
        due_date,
        book_copies!inner (book_id),
        student:student_id (
          user_id,
          username,
          firstname,
          lastname,
          school_id,
          schools:school_id (
            school_name,
            school_code
          )
        )
      `)
      .eq('book_copies.book_id', bookId)
      .eq('status', 'active')
      .order('borrow_date', { ascending: false });

    if (transErr) {
      console.error('[BOOK BORROWERS] Error fetching transactions:', transErr);
    }

    // Map and deduplicate by student/item
    const borrowerMap = new Map();

    // First process active transactions (definitely borrowed)
    (transactions || []).forEach(tx => {
      const student = tx.student;
      const studentId = student?.user_id || tx.student_id;
      const key = `user_${studentId}_borrowed`;
      const username = student?.username || (student?.firstname ? `${student.firstname} ${student.lastname || ''}`.trim() : 'Anonymous Student');
      
      borrowerMap.set(key, {
        id: `tx-${tx.borrow_id}`,
        user_id: studentId,
        username: username,
        full_name: student?.firstname ? `${student.firstname} ${student.lastname || ''}`.trim() : username,
        school_name: student?.schools?.school_name || 'Partner Library',
        school_code: student?.schools?.school_code || '',
        status: 'borrowed',
        status_label: 'Borrowed',
        date: tx.borrow_date,
        due_date: tx.due_date,
        type: 'transaction'
      });
    });

    // Process request items
    (requestItems || []).forEach(item => {
      const reqInfo = item.borrow_requests;
      const student = reqInfo?.student;
      const studentId = student?.user_id || reqInfo?.student_id;
      
      // Determine normalized status and label
      let normStatus = 'requested';
      let statusLabel = 'Requested';

      const rawStatus = (item.status || reqInfo?.status || '').toLowerCase();
      if (['borrowed', 'active', 'picked_up'].includes(rawStatus)) {
        normStatus = 'borrowed';
        statusLabel = 'Borrowed';
      } else if (['approved', 'permission_ready', 'ready_for_pickup'].includes(rawStatus)) {
        normStatus = 'waiting_pickup';
        statusLabel = 'Waiting for Pickup';
      } else {
        normStatus = 'requested';
        statusLabel = 'Requested';
      }

      // If student already has an active loan recorded, skip duplicate
      const alreadyBorrowed = Array.from(borrowerMap.values()).some(b => b.user_id === studentId && b.status === 'borrowed');
      if (alreadyBorrowed && normStatus === 'borrowed') {
        return;
      }

      const username = student?.username || (student?.firstname ? `${student.firstname} ${student.lastname || ''}`.trim() : 'Anonymous Student');

      borrowerMap.set(`req_${item.item_id}`, {
        id: `req-${item.item_id}`,
        request_id: reqInfo?.request_id,
        user_id: studentId,
        username: username,
        full_name: student?.firstname ? `${student.firstname} ${student.lastname || ''}`.trim() : username,
        school_name: student?.schools?.school_name || 'Partner Library',
        school_code: student?.schools?.school_code || '',
        status: normStatus,
        status_label: statusLabel,
        date: item.created_at || reqInfo?.created_at,
        borrow_type: item.borrow_type || 'HOME',
        type: 'request'
      });
    });

    const borrowers = Array.from(borrowerMap.values());

    return res.json({
      success: true,
      data: borrowers,
      total_active_borrowers: borrowers.length
    });
  } catch (error) {
    console.error('[BOOK BORROWERS] Error getting book borrowers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


// @route   POST /api/books/:id/authors
// @desc    Add author to book
// @access  Private (Librarian Admin, Librarian)
router.post('/:id/authors', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const { author_id } = req.body;
    if (!author_id) {
      return res.status(400).json({ success: false, message: 'Author ID is required' });
    }
    await Book.addAuthor(req.params.id, author_id);
    res.json({ success: true, message: 'Author added to book' });
  } catch (error) {
    console.error('Error adding author:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/books/:id/authors
// @desc    Get book authors
// @access  Private
router.get('/:id/authors', auth, async (req, res) => {
  try {
    const authors = await Book.getAuthors(req.params.id);
    res.json({ success: true, data: authors });
  } catch (error) {
    console.error('Error getting book authors:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/books/bulk-import
// @desc    Bulk import books with column mapping
// @access  Private (Librarian Admin, Librarian)
router.post('/bulk-import', auth, requireRole(['Librarian Admin', 'Librarian']), bulkImportBooks);

module.exports = router;
