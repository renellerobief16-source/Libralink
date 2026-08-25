-- ============================================
-- SIMPLE TEST QUERY - Run this first
-- ============================================

SELECT 
  b.book_id,
  b.title,
  b.isbn,
  b.call_number,
  s.school_name,
  a.author_name,
  p.publisher_name,
  bc.accession_number,
  bc.barcode

FROM books b
LEFT JOIN schools s ON b.school_id = s.school_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN book_copies bc ON b.book_id = bc.book_id

ORDER BY b.book_id DESC
LIMIT 10;
