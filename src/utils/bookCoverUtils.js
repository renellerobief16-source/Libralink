import { getBackendAssetUrl } from './api';

/**
 * Curated preset covers available for quick manual selection by librarians
 * as well as smart automatic category/title fallback.
 */
export const PRESET_BOOK_COVERS = [
  { id: 'tech_coding', label: 'Technology & Coding', path: '/topics/tech_coding.jpg', category: 'Computer Science & IT' },
  { id: 'algorithms', label: 'Algorithms & Computing', path: '/books/algorithms.jpg', category: 'Computer Science & IT' },
  { id: 'science_health', label: 'Science & Health', path: '/topics/science_health.jpg', category: 'Nursing & Health Sciences' },
  { id: 'nursing', label: 'Nursing Practice', path: '/books/nursing.jpg', category: 'Nursing & Health Sciences' },
  { id: 'engineering_math', label: 'Engineering & Mathematics', path: '/topics/engineering_math.jpg', category: 'Engineering & Technology' },
  { id: 'engineering', label: 'Applied Engineering', path: '/books/engineering.jpg', category: 'Engineering & Technology' },
  { id: 'business_finance', label: 'Business & Finance', path: '/topics/business_finance.jpg', category: 'Business & Accountancy' },
  { id: 'economics', label: 'Economics & Markets', path: '/books/economics.jpg', category: 'Business & Accountancy' },
  { id: 'law_criminology', label: 'Law & Criminology', path: '/topics/law_criminology.jpg', category: 'Criminology & Law' },
  { id: 'education_pedagogy', label: 'Education & Pedagogy', path: '/topics/education_pedagogy.jpg', category: 'Education & Teaching' },
  { id: 'literature_fiction', label: 'Literature & Fiction', path: '/topics/literature_fiction.jpg', category: 'Literature & Languages' },
  { id: 'american_literature', label: 'American Literature', path: '/books/american_literature.jpg', category: 'Literature & Languages' },
  { id: 'shakespeare', label: 'Classic Drama & Shakespeare', path: '/books/shakespeare.jpg', category: 'Literature & Languages' },
  { id: 'history_society', label: 'History & Society', path: '/topics/history_society.jpg', category: 'Social Sciences & History' },
  { id: 'history', label: 'World History', path: '/books/history.jpg', category: 'Social Sciences & History' },
  { id: 'psychology_selfhelp', label: 'Psychology & Growth', path: '/topics/psychology_selfhelp.jpg', category: 'Psychology' },
  { id: 'psychology', label: 'Psychology Science', path: '/books/psychology.jpg', category: 'Psychology' },
  { id: 'arts_design', label: 'Arts & Design', path: '/topics/arts_design.jpg', category: 'Arts & Design' },
  { id: 'hospitality_tourism', label: 'Hospitality & Tourism', path: '/topics/hospitality_tourism.jpg', category: 'Hospitality & Tourism' },
  { id: 'agriculture', label: 'Agriculture & Biosystems', path: '/books/agriculture.jpg', category: 'Agricultural Sciences' },
  { id: 'einstein', label: 'Physics & Relativity', path: '/books/einstein.jpg', category: 'Natural Sciences' }
];

/**
 * Smart automatic title/category keyword matching to high-res book covers
 */
