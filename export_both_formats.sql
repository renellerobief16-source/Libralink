-- ============================================
-- SINGLE QUERY - EXPORT BOTH CSV FORMATS
-- Run this entire query to get all data
-- ============================================

-- FORMAT 1: Accession, Title, Author, Publisher, Call_Number, ISBN, Ye_ar, Status, Location, Coun_ter, AccID, ID
SELECT 
  'FORMAT_1' AS export_format,
  bc.accession_number AS "Accession",
  b.title AS "Title",
  COALESCE(a.author_name, '') AS "Author",
  COALESCE(p.publisher_name, '') AS "Publisher",
  COALESCE(b.call_number, '') AS "Call_Number",
  COALESCE(b.isbn, '') AS "ISBN",
  COALESCE(b.copyright_year::text, '') AS "Ye_ar",
  bc.status AS "Status",
  COALESCE(bc.shelf_location, '') AS "Location",
  (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id) AS "Coun_ter",
  bc.accession_number AS "AccID",
  b.book_id::text AS "ID"

FROM books b
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id

UNION ALL

-- FORMAT 2: Call Number, Author, Title, Edition, Location, Place of Publication, Publisher, Copyright Year, Physical Description Area, Series Title, General Note, ISBN, Acquisition Method, Price, Name of Dealer/Donor, Subject/Topical Terms, Added Personal Name, RFID TAG STATUS, ACCESSION NUMBER, COPIES, ENCODED BY, REMARKS
SELECT 
  'FORMAT_2' AS export_format,
  COALESCE(b.call_number, '') AS "Accession",
  COALESCE(b.title, '') AS "Title",
  COALESCE(a.author_name, '') AS "Author",
  COALESCE(p.publisher_name, '') AS "Publisher",
  COALESCE(b.call_number, '') AS "Call_Number",
  COALESCE(b.isbn, '') AS "ISBN",
  COALESCE(b.copyright_year::text, '') AS "Ye_ar",
  bc.status AS "Status",
  COALESCE(bc.shelf_location, '') AS "Location",
  (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id) AS "Coun_ter",
  bc.accession_number AS "AccID",
  b.book_id::text AS "ID"

FROM books b
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id

ORDER BY export_format, "ID" DESC;
