-- Fix missing updated_at column in books table
-- This script adds the updated_at column if it doesn't exist

-- Add updated_at column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add comment to the column
COMMENT ON COLUMN books.updated_at IS 'Timestamp for when the record was last updated';

-- Update existing records to have a timestamp
UPDATE books 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS books_updated_at_trigger ON books;

-- Create trigger to automatically update updated_at
CREATE TRIGGER books_updated_at_trigger
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_books_updated_at();

-- Verify the column exists
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'books' 
  AND column_name = 'updated_at';
