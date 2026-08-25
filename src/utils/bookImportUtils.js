// ============================================
// BOOK IMPORT UTILITY FUNCTIONS - ADVANCED AUTO-MAPPING
// ============================================

/**
 * EXACT MATCHES for user's specific CSV columns (highest priority)
 * Keys are NORMALIZED forms (output of normalizeColumnName) so the lookup
 * at detectColumnMapping works correctly. Values are actual DB column names
 * from the production books table (migrate_books_production.sql).
 */
const EXACT_CSV_MATCHES = {
  // First CSV format columns (normalized keys)
  'accession': 'accession_number',
  'accid': 'accession_number',
  'title': 'title',
  'author': 'author',
  'publisher': 'publisher',
  'call_number': 'call_number',
  'isbn': 'isbn',
  'ye_ar': 'copyright_year',
  'status': 'status',
  'location': 'shelf_location',
  'coun_ter': 'quantity',
  'copies': 'quantity',
  'id': 'ignore',

  // Second CSV format columns (normalized keys)
  'title_edition': 'title',              // "title, edition" -> title_edition
  'copyright_year': 'copyright_year',    // "copyright year" -> copyright_year
  'physical_description_area': 'physical_description', // "physical description area" -> physical_description_area
  'series_title': 'series',              // "series title" -> series_title (maps to series column)
  'general_note': 'remarks',             // "general note" -> general_note (maps to remarks column)
  'acquisition_method': 'acquisition_method', // "acquisition method"
  'price': 'purchase_price',
  'name_of_dealer_donor': 'supplier',    // "name of dealer/donor" -> name_of_dealer_donor
  'subject_topical_terms': 'category',   // "subject/topical terms" -> subject_topical_terms
  'added_personal_name': 'author',       // "added personal name" -> added_personal_name
  'rfid_tag_status': 'rfid_tag',         // "rfid tag status" -> rfid_tag_status
  'accession_number': 'accession_number', // "accession number" -> accession_number
  'quantity': 'quantity',
  'encoded_by': 'encoded_by',            // "encoded by" -> encoded_by
};

/**
 * REAL DATABASE COLUMN NAMES from the production books table
 * (migrate_books_production.sql and add_columns_to_books.sql)
 * These are the actual Supabase column names used for autocorrection mapping.
 */
export const DB_COLUMNS = [
  // books table columns
  'id', 'school_id', 'category_id', 'title', 'subtitle', 'author', 'publisher',
  'isbn', 'call_number', 'shelf_location', 'edition', 'copyright_year',
  'physical_description', 'series', 'genre', 'subject', 'language',
  'quantity', 'available_quantity', 'borrowed_quantity',
  'condition', 'status', 'cover_image', 'remarks',
  'acquisition_method', 'supplier', 'purchase_price', 'place_of_publication',
  'encoded_by', 'created_at', 'updated_at',
  // related columns (resolved via joins)
  'school_name', 'school_code', 'category_name', 'publisher_name',
  'author_name', 'accession_number', 'barcode', 'rfid_tag', 'rfid_tag_status'
];

/**
 * Column alias mapping for common variations
 * Maps various column name formats to actual database columns from
 * the production books table (migrate_books_production.sql)
 */
