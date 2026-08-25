-- ============================================
-- ADD MISSING COLUMNS TO BOOKS TABLE
-- Run these ALTER TABLE statements to add the columns
-- ============================================

-- Add place_of_publication to books table (optional, since it's already in publishers)
ALTER TABLE books ADD COLUMN IF NOT EXISTS place_of_publication VARCHAR(255);

-- Add acquisition_method to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS acquisition_method VARCHAR(100);

-- Add purchase_price to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);

-- Add supplier to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);

-- Add subtitle to books table (for "Title, Edition" separation)
ALTER TABLE books ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255);

-- Note: The following columns are already in related tables:
-- - accession_number, barcode, rfid_tag, status, shelf_location → book_copies table
-- - category_name → categories table (via category_id)
-- - author_name → authors table (via book_authors)
-- - place_of_publication → publishers table (via publisher_id)
-- - encoded_by → users table (via user_id)

-- ============================================
-- VERIFY COLUMNS WERE ADDED
-- ============================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'books'
ORDER BY ordinal_position;
