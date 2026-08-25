const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { auth, requireRole } = require('../middleware/auth');
const { bulkImportBooks } = require('../controllers/bookImportController');
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
// @desc    Get all books (limited for public access)
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('[PUBLIC BOOKS] Route hit');
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    console.log('[PUBLIC BOOKS] Fetching with limit:', limit, 'offset:', offset);
    
    const { data, error } = await supabase
      .from('books')
      .select(`
        book_id,
        title,
        author,
        isbn,
        shelf_location,
        school_id,
        genre,
        schools(school_name, school_code),
        categories(category_name)
      `)
      .order('title')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[PUBLIC BOOKS] Supabase error:', error);
      throw error;
    }
    
    console.log('[PUBLIC BOOKS] Books fetched:', data?.length || 0);
    res.json({ success: true, data: data || [] });
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
// @desc    Get books by school via query string with real-time status
// @access  Private
router.get('/school', auth, async (req, res) => {
  const schoolId = req.query.school_id || req.query.schoolId || req.query.school;
  const currentStudentId = req.user?.student_id; // Get current logged-in student ID
  
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'school_id query parameter is required' });
  }

  try {
    // Get books with their copies
    const { data: books, error } = await supabase
      .from('books')
      .select(`
        book_id,
        title,
        author,
        isbn,
        shelf_location,
        call_number,
        school_id,
        schools(school_id, school_name),
        book_copies(copy_id, status)
      `)
      .eq('school_id', schoolId);

    if (error) throw error;

    // Get active borrow requests for these books to determine real-time status
    const bookIds = books.map(b => b.book_id);
    const { data: borrowItems, error: borrowError } = await supabase
      .from('borrow_request_items')
      .select(`
        book_id,
        status,
        released_at,
        borrow_requests(request_id, student_id, status, due_date)
      `)
      .in('book_id', bookIds)
      .in('status', ['pending', 'approved', 'released']);

    if (borrowError) throw borrowError;

    // Map borrow items by book_id
    const borrowStatusMap = {};
    borrowItems.forEach(item => {
      if (!borrowStatusMap[item.book_id]) {
        borrowStatusMap[item.book_id] = [];
      }
      borrowStatusMap[item.book_id].push(item);
    });

    // Add real-time status to each book
    const booksWithStatus = books.map(book => {
      const borrowItems = borrowStatusMap[book.book_id] || [];
      const availableCopies = book.book_copies?.filter(c => c.status === 'available')?.length || 0;
      const totalCopies = book.book_copies?.length || 0;
      const borrowedCopies = book.book_copies?.filter(c => c.status === 'borrowed')?.length || 0;
      
      // Determine overall status
      let status = 'available';
      let statusDetails = null;
      let dueDate = null;

      // First check if any copies are actually borrowed in book_copies table
      if (borrowedCopies > 0) {
        status = 'borrowed';
        // Only show due date if this is the current user's request
        const borrowedItems = borrowItems.filter(i => i.status === 'released' && i.borrow_requests?.student_id === currentStudentId);
        if (borrowedItems.length > 0 && borrowedItems[0].borrow_requests?.due_date) {
          dueDate = borrowedItems[0].borrow_requests.due_date;
          const dueDateObj = new Date(dueDate);
          const formattedDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          statusDetails = `Due: ${formattedDate}`;
        } else {
          statusDetails = `${borrowedCopies} copy/copies currently borrowed`;
        }
      } else if (availableCopies === 0 && totalCopies > 0) {
        status = 'borrowed';
        statusDetails = 'All copies borrowed';
      } else if (borrowItems.length > 0) {
        // Check borrow request status as secondary indicator
        const hasPending = borrowItems.some(i => i.status === 'pending');
        const hasApproved = borrowItems.some(i => i.status === 'approved');
        const hasReleased = borrowItems.some(i => i.status === 'released');

        // Only show detailed status if it's the current user's request
        const myPending = borrowItems.some(i => i.status === 'pending' && i.borrow_requests?.student_id === currentStudentId);
        const myApproved = borrowItems.some(i => i.status === 'approved' && i.borrow_requests?.student_id === currentStudentId);
        const myReleased = borrowItems.some(i => i.status === 'released' && i.borrow_requests?.student_id === currentStudentId);

        if (myReleased) {
          status = 'borrowed';
          if (borrowItems[0].borrow_requests?.due_date) {
            dueDate = borrowItems[0].borrow_requests.due_date;
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
        total_copies: totalCopies
      };
    });

    res.json({ success: true, data: booksWithStatus });
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
      .select('book_id, title, author, isbn, school_id')
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
    
    console.log('[INTER-SCHOOL SEARCH] Querying schools...');
    const { data: schools } = await supabase
      .from('schools')
      .select('school_id, school_name, address, school_code')
      .in('school_id', schoolIds);

    console.log('[INTER-SCHOOL SEARCH] Schools found:', schools?.length || 0);

    const schoolMap = new Map();
    if (schools) {
      schools.forEach(school => schoolMap.set(school.school_id, school));
    }

    const result = filtered.map(book => {
      const school = schoolMap.get(book.school_id);
      return {
        school_id: book.school_id,
        school_name: school?.school_name || 'Unknown School',
        address: school?.address || 'Unknown Address',
        school_code: school?.school_code,
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        available_copies: 1,
        total_copies: 1,
        real_time_status: 'available'
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
router.post('/', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    const { title, school_id } = req.body;
    if (!title || !school_id) {
      return res.status(400).json({ success: false, message: 'Title and school_id are required' });
    }
    const book_id = await Book.create(req.body);
    res.status(201).json({ success: true, message: 'Book created successfully', book_id });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/books/:id
// @desc    Update book
// @access  Private (Librarian Admin, Librarian)
router.put('/:id', auth, requireRole(['Librarian Admin', 'Librarian']), async (req, res) => {
  try {
    console.log('[UPDATE] User:', req.user);
    console.log('[UPDATE] Book ID:', req.params.id);
    console.log('[UPDATE] Update data:', req.body);
    const result = await Book.update(req.params.id, req.body);
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
