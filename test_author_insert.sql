-- Test direct insert of author field to books table
-- This will help determine if the column can accept data

-- First, check if there are any constraints on the author column
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'books' 
  AND column_name = 'author';

-- Check for any constraints on the books table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'books'::regclass;

-- Try a direct insert test (this will fail if there's an issue with the column)
-- Note: This is just a test - you can rollback if needed
BEGIN;

-- Try to insert a test book with author
-- First, get a valid school_id
SELECT school_id FROM schools LIMIT 1;

-- Insert test book with author
INSERT INTO books (
    school_id, 
    title, 
    author, 
    quantity, 
    created_at
) 
SELECT 
    school_id, 
    'Test Book for Author Field', 
    'Test Author Name', 
    1, 
    NOW()
FROM schools 
LIMIT 1;

-- Check if the insert worked
SELECT book_id, title, author FROM books WHERE title = 'Test Book for Author Field';

ROLLBACK; -- Rollback the test insert
