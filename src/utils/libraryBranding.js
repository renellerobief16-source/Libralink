/**
 * libraryBranding.js
 * Universal dynamic branding utility for LibraLink library units.
 * Supports: Senior High School (SHS), Junior High School (JHS), 
 * College / Higher Education, Elementary, Specialized / Law / Medical / Research.
 */

export function getLibraryBranding(libraryType = '', libraryName = '') {
  const type = String(libraryType || '').toLowerCase().trim();
  const name = String(libraryName || '').toLowerCase().trim();

  // 1. Senior High School (SHS)
  if (
    type === 'senior_high_school' ||
    name.includes('senior high') ||
    name.includes('shs') ||
    name.includes('high school')
  ) {
    return {
      key: 'senior_high_school',
      badgeText: libraryName || 'Senior High School Library',
      shortBadge: 'SHS Library',
      icon: '🎓',
      ribbonBg: 'bg-emerald-600',
      ribbonGradient: 'from-emerald-600 via-teal-600 to-indigo-700',
      tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accentColor: 'emerald',
      accentHex: '#059669',
      accentClass: 'text-emerald-600',
      educationLevel: 'Senior High School (Grades 11-12)',
      academicTracksLabel: 'Strand / Track',
      defaultCategory: 'SHS Academic & Strands',
      categories: [
        'All',
        'STEM (Science, Tech, Eng, Math)',
        'ABM (Accountancy & Business)',
        'HUMSS (Humanities & Social Sciences)',
        'GAS (General Academic Strand)',
        'TVL (Technical-Vocational-Livelihood)',
        'General Reference & Fiction',
        'Filipiniana'
      ],
      samplePatronPlaceholder: 'e.g. 12-digit Learner Reference Number (LRN)'
    };
  }

  // 2. Junior High School (JHS)
  if (
    type === 'junior_high_school' ||
    name.includes('junior high') ||
    name.includes('jhs')
  ) {
    return {
      key: 'junior_high_school',
      badgeText: libraryName || 'Junior High School Library',
      shortBadge: 'JHS Library',
      icon: '🎒',
      ribbonBg: 'bg-purple-600',
      ribbonGradient: 'from-purple-600 via-violet-600 to-indigo-700',
      tagClass: 'bg-purple-50 text-purple-700 border-purple-200',
      accentColor: 'purple',
      accentHex: '#7c3aed',
      accentClass: 'text-purple-600',
      educationLevel: 'Junior High School (Grades 7-10)',
      academicTracksLabel: 'Grade Level',
      defaultCategory: 'JHS Core Curriculum',
      categories: [
        'All',
        'Grade 7 Curriculum',
        'Grade 8 Curriculum',
        'Grade 9 Curriculum',
        'Grade 10 Curriculum',
        'Science & Math',
        'Literature & Languages',
        'Social Studies (AP)',
        'Filipiniana'
      ],
      samplePatronPlaceholder: 'e.g. JHS Student Number or LRN'
    };
  }

  // 3. Elementary Education
  if (
    type === 'elementary' ||
    name.includes('elementary') ||
    name.includes('grade school') ||
    name.includes('primary')
  ) {
    return {
      key: 'elementary',
      badgeText: libraryName || 'Elementary School Library',
      shortBadge: 'Elementary Library',
      icon: '🧸',
      ribbonBg: 'bg-amber-600',
      ribbonGradient: 'from-amber-600 via-orange-600 to-yellow-600',
      tagClass: 'bg-amber-50 text-amber-700 border-amber-200',
      accentColor: 'amber',
      accentHex: '#d97706',
      accentClass: 'text-amber-600',
      educationLevel: 'Elementary School (Grades 1-6)',
      academicTracksLabel: 'Grade Level',
      defaultCategory: 'Elementary Collection',
      categories: [
        'All',
        'Primary (Grades 1-3)',
        'Intermediate (Grades 4-6)',
        'Picture Books & Early Readers',
        'Children’s Fiction & Fables',
        'Science & Nature',
        'General Reference'
      ],
      samplePatronPlaceholder: 'e.g. Elementary Pupil Number or LRN'
    };
  }

  // 4. Specialized / Research / Law / Medical / Graduate School
  if (
    type === 'specialized' ||
    name.includes('specialized') ||
    name.includes('law') ||
    name.includes('research') ||
    name.includes('medical') ||
    name.includes('nursing') ||
    name.includes('graduate')
  ) {
    return {
      key: 'specialized',
      badgeText: libraryName || 'Specialized / Research Library',
      shortBadge: 'Specialized Library',
      icon: '🔬',
      ribbonBg: 'bg-indigo-600',
      ribbonGradient: 'from-indigo-600 via-blue-700 to-cyan-600',
      tagClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accentColor: 'indigo',
      accentHex: '#4f46e5',
      accentClass: 'text-indigo-600',
      educationLevel: 'Specialized / Post-Graduate',
      academicTracksLabel: 'Program / Specialization',
      defaultCategory: 'Specialized Research Collection',
      categories: [
        'All',
        'Journals & Periodicals',
        'Research Theses & Dissertations',
        'Legal & Regulatory Texts',
        'Clinical & Health Sciences',
        'Specialized Archives'
      ],
      samplePatronPlaceholder: 'e.g. Researcher / Post-Graduate ID'
    };
  }

  // 5. Default: College / Higher Education
  return {
    key: 'college',
    badgeText: libraryName || 'College Main Library',
    shortBadge: 'College Library',
    icon: '📚',
    ribbonBg: 'bg-blue-600',
    ribbonGradient: 'from-blue-600 via-indigo-600 to-cyan-700',
    tagClass: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: 'blue',
    accentHex: '#2563eb',
    accentClass: 'text-blue-600',
    educationLevel: 'College / Higher Education',
    academicTracksLabel: 'Degree Program / Course',
    defaultCategory: 'College Academic Collection',
    categories: [
      'All',
      'Computer Science & IT',
      'Engineering & Technology',
      'Nursing & Health Sciences',
      'Business & Accountancy',
      'Education & Teaching',
      'Literature & Languages',
      'Criminology & Law',
      'Social Sciences & History',
      'Mathematics & Natural Sciences',
      'Filipiniana'
    ],
    samplePatronPlaceholder: 'e.g. 2024-12345 or Student Number'
  };
}
