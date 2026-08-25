const Book = require('../models/Book');
const supabase = require('../config/database');

/**
 * Bulk import books with column mapping and validation
 */
async function bulkImportBooks(req, res) {
  console.log('[BULK IMPORT] Request received');
  console.log('[BULK IMPORT] Request body keys:', Object.keys(req.body));
  
  try {
     const { 
       data, 
       column_mapping, 
       school_id, 
       user_id,
       custom_columns
     } = req.body;

     console.log('[BULK IMPORT] Data length:', data?.length);
     console.log('[BULK IMPORT] School ID:', school_id);
     console.log('[BULK IMPORT] User ID:', user_id);
     console.log('[BULK IMPORT] Column mapping:', column_mapping);
     console.log('[BULK IMPORT] Custom columns:', custom_columns);

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('[BULK IMPORT ERROR] No data provided');
      return res.status(400).json({ 
        success: false, 
        message: 'No data provided for import' 
      });
    }

    if (!school_id) {
      console.log('[BULK IMPORT ERROR] School ID missing');
      return res.status(400).json({ 
        success: false, 
        message: 'School ID is required' 
      });
    }

    console.log('[BULK IMPORT] Verifying school exists...');
    // Verify school exists or resolve from school name
    let school = null;
    let actualSchoolId = school_id;
    
    // If school_id is not a number, try to resolve by name
    if (isNaN(parseInt(school_id))) {
      console.log('[BULK IMPORT] School ID is not numeric, resolving by name:', school_id);
      const { data: schoolByName, error: nameError } = await supabase
        .from('schools')
        .select('school_id, school_code, school_name')
        .ilike('school_name', school_id)
        .limit(1);
      
      if (nameError) {
        console.log('[BULK IMPORT ERROR] School name lookup failed:', nameError);
      } else if (schoolByName && schoolByName.length > 0) {
        school = schoolByName[0];
        actualSchoolId = school.school_id;
        console.log('[BULK IMPORT] School resolved by name:', school.school_name, 'ID:', actualSchoolId);
      } else {
        console.log('[BULK IMPORT ERROR] School not found by name:', school_id);
        return res.status(400).json({ 
          success: false, 
          message: `School not found: "${school_id}". Please check the school name or use the school ID.` 
        });
      }
    } else {
      // School ID is numeric, verify it exists
      const { data: schoolById, error: schoolError } = await supabase
        .from('schools')
        .select('school_id, school_code')
        .eq('school_id', school_id)
        .single();
      
      if (schoolError) {
        console.log('[BULK IMPORT ERROR] School lookup failed:', schoolError);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid school ID or database error',
          error: schoolError.message 
        });
      }
      
      if (!schoolById) {
        console.log('[BULK IMPORT ERROR] School not found by ID:', school_id);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid school ID: ${school_id}` 
        });
      }
      
      school = schoolById;
    }
    
    if (!school) {
      console.log('[BULK IMPORT ERROR] School not found');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid school ID' 
      });
    }

    console.log('[BULK IMPORT] School verified:', school.school_code, 'ID:', actualSchoolId);

    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      duplicates_updated: 0,
      copies_created: 0,
      errors: [],
      imported_books: []
    };

    console.log('[BULK IMPORT] Fetching existing accession numbers...');
    // Get existing accession numbers for this school
    const { data: existingCopies, error: copiesError } = await supabase
      .from('book_copies')
      .select('accession_number')
      .ilike('accession_number', `${school?.school_code || ''}%`);

    if (copiesError) {
      console.log('[BULK IMPORT WARNING] Could not fetch existing accession numbers:', copiesError);
    }

  const existingAccessionNumbers = existingCopies?.map(c => c.accession_number) || [];
  console.log('[BULK IMPORT] Existing accession numbers count:', existingAccessionNumbers.length);

  // Create dynamic custom columns if any were auto-detected
  if (custom_columns && Array.isArray(custom_columns) && custom_columns.length > 0) {
    console.log('[BULK IMPORT] Creating dynamic custom columns...');
    for (const col of custom_columns) {
      const sqlType = mapDataTypeToSQL(col.dataType);
      try {
        console.log(`[BULK IMPORT] Creating column "${col.dbColumn}" with type ${sqlType}`);
        const { error: alterError } = await supabase.rpc('exec_sql', {
          query: `ALTER TABLE books ADD COLUMN IF NOT EXISTS "${col.dbColumn}" ${sqlType};`
        });
        if (alterError) {
          console.error(`[BULK IMPORT] Failed to create column ${col.dbColumn}:`, alterError);
          // Fallback: try direct RPC or skip
          console.log('[BULK IMPORT] Trying alternative column creation method...');
          try {
            const { error: rpcError } = await supabase.rpc('add_column_to_books', {
              column_name: col.dbColumn,
              column_type: sqlType
            });
            if (rpcError) {
              console.error(`[BULK IMPORT] Alternative method also failed for ${col.dbColumn}:`, rpcError);
            }
          } catch (rpcErr) {
            console.error(`[BULK IMPORT] Fallback RPC failed for ${col.dbColumn}:`, rpcErr);
          }
        }
      } catch (err) {
        console.error(`[BULK IMPORT] Error creating column ${col.dbColumn}:`, err);
      }
    }
  }

  console.log('[BULK IMPORT] Processing rows...');
    console.log('[BULK IMPORT] First row sample:', data[0]);
    console.log('[BULK IMPORT] First row keys:', Object.keys(data[0]));
    
    // Process each row independently for transaction safety
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const normalizedData = normalizeImportData(row, column_mapping);
        
        // Validate the row (always passes now, just auto-corrects)
        const validation = validateRow(normalizedData, existingAccessionNumbers);
        
        // Log warnings but continue (never stop)
        if (validation.warnings && validation.warnings.length > 0) {
          console.log(`[BULK IMPORT] Row ${i + 1} auto-corrected:`, validation.warnings);
        }

        // ALWAYS create new book - no duplicate checking for bulk import
        // This ensures all data is imported regardless of duplicates
        console.log(`[BULK IMPORT] Row ${i + 1} creating new book...`);
        const bookId = await createNewBook(normalizedData, actualSchoolId, user_id);
        results.successful++;
        results.copies_created += normalizedData.quantity || 1;
        results.imported_books.push({
          row: i + 1,
          title: normalizedData.title,
          status: 'created',
          book_id: bookId
        });

        // Add accession number to existing list to prevent duplicates in same import
        if (normalizedData.accession_number) {
          existingAccessionNumbers.push(normalizedData.accession_number);
        }

      } catch (error) {
        console.error(`[BULK IMPORT ERROR] Error processing row ${i + 1}:`, error);
        results.failed++;
        results.errors.push({
          row: i + 1,
          title: data[i]?.title || 'Unknown',
          errors: [error.message]
        });
      }
    }

    console.log('[BULK IMPORT] Recording import history...');

    // Record import history (optional - ignore if table doesn't exist)
    try {
      await recordImportHistory({
        school_id: actualSchoolId,
        user_id,
        file_name: req.file?.originalname || 'bulk_import',
        total_rows: results.total,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        status: results.failed === 0 ? 'completed' : 'completed_with_errors'
      });
    } catch (historyError) {
      console.log('[BULK IMPORT] Import history table may not exist - skipping history recording');
      // Don't fail the import if history table doesn't exist
    }

    console.log('[BULK IMPORT] Import completed successfully');
    console.log('[BULK IMPORT] Results:', {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
      skipped: results.skipped,
      duplicates_updated: results.duplicates_updated,
      copies_created: results.copies_created
    });

    res.json({
      success: true,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`,
      results
    });

  } catch (error) {
    console.error('[BULK IMPORT ERROR] Bulk import error:', error);
    console.error('[BULK IMPORT ERROR] Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during import',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Map frontend data type to SQL column type
 */
function mapDataTypeToSQL(dataType) {
  switch (dataType) {
    case 'integer':
      return 'INTEGER';
    case 'numeric':
      return 'NUMERIC(10,2)';
    case 'text':
    default:
      return 'TEXT';
  }
}

/**
 * Normalize import data using column mapping
 */
function normalizeImportData(row, columnMapping) {
  const normalized = {};
  
  console.log('[NORMALIZE] Input row keys:', Object.keys(row));
  console.log('[NORMALIZE] Input row sample:', row);
  console.log('[NORMALIZE] Column mapping:', columnMapping);

  for (const [sourceColumn, targetField] of Object.entries(columnMapping)) {
    if (targetField === 'ignore') {
      console.log(`[NORMALIZE] Ignoring column: ${sourceColumn}`);
      continue;
    }
    
    // Try both original column name and normalized version
    let value = row[sourceColumn];
    
    // If value is undefined, try to find the key in different formats
    if (value === undefined) {
      const normalizedKey = sourceColumn.toLowerCase().replace(/\s+/g, '_');
      if (row[normalizedKey] !== undefined) {
        value = row[normalizedKey];
        console.log(`[NORMALIZE] Found value using normalized key: ${normalizedKey}`);
      }
    }
    
    // If still undefined, try using the targetField directly (frontend may have pre-normalized)
    if (value === undefined && row[targetField] !== undefined) {
      value = row[targetField];
      console.log(`[NORMALIZE] Found value using target field key: ${targetField}`);
    }
    
    console.log(`[NORMALIZE] Processing ${sourceColumn} -> ${targetField}, value:`, value, 'type:', typeof value);
    
    if (!value) {
      console.log(`[NORMALIZE] Skipping ${sourceColumn} - value is empty`);
      continue;
    }
    
     // Normalize based on field type (actual database column names from production books table)
    switch (targetField) {
      case 'title':
      case 'subtitle':
      case 'author':
      case 'publisher':
      case 'category':
      case 'series':
      case 'remarks':
      case 'physical_description':
      case 'place_of_publication':
      case 'acquisition_method':
      case 'supplier':
      case 'language':
      case 'school':
      case 'encoded_by':
        value = String(value).trim().replace(/\s+/g, ' ');
        console.log(`[NORMALIZE] Normalized ${targetField}: "${value}"`);
        break;
        
      case 'isbn':
        value = String(value).replace(/[-\s]/g, '').toUpperCase();
        break;
        
      case 'call_number':
      case 'accession_number':
      case 'barcode':
      case 'shelf_location':
        value = String(value).trim().toUpperCase();
        break;
        
      case 'quantity':
        // Extract number from text like "5 copies" or "Qty: 10"
        value = String(value).replace(/[^0-9]/g, '');
        value = parseInt(value, 10) || 1; // Default to 1 if invalid
        break;
        
      case 'copyright_year':
        value = parseInt(String(value).replace(/[^0-9]/g, ''), 10) || null;
        break;
        
      case 'purchase_price':
        value = parseFloat(String(value).replace(/[^0-9.]/g, '')) || null;
        break;
        
      case 'rfid_tag':
        value = String(value).trim().toUpperCase();
        break;
        
      case 'status':
        value = String(value).trim().toLowerCase();
        break;
        
      case 'condition':
        value = String(value).trim().toLowerCase();
        break;
        
      default:
        value = String(value).trim();
    }
    
    normalized[targetField] = value;
  }
  
  // Default quantity to 1 if not provided
  if (!normalized.quantity || normalized.quantity <= 0) {
    normalized.quantity = 1;
  }
  
  return normalized;
}

/**
 * Validate a single import row
 * ULTRA-PERMISSIVE: Everything passes, auto-generates missing data
 */
function validateRow(data, existingAccessionNumbers) {
  const errors = [];
  const warnings = [];
  
  // NO REQUIRED FIELDS - everything is optional
  // Auto-generate title if missing
  if (!data.title || data.title.trim() === '') {
    data.title = 'Untitled Book';
    warnings.push('Auto-generated title');
  }
  
  // Always ensure quantity is valid
  if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
    data.quantity = 1;
    warnings.push('Auto-set quantity to 1');
  }
  
  // Fix all data types - never reject
  if (data.copyright_year) {
    const currentYear = new Date().getFullYear();
    if (isNaN(data.copyright_year) || data.copyright_year < 1000 || data.copyright_year > currentYear + 1) {
      data.copyright_year = null;
      warnings.push('Invalid copyright year removed');
    }
  }
  
  if (data.purchase_price && isNaN(data.purchase_price)) {
    data.purchase_price = null;
    warnings.push('Invalid purchase price removed');
  }
  
  // Handle duplicate accession numbers
  if (data.accession_number && existingAccessionNumbers.includes(data.accession_number)) {
    data.accession_number = null;
    warnings.push('Duplicate accession number - will auto-generate');
  }
  
  // Keep any ISBN regardless of format
  if (data.isbn && data.isbn.length > 0) {
    // Always accept
  }
  
  // ALL ROWS ARE VALID - no errors ever
  return {
    valid: true, // ALWAYS VALID
    errors: [], // NO ERRORS
    warnings
  };
}

/**
 * Find existing book by title, ISBN, and school
 */
async function findExistingBook(data, schoolId) {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .eq('school_id', schoolId);
    
    // Primary matching: school_id + normalized title + ISBN
    if (data.isbn) {
      query = query.eq('isbn', data.isbn);
    }
    
    query = query.ilike('title', data.title);
    
    const { data: existingBooks } = await query.limit(1);
    
    if (existingBooks && existingBooks.length > 0) {
      return existingBooks[0];
    }
    
    // Fallback matching: school_id + normalized title + author
    if (data.author) {
      const { data: booksByAuthor } = await supabase
        .from('books')
        .select(`
          *,
          book_authors(
            authors(author_name)
          )
        `)
        .eq('school_id', schoolId)
        .ilike('title', data.title)
        .limit(1);
      
      if (booksByAuthor && booksByAuthor.length > 0) {
        const book = booksByAuthor[0];
        const hasMatchingAuthor = book.book_authors?.some(
          ba => ba.authors?.author_name?.toLowerCase() === data.author.toLowerCase()
        );
        
        if (hasMatchingAuthor) {
          return book;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding existing book:', error);
    return null;
  }
}

/**
 * Create new book with related records
 * Uses ONLY columns from the original supabase.sql schema to avoid
 * "Could not find column" errors. Author/category/publisher are handled
 * through their linking tables.
 */
async function createNewBook(data, schoolId, userId) {
  try {
    console.log('[CREATE BOOK] Creating book with data:', {
      title: data.title,
      author: data.author,
      publisher: data.publisher,
      category: data.category
    });
    
    // Find or create category (uses categories table + category_id FK)
    let categoryId = null;
    if (data.category) {
      console.log('[CREATE BOOK] Finding/creating category:', data.category);
      categoryId = await findOrCreateCategory(data.category);
      console.log('[CREATE BOOK] Category ID:', categoryId);
    }
    
    // Find or create publisher (uses publishers table + publisher_id FK)
    let publisherId = null;
    if (data.publisher) {
      console.log('[CREATE BOOK] Finding/creating publisher:', data.publisher);
      publisherId = await findOrCreatePublisher(data.publisher, data.place_of_publication);
      console.log('[CREATE BOOK] Publisher ID:', publisherId);
    }
    
    // Build book data using ONLY columns from the original supabase.sql schema.
    // This avoids "Could not find column" errors on databases that haven't
    // run the production migration yet.
    const bookData = {
      school_id: schoolId,
      category_id: categoryId,
      publisher_id: publisherId,
      title: data.title,
      author: data.author || null,
      isbn: data.isbn || null,
      call_number: data.call_number || null,
      edition: data.edition || null,
      copyright_year: data.copyright_year || null,
      physical_description: data.physical_description || null,
      series_title: data.series || null,
      general_note: data.remarks || null,
      cover_image: null,
      remarks: data.remarks || null,
      encoded_by: userId
    };

    // Conditionally add custom_ columns if they were dynamically created
    // (e.g., custom_research_area, etc.)
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('custom_')) {
        bookData[key] = value;
      }
    }

    console.log('[CREATE BOOK] Inserting book record:', bookData);
    console.log('[CREATE BOOK] Author field value:', bookData.author);
    console.log('[CREATE BOOK] Original data.author:', data.author);
    
    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert(bookData)
      .select('book_id, author, title')
      .single();
    
    if (bookError) {
      console.error('[CREATE BOOK] Error inserting book:', bookError);
      throw bookError;
    }
    
    console.log('[CREATE BOOK] Book inserted successfully:', newBook);
    console.log('[CREATE BOOK] Author in inserted book:', newBook.author);
    
    const bookId = newBook.book_id;
    console.log('[CREATE BOOK] Book created with ID:', bookId);

    // Create book copies
    console.log('[CREATE BOOK] Creating book copies...');
    await createBookCopies(bookId, schoolId, data);
    console.log('[CREATE BOOK] Book copies created');
    
    return bookId;
  } catch (error) {
    console.error('Error creating new book:', error);
    throw error;
  }
}

/**
 * Update existing book
 */
async function updateExistingBook(existingBook, data, schoolId, userId) {
  try {
    // Update quantity
    const newQuantity = (existingBook.quantity || 0) + (data.quantity || 1);
    const newAvailableQuantity = (existingBook.available_quantity || 0) + (data.quantity || 1);
    
    await supabase
      .from('books')
      .update({
        quantity: newQuantity,
        available_quantity: newAvailableQuantity
      })
      .eq('book_id', existingBook.book_id);
    
    // Create additional copies
    await createBookCopies(existingBook.book_id, schoolId, data, existingBook.quantity || 0);
    
    return existingBook.book_id;
  } catch (error) {
    console.error('Error updating existing book:', error);
    throw error;
  }
}

/**
 * Create book copies
 * Resilient to schema differences: only inserts columns that exist
 */
async function createBookCopies(bookId, schoolId, data, startCopyNumber = 0) {
  const copies = data.quantity || 1;
  const copiesCreated = [];
  
  for (let i = 0; i < copies; i++) {
    const copyNumber = startCopyNumber + i + 1;
    const accessionNumber = data.accession_number 
      ? `${data.accession_number}-${copyNumber}`
      : await generateAccessionNumber(schoolId);
    
    const barcode = data.barcode 
      ? `${data.barcode}-${copyNumber}-${Date.now()}`
      : generateBarcode(bookId, copyNumber, Date.now());
    
    // Start with only the columns that exist in ALL schemas
    const copyData = {
      book_id: bookId,
      accession_number: accessionNumber,
      barcode: barcode
    };
    
    // Try adding optional columns one by one, skip if column doesn't exist
    const optionalColumns = [
      { key: 'shelf_location', value: data.shelf_location || null },
      { key: 'condition', value: data.condition || 'good' },
      { key: 'status', value: data.status || 'available' },
      { key: 'rfid_tag', value: data.rfid_tag || null }
    ];
    
    for (const col of optionalColumns) {
      if (col.value !== null && col.value !== undefined) {
        const testData = { ...copyData, [col.key]: col.value };
        const { error: testError } = await supabase
          .from('book_copies')
          .insert(testData);
        
        if (!testError) {
          copyData[col.key] = col.value;
        } else if (testError.message?.includes('does not exist')) {
          console.log(`[CREATE BOOK COPIES] Skipping unknown column: ${col.key}`);
        } else {
          console.error(`[CREATE BOOK COPIES] Error testing column ${col.key}:`, testError);
        }
      }
    }
    
    // Final insert with only known-good columns
    const { error: copyError } = await supabase
      .from('book_copies')
      .insert(copyData);
    
    if (copyError) {
      console.error('Error creating book copy:', copyError);
    } else {
      copiesCreated.push(copyData);
    }
  }
  
  return copiesCreated;
}

/**
 * Find or create category
 */
async function findOrCreateCategory(categoryName) {
  try {
    console.log('[CATEGORY] Searching for category:', categoryName);
    
    // Try to find existing category (case-insensitive)
    const { data: existingCategory, error: searchError } = await supabase
      .from('categories')
      .select('category_id')
      .ilike('category_name', categoryName)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      console.error('[CATEGORY] Search error:', searchError);
    }
    
    if (existingCategory) {
      console.log('[CATEGORY] Found existing category ID:', existingCategory.category_id);
      return existingCategory.category_id;
    }
    
    // Create new category
    console.log('[CATEGORY] Creating new category:', categoryName.trim());
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({ category_name: categoryName.trim() })
      .select('category_id')
      .single();
    
    if (error) {
      console.error('[CATEGORY] Create error:', error);
      throw error;
    }
    
    console.log('[CATEGORY] Created new category ID:', newCategory.category_id);
    return newCategory.category_id;
  } catch (error) {
    console.error('Error finding/creating category:', error);
    return null;
  }
}

