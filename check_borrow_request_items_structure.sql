-- Check the structure of borrow_request_items table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'borrow_request_items' 
ORDER BY ordinal_position;
