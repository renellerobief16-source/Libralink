-- Add author column to books table
-- This migration adds a direct author column to store author name as text
-- instead of using the separate authors and book_authors tables

-- Add author column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS author TEXT;

-- Add comment to the column
COMMENT ON COLUMN books.author IS 'Author name stored directly as text (simplified approach)';

-- Update existing records by copying author names from book_authors if exists
-- This is a one-time migration to populate the author column
UPDATE books 
SET author = (
  SELECT STRING_AGG(a.author_name, ', ')
  FROM book_authors ba
  JOIN authors a ON ba.author_id = a.author_id
  WHERE ba.book_id = books.book_id
)
WHERE author IS NULL OR author = '';

-- Create index on author for faster searches
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'books' 
  AND column_name = 'author';
