-- ============================================
-- CHECK IMPORTED BOOKS DATA
-- Comprehensive query to verify imported books
-- ============================================

-- ============================================
-- QUERY 1: ALL BOOKS WITH COMPLETE DETAILS
-- Shows all books with related data (names instead of IDs)
-- ============================================

SELECT 
  b.book_id,
  b.school_id,
  s.school_name,
  s.school_code,
  b.title,
  b.isbn,
  b.call_number,
  b.edition,
  b.copyright_year,
  b.physical_description, 
  b.series_title,
  b.general_note,
  b.remarks,
  b.encoded_by,
  b.created_at,
  -- Related data
  c.category_name,
  p.publisher_name,
  p.place_of_publication,
  a.author_name,
  -- Book copies
  bc.copy_id,
  bc.accession_number,
  bc.barcode,
  bc.rfid_tag,
  bc.shelf_location,
  bc.condition AS copy_condition,
  bc.status AS copy_status

FROM books b
LEFT JOIN schools s ON b.school_id = s.school_id
LEFT JOIN categories c ON b.category_id = c.category_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

ORDER BY b.book_id DESC;

-- ============================================
-- QUERY 2: CHECK NULL VALUES IN BOOKS
-- Shows which columns have missing data
-- ============================================

SELECT 
  b.book_id,
  b.title,
  CASE WHEN b.isbn IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS isbn_status,
  CASE WHEN b.call_number IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS call_number_status,
  CASE WHEN b.edition IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS edition_status,
  CASE WHEN b.copyright_year IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS copyright_year_status,
  CASE WHEN b.category_id IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS category_status,
  CASE WHEN b.publisher_id IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS publisher_status,
  CASE WHEN a.author_id IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS author_status,
  CASE WHEN bc.copy_id IS NULL THEN 'NULL' ELSE 'HAS VALUE' END AS copies_status,
  b.created_at

FROM books b
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

ORDER BY b.book_id DESC;

-- ============================================
-- QUERY 3: BOOKS COUNT BY SCHOOL
-- Shows how many books per school
-- ============================================

SELECT 
  s.school_id,
  s.school_name,
  s.school_code,
  COUNT(DISTINCT b.book_id) AS total_books,
  COUNT(DISTINCT bc.copy_id) AS total_copies,
  COUNT(DISTINCT bc.copy_id) FILTER (WHERE bc.status = 'available') AS available_copies,
  COUNT(DISTINCT bc.copy_id) FILTER (WHERE bc.status = 'borrowed') AS borrowed_copies

FROM schools s
LEFT JOIN books b ON s.school_id = b.school_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

GROUP BY s.school_id, s.school_name, s.school_code
ORDER BY total_books DESC;

-- ============================================
-- QUERY 4: RECENTLY IMPORTED BOOKS (Last 50)
-- Shows most recently added books
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.isbn,
  b.call_number,
  b.author,
  s.school_name,
  c.category_name,
  p.publisher_name,
  COUNT(bc.copy_id) AS total_copies,
  b.created_at

FROM books b
LEFT JOIN schools s ON b.school_id = s.school_id
LEFT JOIN categories c ON b.category_id = c.category_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

WHERE b.created_at >= NOW() - INTERVAL '7 days'
GROUP BY b.book_id, b.title, b.isbn, b.call_number, b.author, s.school_name, c.category_name, p.publisher_name, b.created_at
ORDER BY b.created_at DESC
LIMIT 50;

-- ============================================
-- QUERY 5: BOOKS WITHOUT AUTHORS
-- Check if authors are being linked correctly
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.isbn,
  b.created_at

FROM books b
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
WHERE ba.author_id IS NULL
ORDER BY b.created_at DESC;

-- ============================================
-- QUERY 6: BOOKS WITHOUT PUBLISHERS
-- Check if publishers are being linked correctly
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.isbn,
  b.created_at

FROM books b
WHERE b.publisher_id IS NULL
ORDER BY b.created_at DESC;

-- ============================================
-- QUERY 7: BOOKS WITHOUT CATEGORIES
-- Check if categories are being linked correctly
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.isbn,
  b.created_at

FROM books b
WHERE b.category_id IS NULL
ORDER BY b.created_at DESC;

-- ============================================
-- QUERY 8: BOOKS WITHOUT COPIES
-- Check if book copies are being created
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.isbn,
  b.created_at

FROM books b
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
WHERE bc.copy_id IS NULL
ORDER BY b.created_at DESC;

-- ============================================
-- QUERY 9: ALL AUTHORS IN DATABASE
-- Check if authors are being created
-- ============================================

SELECT 
  author_id,
  author_name,
  (SELECT COUNT(*) FROM book_authors WHERE author_id = a.author_id) AS books_count

FROM authors a
ORDER BY author_name;

-- ============================================
-- QUERY 10: ALL PUBLISHERS IN DATABASE
-- Check if publishers are being created
-- ============================================

SELECT 
  publisher_id,
  publisher_name,
  place_of_publication,
  (SELECT COUNT(*) FROM books WHERE publisher_id = p.publisher_id) AS books_count

FROM publishers p
ORDER BY publisher_name;

-- ============================================
-- QUERY 11: ALL CATEGORIES IN DATABASE
-- Check if categories are being created
-- ============================================

SELECT 
  category_id,
  category_name,
  (SELECT COUNT(*) FROM books WHERE category_id = c.category_id) AS books_count

FROM categories c
ORDER BY category_name;

-- ============================================
-- QUERY 12: SIMPLE BOOK LIST (Most Important Fields)
-- Quick view of all books
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.author,
  b.isbn,
  b.call_number,
  s.school_name,
  COUNT(bc.copy_id) AS copies,
  b.created_at

FROM books b
LEFT JOIN schools s ON b.school_id = s.school_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

GROUP BY b.book_id, b.title, b.author, b.isbn, b.call_number, s.school_name, b.created_at
ORDER BY b.book_id DESC;

-- ============================================
-- QUERY 13: BOOKS WITH NULL TITLES (Auto-generated)
-- Check if titles are being imported correctly
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.created_at

FROM books b
WHERE b.title LIKE 'Untitled%' OR b.title LIKE 'Auto-generated%'
ORDER BY b.created_at DESC;

-- ============================================
-- QUERY 14: TOTAL COUNTS SUMMARY
-- Quick overview of database
-- ============================================

SELECT 
  'Total Books' AS metric,
  COUNT(*) AS count
FROM books
UNION ALL
SELECT 
  'Total Book Copies' AS metric,
  COUNT(*) AS count
FROM book_copies
UNION ALL
SELECT 
  'Total Authors' AS metric,
  COUNT(*) AS count
FROM authors
UNION ALL
SELECT 
  'Total Publishers' AS metric,
  COUNT(*) AS count
FROM publishers
UNION ALL
SELECT 
  'Total Categories' AS metric,
  COUNT(*) AS count
FROM categories
UNION ALL
SELECT 
  'Total Schools' AS metric,
  COUNT(*) AS count
FROM schools;
