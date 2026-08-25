-- Add copy_id column to borrow_request_items table
-- This column references the specific book copy being borrowed

ALTER TABLE borrow_request_items 
ADD COLUMN IF NOT EXISTS copy_id INTEGER REFERENCES book_copies(copy_id);

-- Add comment to explain the column
COMMENT ON COLUMN borrow_request_items.copy_id IS 'ID of the specific book copy being borrowed';

-- Grant permissions for the new column
GRANT SELECT, UPDATE ON public.borrow_request_items TO service_role;