const COLUMN_ALIASES = {
  // Title variations
  'title': [
    'title', 'book_title', 'booktitle', 'book name', 'book_name', 
    'name', 'bookname', 'btitle', 'book title', 'titulo',
    'pamagat', 'libro', 'ngalan',
    'title, edition', 'title edition', 'title-edition',  // Combined headers
    'title_edition', 'title_name'
  ],
  
  // Sub-title variations
  'subtitle': [
    'subtitle', 'sub_title', 'subheading', 'sub title', 'sub-title', 'sub_title',
    'pamagat na ibaba', 'subtitle text', 'title subtitle'
  ],
  
  // Status variations (for book copy status)
  'status': [
    'status', 'book_status', 'availability', 'state',
    'estado', 'status ng libro', 'book availability',
    'copy_status'
  ],
  
  // Author variations
  'author': [
    'author', 'author_name', 'authorname', 'authors', 'writer', 
    'written by', 'writer name', 'book author', 'author name',
    'by', 'auth', 'may akda', 'sinulat ni', 'co_author', 'co-author'
  ],
  
  // Publisher variations
  'publisher': [
    'publisher', 'publisher_name', 'publishername', 'published by', 
    'publication', 'publishing company', 'publisher company',
    'pub', 'publish', 'lathalain', 'publiser'
  ],
  
  // ISBN variations
  'isbn': [
    'isbn', 'isbn_10', 'isbn_13', 'isbn-10', 'isbn-13', 
    'isbn number', 'isbn_no', 'isbn no', 'isbn no.',
    'isbn10', 'isbn13', 'isbnnumber', 'isbn num'
  ],
  
  // Call number variations
  'call_number': [
    'call_number', 'callnumber', 'call no', 'call_no', 
    'call number', 'classification', 'dewey', 'call no.',
    'callno', 'call', 'tawag', 'numero'
  ],
  
  // Category variations
  'category': [
    'category', 'category_name', 'categoryname', 'subject', 
    'classification', 'genre', 'topic', 'cat', 'class',
    'kategoriya', 'paksa', 'uri',
    'subject/topical terms', 'subject_topical_terms', 'subject topical terms'
  ],
  
  // Copies/Quantity variations
  'quantity': [
    'copies', 'quantity', 'qty', 'number of copies', 'stock', 
    'count', 'total copies', 'no of copies', 'no. of copies',
    'copy', 'kopya', 'dami', 'bilang',
    'coun_ter', 'counter', 'num_copies'
  ],
  
  // School variations
  'school': [
    'school', 'school_name', 'schoolname', 'institution', 
    'library', 'college', 'institution name', 'school id',
    'school_id', 'sch', 'library name', 'paaralan',
    'eskwela', 'institution'
  ],
  
  // Edition variations
  'edition': [
    'edition', 'ed', 'edition no', 'edition_number', 
    'version', 'edition number', 'edn', 'bersyon'
  ],
  
  // Author variations
  'author': [
    'author', 'authors', 'Author', 'Authors', 'AUTHOR', 'AUTHORS',
    'writer', 'writers', 'by', 'By', 'BY',
    'written by', 'Written By', 'WRITTEN BY',
    'author name', 'author_name', 'authorname', 'Author Name', 'Author_Name', 'Authorname',
    'may akda', 'sinulat', 'added personal name', 'added_personal_name',
    'added personal name', 'Added Personal Name', 'ADDED PERSONAL NAME'
  ],
  
  // Copyright year variations
  'copyright_year': [
    'copyright_year', 'copyrightyear', 'year', 'publication_year', 
    'pub_year', 'copyright', 'published year', 'year published',
    'copyright year', 'pubyear', 'taon', 'pub_year'
  ],
  
  // Physical description variations
  'physical_description': [
    'physical_description', 'physicaldescription', 'description', 
    'pages', 'format', 'physical', 'phys desc', 'details',
    'paglalarawan', 'pahina',
    'physical description area', 'physical_description_area', 'physicaldescriptionarea'
  ],
  
  // Series title variations
  'series': [
    'series', 'series_title', 'seriestitle', 'series name',
    'seriest', 'series title', 'serye', 'series_title'
  ],
  
  // General note / remarks variations
  'remarks': [
    'remarks', 'general_note', 'generalnote', 'note', 'notes', 
    'comments', 'remark', 'comment',
    'general notes', 'tala', 'puna',
    'general_note_text', 'note_text'
  ],
  
  // Accession number variations
  'accession_number': [
    'accession_number', 'accessionnumber', 'accession no', 'accession_no', 
    'accession #', 'acc no', 'accid', 'acc id', 'accession',
    'acc no.', 'accession no.', 'accesion'
  ],
  
  // Barcode variations
  'barcode': [
    'barcode', 'bar code', 'bar_code', 'bar',
    'barekode'
  ],
  
  // RFID Tag variations
  'rfid_tag': [
    'rfid_tag', 'rfidtag', 'rfid_tag_status', 'rfidtagstatus',
    'rfid status', 'rfid_status', 'rfid tag status', 'rfid tag', 'rfid'
  ],
  
  // Shelf location variations
  'shelf_location': [
    'shelf_location', 'shelflocation', 'shelf', 'location', 
    'shelf no', 'shelf_no', 'shelf no.', 'book location',
    'shelfnumber', 'estante', 'lugar'
  ],
  
  // Place of publication variations
  'place_of_publication': [
    'place_of_publication', 'placeofpublication', 'place', 
    'published in', 'publication place', 'pub place',
    'place of pub', 'lugar ng publikasyon'
  ],
  
  // Condition variations
  'condition': [
    'condition', 'book_condition', 'state', 'quality',
    'book condition', 'cond', 'kondisyon', 'estado'
  ],
  
  // Acquisition method variations
  'acquisition_method': [
    'acquisition_method', 'acquisitionmethod', 'acquired by', 
    'source', 'acquisition', 'acq method', 'method',
    'acquisition_type', 'paraan ng pagkuha'
  ],
  
  // Supplier variations
  'supplier': [
    'supplier', 'vendor', 'supplied by', 'purchased from',
    'supp', 'vendor name', 'tagapagbigay',
    'name of dealer/donor', 'name_of_dealer_donor', 'name of dealer donor'
  ],
  
  // Purchase price variations
  'purchase_price': [
    'purchase_price', 'purchaseprice', 'price', 'cost', 
    'amount', 'purchase amount', 'cost price', 'presyo'
  ],
  
  // Language variations
  'language': [
    'language', 'lang', 'language_code', 'lng',
    'wika', 'idioma'
  ],
  
  // Encoded by variations
  'encoded_by': [
    'encoded_by', 'encodedby', 'encoded by', 'encoder',
    'nag-encode', 'encoder'
  ]
};

