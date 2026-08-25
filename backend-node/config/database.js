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

// Test connection with detailed error logging
console.log('Testing Supabase connection with SERVICE_ROLE_KEY...');
supabase.from('schools').select('*', { count: 'exact' }).then(({ data, error, status, statusText, count }) => {
  console.log('=== Supabase Connection Test ===');
  console.log('Data:', data);
  console.log('Error:', error);
  console.log('Status:', status);
  console.log('Status Text:', statusText);
  console.log('Count:', count);
  console.log('Full response:', JSON.stringify({ data, error, status, statusText, count }, null, 2));
  console.log('===============================');
  
  if (error) {
    console.error('=== Supabase Connection Error ===');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('================================');
  } else {
    console.log('✓ Connected to Supabase successfully with SERVICE_ROLE_KEY');
    console.log('Schools count:', count);
    console.log('Schools data:', data);
  }
}).catch(err => {
  console.error('=== Supabase Connection Exception ===');
  console.error('Exception type:', err.constructor.name);
  console.error('Exception message:', err.message);
  console.error('Exception stack:', err.stack);
  console.error('Full exception:', JSON.stringify(err, null, 2));
  console.error('====================================');
});

module.exports = supabase;
