-- Enhanced Borrowing System Migration
-- LibraLink Multi-School Library Management System

-- ============================================
-- ENHANCE SCHOOLS TABLE FOR MAPPING
-- ============================================

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS borrowing_requirements TEXT;

-- ============================================
-- BORROW REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS borrow_requests (
  request_id VARCHAR(20) PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  home_school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('HOME', 'INTER_SCHOOL')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'permission_ready', 'ready_for_pickup', 'borrowed', 'returned', 'cancelled')),
  purpose TEXT NOT NULL,
  contact_number VARCHAR(50),
  address TEXT,
  id_picture_url VARCHAR(255),
  qr_token VARCHAR(255) UNIQUE,
  permission_letter_generated BOOLEAN DEFAULT FALSE,
  permission_letter_url VARCHAR(255),
  approved_by INTEGER REFERENCES users(user_id),
  approved_at TIMESTAMP,
  borrowed_at TIMESTAMP,
  returned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrow_requests_student_id ON borrow_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_home_school_id ON borrow_requests(home_school_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON borrow_requests(status);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_qr_token ON borrow_requests(qr_token);

-- ============================================
-- BORROW REQUEST ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS borrow_request_items (
  item_id SERIAL PRIMARY KEY,
  request_id VARCHAR(20) NOT NULL REFERENCES borrow_requests(request_id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
  owner_school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  partner_school_id INTEGER REFERENCES schools(school_id) ON DELETE SET NULL,
  borrow_type VARCHAR(30) NOT NULL CHECK (borrow_type IN ('HOME', 'INTER_SCHOOL_LIBRARY_USE')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'released', 'returned', 'cancelled')),
  copy_id INTEGER REFERENCES book_copies(copy_id),
  released_by INTEGER REFERENCES users(user_id),
  released_at TIMESTAMP,
  returned_by INTEGER REFERENCES users(user_id),
  returned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrow_request_items_request_id ON borrow_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_book_id ON borrow_request_items(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_owner_school_id ON borrow_request_items(owner_school_id);
CREATE INDEX IF NOT EXISTS idx_borrow_request_items_partner_school_id ON borrow_request_items(partner_school_id);

-- ============================================
-- FUNCTION TO GENERATE REQUEST ID
-- ============================================

CREATE OR REPLACE FUNCTION generate_request_id()
RETURNS VARCHAR(20) AS $$
DECLARE
  year_part VARCHAR(4);
  sequence_num INTEGER;
  request_id VARCHAR(20);
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_id FROM 12) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM borrow_requests
  WHERE request_id LIKE 'LL-' || year_part || '-%';
  
  -- Format: LL-2026-000123
  request_id := 'LL-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO GENERATE QR TOKEN
-- ============================================

CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS VARCHAR(255) AS $$
DECLARE
  token VARCHAR(255);
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_borrow_requests_updated_at
  BEFORE UPDATE ON borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_borrow_request_items_updated_at
  BEFORE UPDATE ON borrow_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT SAMPLE DATA FOR TESTING
-- ============================================

-- Update some schools with coordinates for testing
UPDATE schools 
SET latitude = 15.1234, longitude = 120.5678, 
    borrowing_requirements = 'Valid Student ID Required, QR Token Required'
WHERE school_id IN (1, 2, 3);

-- ============================================
-- GRANT PERMISSIONS TO SERVICE_ROLE
-- ============================================

-- Grant permissions on borrow_requests table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE borrow_requests_request_id_seq TO service_role;

-- Grant permissions on borrow_request_items table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrow_request_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE borrow_request_items_item_id_seq TO service_role;

-- Grant permissions on schools table (for latitude, longitude, borrowing_requirements)
GRANT SELECT, UPDATE ON public.schools TO service_role;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.generate_request_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_qr_token() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

COMMENT ON TABLE borrow_requests IS 'Main borrowing requests table for both home and inter-school borrowing';
COMMENT ON TABLE borrow_request_items IS 'Individual book items within a borrowing request';
COMMENT ON COLUMN borrow_requests.request_type IS 'Type of borrowing: HOME or INTER_SCHOOL';
COMMENT ON COLUMN borrow_requests.qr_token IS 'Secure token for QR code generation';
COMMENT ON COLUMN borrow_request_items.borrow_type IS 'Borrow type: HOME or INTER_SCHOOL_LIBRARY_USE';
COMMENT ON COLUMN schools.borrowing_requirements IS 'JSON or text describing school-specific borrowing requirements';
