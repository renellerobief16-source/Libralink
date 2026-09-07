-- Add school_id column to announcements
-- LibraLink Multi-School Library Management System
-- Enables school-scoped announcements created by Librarian Admins.
-- - NULL school_id  → global announcement (created by Super Admin)
-- - set school_id   → school-scoped announcement

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(school_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_announcements_school_id
  ON announcements(school_id);

COMMENT ON COLUMN announcements.school_id IS
  'NULL when the announcement is global (Super Admin); set to a school_id when the announcement is scoped to one school (Librarian Admin).';