export function getAutomaticCoverByTitle(book) {
  const text = `${book?.title || ''} ${book?.category_name || book?.category?.category_name || book?.category || ''} ${book?.subject || ''} ${book?.course || ''}`.toLowerCase();

  // Reference, Encyclopedia, Dictionary, Almanac, Knowledge, General Collection
  if (
    text.includes('encycloped') ||
    text.includes('lexicon') ||
    text.includes('dictionary') ||
    text.includes('almanac') ||
    text.includes('quotation') ||
    text.includes('handbook') ||
    text.includes('knowledge') ||
    text.includes('general collection') ||
    text.includes('reference')
  ) {
    return '/topics/education_pedagogy.jpg';
  }

  // Religion, Bible, Roman, Theology, Spiritual
  if (
    text.includes('bible') ||
    text.includes('roman') ||
    text.includes('relig') ||
    text.includes('spirit') ||
    text.includes('theolog') ||
    text.includes('church') ||
    text.includes('faith') ||
    text.includes('scripture')
  ) {
    return '/books/history.jpg';
  }

  // Language, Linguistics, Grammar, Communication
  if (
    text.includes('linguist') ||
    text.includes('grammar') ||
    text.includes('language') ||
    text.includes('speech') ||
    text.includes('communication')
  ) {
    return '/books/american_literature.jpg';
  }

  // Leadership, Administration, Management, Competence, Employees, HR
  if (
    text.includes('leadership') ||
    text.includes('administration') ||
    text.includes('human resource') ||
    text.includes('competenc') ||
    text.includes('management') ||
    text.includes('employee') ||
    text.includes('organization')
  ) {
    return '/topics/business_finance.jpg';
  }

  // Security, Crime, Criminology, Law, Abuses
  if (
    text.includes('securit') ||
    text.includes('crime') ||
    text.includes('crimin') ||
    text.includes('abuse') ||
    text.includes('law') ||
    text.includes('justice') ||
    text.includes('penal') ||
    text.includes('court') ||
    text.includes('forensic')
  ) {
    return '/topics/law_criminology.jpg';
  }

  // Education, Teaching, Elementary, Teachers, School, Pedagogy
  if (
    text.includes('educ') ||
    text.includes('teach') ||
    text.includes('school') ||
    text.includes('pedagog') ||
    text.includes('student') ||
    text.includes('curriculum') ||
    text.includes('classroom') ||
    text.includes('instruction') ||
    text.includes('academic')
  ) {
    return '/topics/education_pedagogy.jpg';
  }

  // Agriculture & Biosciences
  if (text.includes('agri') || text.includes('farm') || text.includes('crop') || text.includes('soil')) {
    return '/books/agriculture.jpg';
  }
  if (text.includes('american lit') || (text.includes('american') && text.includes('literature'))) {
    return '/books/american_literature.jpg';
  }
  if (text.includes('shakespeare') || text.includes('hamlet') || text.includes('macbeth') || text.includes('playwright')) {
    return '/books/shakespeare.jpg';
  }
  if (text.includes('literature') || text.includes('novel') || text.includes('poem') || text.includes('poetry') || text.includes('fiction') || text.includes('prose') || text.includes('english')) {
    return '/topics/literature_fiction.jpg';
  }
  if (text.includes('nurs') || text.includes('patient care')) {
    return '/books/nursing.jpg';
  }
  if (text.includes('medic') || text.includes('health') || text.includes('clinical') || text.includes('hospital') || text.includes('anatomy') || text.includes('physio') || text.includes('pharmac') || text.includes('biology')) {
    return '/topics/science_health.jpg';
  }
  if (text.includes('algo') || text.includes('program') || text.includes('python') || text.includes('java') || text.includes('c++') || text.includes('web dev') || text.includes('code') || text.includes('software')) {
    return '/books/algorithms.jpg';
  }
  if (text.includes('tech') || text.includes('comput') || text.includes('data') || text.includes('network') || text.includes('cyber') || text.includes('system') || text.includes('information tech')) {
    return '/topics/tech_coding.jpg';
  }
  if (text.includes('econom') || text.includes('microeconom') || text.includes('macroeconom')) {
    return '/books/economics.jpg';
  }
  if (text.includes('business') || text.includes('finance') || text.includes('market') || text.includes('accounting') || text.includes('bank') || text.includes('entrepreneur')) {
    return '/topics/business_finance.jpg';
  }
  if (text.includes('history') || text.includes('philippine') || text.includes('heritage') || text.includes('revolution') || text.includes('civilization') || text.includes('historical')) {
    return '/books/history.jpg';
  }
  if (text.includes('society') || text.includes('sociolog') || text.includes('politi') || text.includes('governance')) {
    return '/topics/history_society.jpg';
  }
  if (text.includes('philo') || text.includes('ethics') || text.includes('metaphys') || text.includes('logic')) {
    return '/topics/history_society.jpg';
  }
  if (text.includes('psycholog') || text.includes('mental') || text.includes('behavior') || text.includes('mind') || text.includes('counsel') || text.includes('therapy')) {
    return '/books/psychology.jpg';
  }
  if (text.includes('self-help') || text.includes('growth') || text.includes('habit')) {
    return '/topics/psychology_selfhelp.jpg';
  }
  if (text.includes('einstein') || text.includes('physics') || text.includes('relativity') || text.includes('quantum') || text.includes('astronomy')) {
    return '/books/einstein.jpg';
  }
  if (text.includes('engineer') || text.includes('mechanic') || text.includes('circuit') || text.includes('civil') || text.includes('electrical')) {
    return '/books/engineering.jpg';
  }
  if (text.includes('math') || text.includes('calculus') || text.includes('algebra') || text.includes('statistic') || text.includes('geometry')) {
    return '/topics/engineering_math.jpg';
  }
  if (text.includes('art') || text.includes('design') || text.includes('draw') || text.includes('paint') || text.includes('architect') || text.includes('media') || text.includes('visual')) {
    return '/topics/arts_design.jpg';
  }
  if (text.includes('touris') || text.includes('hotel') || text.includes('hospitality') || text.includes('culinary') || text.includes('travel')) {
    return '/topics/hospitality_tourism.jpg';
  }

  // Deterministic fallback based on title hash so the cover stays consistent
  const fallbackCovers = [
    '/books/algorithms.jpg',
    '/books/engineering.jpg',
    '/books/economics.jpg',
    '/books/history.jpg',
    '/books/nursing.jpg',
    '/books/american_literature.jpg',
    '/books/psychology.jpg',
    '/books/agriculture.jpg',
    '/books/shakespeare.jpg',
    '/topics/tech_coding.jpg',
    '/topics/business_finance.jpg',
    '/topics/science_health.jpg'
  ];
  const seed = (Number(book?.id || book?.book_id) || 0) + (book?.title?.length || 0);
  return fallbackCovers[Math.abs(seed) % fallbackCovers.length];
}