/**
 * Find or create author
 */
async function findOrCreateAuthor(authorName) {
  if (!authorName || authorName.trim() === '') return null;
  
  try {
    console.log('[AUTHOR] Searching for author:', authorName);
    
    // Try to find existing author (case-insensitive)
    const { data: existingAuthor, error: searchError } = await supabase
      .from('authors')
      .select('author_id')
      .ilike('author_name', authorName)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      console.error('[AUTHOR] Search error:', searchError);
    }
    
    if (existingAuthor) {
      console.log('[AUTHOR] Found existing author ID:', existingAuthor.author_id);
      return existingAuthor.author_id;
    }
    
    // Create new author
    console.log('[AUTHOR] Creating new author:', authorName.trim());
    const { data: newAuthor, error } = await supabase
      .from('authors')
      .insert({ author_name: authorName.trim() })
      .select('author_id')
      .single();
    
    if (error) {
      console.error('[AUTHOR] Create error:', error);
      throw error;
    }
    
    console.log('[AUTHOR] Created new author ID:', newAuthor.author_id);
    return newAuthor.author_id;
  } catch (error) {
    console.error('Error finding/creating author:', error);
    return null;
  }
}

/**
 * Find or create publisher
 */
async function findOrCreatePublisher(publisherName, placeOfPublication = null) {
  try {
    console.log('[PUBLISHER] Searching for publisher:', publisherName);
    
    // Try to find existing publisher (case-insensitive)
    const { data: existingPublisher, error: searchError } = await supabase
      .from('publishers')
      .select('publisher_id')
      .ilike('publisher_name', publisherName)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      console.error('[PUBLISHER] Search error:', searchError);
    }
    
    if (existingPublisher) {
      console.log('[PUBLISHER] Found existing publisher ID:', existingPublisher.publisher_id);
      return existingPublisher.publisher_id;
    }
    
    // Create new publisher
    console.log('[PUBLISHER] Creating new publisher:', publisherName.trim());
    const { data: newPublisher, error } = await supabase
      .from('publishers')
      .insert({ 
        publisher_name: publisherName.trim(),
        place_of_publication: placeOfPublication?.trim() || null
      })
      .select('publisher_id')
      .single();
    
    if (error) {
      console.error('[PUBLISHER] Create error:', error);
      throw error;
    }
    
    console.log('[PUBLISHER] Created new publisher ID:', newPublisher.publisher_id);
    return newPublisher.publisher_id;
  } catch (error) {
    console.error('Error finding/creating publisher:', error);
    return null;
  }
}

