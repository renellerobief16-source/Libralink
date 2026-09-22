const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function check() {
  const { data: requests, error } = await supabase
    .from('borrow_requests')
    .select('request_id, student_id, id_picture_url, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Borrow requests with id_picture_url:');
  console.log(JSON.stringify(requests, null, 2));

  // Also check students table / users table
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('user_id, student_number, firstname, lastname, profile_image')
    .limit(5);

  console.log('Users:');
  console.log(JSON.stringify(users, null, 2));
}

check().catch(console.error);