/**
 * OpenLibrary ISBN Cover URL helper
 */
export function getOpenLibraryCoverUrl(isbn) {
  if (!isbn) return null;
  const clean = String(isbn).replace(/[^0-9X]/gi, '').trim();
  if (clean.length >= 9) {
    return `https://covers.openlibrary.org/b/isbn/${clean}-M.jpg?default=false`;
  }
  return null;
}

/**
 * Universal Master Book Cover Resolver
 * Checks:
 * 1. Uploaded/saved database cover (cover_image / cover / image_url)
 *    - Maps any uploads to permanent Supabase Storage public CDN
 * 2. Frontend public asset presets (/books/... and /topics/...)
 * 3. Automatic title & category keyword matching
 */
export function getBookCoverUrl(book) {
  const rawCover = book?.cover_image || book?.cover || book?.image_url;

  if (rawCover && typeof rawCover === 'string' && rawCover.trim() !== '') {
    const trimmed = rawCover.trim();

    // 1. If it's an uploaded book cover (from /uploads/book-covers or book-cover-...)
    if (trimmed.includes('book-covers/') || trimmed.includes('book-cover-')) {
      // If already a full public Supabase or external URL, return it directly
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      // Extract filename and route directly to permanent Supabase Storage public CDN
      const filename = trimmed.split('/').pop().split('?')[0];
      if (filename) {
        return `https://yacrlfcbeltxtiztvwgo.supabase.co/storage/v1/object/public/book-covers/${filename}`;
      }
    }

    // 2. If the path starts with /books/ or /topics/, it's a frontend public asset preset
    if (trimmed.startsWith('/books/') || trimmed.startsWith('/topics/')) {
      return trimmed;
    }

    // 3. Full external URL or data URI
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    // 4. Any other backend relative asset
    return getBackendAssetUrl(trimmed);
  }

  // 5. Automatic title & category keyword matching
  return getAutomaticCoverByTitle(book);
}