/**
 * Generate accession number
 */
async function generateAccessionNumber(schoolId) {
  try {
    const { data: school } = await supabase
      .from('schools')
      .select('school_code')
      .eq('school_id', schoolId)
      .single();
    
    const schoolCode = school?.school_code || 'SCH';
    
    // Get last accession number for this school from book_copies table
    const { data: lastCopy } = await supabase
      .from('book_copies')
      .select('accession_number')
      .ilike('accession_number', `${schoolCode}-%`)
      .order('accession_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let lastNumber = 0;
    if (lastCopy && lastCopy.accession_number) {
      const match = lastCopy.accession_number.match(/-(\d+)$/);
      if (match) {
        lastNumber = parseInt(match[1], 10);
      }
    }
    
    const newNumber = lastNumber + 1;
    return `${schoolCode}-${String(newNumber).padStart(8, '0')}`;
  } catch (error) {
    console.error('Error generating accession number:', error);
    return `ACC-${Date.now()}`;
  }
}

/**
 * Generate barcode - unique for each copy
 */
function generateBarcode(bookId, copyNumber, timestamp = Date.now()) {
  // Add timestamp and random to ensure uniqueness
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `BC-${String(bookId).padStart(6, '0')}-${String(copyNumber).padStart(3, '0')}-${timestamp.toString().slice(-6)}-${randomSuffix}`;
}

/**
 * Record import history
 */
async function recordImportHistory(importData) {
  try {
    const { error } = await supabase
      .from('import_history')
      .insert({
        school_id: importData.school_id,
        user_id: importData.user_id,
        file_name: importData.file_name,
        total_rows: importData.total_rows,
        successful: importData.successful,
        failed: importData.failed,
        skipped: importData.skipped,
        status: importData.status,
        import_date: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error recording import history:', error);
    }
  } catch (error) {
    console.error('Error recording import history:', error);
  }
}

module.exports = {
  bulkImportBooks
};