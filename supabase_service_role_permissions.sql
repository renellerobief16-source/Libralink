-- Grant full permissions to service_role to bypass RLS
-- Run this in Supabase SQL Editor

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant permissions on all sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on all functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant permissions on specific tables (alternative if above doesn't work)
GRANT SELECT, INSERT, UPDATE, DELETE ON schools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON authors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON publishers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON books TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON book_authors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON book_copies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON borrow_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interlibrary_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO service_role;
