/**
 * studentRecommendations.js
 * Comprehensive topics, academic courses, and recommendation engine
 * for the LibraLink Student Portal.
 */
import { updateUserProfile, getBackendAssetUrl } from './api';

export const STUDENT_TOPICS = [
  {
    id: "science_health",
    title: "Medical & Health Sciences",
    subtitle: "Nursing, Anatomy, Pharmacology, Pathology & Clinical Care",
    categoryKeywords: [
      "nursing", "nurse", "medicine", "medical", "health", "anatomy", "physiology",
      "pharmacology", "pathology", "clinical", "hospital", "patient", "first aid",
      "pediatric", "surgical", "biology", "science", "healthcare", "ethics", "informatics", "epidemiology"
    ],
    image: "/topics/science_health.jpg",
    fallbackGradient: "from-emerald-600 via-teal-600 to-cyan-800",
    badge: "Health & Medical",
    colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200"
  },
  {
    id: "tech_coding",
    title: "Technology & Coding",
    subtitle: "AI, Web Dev, Cybersecurity & Software Systems",
    categoryKeywords: ["technology", "computer", "programming", "software", "it", "web", "ai", "data", "coding", "algorithm", "database", "network", "python", "java"],
    image: "/topics/tech_coding.jpg",
    fallbackGradient: "from-blue-600 via-indigo-600 to-cyan-700",
    badge: "Tech & IT",
    colorClass: "text-blue-700 bg-blue-50 border-blue-200"
  },
  {
    id: "business_finance",
    title: "Business & Management",
    subtitle: "Finance, Entrepreneurship, Marketing & Accountancy",
    categoryKeywords: ["business", "management", "marketing", "economics", "finance", "accounting", "commerce", "leadership", "administration", "human resources"],
    image: "/topics/business_finance.jpg",
    fallbackGradient: "from-amber-600 via-orange-600 to-rose-700",
    badge: "Business",
    colorClass: "text-amber-700 bg-amber-50 border-amber-200"
  },
  {
    id: "literature_fiction",
    title: "Literature & Fiction",
    subtitle: "Novels, Fantasy, Poetry, Drama & World Classics",
    categoryKeywords: ["fiction", "literature", "novel", "poetry", "classics", "drama", "fantasy", "story", "prose", "literary", "creative writing"],
    image: "/topics/literature_fiction.jpg",
    fallbackGradient: "from-rose-600 via-pink-600 to-purple-800",
    badge: "Fiction & Novels",
    colorClass: "text-rose-700 bg-rose-50 border-rose-200"
  },
  {
    id: "history_society",
    title: "History & Social Sciences",
    subtitle: "World History, Sociology, Politics, Culture & Heritage",
    categoryKeywords: ["history", "social", "sociology", "politics", "culture", "anthropology", "world", "philippines", "historical", "government"],
    image: "/topics/history_society.jpg",
    fallbackGradient: "from-amber-700 via-yellow-700 to-stone-800",
    badge: "History & Society",
    colorClass: "text-amber-800 bg-amber-50 border-amber-300"
  },
  {
    id: "law_criminology",
    title: "Law & Criminal Justice",
    subtitle: "Criminology, Forensics, Criminal Law & Jurisprudence",
    categoryKeywords: ["law", "criminology", "justice", "legal", "forensic", "ethics", "crime", "investigation", "penology", "police", "jurisprudence"],
    image: "/topics/law_criminology.jpg",
    fallbackGradient: "from-slate-700 via-slate-800 to-zinc-950",
    badge: "Law & Justice",
    colorClass: "text-slate-800 bg-slate-100 border-slate-300"
  },
  {
    id: "engineering_math",
    title: "Engineering & Mathematics",
    subtitle: "Civil, Electrical, Mechanical, Calculus & Physics",
    categoryKeywords: ["engineering", "mathematics", "math", "calculus", "physics", "civil", "mechanical", "electrical", "algebra", "structural", "surveying"],
    image: "/topics/engineering_math.jpg",
    fallbackGradient: "from-cyan-700 via-blue-800 to-indigo-950",
    badge: "Engineering",
    colorClass: "text-cyan-800 bg-cyan-50 border-cyan-200"
  },
  {
    id: "arts_design",
    title: "Arts, Design & Media",
    subtitle: "Graphic Design, Architecture, Visual Arts & Digital Media",
    categoryKeywords: ["art", "arts", "design", "architecture", "media", "photography", "creative", "drawing", "illustration", "multimedia"],
    image: "/topics/arts_design.jpg",
    fallbackGradient: "from-purple-600 via-fuchsia-600 to-pink-800",
    badge: "Arts & Design",
    colorClass: "text-purple-700 bg-purple-50 border-purple-200"
  },
  {
    id: "psychology_selfhelp",
    title: "Psychology & Self-Growth",
    subtitle: "Human Behavior, Mental Health, Mindfulness & Leadership",
    categoryKeywords: ["psychology", "self-help", "personal development", "mental health", "philosophy", "leadership", "habits", "mindset", "behavior"],
    image: "/topics/psychology_selfhelp.jpg",
    fallbackGradient: "from-violet-600 via-indigo-700 to-slate-900",
    badge: "Psychology",
    colorClass: "text-violet-700 bg-violet-50 border-violet-200"
  },
  {
    id: "education_pedagogy",
    title: "Education & Teaching",
    subtitle: "Curriculum, Teaching Methods, Childhood & Learning",
    categoryKeywords: ["education", "teaching", "pedagogy", "learning", "curriculum", "instruction", "classroom", "teacher", "childhood"],
    image: "/topics/education_pedagogy.jpg",
    fallbackGradient: "from-teal-600 via-emerald-700 to-cyan-900",
    badge: "Education",
    colorClass: "text-teal-700 bg-teal-50 border-teal-200"
  },
  {
    id: "hospitality_tourism",
    title: "Hospitality & Tourism",
    subtitle: "Hotel Management, Culinary Arts, Events & Travel",
    categoryKeywords: ["hospitality", "tourism", "culinary", "hotel", "travel", "food", "event", "beverage", "resort"],
    image: "/topics/hospitality_tourism.jpg",
    fallbackGradient: "from-sky-600 via-blue-700 to-indigo-900",
    badge: "Hospitality",
    colorClass: "text-sky-700 bg-sky-50 border-sky-200"
  }
];

