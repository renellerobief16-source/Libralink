-- Add RLS policies for borrow_requests table
-- This ensures proper permissions for the backend API

-- Enable Row Level Security if not already enabled
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can view all borrow requests" ON borrow_requests;
DROP POLICY IF EXISTS "Service role can insert borrow requests" ON borrow_requests;
DROP POLICY IF EXISTS "Service role can update borrow requests" ON borrow_requests;
DROP POLICY IF EXISTS "Service role can delete borrow requests" ON borrow_requests;

-- RLS Policies for service_role (backend API access)
CREATE POLICY "Service role can view all borrow requests"
  ON borrow_requests FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert borrow requests"
  ON borrow_requests FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update borrow requests"
  ON borrow_requests FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete borrow requests"
  ON borrow_requests FOR DELETE
  TO service_role
  USING (true);

-- Grant permissions if not already granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_requests TO service_role;