/**
 * Smart column name normalizer
 * - Convert to lowercase
 * - Trim spaces
 * - Remove special characters
 * - Replace spaces, underscores, hyphens, slashes, commas with single underscore
 * - Normalize common abbreviations
 * - Remove multiple consecutive characters
 * - Convert to actual database column names from books table query
 */
export function normalizeColumnName(columnName) {
  if (!columnName) return '';
  
  let normalized = columnName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\-_/,.]/g, '') // Remove special chars except space, hyphen, underscore, slash, comma
    .replace(/[\s\-_/,]+/g, '_')    // Replace space, hyphen, underscore, slash, comma with underscore
    .replace(/_+/g, '_')           // Replace multiple underscores with single
    .replace(/^_|_$/g, '');        // Remove leading/trailing underscores
  
  // Normalize common abbreviations
  const abbreviations = {
    'no': 'number',
    'no.': 'number',
    'num': 'number',
    'num.': 'number',
    'qty': 'quantity',
    'sch': 'school',
    'sch.': 'school',
    'pub': 'publisher',
    'pub.': 'publisher',
    'auth': 'author',
    'ed': 'edition',
    'ed.': 'edition',
    'edn': 'edition',
    'yr': 'year',
    'yr.': 'year',
    'acc': 'accession',
    'acc.': 'accession',
    'cond': 'condition',
    'cond.': 'condition',
    'lng': 'language',
    'lang': 'language'
  };
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
  }
  
  return normalized;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a score between 0 and 1 (1 = exact match)
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  // Simple Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  return 1 - (distance / maxLen);
}

/**
 * Smart column detection with multi-level matching
 * Level 1: Exact normalized match
 * Level 2: Alias match
 * Level 3: Fuzzy match with confidence threshold
 */