export const STUDENT_COURSES = [
  { code: "BSN", name: "BS in Nursing", dept: "College of Nursing & Health Sciences", relatedTopicIds: ["science_health", "psychology_selfhelp"] },
  { code: "BSIT", name: "BS in Information Technology", dept: "College of Computer Studies", relatedTopicIds: ["tech_coding", "engineering_math"] },
  { code: "BSCS", name: "BS in Computer Science", dept: "College of Computer Studies", relatedTopicIds: ["tech_coding", "engineering_math"] },
  { code: "BSBA", name: "BS in Business Administration", dept: "College of Business & Management", relatedTopicIds: ["business_finance", "psychology_selfhelp"] },
  { code: "BSA", name: "BS in Accountancy", dept: "College of Accountancy", relatedTopicIds: ["business_finance", "engineering_math"] },
  { code: "BSCrim", name: "BS in Criminology", dept: "College of Criminal Justice", relatedTopicIds: ["law_criminology", "psychology_selfhelp"] },
  { code: "BSEd", name: "Bachelor of Secondary Education", dept: "College of Education", relatedTopicIds: ["education_pedagogy", "literature_fiction"] },
  { code: "BEEd", name: "Bachelor of Elementary Education", dept: "College of Education", relatedTopicIds: ["education_pedagogy", "arts_design"] },
  { code: "BSHM", name: "BS in Hospitality Management", dept: "College of Hospitality Management", relatedTopicIds: ["hospitality_tourism", "business_finance"] },
  { code: "BSTM", name: "BS in Tourism Management", dept: "College of Tourism", relatedTopicIds: ["hospitality_tourism", "history_society"] },
  { code: "BSCE", name: "BS in Civil Engineering", dept: "College of Engineering", relatedTopicIds: ["engineering_math", "tech_coding"] },
  { code: "BSPsych", name: "BS in Psychology", dept: "College of Arts & Sciences", relatedTopicIds: ["psychology_selfhelp", "science_health"] },
  { code: "SHS-STEM", name: "Senior High School - STEM", dept: "Basic Education", relatedTopicIds: ["engineering_math", "science_health", "tech_coding"] },
  { code: "SHS-ABM", name: "Senior High School - ABM", dept: "Basic Education", relatedTopicIds: ["business_finance"] },
  { code: "SHS-HUMSS", name: "Senior High School - HUMSS", dept: "Basic Education", relatedTopicIds: ["history_society", "literature_fiction", "law_criminology"] },
  { code: "OTHER", name: "Other Degree / General Studies", dept: "General Academics", relatedTopicIds: ["literature_fiction", "psychology_selfhelp"] }
];

