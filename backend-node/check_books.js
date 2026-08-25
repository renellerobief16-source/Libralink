require('dotenv').config();
const supabase = require('./config/database');

(async () => {
  try {
    console.log('Checking books table...');
    const { data, error, count } = await supabase
      .from('books')
      .select('book_id, title, school_id, schools(school_name)', { count: 'exact' });
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Books count:', count);
      console.log('Books data length:', data.length);
      
      // Group by school
      const bySchool = {};
      data.forEach(book => {
        const schoolName = book.schools?.school_name || 'Unknown';
        if (!bySchool[schoolName]) {
          bySchool[schoolName] = [];
        }
        bySchool[schoolName].push(book);
      });
      
      console.log('\nBooks by school:');
      Object.keys(bySchool).forEach(school => {
        console.log(`- ${school}: ${bySchool[school].length} books`);
      });
      
      if (data.length > 0) {
        console.log('\nSample books from each school:');
        Object.keys(bySchool).slice(0, 5).forEach(school => {
          const sample = bySchool[school][0];
          console.log(`- ${school}: ID ${sample.book_id}, "${sample.title}" (School ID: ${sample.school_id})`);
        });
      }
    }
  } catch (err) {
    console.error('Exception:', err);
  }
})();