export function detectColumnMapping(columnName) {
  const normalized = normalizeColumnName(columnName);
  
  // EXACT MATCHES for user's specific CSV columns (highest priority)
  const exactMatch = EXACT_CSV_MATCHES[normalized];
  if (exactMatch) {
    return { field: exactMatch, confidence: 1.0, method: 'exact-csv-match' };
  }
  
  
  // Priority: If column contains "title", always map to title first
  if (normalized.includes('title') || normalized.includes('pamagat')) {
    return { field: 'title', confidence: 0.95, method: 'priority-title' };
  }
  
  // Priority: If column contains "author", always map to author
  if (normalized.includes('author') || normalized.includes('mayakda') || normalized.includes('writer')) {
    return { field: 'author', confidence: 0.95, method: 'priority-author' };
  }
  
  // Priority: If column contains "publisher", always map to publisher
  if (normalized.includes('publisher') || normalized.includes('lathalain')) {
    return { field: 'publisher', confidence: 0.95, method: 'priority-publisher' };
  }
  
  // Priority: If column contains "isbn", always map to isbn
  if (normalized.includes('isbn')) {
    return { field: 'isbn', confidence: 0.95, method: 'priority-isbn' };
  }
  
  // Priority: If column contains "category"/"subject"/"genre", map to category
  if (normalized.includes('category') || normalized.includes('subject') || normalized.includes('genre') || normalized.includes('kategoriya')) {
    return { field: 'category', confidence: 0.95, method: 'priority-category' };
  }
  
  // Priority: If column contains "school", map to school
  if (normalized.includes('school') || normalized.includes('paaralan') || normalized.includes('eskwela')) {
    return { field: 'school', confidence: 0.95, method: 'priority-school' };
  }
  
  // Priority: If column contains "subtitle"/"sub_title", map to subtitle
  if (normalized.includes('subtitle') || normalized.includes('sub_title')) {
    return { field: 'subtitle', confidence: 0.95, method: 'priority-subtitle' };
  }
  
  // Priority: If column contains "series", map to series
  if (normalized.includes('series') || normalized.includes('serye')) {
    return { field: 'series', confidence: 0.95, method: 'priority-series' };
  }
  
  // Priority: If column contains "quantity"/"copies", map to quantity
  if (normalized.includes('copies') || normalized.includes('quantity') || normalized.includes('qty')) {
    return { field: 'quantity', confidence: 0.95, method: 'priority-quantity' };
  }
  
  // Priority: If column contains "place", map to place_of_publication
  if (normalized.includes('place')) {
    return { field: 'place_of_publication', confidence: 0.9, method: 'priority-place' };
  }
  
  // Level 1: Exact match in aliases
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) {
      return { field, confidence: 1.0, method: 'exact' };
    }
  }
  
  // Level 2: Partial/substring match
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        const similarity = calculateSimilarity(normalized, alias);
        if (similarity >= 0.8) {
          return { field, confidence: similarity, method: 'partial' };
        }
      }
    }
  }
  
  // Level 3: Fuzzy match against all aliases
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const similarity = calculateSimilarity(normalized, alias);
      if (similarity > bestScore && similarity >= 0.6) {
        bestScore = similarity;
        bestMatch = { field, confidence: similarity, method: 'fuzzy' };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Infer column type from data content
 * Used when column name is not recognized
 */
export function inferColumnFromData(columnName, sampleValues) {
  if (!sampleValues || sampleValues.length === 0) return null;
  
  const normalized = normalizeColumnName(columnName);
  const values = sampleValues.filter(v => v && v !== '').slice(0, 10); // Check first 10 non-empty values
  
  if (values.length === 0) return null;
  
  // Check if all values are numbers (quantity/year/price)
  const allNumbers = values.every(v => !isNaN(parseFloat(v)));
  if (allNumbers) {
    const avg = values.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / values.length;
    
    // If average is small (1-100), likely quantity
    if (avg >= 1 && avg <= 100 && values.every(v => parseInt(v) === parseFloat(v))) {
      return { field: 'copies', confidence: 0.7, method: 'inferred from data' };
    }
    
    // If average is year-like (1900-2030), likely year
    if (avg >= 1900 && avg <= 2030) {
      return { field: 'copyright_year', confidence: 0.8, method: 'inferred from data' };
    }
    
    // If average has decimals, likely price
    if (values.some(v => v.includes('.'))) {
      return { field: 'purchase_price', confidence: 0.7, method: 'inferred from data' };
    }
  }
  
  // Check if values look like ISBN (contains numbers and dashes)
  const isISBNLike = values.every(v => /[\d-]/.test(v) && v.length >= 10);
  if (isISBNLike) {
    return { field: 'isbn', confidence: 0.8, method: 'inferred from data' };
  }
  
  // Check if values look like accession numbers
  const isAccessionLike = values.every(v => /acc/i.test(v) || /^\d+$/.test(v));
  if (isAccessionLike) {
    return { field: 'accession_number', confidence: 0.7, method: 'inferred from data' };
  }
  
  // Check if values are short (likely codes)
  const isCodeLike = values.every(v => v.length <= 20 && v.length >= 3);
  if (isCodeLike) {
    return { field: 'call_number', confidence: 0.7, method: 'inferred from data' };
  }
  
  // Check if values are location-like
  const isLocationLike = values.every(v => /shelf|loc|place|estante|lugar/i.test(v));
  if (isLocationLike) {
    return { field: 'shelf_location', confidence: 0.8, method: 'inferred from data' };
  }
  
  // Check if values are condition-like
  const isConditionLike = values.every(v => /good|fair|new|old|poor|excellent|bago|luma/i.test(v));
  if (isConditionLike) {
    return { field: 'condition', confidence: 0.8, method: 'inferred from data' };
  }
  
  // Check if values are longer text (likely title/author/publisher)
  const avgLength = values.reduce((a, b) => a + b.length, 0) / values.length;
  
    if (avgLength > 15) {
    // Likely title or description
    if (normalized.includes('title') || normalized.includes('name') || normalized.includes('book') || normalized.includes('pamagat') || normalized.includes('ngalan')) {
      return { field: 'title', confidence: 0.9, method: 'inferred from data' };
    }
    if (normalized.includes('author') || normalized.includes('writer') || normalized.includes('by') || normalized.includes('may akda') || normalized.includes('sinulat')) {
      return { field: 'author', confidence: 0.9, method: 'inferred from data' };
    }
    if (normalized.includes('publisher') || normalized.includes('pub') || normalized.includes('publishing') || normalized.includes('lathalain')) {
      return { field: 'publisher', confidence: 0.9, method: 'inferred from data' };
    }
    if (normalized.includes('category') || normalized.includes('cat') || normalized.includes('subject') || normalized.includes('genre') || normalized.includes('kategoriya') || normalized.includes('paksa')) {
      return { field: 'category', confidence: 0.9, method: 'inferred from data' };
    }
    if (normalized.includes('series') || normalized.includes('seriest') || normalized.includes('serye')) {
      return { field: 'series', confidence: 0.8, method: 'inferred from data' };
    }
    if (normalized.includes('note') || normalized.includes('remark') || normalized.includes('comment') || normalized.includes('tala') || normalized.includes('puna')) {
      return { field: 'remarks', confidence: 0.8, method: 'inferred from data' };
    }
    if (normalized.includes('shelf') || normalized.includes('location') || normalized.includes('estante') || normalized.includes('lugar')) {
      return { field: 'shelf_location', confidence: 0.8, method: 'inferred from data' };
    }
    // Default to title for long text (most likely)
    return { field: 'title', confidence: 0.7, method: 'inferred from data (default)' };
  }
  
  // If very short (1-3 chars), could be code or abbreviation
  if (avgLength <= 3) {
    return { field: 'call_number', confidence: 0.6, method: 'inferred from data (short)' };
  }
  
  return null;
}

/**
 * Get all available database fields for books import
 * Uses actual column names from the production books table
 */
export function getAvailableFields() {
  return [
    { value: 'title', label: 'Title', required: true },
    { value: 'author', label: 'Author', required: false },
    { value: 'publisher', label: 'Publisher', required: false },
    { value: 'isbn', label: 'ISBN', required: false },
    { value: 'call_number', label: 'Call Number', required: false },
    { value: 'category', label: 'Category', required: false },
    { value: 'quantity', label: 'Quantity', required: true },
    { value: 'school', label: 'School', required: true },
    { value: 'edition', label: 'Edition', required: false },
    { value: 'copyright_year', label: 'Copyright Year', required: false },
    { value: 'physical_description', label: 'Physical Description', required: false },
    { value: 'series', label: 'Series', required: false },
    { value: 'remarks', label: 'Remarks', required: false },
    { value: 'subtitle', label: 'Subtitle', required: false },
    { value: 'place_of_publication', label: 'Place of Publication', required: false },
    { value: 'condition', label: 'Condition', required: false },
    { value: 'acquisition_method', label: 'Acquisition Method', required: false },
    { value: 'supplier', label: 'Supplier', required: false },
    { value: 'purchase_price', label: 'Purchase Price', required: false },
    { value: 'language', label: 'Language', required: false },
    { value: 'accession_number', label: 'Accession Number', required: false },
    { value: 'barcode', label: 'Barcode', required: false },
    { value: 'shelf_location', label: 'Shelf Location', required: false },
    { value: 'rfid_tag', label: 'RFID Tag', required: false },
    { value: 'status', label: 'Status', required: false },
    { value: 'encoded_by', label: 'Encoded By', required: false }
  ];
}

/**
 * Get required fields for book import
 */
export function getRequiredFields() {
  return ['title']; // Only title is truly required
}

/**
 * Get recommended fields for book import
 */
export function getRecommendedFields() {
  return ['category', 'author', 'call_number'];
}

/**
 * Smart quantity extraction
 * Handles various formats: "5", "5 copies", "Qty: 10", etc.
 */
function extractQuantity(value) {
  if (!value) return 1;
  
  // Try direct number
  const directNum = parseInt(String(value), 10);
  if (!isNaN(directNum) && directNum > 0) {
    return directNum;
  }
  
  // Extract number from text
  const match = String(value).match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 0) return num;
  }
  
  return 1; // Default fallback
}

