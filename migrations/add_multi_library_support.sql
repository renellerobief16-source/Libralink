-- ========================================================
-- MIGRATION: Multi-Library Management per School
-- Description: Adds libraries table and associates users,
-- books, borrow_transactions, and requests with specific library units.
-- ========================================================

-- 1. Create libraries table
CREATE TABLE IF NOT EXISTS libraries (
  library_id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  library_type VARCHAR(50) NOT NULL DEFAULT 'college', 
    -- 'college', 'senior_high_school', 'junior_high_school', 'elementary', 'specialized', 'other'
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_libraries_school_id ON libraries(school_id);
CREATE INDEX IF NOT EXISTS idx_libraries_status ON libraries(status);
CREATE INDEX IF NOT EXISTS idx_libraries_type ON libraries(library_type);

-- 2. Add library_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_library_id ON users(library_id);

-- 3. Add library_id to books
ALTER TABLE books ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_books_library_id ON books(library_id);

-- 4. Add library_id to borrow_transactions
ALTER TABLE borrow_transactions ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_library_id ON borrow_transactions(library_id);

-- 5. Add library tracking to borrow_requests
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS home_library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS source_library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;

-- 6. Add library tracking to borrow_request_items
ALTER TABLE borrow_request_items ADD COLUMN IF NOT EXISTS owner_library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;
ALTER TABLE borrow_request_items ADD COLUMN IF NOT EXISTS requesting_library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;

-- 7. Add library tracking to interlibrary_requests
ALTER TABLE interlibrary_requests ADD COLUMN IF NOT EXISTS from_library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;
ALTER TABLE interlibrary_requests ADD COLUMN IF NOT EXISTS to_library_id INTEGER REFERENCES libraries(library_id) ON DELETE SET NULL;

-- ========================================================
-- BACKFILL: Create default "College Library" for each existing school
-- ========================================================

INSERT INTO libraries (school_id, name, library_type, description, status)
SELECT 
  s.school_id, 
  s.school_name || ' - College Library', 
  'college', 
  'Main campus academic library', 
  'active'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM libraries l WHERE l.school_id = s.school_id
);

-- Backfill books without library_id to their school's default library
UPDATE books b
SET library_id = (
  SELECT l.library_id 
  FROM libraries l 
  WHERE l.school_id = b.school_id 
  ORDER BY l.library_id ASC 
  LIMIT 1
)
WHERE b.library_id IS NULL AND b.school_id IS NOT NULL;

-- Backfill users without library_id to their school's default library
UPDATE users u
SET library_id = (
  SELECT l.library_id 
  FROM libraries l 
  WHERE l.school_id = u.school_id 
  ORDER BY l.library_id ASC 
  LIMIT 1
)
WHERE u.library_id IS NULL AND u.school_id IS NOT NULL;

-- Backfill borrow_transactions without library_id based on copy -> book -> library
UPDATE borrow_transactions bt
SET library_id = (
  SELECT b.library_id 
  FROM book_copies bc 
  JOIN books b ON b.book_id = bc.book_id 
  WHERE bc.copy_id = bt.copy_id
)
WHERE bt.library_id IS NULL;
