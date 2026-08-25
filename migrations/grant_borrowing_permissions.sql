-- Grant permissions for borrowing system tables
-- Run this in your Supabase SQL Editor

-- DISABLE RLS temporarily to fix permissions
ALTER TABLE public.borrow_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_request_items DISABLE ROW LEVEL SECURITY;

-- Grant permissions on borrow_requests table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_requests TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on borrow_request_items table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_request_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE borrow_request_items_item_id_seq TO service_role;

-- Grant permissions on schools table (for latitude, longitude, borrowing_requirements)
GRANT SELECT, UPDATE ON public.schools TO service_role;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.generate_request_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_qr_token() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