/**
 * Normalize book data from import row with smart defaults
 * Converts various data formats to standard database format
 */
export function normalizeBookData(row, columnMapping) {
  const normalized = {};
  
   // Set default values for optional fields
  const defaultValues = {
    author: null,
    publisher: null,
    isbn: null,
    call_number: null,
    category: null,
    edition: null,
    copyright_year: null,
    physical_description: null,
    series: null,
    remarks: null,
    accession_number: null,
    barcode: null,
    shelf_location: null,
    subtitle: null,
    place_of_publication: null,
    condition: null,
    acquisition_method: null,
    supplier: null,
    purchase_price: null,
    language: null,
    rfid_tag: null,
    status: null,
    encoded_by: null
  };
  
  // Apply defaults first
  Object.assign(normalized, defaultValues);
  
  // Process mapped columns
  for (const [csvColumn, dbField] of Object.entries(columnMapping)) {
    if (dbField === 'ignore' || !row[csvColumn]) continue;
    
    let value = row[csvColumn];
    
    // Normalize specific field types based on actual database columns
    switch (dbField) {
      case 'title':
      case 'subtitle':
      case 'author':
      case 'publisher':
      case 'category':
      case 'series':
      case 'remarks':
      case 'place_of_publication':
      case 'acquisition_method':
      case 'supplier':
      case 'language':
      case 'school':
      case 'encoded_by':
      case 'physical_description':
        // Text fields: trim and normalize whitespace
        value = String(value).trim().replace(/\s+/g, ' ');
        if (value === '') value = null;
        break;
        
      case 'isbn':
        // ISBN: remove hyphens and spaces
        value = String(value).replace(/[-\s]/g, '').toUpperCase();
        if (value === '') value = null;
        break;
        
      case 'call_number':
      case 'accession_number':
      case 'barcode':
      case 'shelf_location':
        // Code fields: uppercase and trim
        value = String(value).trim().toUpperCase();
        if (value === '') value = null;
        break;
        
      case 'quantity':
        // Smart quantity extraction
        value = extractQuantity(value);
        break;
        
      case 'copyright_year':
        // Numeric fields: convert to integer
        value = parseInt(String(value).replace(/[^0-9]/g, ''), 10) || null;
        break;
        
      case 'purchase_price':
        // Price: convert to float
        value = parseFloat(String(value).replace(/[^0-9.]/g, '')) || null;
        break;
        
      case 'rfid_tag':
        // RFID: trim and uppercase
        value = String(value).trim().toUpperCase();
        if (value === '') value = null;
        break;
        
      case 'status':
        // Status: normalize to lowercase
        value = String(value).trim().toLowerCase();
        if (value === '') value = null;
        break;
        
      case 'condition':
        // Condition: normalize to lowercase
        value = String(value).trim().toLowerCase();
        if (value === '') value = null;
        break;
        
      default:
        value = String(value).trim();
        if (value === '') value = null;
    }
    
    normalized[dbField] = value;
  }
  
  // Default quantity to 1 if not set
  if (!normalized.quantity || normalized.quantity <= 0) {
    normalized.quantity = 1;
  }
  
  return normalized;
}

