-- ============================================
-- IMPORT HISTORY TABLE
-- ============================================
-- This table tracks all bulk import operations

CREATE TABLE IF NOT EXISTS import_history (
  import_id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_history_school_id ON import_history(school_id);
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);
CREATE INDEX IF NOT EXISTS idx_import_history_import_date ON import_history(import_date);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);