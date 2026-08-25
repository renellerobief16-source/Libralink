const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOverdue() {
  const today = new Date();
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(`
      *,
      student:student_id(firstname, lastname, student_number),
      book_copies(accession_number, books(title, isbn))
    `)
    .eq('status', 'active')
    .lt('due_date', today.toISOString());

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Overdue books found:', data.length);
    data.forEach(borrow => {
      const dueDate = new Date(borrow.due_date);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      console.log(`- ${borrow.book_copies?.books?.title || 'Unknown'} by ${borrow.student?.firstname} ${borrow.student?.lastname} - ${daysOverdue} days overdue`);
    });
  } else {
    console.log('No overdue books found');
  }
}

checkOverdue();
