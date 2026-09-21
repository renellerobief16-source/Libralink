/**
 * Libralink Library Catalog Export & Backup Utilities
 * Supports Multi-Sheet Excel (.xlsx) and Universal UTF-8 CSV (.csv)
 */

export async function exportBooksToExcel(books = [], options = {}) {
  const XLSX = await import('xlsx');

  const campusCode = options.schoolCode || localStorage.getItem('schoolCode') || 'Campus';
  const campusName = options.schoolName || localStorage.getItem('schoolName') || 'Libralink Library';
  const today = new Date().toISOString().split('T')[0];
  const filename = options.filename || `Libralink_Books_Backup_${campusCode}_${today}.xlsx`;

  // ─────────────────────────────────────────────────────────────
  // 1. Sheet 1: Catalog Titles Summary
  // ─────────────────────────────────────────────────────────────
  const catalogRows = books.map((book, index) => {
    const total = Number(book.total_copies ?? (Array.isArray(book.book_copies) ? book.book_copies.length : 1));
    const avail = Number(book.available_copies ?? total);
    const borrowed = Math.max(0, total - avail);

    return {
      'No.': index + 1,
      'Book ID': book.id || 'N/A',
      'Title': book.title || 'Untitled',
      'Author / Creator': book.author || 'Unknown Author',
      'ISBN': book.isbn || 'N/A',
      'Call Number': book.callNumber || book.call_number || 'N/A',
      'Publisher': book.publisher || 'N/A',
      'Publication Year': book.year || book.publication_year || book.copyright_year || 'N/A',
      'Edition': book.edition || 'N/A',
      'Category / Subject': book.category || 'General Collection',
      'Shelf Location': book.location || book.shelf_location || 'Main Stacks',
      'Total Copies': total,
      'Available Copies': avail,
      'Currently Borrowed': borrowed,
      'Series': book.series || book.series_title || '',
      'Physical Description': book.physical_description || '',
      'Notes / Remarks': book.remarks || book.general_note || ''
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Sheet 2: Granular Physical Copies & Barcodes
  // ─────────────────────────────────────────────────────────────
  const copyRows = [];
  let copyIndex = 1;

  books.forEach((book) => {
    const copies = Array.isArray(book.book_copies) && book.book_copies.length > 0
      ? book.book_copies
      : null;

    if (copies) {
      copies.forEach((copy) => {
        copyRows.push({
          'Copy No.': copyIndex++,
          'Copy ID': copy.copy_id || copy.id || 'N/A',
          'Book ID': book.id || 'N/A',
          'Book Title': book.title || 'Untitled',
          'Author': book.author || 'Unknown Author',
          'Accession Number': copy.accession_number || copy.accessionNumber || 'N/A',
          'Barcode': copy.barcode || copy.barcode_number || 'N/A',
          'Current Status': String(copy.status || 'available').toUpperCase(),
          'Copy Location': copy.shelf_location || book.location || 'Main Stacks',
          'Condition Note': copy.condition_note || copy.remarks || 'Good',
          'Acquisition Date': copy.created_at ? new Date(copy.created_at).toISOString().split('T')[0] : 'N/A'
        });
      });
    } else {
      // Fallback: If no granular copy records exist, generate entry from book header
      const total = Number(book.total_copies || 1);
      for (let i = 1; i <= total; i++) {
        copyRows.push({
          'Copy No.': copyIndex++,
          'Copy ID': `${book.id}-C${i}`,
          'Book ID': book.id || 'N/A',
          'Book Title': book.title || 'Untitled',
          'Author': book.author || 'Unknown Author',
          'Accession Number': `ACC-${book.id}-${String(i).padStart(3, '0')}`,
          'Barcode': `BC-${book.id}-${String(i).padStart(3, '0')}`,
          'Current Status': i <= Number(book.available_copies ?? total) ? 'AVAILABLE' : 'BORROWED',
          'Copy Location': book.location || 'Main Stacks',
          'Condition Note': 'Good',
          'Acquisition Date': today
        });
      }
    }
  });

  // Create Sheets
  const wsCatalog = XLSX.utils.json_to_sheet(catalogRows);
  const wsCopies = XLSX.utils.json_to_sheet(copyRows);

  // Auto-fit Column Widths Helper
  const autoFitColumns = (rows) => {
    if (!rows || rows.length === 0) return [];
    const keys = Object.keys(rows[0]);
    return keys.map((key) => {
      let maxLen = key.length;
      for (let i = 0; i < Math.min(rows.length, 100); i++) {
        const val = rows[i][key];
        const len = val ? String(val).length : 0;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
  };

  wsCatalog['!cols'] = autoFitColumns(catalogRows);
  wsCopies['!cols'] = autoFitColumns(copyRows);

  // Build Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsCatalog, 'Catalog Titles');
  XLSX.utils.book_append_sheet(wb, wsCopies, 'Physical Copies & Barcodes');

  // Trigger browser download
  XLSX.writeFile(wb, filename);

  return {
    success: true,
    filename,
    totalTitles: catalogRows.length,
    totalCopies: copyRows.length
  };
}

export function exportBooksToCsv(books = [], options = {}) {
  const campusCode = options.schoolCode || localStorage.getItem('schoolCode') || 'Campus';
  const today = new Date().toISOString().split('T')[0];
  const filename = options.filename || `Libralink_Books_Backup_${campusCode}_${today}.csv`;

  const headers = [
    'Book ID',
    'Title',
    'Author',
    'ISBN',
    'Call Number',
    'Publisher',
    'Publication Year',
    'Edition',
    'Category',
    'Shelf Location',
    'Total Copies',
    'Available Copies',
    'Currently Borrowed',
    'Remarks'
  ];

  const escapeCsv = (str) => {
    const val = str === null || str === undefined ? '' : String(str);
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = books.map((book) => {
    const total = Number(book.total_copies ?? (Array.isArray(book.book_copies) ? book.book_copies.length : 1));
    const avail = Number(book.available_copies ?? total);
    const borrowed = Math.max(0, total - avail);

    return [
      escapeCsv(book.id),
      escapeCsv(book.title),
      escapeCsv(book.author),
      escapeCsv(book.isbn),
      escapeCsv(book.callNumber || book.call_number),
      escapeCsv(book.publisher),
      escapeCsv(book.year || book.publication_year || book.copyright_year),
      escapeCsv(book.edition),
      escapeCsv(book.category),
      escapeCsv(book.location || book.shelf_location),
      escapeCsv(total),
      escapeCsv(avail),
      escapeCsv(borrowed),
      escapeCsv(book.remarks || book.general_note)
    ].join(',');
  });

  // Prepend UTF-8 BOM so Microsoft Excel correctly renders Unicode characters
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    filename,
    totalTitles: books.length
  };
}
