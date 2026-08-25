-- Add approved_at and approved_by columns to borrow_requests table
-- These columns store when and by whom a request was approved

ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(user_id);

-- Add comments to explain the columns
COMMENT ON COLUMN borrow_requests.approved_at IS 'Timestamp when the request was approved by a librarian';
COMMENT ON COLUMN borrow_requests.approved_by IS 'ID of the user (librarian) who approved the request';

-- Grant permissions for the new columns
GRANT SELECT, UPDATE ON public.borrow_requests TO service_role;
