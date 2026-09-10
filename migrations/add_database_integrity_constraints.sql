-- Migration: Add Database Integrity Constraints for Borrowing System
-- This migration adds constraints and triggers to prevent data integrity issues
-- such as negative availability, double booking, and concurrent approval problems.

-- ============================================
-- ADD CHECK CONSTRAINT FOR AVAILABILITY
-- ============================================

-- Ensure book copy status is valid (using existing enum values)
ALTER TABLE book_copies
ADD CONSTRAINT chk_book_copy_status_valid
CHECK (status IN ('available', 'borrowed', 'reserved', 'lost', 'maintenance'));

-- ============================================
-- SKIP GIST EXCLUDE CONSTRAINT (requires extension)
-- ============================================
-- Note: The GIST EXCLUDE constraint requires the btree_gist extension.
-- We'll handle double booking prevention through triggers instead.

-- ============================================
-- ADD TRIGGER TO PREVENT DOUBLE APPROVAL
-- ============================================

CREATE OR REPLACE FUNCTION prevent_double_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_copy_id INTEGER;
  v_current_status request_status;
BEGIN
  -- Only check on UPDATE to approved or waiting_pickup status
  IF TG_OP = 'UPDATE' AND NEW.item_status IN ('approved', 'waiting_pickup') THEN
    -- If a copy is being assigned
    IF NEW.assigned_copy_id IS NOT NULL AND (OLD.assigned_copy_id IS NULL OR OLD.assigned_copy_id != NEW.assigned_copy_id) THEN
      -- Check if this copy is already assigned to another active request
      SELECT item_status INTO v_current_status
      FROM borrow_request_items
      WHERE assigned_copy_id = NEW.assigned_copy_id
        AND item_id != NEW.item_id
        AND item_status IN ('approved', 'waiting_pickup', 'released')
      LIMIT 1;
      
      IF v_current_status IS NOT NULL THEN
        RAISE EXCEPTION 'Book copy % is already assigned to another active request', NEW.assigned_copy_id;
      END IF;
      
      -- Check if the copy is actually available
      SELECT status INTO v_current_status
      FROM book_copies
      WHERE copy_id = NEW.assigned_copy_id;
      
      IF v_current_status != 'available' THEN
        RAISE EXCEPTION 'Book copy % is not available for assignment (current status: %)', NEW.assigned_copy_id, v_current_status;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for borrow_request_items
DROP TRIGGER IF EXISTS trg_prevent_double_approval ON borrow_request_items;
CREATE TRIGGER trg_prevent_double_approval
  BEFORE INSERT OR UPDATE ON borrow_request_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_double_approval();

-- ============================================
-- ADD TRIGGER TO UPDATE BOOK COPY STATUS ON REQUEST STATUS CHANGE
-- ============================================

CREATE OR REPLACE FUNCTION update_copy_status_on_request_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request item is approved, reserve the assigned copy
  IF TG_OP = 'UPDATE' AND NEW.item_status = 'approved' AND NEW.assigned_copy_id IS NOT NULL THEN
    UPDATE book_copies
    SET status = 'reserved'
    WHERE copy_id = NEW.assigned_copy_id;
  END IF;
  
  -- When a request item is released (borrowed), mark copy as borrowed
  IF TG_OP = 'UPDATE' AND NEW.item_status = 'released' AND NEW.assigned_copy_id IS NOT NULL THEN
    UPDATE book_copies
    SET status = 'borrowed'
    WHERE copy_id = NEW.assigned_copy_id;
  END IF;
  
  -- When a request item is returned, mark copy as available
  IF TG_OP = 'UPDATE' AND NEW.item_status = 'returned' AND NEW.assigned_copy_id IS NOT NULL THEN
    UPDATE book_copies
    SET status = 'available'
    WHERE copy_id = NEW.assigned_copy_id;
  END IF;
  
  -- When a request item is rejected or cancelled, free the assigned copy
  IF TG_OP = 'UPDATE' AND NEW.item_status IN ('rejected', 'cancelled') AND NEW.assigned_copy_id IS NOT NULL THEN
    UPDATE book_copies
    SET status = 'available'
    WHERE copy_id = NEW.assigned_copy_id
      AND status IN ('reserved', 'borrowed'); -- Only if it was reserved/borrowed by this request
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for borrow_request_items
DROP TRIGGER IF EXISTS trg_update_copy_status ON borrow_request_items;
CREATE TRIGGER trg_update_copy_status
  AFTER INSERT OR UPDATE ON borrow_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_copy_status_on_request_change();