/**
 * Validate a single book import row with detailed error messages
 * Returns validation result with errors and warnings
 * ULTRA-PERMISSIVE: Everything passes, auto-generates missing data
 */
export function validateImportRow(row, rowIndex, existingAccessionNumbers = []) {
  const errors = [];
  const warnings = [];
  
  // NO REQUIRED FIELDS - everything is optional now
  // Auto-generate title if missing
  if (!row.title || row.title.trim() === '') {
    row.title = `Untitled Book ${rowIndex + 1}`;
    warnings.push(`Row ${rowIndex + 1}: Auto-generated title`);
  }
  
  // Auto-correct quantity to always be valid
  if (!row.quantity || isNaN(row.quantity) || row.quantity <= 0) {
    row.quantity = 1;
    warnings.push(`Row ${rowIndex + 1}: Auto-set quantity to 1`);
  }
  
  // School is optional - will be resolved from selection
  if (row.school && row.school.trim() === '') {
    warnings.push(`Row ${rowIndex + 1}: School is empty - will use selected school`);
  }
  
  // Fix ALL data types - never reject
  if (row.copyright_year) {
    const currentYear = new Date().getFullYear();
    if (isNaN(row.copyright_year) || row.copyright_year < 1000 || row.copyright_year > currentYear + 1) {
      row.copyright_year = null; // Remove invalid year
      warnings.push(`Row ${rowIndex + 1}: Invalid copyright year removed`);
    }
  }
  
  if (row.purchase_price && isNaN(row.purchase_price)) {
    row.purchase_price = null; // Remove invalid price
    warnings.push(`Row ${rowIndex + 1}: Invalid purchase price removed`);
  }
  
  // Keep any ISBN regardless of format
  if (row.isbn && row.isbn.length > 0) {
    // Always accept ISBN
  }
  
  // Handle duplicate accession numbers - auto-generate new one
  if (row.accession_number && existingAccessionNumbers.includes(row.accession_number)) {
    row.accession_number = null;
    warnings.push(`Row ${rowIndex + 1}: Duplicate accession number - will auto-generate`);
  }
  
  // ALL ROWS ARE VALID - no errors ever
  return {
    valid: true, // ALWAYS VALID
    errors: [], // NO ERRORS
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Generate confidence score for column mapping
 * Returns confidence level: 'high', 'medium', 'low', or null
 */
export function getMappingConfidence(columnName, detectedField) {
  if (!detectedField) return null;
  
  const normalized = normalizeColumnName(columnName);
  const aliases = COLUMN_ALIASES[detectedField] || [];
  
  // High confidence: exact match (90-100%)
  if (aliases.includes(normalized)) {
    return 'high';
  }
  
  // Medium confidence: partial match (70-89%)
  for (const alias of aliases) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return 'medium';
    }
  }
  
  // Low confidence: weak match (50-69%)
  return 'low';
}

