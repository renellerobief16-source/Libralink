-- Add is_global column to notifications
-- LibraLink Multi-School Library Management System
-- Used to mark notifications broadcast system-wide by the Super Admin
-- (global announcements), as opposed to school-scoped ones.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_is_global
  ON notifications(is_global);

COMMENT ON COLUMN notifications.is_global IS
  'TRUE when a super admin broadcast this notification to every school (global announcement).';