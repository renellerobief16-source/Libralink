const supabase = require('./config/database');
const fs = require('fs');
const path = require('path');

async function assignCoverImages() {
  try {
    console.log('[ASSIGN COVERS] Starting cover image assignment...');

    // Get all books without cover images
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('book_id, title, cover_image')
      .is('cover_image', null)
      .order('book_id', { ascending: true })
      .limit(20);

    if (booksError) {
      console.error('[ASSIGN COVERS] Error fetching books:', booksError);
      return;
    }

    console.log(`[ASSIGN COVERS] Found ${books.length} books without cover images`);

    if (books.length === 0) {
      console.log('[ASSIGN COVERS] No books need cover images');
      return;
    }

    // Get all cover image files
    const uploadsDir = path.join(__dirname, 'uploads', 'book-covers');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'));
    
    console.log(`[ASSIGN COVERS] Found ${files.length} cover image files`);

    if (files.length === 0) {
      console.log('[ASSIGN COVERS] No cover image files found');
      return;
    }

    // Assign cover images to books (round-robin)
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const file = files[i % files.length];
      const coverImagePath = `/uploads/book-covers/${file}`;

      console.log(`[ASSIGN COVERS] Assigning ${file} to book ${book.book_id} (${book.title})`);

      const { error: updateError } = await supabase
        .from('books')
        .update({ cover_image: coverImagePath })
        .eq('book_id', book.book_id);

      if (updateError) {
        console.error(`[ASSIGN COVERS] Error updating book ${book.book_id}:`, updateError);
      } else {
        console.log(`[ASSIGN COVERS] Successfully assigned cover to book ${book.book_id}`);
      }
    }

    console.log('[ASSIGN COVERS] Cover image assignment completed');
  } catch (error) {
    console.error('[ASSIGN COVERS] Error:', error);
  }
}

assignCoverImages();