/**
 * Get mapping confidence percentage
 */
export function getMappingConfidencePercentage(columnName, detectedField) {
  if (!detectedField) return 0;
  
  const result = detectColumnMapping(columnName);
  if (result && result.field === detectedField) {
    return Math.round(result.confidence * 100);
  }
  
  return 0;
}

/**
 * Auto-map all columns with advanced detection
 * Returns mapping with confidence scores
 * Unrecognized columns are mapped to custom_<normalized_name> for dynamic creation
 */
export function autoMapColumns(headers, data) {
  const mapping = {};
  const unmappedColumns = [];
  const customColumns = [];
  const mappedFields = new Set();

  for (const header of headers) {
    const detected = detectColumnMapping(header);

    if (detected && detected.confidence >= 0.5) { // Lowered threshold from 0.6 to 0.5
      // Prevent duplicate mappings to same field
      if (!mappedFields.has(detected.field)) {
        mapping[header] = detected.field;
        mappedFields.add(detected.field);
      } else {
        // Field already mapped, try to find alternative
        const alternatives = getAlternativeFields(detected.field);
        for (const alt of alternatives) {
          if (!mappedFields.has(alt)) {
            mapping[header] = alt;
            mappedFields.add(alt);
            break;
          }
        }
        if (!mapping[header]) {
          mapping[header] = 'ignore';
        }
      }
    } else {
      // Try to infer from data content
      const sampleValues = data.map(row => row[header]).filter(v => v);
      const inferred = inferColumnFromData(header, sampleValues);

      if (inferred && inferred.confidence >= 0.4) { // Lowered threshold from 0.5 to 0.4
        if (!mappedFields.has(inferred.field)) {
          mapping[header] = inferred.field;
          mappedFields.add(inferred.field);
        } else {
          mapping[header] = 'ignore';
        }
      } else {
        // Map to a dynamic custom column that will be created in the DB
        const normalized = normalizeColumnName(header);
        const customField = `custom_${normalized}`;
        mapping[header] = customField;
        customColumns.push({
          csvColumn: header,
          dbColumn: customField,
          dataType: inferColumnDataType(header, sampleValues)
        });
        mappedFields.add(customField);
      }
    }
  }

  return { mapping, unmappedColumns, customColumns };
}

