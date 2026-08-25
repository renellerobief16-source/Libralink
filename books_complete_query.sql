-- ============================================
-- COMPREHENSIVE BOOK DATA QUERY (FIXED)
-- Joins all book-related tables for complete data
-- ============================================

SELECT 
  -- BOOKS TABLE (Main Book Information)
  b.book_id,
  b.school_id,
  b.category_id,
  b.publisher_id,
  b.title,
  b.isbn,
  b.call_number,
  b.edition,
  b.copyright_year,
  b.physical_description,
  b.series_title,
  b.general_note,
  b.cover_image,
  b.remarks,
  b.encoded_by,
  b.created_at,
  
  -- SCHOOL INFORMATION
  s.school_name,
  s.school_code,
  s.address AS school_address,
  s.contact_number AS school_contact,
  s.email AS school_email,
  s.status AS school_status,
  
  -- CATEGORY INFORMATION
  c.category_name,
  
  -- PUBLISHER INFORMATION
  p.publisher_name,
  p.place_of_publication,
  
  -- AUTHOR INFORMATION (Multiple authors can be associated)
  a.author_id,
  a.author_name,
  
  -- BOOK COPIES INFORMATION (Physical copies)
  bc.copy_id,
  bc.accession_number,
  bc.barcode,
  bc.rfid_tag,
  bc.shelf_location,
  bc.condition AS copy_condition,
  bc.status AS copy_status,
  
  -- AGGREGATE DATA (Copies count per book)
  COALESCE(total_copies.total_copies, 0) AS total_copies,
  COALESCE(available_copies.available_copies, 0) AS available_copies,
  COALESCE(borrowed_copies.borrowed_copies, 0) AS borrowed_copies

FROM books b

-- JOIN WITH SCHOOL
LEFT JOIN schools s ON b.school_id = s.school_id

-- JOIN WITH CATEGORY
LEFT JOIN categories c ON b.category_id = c.category_id

-- JOIN WITH PUBLISHER
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id

-- JOIN WITH AUTHORS (Many-to-Many)
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id

-- JOIN WITH BOOK COPIES
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

-- SUBQUERY: TOTAL COPIES PER BOOK
LEFT JOIN (
  SELECT book_id, COUNT(*) AS total_copies
  FROM book_copies
  GROUP BY book_id
) total_copies ON b.book_id = total_copies.book_id

-- SUBQUERY: AVAILABLE COPIES PER BOOK
LEFT JOIN (
  SELECT book_id, COUNT(*) AS available_copies
  FROM book_copies
  WHERE status = 'available'
  GROUP BY book_id
) available_copies ON b.book_id = available_copies.book_id

-- SUBQUERY: BORROWED COPIES PER BOOK
LEFT JOIN (
  SELECT book_id, COUNT(*) AS borrowed_copies
  FROM book_copies
  WHERE status = 'borrowed'
  GROUP BY book_id
) borrowed_copies ON b.book_id = borrowed_copies.book_id

-- ORDER BY
ORDER BY b.book_id, bc.copy_id;

-- ============================================
-- SIMPLIFIED QUERY FOR IMPORT/PREVIEW (FIXED)
-- Just the essential columns for encoding
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
  c.category_name,
  p.publisher_name,
  p.place_of_publication,
  a.author_name,
  bc.accession_number,
  bc.barcode,
  bc.rfid_tag,
  bc.shelf_location,
  bc.condition AS copy_condition,
  bc.status AS copy_status,
  b.encoded_by,
  b.created_at

FROM books b
LEFT JOIN schools s ON b.school_id = s.school_id
LEFT JOIN categories c ON b.category_id = c.category_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

ORDER BY b.book_id DESC;

-- ============================================
-- QUERY TO CHECK NULL VALUES IN BOOKS TABLE (FIXED)
-- Helps identify which columns have missing data
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
  b.created_at

FROM books b
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
ORDER BY b.book_id DESC;

-- ============================================
-- QUERY TO GET BOOKS WITH ALL AVAILABLE COLUMNS (FIXED)
-- For export or complete data view
-- ============================================

SELECT 
  b.*,
  s.school_name,
  s.school_code,
  c.category_name,
  p.publisher_name,
  p.place_of_publication,
  a.author_name,
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
-- SIMPLE QUERY - JUST BOOKS TABLE WITH RELATED NAMES
-- No aggregation, just raw data
-- ============================================

SELECT 
  b.book_id,
  b.school_id,
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
  -- Related data (foreign keys resolved to names)
  s.school_name,
  s.school_code,
  c.category_name,
  p.publisher_name,
  p.place_of_publication,
  -- Author (first one if multiple)
  (SELECT a.author_name 
   FROM book_authors ba2 
   JOIN authors a ON ba2.author_id = a.author_id 
   WHERE ba2.book_id = b.book_id 
   LIMIT 1) AS author_name,
  -- Count of copies
  (SELECT COUNT(*) FROM book_copies bc2 WHERE bc2.book_id = b.book_id) AS total_copies,
  -- Count of available copies
  (SELECT COUNT(*) FROM book_copies bc3 WHERE bc3.book_id = b.book_id AND bc3.status = 'available') AS available_copies

FROM books b
LEFT JOIN schools s ON b.school_id = s.school_id
LEFT JOIN categories c ON b.category_id = c.category_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id

ORDER BY b.book_id DESC;
