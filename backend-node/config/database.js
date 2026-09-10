const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend-node/.env');
}

if (!/^https?:\/\/[^\s]+$/i.test(supabaseUrl)) {
  throw new Error('SUPABASE_URL must be a valid URL starting with https://');
}

// Print environment variables for debugging (excluding secrets)
console.log('=== Database Configuration ===');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', serviceRoleKey.length);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('===============================');

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    global: {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// Test connection
supabase.from('schools').select('school_id', { count: 'exact', head: true }).then(({ error, count }) => {
  if (error) {
    console.error('=== Supabase Connection Error ===', error.message);
  } else {
    console.log(`✓ Connected to Supabase successfully (${count} schools)`);
  }
}).catch(err => {
  console.error('=== Supabase Connection Exception ===', err.message);
});

module.exports = supabase;
