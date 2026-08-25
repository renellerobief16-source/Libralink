-- Debug script to check borrow_request_items table structure
-- Run this in your PostgreSQL database to check if the table exists and has correct columns

-- Check if borrow_request_items table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'borrow_request_items'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'borrow_request_items'
) as table_exists;

-- Check a sample item if table exists
SELECT * FROM borrow_request_items LIMIT 1;

-- Check if there are any items with item_id = 36
SELECT * FROM borrow_request_items WHERE item_id = 36;
