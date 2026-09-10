-- Migration: Improve Book Availability Tracking
-- This migration enhances the book availability system to support real-time
-- availability calculation (AVAILABLE_COPIES / TOTAL_COPIES) and proper
-- lifecycle management.

-- ============================================
-- ADD MISSING STATUS VALUES TO ENUMS
-- ============================================

-- Add new status to request_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'received', 'returned');
  END IF;
  
  -- Add new statuses if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'waiting_pickup' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')) THEN
    ALTER TYPE request_status ADD VALUE 'waiting_pickup' AFTER 'approved';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'borrowed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')) THEN
    ALTER TYPE request_status ADD VALUE 'borrowed' AFTER 'waiting_pickup';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')) THEN
    ALTER TYPE request_status ADD VALUE 'cancelled' AFTER 'rejected';
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO BORROW_REQUESTS TABLE
-- ============================================

-- Add approved_at timestamp
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Add approved_by librarian reference
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(user_id);

-- Add pickup_date timestamp
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS pickup_date TIMESTAMP;

-- Add borrow_date timestamp
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS borrow_date TIMESTAMP;

-- Add due_date for the borrowing period
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add return_date timestamp
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS return_date TIMESTAMP;

-- Add rejection reason
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add cancellation reason
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ============================================
-- ADD COLUMNS TO BORROW_REQUEST_ITEMS TABLE
-- ============================================

-- Add assigned_copy_id to track which physical copy is assigned
ALTER TABLE borrow_request_items 
ADD COLUMN IF NOT EXISTS assigned_copy_id INTEGER REFERENCES book_copies(copy_id);

-- Add item-level status for granular tracking
ALTER TABLE borrow_request_items 
ADD COLUMN IF NOT EXISTS item_status request_status DEFAULT 'pending';

-- Add released_at timestamp when book is physically released
ALTER TABLE borrow_request_items 
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP;

-- Add returned_at timestamp when book is returned
ALTER TABLE borrow_request_items 
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for approved requests
CREATE INDEX IF NOT EXISTS idx_borrow_requests_approved_at 
ON borrow_requests(approved_at) 
WHERE approved_at IS NOT NULL;

-- Index for pickup date
CREATE INDEX IF NOT EXISTS idx_borrow_requests_pickup_date 
ON borrow_requests(pickup_date) 
WHERE pickup_date IS NOT NULL;

-- Index for due date (for overdue tracking)
CREATE INDEX IF NOT EXISTS idx_borrow_requests_due_date 
ON borrow_requests(due_date) 
WHERE due_date IS NOT NULL;

-- Index for assigned copies
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_assigned_copy 
ON borrow_request_items(assigned_copy_id) 
WHERE assigned_copy_id IS NOT NULL;

-- Index for item status
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_status 
ON borrow_request_items(item_status);

-- ============================================
-- CREATE FUNCTION FOR REAL-TIME AVAILABILITY CALCULATION
-- ============================================

CREATE OR REPLACE FUNCTION get_book_availability(p_book_id INTEGER)
RETURNS TABLE(
  total_copies INTEGER,
  available_copies INTEGER,
  borrowed_copies INTEGER,
  reserved_copies INTEGER,
  unavailable_copies INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_copies,
    COUNT(*) FILTER (WHERE status = 'available') as available_copies,
    COUNT(*) FILTER (WHERE status = 'borrowed') as borrowed_copies,
    COUNT(*) FILTER (WHERE status = 'reserved') as reserved_copies,
    COUNT(*) FILTER (WHERE status IN ('lost', 'maintenance')) as unavailable_copies
  FROM book_copies
  WHERE book_id = p_book_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE FUNCTION FOR GROUPED BOOK AVAILABILITY
-- ============================================

CREATE OR REPLACE FUNCTION get_grouped_book_availability(p_title TEXT, p_author TEXT DEFAULT NULL, p_isbn TEXT DEFAULT NULL)
RETURNS TABLE(
  book_id INTEGER,
  title TEXT,
  author TEXT,
  isbn TEXT,
  school_id INTEGER,
  total_copies INTEGER,
  available_copies INTEGER,
  borrowed_copies INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.book_id,
    b.title,
    b.author,
    b.isbn,
    b.school_id,
    COUNT(bc.copy_id) as total_copies,
    COUNT(bc.copy_id) FILTER (WHERE bc.status = 'available') as available_copies,
    COUNT(bc.copy_id) FILTER (WHERE bc.status = 'borrowed') as borrowed_copies
  FROM books b
  LEFT JOIN book_copies bc ON b.book_id = bc.book_id
  WHERE 
    b.title = p_title
    AND (p_author IS NULL OR b.author = p_author)
    AND (p_isbn IS NULL OR b.isbn = p_isbn)
  GROUP BY b.book_id, b.title, b.author, b.isbn, b.school_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGER TO UPDATE AVAILABILITY ON COPY STATUS CHANGE
-- ============================================

CREATE OR REPLACE FUNCTION update_book_availability_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger can be used to update cached availability if needed
  -- For now, we'll use real-time calculation via the functions above
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN borrow_requests.approved_at IS 'Timestamp when request was approved by librarian';
COMMENT ON COLUMN borrow_requests.approved_by IS 'User ID of librarian who approved the request';
COMMENT ON COLUMN borrow_requests.pickup_date IS 'Timestamp when student picked up the book';
COMMENT ON COLUMN borrow_requests.borrow_date IS 'Timestamp when book was officially borrowed (QR scanned)';
COMMENT ON COLUMN borrow_requests.due_date IS 'Expected return date for the borrowed book';
COMMENT ON COLUMN borrow_requests.return_date IS 'Timestamp when book was returned';
COMMENT ON COLUMN borrow_requests.rejection_reason IS 'Reason provided by librarian for rejection';
COMMENT ON COLUMN borrow_requests.cancellation_reason IS 'Reason provided by student for cancellation';

COMMENT ON COLUMN borrow_request_items.assigned_copy_id IS 'Physical copy ID assigned to this request item';
COMMENT ON COLUMN borrow_request_items.item_status IS 'Individual status for each book in the request';
COMMENT ON COLUMN borrow_request_items.released_at IS 'Timestamp when physical copy was released to student';
COMMENT ON COLUMN borrow_request_items.returned_at IS 'Timestamp when physical copy was returned';

COMMENT ON FUNCTION get_book_availability IS 'Calculates real-time availability for a specific book';
COMMENT ON FUNCTION get_grouped_book_availability IS 'Calculates availability for grouped books (same title/author/ISBN)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