/**
 * Curated high-res educational textbook covers tailored by topic
 */
export const TOPIC_COVER_PALETTES = {
  science_health: {
    covers: [
      "/topics/science_health.jpg",
    ],
    badge: "Medical & Health",
    gradient: "from-emerald-600 via-teal-600 to-cyan-800"
  },
  tech_coding: {
    covers: [
      "/topics/tech_coding.jpg",
    ],
    badge: "Tech & IT",
    gradient: "from-blue-600 via-indigo-600 to-cyan-700"
  },
  business_finance: {
    covers: [
      "/topics/business_finance.jpg",
    ],
    badge: "Business",
    gradient: "from-amber-600 via-orange-600 to-rose-700"
  },
  law_criminology: {
    covers: [
      "/topics/law_criminology.jpg",
    ],
    badge: "Law & Justice",
    gradient: "from-slate-700 via-slate-800 to-zinc-950"
  },
  education_pedagogy: {
    covers: [
      "/topics/education_pedagogy.jpg",
    ],
    badge: "Education",
    gradient: "from-teal-600 via-emerald-700 to-cyan-900"
  },
  engineering_math: {
    covers: [
      "/topics/engineering_math.jpg",
    ],
    badge: "Engineering",
    gradient: "from-cyan-700 via-blue-800 to-indigo-950"
  },
  literature_fiction: {
    covers: [
      "/topics/literature_fiction.jpg",
    ],
    badge: "Literature",
    gradient: "from-rose-600 via-pink-600 to-purple-800"
  }
};

/**
 * Real Book Cover Resolver:
 * Returns the actual book picture (cover_image / cover / image_url).
 * If no image is uploaded or available, returns null so the UI can render
 * the clean grey L.png Libralink fallback.
 */
export function getTopicBookCover(book) {
  const rawCover = book?.cover_image || book?.cover || book?.image_url;
  const isDummySpiderCover = typeof rawCover === 'string' && rawCover.includes('book-cover-17888');

  if (rawCover && !isDummySpiderCover) {
    return getBackendAssetUrl(rawCover);
  }

  return null;
}

/**
 * Retrieve current student preferences from localStorage / currentUser
 */
export function getStudentPreferences() {
  try {
    const userStr = localStorage.getItem("currentUser");
    const user = userStr ? JSON.parse(userStr) : {};

    const course = user.course || user.program || user.position || localStorage.getItem("studentCourse") || "";
    let favorite_topics = user.favorite_topics || user.interests;

    if (!Array.isArray(favorite_topics)) {
      try {
        const storedTopics = localStorage.getItem("studentInterests");
        favorite_topics = storedTopics ? JSON.parse(storedTopics) : [];
      } catch {
        favorite_topics = [];
      }
    }

    return {
      course: course || "",
      favorite_topics: Array.isArray(favorite_topics) ? favorite_topics : [],
    };
  } catch (error) {
    console.error("Error reading student preferences:", error);
    return { course: "", favorite_topics: [] };
  }
}

/**
 * Save updated student preferences to localStorage and database
 */
export async function saveStudentPreferences({ course, favorite_topics }) {
  try {
    const userStr = localStorage.getItem("currentUser");
    const user = userStr ? JSON.parse(userStr) : {};
    const userId = user.user_id || user.id || Number(localStorage.getItem("currentUserId"));

    const safeTopics = Array.isArray(favorite_topics) ? favorite_topics : [];
    const safeCourse = String(course || "").trim();

    const updatedUser = {
      ...user,
      course: safeCourse,
      position: safeCourse,
      favorite_topics: safeTopics,
      interests: safeTopics,
    };

    localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    localStorage.setItem("studentCourse", safeCourse);
    localStorage.setItem("studentInterests", JSON.stringify(safeTopics));

    if (userId) {
      await updateUserProfile(userId, {
        position: safeCourse,
        course: safeCourse,
      });
    }

    // Broadcast update so any open tab/component updates instantly
    window.dispatchEvent(new CustomEvent("libralink-preferences-updated", {
      detail: { course: safeCourse, favorite_topics: safeTopics }
    }));

    return { success: true };
  } catch (error) {
    console.error("Error saving student preferences:", error);
    return { success: false, error };
  }
}

