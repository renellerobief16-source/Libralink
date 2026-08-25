-- Check if borrow_request_items table exists and has the correct columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'borrow_request_items'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'borrow_request_items'
);

-- Check a sample item
SELECT * FROM borrow_request_items LIMIT 1;
