-- Notifications System Migration
-- LibraLink Multi-School Library Management System

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('BORROW_REQUEST_SUBMITTED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_REJECTED', 'BOOK_READY_FOR_PICKUP', 'BOOK_BORROWED', 'BOOK_RETURNED', 'PERMISSION_LETTER_GENERATED')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_request_id VARCHAR(20) REFERENCES borrow_requests(request_id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON notifications TO service_role;
GRANT USAGE, SELECT ON SEQUENCE notifications_notification_id_seq TO service_role;
