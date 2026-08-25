-- Check if author column exists in books table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'books' 
  AND column_name = 'author';

-- Check sample books to see if author column has data
SELECT book_id, title, author 
FROM books 
LIMIT 5;

-- Check if there are any books with author data
SELECT COUNT(*) as total_books, 
       COUNT(author) as books_with_author,
       COUNT(*) - COUNT(author) as books_without_author
FROM books;

-- Check the structure of books table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' 
ORDER BY ordinal_position;
