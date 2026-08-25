-- Check the complete structure of the books table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'books' 
ORDER BY ordinal_position;

-- Check if author column specifically exists and its properties
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'books' 
  AND column_name = 'author';

-- Check recent books to see if any have author data
SELECT book_id, title, author, created_at 
FROM books 
ORDER BY created_at DESC 
LIMIT 10;

-- Count books with and without author
SELECT 
    COUNT(*) as total_books,
    COUNT(author) as books_with_author,
    COUNT(*) - COUNT(author) as books_without_author
FROM books;
