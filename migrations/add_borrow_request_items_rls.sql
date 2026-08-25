-- Add RLS policies for borrow_request_items table
-- This fixes the book release server error by granting proper permissions

-- Enable Row Level Security if not already enabled
ALTER TABLE borrow_request_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can view all borrow request items" ON borrow_request_items;
DROP POLICY IF EXISTS "Service role can insert borrow request items" ON borrow_request_items;
DROP POLICY IF EXISTS "Service role can update borrow request items" ON borrow_request_items;
DROP POLICY IF EXISTS "Service role can delete borrow request items" ON borrow_request_items;

-- RLS Policies for service_role (backend API access)
CREATE POLICY "Service role can view all borrow request items"
  ON borrow_request_items FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert borrow request items"
  ON borrow_request_items FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update borrow request items"
  ON borrow_request_items FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete borrow request items"
  ON borrow_request_items FOR DELETE
  TO service_role
  USING (true);

-- Grant permissions if not already granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_request_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE borrow_request_items_item_id_seq TO service_role;