/**
 * Score and rank books based on student preferences
 */
export function scoreBookForStudent(book, preferences) {
  const { course, favorite_topics = [] } = preferences || {};
  let score = 0;
  let primaryReason = "";
  let matchedTopic = null;

  const title = (book.title || "").toLowerCase();
  const category = (book.category_name || book.category || book.categories?.category_name || "").toLowerCase();
  const subject = (book.subject || "").toLowerCase();
  const bookCourse = (book.course || "").toLowerCase();
  const author = (book.author || "").toLowerCase();
  const combinedText = `${title} ${category} ${subject} ${bookCourse} ${author}`;

  // Check if student wants Nursing / Health
  const wantsNursing = 
    course === "BSN" || 
    (course && course.toLowerCase().includes("nursing")) || 
    favorite_topics.includes("science_health");

  const isMedicalBook = /nursing|nurse|medical|medicine|health|anatomy|physiology|pharmacology|pathology|clinical|hospital|patient|first aid|pediatric|surgical|informatics|epidemiology/i.test(combinedText);

  // 1. Nursing Priority Matching
  if (wantsNursing && isMedicalBook) {
    score += 40;
    matchedTopic = STUDENT_TOPICS.find(t => t.id === "science_health");
    if (/nursing|nurse/i.test(title)) {
      primaryReason = course === "BSN" ? "Aligned with your BSN syllabus" : "Essential for Nursing";
    } else {
      primaryReason = "Recommended for Health & Medical";
    }
  }

  // 2. Academic Course Matching
  if (course) {
    const courseObj = STUDENT_COURSES.find(c => c.code === course || c.name === course);
    const courseCodeLower = (courseObj?.code || course).toLowerCase();

    if (
      bookCourse.includes(courseCodeLower) ||
      subject.includes(courseCodeLower) ||
      title.includes(courseCodeLower)
    ) {
      score += 25;
      if (!primaryReason) {
        primaryReason = `Aligned with your ${courseObj?.code || course} syllabus`;
      }
    } else if (courseObj?.relatedTopicIds) {
      for (const topicId of courseObj.relatedTopicIds) {
        const topic = STUDENT_TOPICS.find(t => t.id === topicId);
        if (topic && topic.categoryKeywords.some(kw => combinedText.includes(kw))) {
          score += 18;
          if (!primaryReason) {
            primaryReason = `Recommended for ${courseObj.code} students`;
          }
          if (!matchedTopic) matchedTopic = topic;
          break;
        }
      }
    }
  }

  // 3. Favorite Topics Matching
  for (const topicId of favorite_topics) {
    const topic = STUDENT_TOPICS.find(t => t.id === topicId);
    if (!topic) continue;

    const matchesKeyword = topic.categoryKeywords.some(kw => combinedText.includes(kw));

    if (matchesKeyword) {
      score += 20;
      if (!matchedTopic) matchedTopic = topic;
      if (!primaryReason) {
        primaryReason = `Because you enjoy ${topic.badge}`;
      }
    }
  }

  // 4. Availability Bonus
  const isAvailable = book.is_available || book.available || book.real_time_status === "available";
  if (isAvailable) {
    score += 5;
  }

  // Fallback reason
  if (!primaryReason) {
    primaryReason = isAvailable ? "Available in campus library" : "Recommended Pick";
  }

  return {
    ...book,
    matchScore: score,
    recommendationReason: primaryReason,
    matchedTopic: matchedTopic,
    coverUrl: getTopicBookCover(book, matchedTopic?.id),
  };
}

/**
 * Filter and sort books based on student recommendations
 */
export function getRecommendedBooks(books = [], preferences = null, limit = 12) {
  const prefs = preferences || getStudentPreferences();
  if (!Array.isArray(books) || books.length === 0) return [];

  const scored = books.map(book => scoreBookForStudent(book, prefs));

  // Sort by highest score first, then by availability
  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    const aAvail = a.is_available || a.available || a.real_time_status === "available" ? 1 : 0;
    const bAvail = b.is_available || b.available || b.real_time_status === "available" ? 1 : 0;
    return bAvail - aAvail;
  });

  return scored.slice(0, limit);
}
