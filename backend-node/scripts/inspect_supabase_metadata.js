require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const checks = [
    { name: 'settings table', table: 'information_schema.tables', filter: `table_schema=eq.public&table_name=eq.settings`},
    { name: 'activity_logs fks', table: 'information_schema.key_column_usage', filter: `table_schema=eq.public&table_name=eq.activity_logs`},
    { name: 'borrow_transactions fks', table: 'information_schema.key_column_usage', filter: `table_schema=eq.public&table_name=eq.borrow_transactions`},
    { name: 'books fks', table: 'information_schema.key_column_usage', filter: `table_schema=eq.public&table_name=eq.books`},
    { name: 'book_copies fks', table: 'information_schema.key_column_usage', filter: `table_schema=eq.public&table_name=eq.book_copies`},
    { name: 'users fks', table: 'information_schema.key_column_usage', filter: `table_schema=eq.public&table_name=eq.users`},
  ];

  for (const check of checks) {
    try {
      console.log('---', check.name, '---');
      const { data, error } = await supabase.from(check.table).select('*').filter('table_schema', 'eq', 'public').filter('table_name', 'eq', check.table.includes('tables') ? 'settings' : check.table === 'information_schema.key_column_usage' ? check.filter : '');
      console.log('data', data && data.length ? data.slice(0, 10) : data);
      console.error('error', error);
    } catch (error) {
      console.error('exception', error);
    }
  }
})();