-- ============================================
-- ADD FUNCTION FOR ATOMIC COPY ASSIGNMENT
-- ============================================

CREATE OR REPLACE FUNCTION assign_available_copy(p_book_id INTEGER, p_request_item_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_copy_id INTEGER;
  v_assigned BOOLEAN := FALSE;
BEGIN
  -- Use SELECT FOR UPDATE SKIP LOCKED to handle concurrent requests safely
  -- This ensures only one transaction can assign a specific copy at a time
  FOR v_copy_id IN
    SELECT copy_id
    FROM book_copies
    WHERE book_id = p_book_id
      AND status = 'available'
    ORDER BY copy_id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Assign the copy
    UPDATE borrow_request_items
    SET assigned_copy_id = v_copy_id
    WHERE item_id = p_request_item_id;
    
    -- Mark as reserved
    UPDATE book_copies
    SET status = 'reserved'
    WHERE copy_id = v_copy_id;
    
    v_assigned := TRUE;
  END LOOP;
  
  IF NOT v_assigned THEN
    RAISE EXCEPTION 'No available copies for book %', p_book_id;
  END IF;
  
  RETURN v_copy_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD FUNCTION TO CHECK AVAILABILITY BEFORE APPROVAL
-- ============================================

CREATE OR REPLACE FUNCTION check_book_availability_for_approval(p_book_id INTEGER)
RETURNS TABLE(
  available BOOLEAN,
  total_copies INTEGER,
  available_copies INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'available') > 0 as available,
    COUNT(*) as total_copies,
    COUNT(*) FILTER (WHERE status = 'available') as available_copies
  FROM book_copies
  WHERE book_id = p_book_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SKIP DUE DATE CONSTRAINT (existing data may violate)
-- ============================================
-- Note: Skipping this constraint as existing data may have past due dates.
-- Application-level validation should ensure future due dates for new requests.

-- ============================================
-- ADD CONSTRAINT TO PREVENT INVALID STATUS TRANSITIONS
-- ============================================

-- This function will be called by application logic to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition(
  p_current_status request_status,
  p_new_status request_status
) RETURNS BOOLEAN AS $$
BEGIN
  -- Define valid status transitions
  -- pending -> approved, rejected, cancelled
  -- approved -> waiting_pickup, rejected, cancelled
  -- waiting_pickup -> released, rejected, cancelled
  -- released -> returned
  -- rejected -> (no further transitions)
  -- cancelled -> (no further transitions)
  -- returned -> (no further transitions)
  
  CASE p_current_status
    WHEN 'pending' THEN
      IF p_new_status NOT IN ('approved', 'rejected', 'cancelled') THEN
        RETURN FALSE;
      END IF;
    WHEN 'approved' THEN
      IF p_new_status NOT IN ('waiting_pickup', 'rejected', 'cancelled') THEN
        RETURN FALSE;
      END IF;
    WHEN 'waiting_pickup' THEN
      IF p_new_status NOT IN ('released', 'rejected', 'cancelled') THEN
        RETURN FALSE;
      END IF;
    WHEN 'released' THEN
      IF p_new_status NOT IN ('returned') THEN
        RETURN FALSE;
      END IF;
    WHEN 'rejected', 'cancelled', 'returned' THEN
      -- Terminal states - no further transitions allowed
      RETURN FALSE;
    ELSE
      -- Unknown current status
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
