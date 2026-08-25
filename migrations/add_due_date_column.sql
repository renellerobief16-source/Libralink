-- Add due_date column to borrow_requests table
-- This column will store the due date for HOME borrowing (3 days)
-- INTER_SCHOOL borrowing will have NULL due date (library use only)

ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Add comment to explain the column
COMMENT ON COLUMN borrow_requests.due_date IS 'Due date for HOME borrowing (3 days). NULL for INTER_SCHOOL (library use only)';

-- Grant permissions for the new column
GRANT SELECT, UPDATE ON public.borrow_requests TO service_role;

-- Note: RLS should already be enabled on borrow_requests table from the enhance_borrowing_system.sql migration
-- If RLS policies need to be updated for the new column, add them here
