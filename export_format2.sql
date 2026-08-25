-- ============================================
-- CSV FORMAT 2 EXPORT
-- Columns: Call Number, Author, Title, Edition, Location, Place of Publication, Publisher, Copyright Year, Physical Description Area, Series Title, General Note, ISBN, Acquisition Method, Price, Name of Dealer/Donor, Subject/Topical Terms, Added Personal Name, RFID TAG STATUS, ACCESSION NUMBER, COPIES, ENCODED BY, REMARKS
-- ============================================

SELECT 
  COALESCE(b.call_number, '') AS "Call Number",
  COALESCE(a.author_name, '') AS "Author",
  COALESCE(b.title, '') AS "Title, Edition",
  COALESCE(bc.shelf_location, '') AS "Location",
  COALESCE(p.place_of_publication, '') AS "Place of Publication",
  COALESCE(p.publisher_name, '') AS "Publisher",
  COALESCE(b.copyright_year::text, '') AS "Copyright Year",
  COALESCE(b.physical_description, '') AS "Physical Description Area",
  COALESCE(b.series_title, '') AS "Series Title",
  COALESCE(b.general_note, '') AS "General Note",
  COALESCE(b.isbn, '') AS "ISBN",
  COALESCE(b.acquisition_method, '') AS "Acquisition Method",
  COALESCE(b.purchase_price::text, '') AS "Price",
  COALESCE(b.supplier, '') AS "Name of Dealer/Donor",
  COALESCE(c.category_name, '') AS "Subject/Topical Terms",
  COALESCE(a.author_name, '') AS "Added Personal Name",
  COALESCE(bc.rfid_tag, '') AS "RFID TAG STATUS",
  COALESCE(bc.accession_number, '') AS "ACCESSION NUMBER",
  (SELECT COUNT(*) FROM book_copies WHERE book_id = b.book_id)::text AS "COPIES",
  COALESCE(u.firstname || ' ' || u.lastname, '') AS "ENCODED BY",
  COALESCE(b.remarks, '') AS "REMARKS"

FROM books b
LEFT JOIN book_copies bc ON b.book_id = bc.book_id
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN publishers p ON b.publisher_id = p.publisher_id
LEFT JOIN categories c ON b.category_id = c.category_id
LEFT JOIN users u ON b.encoded_by = u.user_id

ORDER BY b.book_id DESC;
