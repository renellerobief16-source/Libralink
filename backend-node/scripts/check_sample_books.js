require('dotenv').config();
const supabase = require('../config/database');

async function main() {
  const { data, error } = await supabase.from('books').select('*').limit(3);
  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  console.log('Columns in books table:', Object.keys(data[0] || {}));
  console.log('Sample book:', data[0]);

  // Categories
  const { data: cats } = await supabase.from('categories').select('*');
  console.log('Categories count:', cats?.length);
  console.log('Categories:', cats);

  // Check if any books match nursing/health/medical
  const { data: nursingBooks } = await supabase.from('books').select('book_id, title, author, category_id, school_id').or('title.ilike.%nurs%,title.ilike.%health%,title.ilike.%medic%,title.ilike.%anatom%').limit(10);
  console.log('Nursing/Health books found in DB:', nursingBooks);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
