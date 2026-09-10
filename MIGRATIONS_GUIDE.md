# Database Migrations Guide

This document provides instructions for running the database migrations for the realtime interconnected borrowing system.

## Migration Files

The following migrations need to be run in order:

1. **fix_request_status_enum.sql** - Adds missing enum values (released, returned, waiting_pickup, cancelled) to request_status
2. **improve_book_availability_tracking.sql** - Adds columns for tracking availability, due dates, and request lifecycle
3. **enable_supabase_realtime.sql** - Enables Supabase Realtime on borrowing tables
4. **add_library_settings_for_borrower_visibility.sql** - Adds settings for public borrower visibility
5. **add_database_integrity_constraints.sql** - Adds constraints to prevent data integrity issues

## How to Run Migrations

### Option 1: Via Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the content of each migration file
5. Run them in the order listed above
6. Check for any errors and fix them before proceeding to the next migration

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd c:\xampp\htdocs\libralinkk

# Run each migration
supabase db push --file migrations/improve_book_availability_tracking.sql
supabase db push --file migrations/enable_supabase_realtime.sql
supabase db push --file migrations/add_library_settings_for_borrower_visibility.sql
supabase db push --file migrations/add_database_integrity_constraints.sql
```

### Option 3: Via Node.js Script

Create a script to run migrations programmatically:

```javascript
// run-migrations.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration(filePath, migrationName) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running migration: ${migrationName}...`);
    
    // Split by semicolon and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) throw error;
    }
    
    console.log(`Migration ${migrationName} completed successfully`);
    return true;
  } catch (err) {
    console.error(`Error running migration ${migrationName}:`, err);
    return false;
  }
}

async function main() {
  const migrations = [
    { path: './migrations/improve_book_availability_tracking.sql', name: 'improve_book_availability_tracking' },
    { path: './migrations/enable_supabase_realtime.sql', name: 'enable_supabase_realtime' },
    { path: './migrations/add_library_settings_for_borrower_visibility.sql', name: 'add_library_settings_for_borrower_visibility' },
    { path: './migrations/add_database_integrity_constraints.sql', name: 'add_database_integrity_constraints' }
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration.path, migration.name);
    if (!success) {
      console.error(`Failed to run ${migration.name}. Stopping.`);
      process.exit(1);
    }
  }
  
  console.log('All migrations completed successfully');
  process.exit(0);
}

main();
```

Run with:
```bash
node run-migrations.js
```

## Migration Details

### 1. improve_book_availability_tracking.sql

- Adds `approved_at`, `approved_by`, `pickup_date`, `borrow_date`, `due_date`, `return_date`, `rejection_reason`, `cancellation_reason` to `borrow_requests`
- Adds `assigned_copy_id`, `item_status`, `released_at`, `returned_at` to `borrow_request_items`
- Creates indexes for performance
- Creates functions for real-time availability calculation

### 2. enable_supabase_realtime.sql

- Enables Supabase Realtime on: `borrow_requests`, `borrow_request_items`, `book_copies`, `notifications`, `borrow_transactions`
- Allows frontend to subscribe to database changes in real-time

### 3. add_library_settings_for_borrower_visibility.sql

- Adds `show_public_borrower` setting to `library_settings` table
- Creates `app_settings` table as fallback if `library_settings` doesn't exist
- Creates function `get_borrower_visibility_setting` to check if borrower names should be shown

### 4. add_database_integrity_constraints.sql

- Adds check constraints for valid book copy statuses
- Adds unique constraint to prevent double assignment of book copies
- Creates triggers to:
  - Prevent double approval
  - Update book copy status on request status change
- Creates atomic copy assignment function for concurrent request handling
- Creates availability check function
- Creates status transition validation function

## Verification

After running migrations, verify:

1. Check that new columns exist in the database
2. Test that Supabase Realtime is enabled (check Publication settings)
3. Test that constraints prevent invalid data
4. Test that triggers work correctly

## Rollback

If you need to rollback, you can manually revert the changes or create rollback scripts for each migration.