/**
 * Infer the best SQL data type for a custom column based on sample values
 * Returns 'text', 'integer', or 'numeric'
 */
export function inferColumnDataType(columnName, sampleValues) {
  if (!sampleValues || sampleValues.length === 0) return 'text';

  const values = sampleValues.filter(v => v !== null && v !== undefined && v !== '');
  if (values.length === 0) return 'text';

  const allNumbers = values.every(v => !isNaN(parseFloat(v)));
  if (allNumbers) {
    // Check if all are integers
    const allIntegers = values.every(v => {
      const num = parseFloat(v);
      return num === parseInt(num, 10);
    });
    if (allIntegers) {
      return 'integer';
    }
    return 'numeric'; // decimal/numeric for prices
  }

  return 'text';
}

/**
 * Generate ALTER TABLE SQL statements for creating dynamic custom columns
 * Returns array of SQL strings to be executed by the backend
 */
export function generateColumnCreationSQL(customColumns) {
  return customColumns.map(col => {
    return `ALTER TABLE books ADD COLUMN IF NOT EXISTS ${col.dbColumn} ${col.dataType};`;
  });
}
function getAlternativeFields(field) {
  const alternatives = {
    'title': ['subtitle', 'series'],
    'subtitle': ['title'],
    'author': [],
    'publisher': [],
    'isbn': ['barcode'],
    'call_number': ['shelf_location', 'accession_number'],
    'category': [],
    'quantity': [],
    'school': [],
    'edition': [],
    'copyright_year': [],
    'physical_description': ['remarks'],
    'series': ['subtitle'],
    'remarks': ['physical_description'],
    'accession_number': ['barcode', 'call_number'],
    'barcode': ['isbn', 'accession_number'],
    'shelf_location': ['call_number'],
    'place_of_publication': [],
    'condition': [],
    'acquisition_method': [],
    'supplier': [],
    'purchase_price': [],
    'rfid_tag': [],
    'status': [],
    'encoded_by': []
  };

  return alternatives[field] || [];
}

/**
 * Parse Excel/CSV file and extract headers and data
 * This is a client-side parser that will be used before sending to backend
 */
export async function parseImportFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  
  if (extension === 'csv') {
    return parseCSVFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
  }
}

/**
 * Parse CSV file
 */
async function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('File is empty'));
          return;
        }
        
        // Parse header
        const headers = parseCSVLine(lines[0]);
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          // Handle rows with different column counts
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          // Add extra values if row has more columns than headers
          if (values.length > headers.length) {
            for (let j = headers.length; j < values.length; j++) {
              row[`extra_column_${j}`] = values[j];
            }
          }
          data.push(row);
        }
        
        resolve({ headers, data, rowCount: data.length });
      } catch (error) {
        reject(new Error('Failed to parse CSV file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse Excel file (requires xlsx library)
 */
async function parseExcelFile(file) {
  try {
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    const headers = jsonData[0].map(h => String(h).trim());
    const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
    
    return {
      headers,
      data: dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] !== undefined ? String(row[index]) : '';
        });
        return obj;
      }),
      rowCount: dataRows.length
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Generate import report as CSV
 */
export function generateImportReport(results) {
  const headers = ['Row Number', 'Title', 'Status', 'Error Type', 'Error Message'];
  const rows = [];
  
  results.forEach((result, index) => {
    if (result.status === 'error' || result.status === 'warning') {
      rows.push([
        index + 1,
        result.data?.title || 'N/A',
        result.status,
        result.errorType || 'N/A',
        result.errorMessage || 'N/A'
      ]);
    }
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  return csvContent;
}

/**
 * Download import report as file
 */
export function downloadImportReport(results, filename = 'import_report.csv') {
  const csvContent = generateImportReport(results);
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
