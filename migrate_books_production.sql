-- ============================================
-- PRODUCTION-READY BOOKS TABLE MIGRATION
-- Library Management System for Philippine Schools
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE NEW BOOKS TABLE WITH UUID
-- ============================================

-- First, backup existing books table
CREATE TABLE IF NOT EXISTS books_backup AS SELECT * FROM books;

-- Drop old books table (data is preserved in books_backup)
DROP TABLE IF EXISTS books CASCADE;

-- Create new production-ready books table
CREATE TABLE books (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- School Reference
  school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  
  -- Identification
  accession_number VARCHAR(50) UNIQUE,
  barcode VARCHAR(50) UNIQUE,
  isbn VARCHAR(20),
  
  -- Title Information
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  
  -- Author/Contributor Information
  author VARCHAR(255),
  co_author VARCHAR(255),
  editor VARCHAR(255),
  translator VARCHAR(255),
  
  -- Publication Information
  publisher VARCHAR(255),
  place_of_publication VARCHAR(255),
  publication_year INTEGER,
  copyright_year INTEGER,
  edition VARCHAR(50),
  volume VARCHAR(50),
  series VARCHAR(255),
  
  -- Classification
  category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
  category VARCHAR(100),
  genre VARCHAR(100),
  subject VARCHAR(255),
  language VARCHAR(50) DEFAULT 'English',
  
  -- Library Classification
  call_number VARCHAR(100),
  shelf_location VARCHAR(100),
  
  -- Description
  description TEXT,
  keywords TEXT,
  pages INTEGER,
  book_format VARCHAR(50),
  dimensions VARCHAR(50),
  
  -- Acquisition Information
  acquisition_date DATE,
  acquisition_type VARCHAR(50) CHECK (acquisition_type IN ('purchase', 'donation', 'gift', 'exchange')),
  supplier VARCHAR(255),
  purchase_price DECIMAL(10, 2) CHECK (purchase_price >= 0),
  
  -- Quantity Management
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  available_quantity INTEGER NOT NULL DEFAULT 1 CHECK (available_quantity >= 0 AND available_quantity <= quantity),
  borrowed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (borrowed_quantity >= 0 AND borrowed_quantity <= quantity),
  
  -- Condition and Status
  condition VARCHAR(50) CHECK (condition IN ('good', 'fair', 'poor', 'damaged', 'lost')) DEFAULT 'good',
  status VARCHAR(50) CHECK (status IN ('available', 'borrowed', 'reserved', 'lost', 'maintenance')) DEFAULT 'available',
  
  -- Media
  cover_image VARCHAR(500),
  pdf_url VARCHAR(500),
  
  -- Additional Information
  remarks TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- CREATE INDEXES FOR SEARCHING
-- ============================================

-- Primary search indexes
CREATE INDEX idx_books_school_id ON books(school_id);
CREATE INDEX idx_books_title ON books USING gin(to_tsvector('english', title));
CREATE INDEX idx_books_author ON books USING gin(to_tsvector('english', author));
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_accession_number ON books(accession_number);
CREATE INDEX idx_books_barcode ON books(barcode);

-- Classification indexes
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_subject ON books(subject);
CREATE INDEX idx_books_language ON books(language);

-- Library classification indexes
CREATE INDEX idx_books_call_number ON books(call_number);
CREATE INDEX idx_books_shelf_location ON books(shelf_location);

-- Status and condition indexes
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_condition ON books(condition);

-- Acquisition indexes
CREATE INDEX idx_books_acquisition_date ON books(acquisition_date);
CREATE INDEX idx_books_acquisition_type ON books(acquisition_type);

-- Publisher index
CREATE INDEX idx_books_publisher ON books(publisher);

-- Full-text search index
CREATE INDEX idx_books_fulltext ON books USING gin(
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(subtitle, '') || ' ' || 
    COALESCE(author, '') || ' ' || 
    COALESCE(co_author, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(keywords, '')
  )
);

-- ============================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for books table
DROP TRIGGER IF EXISTS update_books_updated_at ON books;
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATE DATA FROM BACKUP
-- ============================================

-- Migrate data from old books_backup to new books table
INSERT INTO books (
  school_id,
  accession_number,
  isbn,
  title,
  subtitle,
  author,
  publisher,
  place_of_publication,
  publication_year,
  copyright_year,
  edition,
  series,
  category_id,
  category,
  call_number,
  shelf_location,
  description,
  keywords,
  pages,
  book_format,
  dimensions,
  quantity,
  available_quantity,
  borrowed_quantity,
  condition,
  status,
  cover_image,
  remarks,
  created_at
)
SELECT 
  school_id,
  NULL::VARCHAR(50) AS accession_number, -- Will be generated
  isbn,
  title,
  NULL::VARCHAR(500) AS subtitle,
  NULL::VARCHAR(255) AS author, -- Will need to populate from book_authors
  NULL::VARCHAR(255) AS publisher, -- Will need to populate from publishers
  NULL::VARCHAR(255) AS place_of_publication,
  NULL::INTEGER AS publication_year,
  copyright_year,
  edition,
  series_title AS series,
  category_id,
  NULL::VARCHAR(100) AS category,
  call_number,
  NULL::VARCHAR(100) AS shelf_location,
  general_note AS description,
  NULL::TEXT AS keywords,
  NULL::INTEGER AS pages,
  NULL::VARCHAR(50) AS book_format,
  NULL::VARCHAR(50) AS dimensions,
  1 AS quantity,
  1 AS available_quantity,
  0 AS borrowed_quantity,
  'good' AS condition,
  'available' AS status,
  cover_image,
  remarks,
  created_at
FROM books_backup
ON CONFLICT DO NOTHING;

-- ============================================
-- GENERATE ACCESSION NUMBERS FOR EXISTING BOOKS
-- ============================================

-- Generate accession numbers for books that don't have one
UPDATE books 
SET accession_number = 'ACC-' || LPAD(id::TEXT, 8, '0')
WHERE accession_number IS NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE books IS 'Production-ready books catalog for library management system';
COMMENT ON COLUMN books.id IS 'UUID primary key';
COMMENT ON COLUMN books.accession_number IS 'Unique library accession number';
COMMENT ON COLUMN books.barcode IS 'Unique barcode for scanning';
COMMENT ON COLUMN books.isbn IS 'International Standard Book Number';
COMMENT ON COLUMN books.quantity IS 'Total number of copies';
COMMENT ON COLUMN books.available_quantity IS 'Number of copies available for borrowing';
COMMENT ON COLUMN books.borrowed_quantity IS 'Number of copies currently borrowed';
COMMENT ON COLUMN books.condition IS 'Physical condition of the book';
COMMENT ON COLUMN books.status IS 'Current availability status';
