-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interlibrary_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service Role Bypass Policies (for backend with service_role key)
-- These allow the backend to bypass RLS completely

DROP POLICY IF EXISTS "Service role can do anything on schools" ON schools;
CREATE POLICY "Service role can do anything on schools" 
ON schools FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on roles" ON roles;
CREATE POLICY "Service role can do anything on roles" 
ON roles FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on users" ON users;
CREATE POLICY "Service role can do anything on users" 
ON users FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on categories" ON categories;
CREATE POLICY "Service role can do anything on categories" 
ON categories FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on authors" ON authors;
CREATE POLICY "Service role can do anything on authors" 
ON authors FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on publishers" ON publishers;
CREATE POLICY "Service role can do anything on publishers" 
ON publishers FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on books" ON books;
CREATE POLICY "Service role can do anything on books" 
ON books FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on book_authors" ON book_authors;
CREATE POLICY "Service role can do anything on book_authors" 
ON book_authors FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on book_copies" ON book_copies;
CREATE POLICY "Service role can do anything on book_copies" 
ON book_copies FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on borrow_transactions" ON borrow_transactions;
CREATE POLICY "Service role can do anything on borrow_transactions" 
ON borrow_transactions FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on interlibrary_requests" ON interlibrary_requests;
CREATE POLICY "Service role can do anything on interlibrary_requests" 
ON interlibrary_requests FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on announcements" ON announcements;
CREATE POLICY "Service role can do anything on announcements" 
ON announcements FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on activity_logs" ON activity_logs;
CREATE POLICY "Service role can do anything on activity_logs" 
ON activity_logs FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do anything on notifications" ON notifications;
CREATE POLICY "Service role can do anything on notifications" 
ON notifications FOR ALL 
USING (auth.role() = 'service_role');

-- Public/Anon Policies (for unauthenticated access)
-- Schools: Public can view schools
DROP POLICY IF EXISTS "Public can view schools" ON schools;
CREATE POLICY "Public can view schools" 
ON schools FOR SELECT 
USING (true);

-- Roles: Public can view roles
DROP POLICY IF EXISTS "Public can view roles" ON roles;
CREATE POLICY "Public can view roles" 
ON roles FOR SELECT 
USING (true);

-- Categories: Public can view categories
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" 
ON categories FOR SELECT 
USING (true);

-- Authors: Public can view authors
DROP POLICY IF EXISTS "Public can view authors" ON authors;
CREATE POLICY "Public can view authors" 
ON authors FOR SELECT 
USING (true);

-- Publishers: Public can view publishers
DROP POLICY IF EXISTS "Public can view publishers" ON publishers;
CREATE POLICY "Public can view publishers" 
ON publishers FOR SELECT 
USING (true);

-- Books: Public can view books
DROP POLICY IF EXISTS "Public can view books" ON books;
CREATE POLICY "Public can view books" 
ON books FOR SELECT 
USING (true);

-- Book Authors: Public can view book authors
DROP POLICY IF EXISTS "Public can view book_authors" ON book_authors;
CREATE POLICY "Public can view book_authors" 
ON book_authors FOR SELECT 
USING (true);

-- Book Copies: Public can view book copies
DROP POLICY IF EXISTS "Public can view book_copies" ON book_copies;
CREATE POLICY "Public can view book_copies" 
ON book_copies FOR SELECT 
USING (true);

-- Announcements: Public can view announcements
DROP POLICY IF EXISTS "Public can view announcements" ON announcements;
CREATE POLICY "Public can view announcements" 
ON announcements FOR SELECT 
USING (true);

-- Authenticated User Policies
-- Users: Can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid()::text = user_id::text);

-- Users: Can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- Borrow Transactions: Users can view their own borrows
DROP POLICY IF EXISTS "Users can view own borrows" ON borrow_transactions;
CREATE POLICY "Users can view own borrows" 
ON borrow_transactions FOR SELECT 
USING (auth.uid()::text = student_id::text);

-- Notifications: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid()::text = user_id::text);

-- Notifications: Users can update their own notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- School-based Policies
-- Books: Users can view books from their school
DROP POLICY IF EXISTS "Users can view school books" ON books;
CREATE POLICY "Users can view school books" 
ON books FOR SELECT 
USING (
  school_id IN (
    SELECT school_id FROM users WHERE user_id::text = auth.uid()::text
  )
);

-- Book Copies: Users can view copies from their school
DROP POLICY IF EXISTS "Users can view school book copies" ON book_copies;
CREATE POLICY "Users can view school book copies" 
ON book_copies FOR SELECT 
USING (
  book_id IN (
    SELECT book_id FROM books WHERE school_id IN (
      SELECT school_id FROM users WHERE user_id::text = auth.uid()::text
    )
  )
);

-- Borrow Transactions: Librarians can view borrows from their school
DROP POLICY IF EXISTS "Librarians can view school borrows" ON borrow_transactions;
CREATE POLICY "Librarians can view school borrows" 
ON borrow_transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.user_id::text = auth.uid()::text 
    AND r.role_name IN ('Librarian', 'Librarian Admin', 'Super Admin')
    AND u.school_id = (
      SELECT school_id FROM users WHERE user_id = borrow_transactions.student_id
    )
  )
);

-- Super Admin Policies
-- Super Admins can do anything
DROP POLICY IF EXISTS "Super Admins can do anything on schools" ON schools;
CREATE POLICY "Super Admins can do anything on schools" 
ON schools FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.user_id::text = auth.uid()::text 
    AND r.role_name = 'Super Admin'
  )
);

DROP POLICY IF EXISTS "Super Admins can do anything on users" ON users;
CREATE POLICY "Super Admins can do anything on users" 
ON users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.user_id::text = auth.uid()::text 
    AND r.role_name = 'Super Admin'
  )
);

DROP POLICY IF EXISTS "Super Admins can do anything on books" ON books;
CREATE POLICY "Super Admins can do anything on books" 
ON books FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.user_id::text = auth.uid()::text 
    AND r.role_name = 'Super Admin'
  )
);

DROP POLICY IF EXISTS "Super Admins can do anything on borrow_transactions" ON borrow_transactions;
CREATE POLICY "Super Admins can do anything on borrow_transactions" 
ON borrow_transactions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.user_id::text = auth.uid()::text 
    AND r.role_name = 'Super Admin'
  )
);
