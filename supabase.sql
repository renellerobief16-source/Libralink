-- Libralink PostgreSQL Database Schema for Supabase
-- Multi-School Library Management System

-- ============================================
-- ENUM TYPES
-- ============================================

-- Create enum types only if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'book_condition') THEN
    CREATE TYPE book_condition AS ENUM ('good', 'fair', 'poor', 'damaged');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'book_status') THEN
    CREATE TYPE book_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'maintenance');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'borrow_status') THEN
    CREATE TYPE borrow_status AS ENUM ('active', 'returned', 'overdue');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'school_status') THEN
    CREATE TYPE school_status AS ENUM ('active', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'received', 'returned');
  END IF;
END $$;

-- ============================================
-- SCHOOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
  school_id SERIAL PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL,
  school_code VARCHAR(50) NOT NULL UNIQUE,
  address TEXT,
  contact_number VARCHAR(50),
  email VARCHAR(255),
  logo TEXT,
  status school_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schools_school_code ON schools(school_code);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  student_number VARCHAR(50),
  employee_number VARCHAR(50),
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  gender gender_type,
  contact_number VARCHAR(50),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100),
  recovery_email VARCHAR(255),
  policy_accepted BOOLEAN DEFAULT FALSE,
  password VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  profile_image VARCHAR(255),
  status user_status DEFAULT 'active',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_student_number ON users(student_number);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================
-- AUTHORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS authors (
  author_id SERIAL PRIMARY KEY,
  author_name VARCHAR(255) NOT NULL UNIQUE
);

-- ============================================
-- PUBLISHERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS publishers (
  publisher_id SERIAL PRIMARY KEY,
  publisher_name VARCHAR(255) NOT NULL UNIQUE,
  place_of_publication VARCHAR(255)
);

