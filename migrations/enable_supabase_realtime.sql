-- Migration: Enable Supabase Realtime for Borrowing System
-- This migration enables Supabase Realtime on the necessary tables
-- for the interconnected borrowing system.

-- ============================================
-- ENABLE REALTIME ON BORROW_REQUESTS TABLE
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE borrow_requests;

-- ============================================
-- ENABLE REALTIME ON BORROW_REQUEST_ITEMS TABLE
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE borrow_request_items;

-- ============================================
-- ENABLE REALTIME ON BOOK_COPIES TABLE
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE book_copies;

-- ============================================
-- ENABLE REALTIME ON NOTIFICATIONS TABLE
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- ENABLE REALTIME ON BORROW_TRANSACTIONS TABLE (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'borrow_transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE borrow_transactions;
  END IF;
END $$;

-- ============================================
-- ADD REALTIME FILTER FUNCTION FOR SCHOOL-SPECIFIC SUBSCRIPTIONS
-- ============================================

-- This function can be used to filter realtime events by school
CREATE OR REPLACE FUNCTION realtime_filter_school(school_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- This is a placeholder for more complex filtering logic
  -- Supabase Realtime handles filtering at the subscription level
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON PUBLICATION supabase_realtime IS 'Publication for Supabase Realtime subscriptions including borrowing system tables';