-- ============================================
-- BOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS books (
  book_id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
  publisher_id INTEGER REFERENCES publishers(publisher_id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  isbn VARCHAR(50),
  call_number VARCHAR(100),
  edition VARCHAR(50),
  copyright_year INTEGER,
  physical_description TEXT,
  series_title VARCHAR(255),
  general_note TEXT,
  cover_image VARCHAR(255),
  remarks TEXT,
  encoded_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_school_id ON books(school_id);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- ============================================
-- BOOK_AUTHORS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS book_authors (
  book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);

-- ============================================
-- BOOK_COPIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS book_copies (
  copy_id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
  accession_number VARCHAR(50) NOT NULL UNIQUE,
  barcode VARCHAR(50) UNIQUE,
  rfid_tag VARCHAR(50) UNIQUE,
  shelf_location VARCHAR(100),
  condition book_condition DEFAULT 'good',
  status book_status DEFAULT 'available'
);

CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_accession_number ON book_copies(accession_number);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON book_copies(status);

-- ============================================
-- BORROW_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS borrow_transactions (
  borrow_id SERIAL PRIMARY KEY,
  copy_id INTEGER NOT NULL REFERENCES book_copies(copy_id),
  student_id INTEGER NOT NULL REFERENCES users(user_id),
  librarian_id INTEGER REFERENCES users(user_id),
  borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE NOT NULL,
  return_date TIMESTAMP,
  status borrow_status DEFAULT 'active',
  remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_borrow_transactions_student_id ON borrow_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_copy_id ON borrow_transactions(copy_id);
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_status ON borrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_borrow_transactions_due_date ON borrow_transactions(due_date);

-- ============================================
-- INTERLIBRARY_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS interlibrary_requests (
  request_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(user_id),
  copy_id INTEGER NOT NULL REFERENCES book_copies(copy_id),
  from_school_id INTEGER NOT NULL REFERENCES schools(school_id),
  to_school_id INTEGER NOT NULL REFERENCES schools(school_id),
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INTEGER REFERENCES users(user_id),
  status request_status DEFAULT 'pending',
  remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_interlibrary_requests_student_id ON interlibrary_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_interlibrary_requests_status ON interlibrary_requests(status);
CREATE INDEX IF NOT EXISTS idx_interlibrary_requests_from_school ON interlibrary_requests(from_school_id);
CREATE INDEX IF NOT EXISTS idx_interlibrary_requests_to_school ON interlibrary_requests(to_school_id);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image VARCHAR(255),
  created_by INTEGER NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);

-- ============================================
-- ACTIVITY_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  activity TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(school_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  related_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  is_admin_notification BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (role_name) VALUES
('Super Admin'),
('Librarian Admin'),
('Librarian'),
('Assistant Librarian'),
('Library Technician'),
('Student')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default schools
INSERT INTO schools (school_name, school_code, address, contact_number, email, status) VALUES
('Santa Rita College', 'SRC', 'Santa Rita, Pampanga', '123-4567', 'info@src.edu.ph', 'active'),
('Guagua National College', 'GNC', 'Guagua, Pampanga', '123-4568', 'info@gnc.edu.ph', 'active')
ON CONFLICT (school_code) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (category_name) VALUES
('Fiction'),
('Non-Fiction'),
('Science'),
('Technology'),
('History'),
('Literature')
ON CONFLICT (category_name) DO NOTHING;

-- Insert sample authors
INSERT INTO authors (author_name) VALUES
('Martires, Concepcion R.'),
('Leuterio, Mercedes M.'),
('Lacsamana, B.B.')
ON CONFLICT (author_name) DO NOTHING;

-- Insert sample publishers
INSERT INTO publishers (publisher_name, place_of_publication) VALUES
('National Book Store', 'Manila'),
('Anvil Publication', 'Quezon City'),
('Accord Printing', 'Pampanga')
ON CONFLICT (publisher_name) DO NOTHING;

-- Insert sample users (password: admin123 for admin/librarian, student123 for students, mementomori637 for super.admin@libralink.com)
-- Passwords are bcrypt hashed
INSERT INTO users (school_id, role_id, employee_number, firstname, lastname, email, password, status) VALUES
(1, 1, 'ADMIN001', 'Super', 'Admin', 'superadmin@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active'),
(1, 1, 'ADMIN002', 'Super', 'Admin', 'super.admin@libralink.com', '$2a$10$Mnwj8tonhUlW3JqSV8iQduZysgLhiS6IvkHrjdcenaCNj8p0Soh5m', 'active'),
(1, 2, 'LIB001', 'Librarian', 'Admin', 'librarianadmin@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active'),
(1, 3, 'LIB002', 'Librarian', 'SRC', 'srclibrarian@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active'),
(2, 3, 'LIB003', 'Librarian', 'GNC', 'gnclibrarian@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active')
ON CONFLICT (email) DO NOTHING;

-- Alternative: Insert just the new super admin account if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'super.admin@libralink.com') THEN
    INSERT INTO users (school_id, role_id, employee_number, firstname, lastname, email, password, status)
    VALUES (1, 1, 'ADMIN002', 'Super', 'Admin', 'super.admin@libralink.com', '$2a$10$Mnwj8tonhUlW3JqSV8iQduZysgLhiS6IvkHrjdcenaCNj8p0Soh5m', 'active');
  END IF;
END $$;

-- Insert sample students
INSERT INTO users (school_id, role_id, student_number, firstname, lastname, gender, email, password, status) VALUES
(1, 4, 'SRC2024001', 'Juan', 'Dela Cruz', 'male', 'juan.src@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active'),
(1, 4, 'SRC2024002', 'Maria', 'Santos', 'female', 'maria.src@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active'),
(2, 4, 'GNC2024001', 'Pedro', 'Reyes', 'male', 'pedro.gnc@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active'),
(2, 4, 'GNC2024002', 'Ana', 'Garcia', 'female', 'ana.gnc@libralink.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert sample books for SRC
INSERT INTO books (school_id, category_id, publisher_id, title, isbn, call_number, edition, copyright_year, physical_description, shelf_location) VALUES
(1, 2, 1, 'Human Resources Management', '971-08-6011-9', '658.3 M36 1999', '1st', 1999, 'xv, 250 p. ; 23 cm.', 'A-101'),
(1, 2, 2, 'Banking', '971-27-1405-5', '332.109599 L57 2004', '1st', 2004, 'xviii, 300 p. ; 24 cm.', 'B-201'),
(1, 3, 1, 'Introduction to Computer Science', '971-08-6012-0', '004.5 C76 2020', '2nd', 2020, 'xx, 400 p. ; 25 cm.', 'C-101'),
(1, 4, 2, 'Web Development Fundamentals', '971-27-1406-0', '005.1 W45 2021', '1st', 2021, 'xvi, 350 p. ; 24 cm.', 'D-101'),
(1, 5, 3, 'Philippine History', '971-23-4567-8', '959.9 P56 2019', '1st', 2019, 'xiv, 280 p. ; 23 cm.', 'E-101');

-- Insert sample books for GNC
INSERT INTO books (school_id, category_id, publisher_id, title, isbn, call_number, edition, copyright_year, physical_description, shelf_location) VALUES
(2, 2, 1, 'Human Resources Management', '971-08-6011-9', '658.3 M36 1999', '1st', 1999, 'xv, 250 p. ; 23 cm.', 'G-101'),
(2, 5, 3, 'Tongue Twisters', NULL, '428.6 L12', '1st', 2010, '50 p. ; 18 cm.', 'G-201'),
(2, 3, 2, 'Python Programming', '971-27-1407-0', '005.133 P99 2022', '1st', 2022, 'xviii, 420 p. ; 25 cm.', 'G-301'),
(2, 4, 1, 'React JS Complete Guide', '971-08-6013-0', '005.133 R42 2023', '1st', 2023, 'xx, 380 p. ; 24 cm.', 'G-401'),
(2, 6, 3, 'Modern Literature', '971-23-4568-0', '823.914 M64 2021', '1st', 2021, 'xii, 200 p. ; 21 cm.', 'G-501');

-- Insert sample book authors
INSERT INTO book_authors (book_id, author_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 1),
(5, 2),
(6, 1),
(7, 3),
(8, 2),
(9, 1),
(10, 3)
ON CONFLICT (book_id, author_id) DO NOTHING;

-- Insert sample book copies
INSERT INTO book_copies (book_id, accession_number, barcode, shelf_location, condition, status) VALUES
(1, 'SRC-000001', 'BC000001', 'A-101-1', 'good', 'available'),
(1, 'SRC-000002', 'BC000002', 'A-101-2', 'good', 'available'),
(2, 'SRC-000003', 'BC000003', 'B-201-1', 'good', 'available'),
(3, 'SRC-000004', 'BC000004', 'C-101-1', 'good', 'available'),
(4, 'SRC-000005', 'BC000005', 'D-101-1', 'good', 'available'),
(5, 'SRC-000006', 'BC000006', 'E-101-1', 'good', 'available'),
(6, 'GNC-000001', 'BC000007', 'G-101-1', 'good', 'available'),
(7, 'GNC-000002', 'BC000008', 'G-201-1', 'good', 'available'),
(8, 'GNC-000003', 'BC000009', 'G-301-1', 'good', 'available'),
(9, 'GNC-000004', 'BC000010', 'G-401-1', 'good', 'available'),
(10, 'GNC-000005', 'BC000011', 'G-501-1', 'good', 'available')
ON CONFLICT (accession_number) DO NOTHING;
