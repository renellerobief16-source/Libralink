import { useState, useEffect, useLayoutEffect, useRef } from "react";

import { useLocation, useSearchParams } from "react-router-dom";

import {
  Search,
  Camera,
  Mic,
  Book,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  Church,
  Cpu,
  FlaskConical,
  GraduationCap,
  History as HistoryIcon,
  Languages,
  Landmark,
  Leaf,
  Palette,
  PenLine,
  Scale,
  Stethoscope,
  Users,
  MapPin,
  Navigation,
  Heart,
  ExternalLink,
  Filter,
  X,
  Calendar,
  User,
  Plus,
  CheckCircle,
  Clock,
  Building2,
  ChevronRight,
  ShoppingCart,
  Globe,
  Star,
  MessageCircle,
  ArrowDownAZ,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Sparkles,
} from "lucide-react";

import api from "../../../utils/api";

import { MinimalSchoolMap } from "./SchoolMap";
import { StudentHeaderActions } from "./StudentHeaderActions";

import StudentBorrowingForm from "./StudentBorrowingForm";

import QRCodeDisplay from "./QRCodeDisplay";


const getBookCategoryValue = (book) => {
  const directCategory = [
    book?.categories?.category_name,
    book?.category?.category_name,
    book?.category_name,
    book?.subject,
    book?.course,
    book?.program,
    book?.department,
  ].find((value) => typeof value === "string" && value.trim());

  if (directCategory) return directCategory.trim();

  const title = `${book?.title || ""} ${book?.description || ""} ${book?.keywords || ""}`.toLowerCase();
  const categoryRules = [
    ["Health Sciences", /nursing|medicine|health|anatomy|pharmacy|patient/],
    ["Technology", /database|programming|software|web development|computer|information technology|coding/],
    ["Business", /accounting|marketing|business|finance|management|entrepreneur/],
    ["Education", /teaching|education|pedagogy|instruction|curriculum/],
    ["Law & Politics", /law|legal|politics|government|constitution|justice/],
    ["Science", /biology|chemistry|physics|science|astronomy|geology/],
    ["General Education", /history|philippine|literature|communication|language|humanities/],
  ];

  return categoryRules.find(([, pattern]) => pattern.test(title))?.[0] || "Other Subjects";
};

const getBookOrganizationLabels = (book) => [
  ["Category", book?.categories?.category_name || book?.category?.category_name || book?.category_name],
  ["Subject", book?.subject],
  ["Course", book?.course],
  ["Program", book?.program],
  ["Department", book?.department],
].filter(([, value]) => typeof value === "string" && value.trim());

function BookStatusBadge({ status, compact = false }) {
  const statusConfig = {
    available: {
      label: "Available",

      icon: CheckCircle,

      className: "text-emerald-700 border-emerald-200 bg-emerald-50",
    },

    requested: {
      label: "Requested",

      icon: Clock,

      className: "text-amber-700 border-amber-200 bg-amber-50",

      animated: true,
    },

    waiting_pickup: {
      label: "Waiting for Pickup",

      icon: CheckCircle,

      className: "text-blue-700 border-blue-200 bg-blue-50",

      animated: true,
    },

    borrowed: {
      label: "Borrowed",

      icon: BookOpen,

      className: "text-rose-700 border-rose-200 bg-rose-50",
    },
  };

  const config = statusConfig[status] || statusConfig.borrowed;

  const StatusIcon = config.icon;

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold leading-none ${config.className} ${config.animated ? "animate-pulse" : ""}`}
    >
      <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />

      {!compact && <span className="truncate">{config.label}</span>}
    </span>
  );
}

function StudentSearch({ onBookClick, onBorrowClick, userInfo, onLogout }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryView = searchParams.get("category");

  const initialSearchQuery = location.state?.query || "";

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");

    return saved ? JSON.parse(saved) : [];
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterPanelRef = useRef(null);

  const searchBarRef = useRef(null);

  const filterRailRef = useRef(null);

  const otherSchoolsSectionRef = useRef(null);

  const touchStartX = useRef(0);

  const touchStartY = useRef(0);

  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);

  const [isDropped, setIsDropped] = useState(false);

  const [isClicked, setIsClicked] = useState(false);

  const [showAddedOverlay, setShowAddedOverlay] = useState(false);

  const dragStartPos = useRef({ x: 0, y: 0 });

  const buttonRef = useRef(null);

  const bookDetailsPanelRef = useRef(null);

  const searchScrollContainerRef = useRef(null);

  const [books, setBooks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedBook, setSelectedBook] = useState(null);

  const [bookDetailsWidth, setBookDetailsWidth] = useState(280);

  const [isResizingBookDetails, setIsResizingBookDetails] = useState(false);

  const [borrowingList, setBorrowingList] = useState(() => {
    const saved = localStorage.getItem("borrowingList");

    return saved ? JSON.parse(saved) : [];
  });

  const [showBorrowingList, setShowBorrowingList] = useState(false);

  useEffect(() => {
    const openBorrowingList = () => setShowBorrowingList(true);
    window.addEventListener('open-borrowing-list', openBorrowingList);

    if (sessionStorage.getItem('openBorrowingList') === 'true') {
      sessionStorage.removeItem('openBorrowingList');
      setShowBorrowingList(true);
    }

    return () => window.removeEventListener('open-borrowing-list', openBorrowingList);
  }, []);

  useEffect(() => {
    if (categoryView) {
      setShowSearchHistory(false);
    }
  }, [categoryView]);

  const [showBorrowingForm, setShowBorrowingForm] = useState(false);

  const [borrowingFormList, setBorrowingFormList] = useState([]);

  const [userData, setUserData] = useState(null);

  const [submittedRequest, setSubmittedRequest] = useState(null);

  const [showQRCode, setShowQRCode] = useState(false);

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(true);

  const [showSchoolView, setShowSchoolView] = useState(false);

  const [schools, setSchools] = useState([]);

  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");

  const [selectedSchool, setSelectedSchool] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("All Books");

  const [filterAvailability, setFilterAvailability] = useState("all"); // 'all' | 'available'

  const [notificationFilter, setNotificationFilter] = useState("all");

  const [showOtherSchoolsModal, setShowOtherSchoolsModal] = useState(false);

  const [otherSchoolsWithBook, setOtherSchoolsWithBook] = useState([]);

  const [searchingOtherSchools, setSearchingOtherSchools] = useState(false);

  const [bookForOtherSchoolSearch, setBookForOtherSchoolSearch] =
    useState(null);

  const [interSchoolRequestStatuses, setInterSchoolRequestStatuses] = useState(
    {},
  );

  const [showBookDetailModal, setShowBookDetailModal] = useState(false);

  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("searchHistory");

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showSearchHistory, setShowSearchHistory] = useState(false);


  const [showDiscoveryFilters, setShowDiscoveryFilters] = useState(false);

  const [sortBy, setSortBy] = useState("recommended");

  const [readingReviews, setReadingReviews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studentReadingReviews") || "{}");
    } catch {
      return {};
    }
  });

  const [reviewRating, setReviewRating] = useState(0);

  const [reviewNote, setReviewNote] = useState("");


  useEffect(() => {
    if (!isResizingBookDetails) return undefined;

    const handlePointerMove = (event) => {
      const nextWidth = window.innerWidth - event.clientX;
      setBookDetailsWidth(Math.min(480, Math.max(240, nextWidth)));
    };

    const stopResizing = () => setIsResizingBookDetails(false);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, [isResizingBookDetails]);

  useEffect(() => {
    if (!showOtherSchoolsModal) return;

    requestAnimationFrame(() => {
      otherSchoolsSectionRef.current?.scrollIntoView({
        behavior: "smooth",

        block: "start",
      });
    });
  }, [showOtherSchoolsModal]);

  useEffect(() => {
    const incomingQuery = location.state?.query;

    if (typeof incomingQuery === "string") {
      setSearchQuery(incomingQuery);

      setShowSearchHistory(false);
    }
  }, [location.state?.query]);

  // Load user data from localStorage

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");

    if (userStr) {
      try {
        const currentUser = JSON.parse(userStr);

        setUserData(currentUser);
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }
  }, []);

  // Load schools when school view is enabled

  useEffect(() => {
    if (showSchoolView) {
      loadSchools();
    }
  }, [showSchoolView]);

  const loadSchools = async () => {
    try {
      const response = await api.get("/schools");

      if (response.data) {
        setSchools(response.data || []);
      }
    } catch (error) {
      console.error("Unable to load schools:", error);

      setSchools([]);
    }
  };

  const fetchInterSchoolRequestStatuses = async () => {
    try {
      const response = await api.get("/borrow-requests/inter-school-status");

      const items = Array.isArray(response?.data) ? response.data : [];

      const statusMap = {};

      items.forEach((item) => {
        if (!item || !item.status) return;

        const bookId = item.book_id ?? item.book?.id ?? item.book_id;

        const ownerSchoolId =
          item.owner_school_id ??
          item.owner_school?.school_id ??
          item.school_id;

        if (bookId !== undefined && ownerSchoolId !== undefined) {
          statusMap[`${bookId}_${ownerSchoolId}`] = item.status;
        }
      });

      setInterSchoolRequestStatuses(statusMap);
    } catch (error) {
      console.error("Unable to load inter-school request statuses:", error);

      setInterSchoolRequestStatuses({});
    }
  };

  useEffect(() => {
    fetchInterSchoolRequestStatuses();
  }, []);

  const getBookDisplayStatus = (book, ownerSchoolId = book?.school_id) => {
    if (!book) return "available";

    const requestStatus =
      interSchoolRequestStatuses[`${book.id ?? book.book_id}_${ownerSchoolId}`];

    if (requestStatus === "pending") return "requested";

    if (requestStatus === "approved") return "waiting_pickup";

    if (requestStatus === "released" || requestStatus === "borrowed")
      return "borrowed";

    if (requestStatus === "returned" || requestStatus === "cancelled")
      return "available";

    const rawStatus = book.real_time_status || "available";

    if (rawStatus === "pending_approval") return "requested";

    if (rawStatus === "approved") return "waiting_pickup";

    if (rawStatus === "released") return "borrowed";

    return rawStatus;
  };

  const isBookAvailableForBorrow = (book, ownerSchoolId = book?.school_id) => {
    return getBookDisplayStatus(book, ownerSchoolId) === "available";
  };

  // Search for book in other schools

  const searchBookInOtherSchools = async (book) => {
    setBookForOtherSchoolSearch(book);

    setSearchingOtherSchools(true);

    try {
      const currentSchoolId = localStorage.getItem("schoolId");

      const searchTitle = String(book.title || "").trim();

      console.log(
        "[OTHER SCHOOLS] Searching for:",

        JSON.stringify(searchTitle),

        "excluding school:",

        currentSchoolId,
      );

      console.log("[OTHER SCHOOLS] Book object:", book);

      console.log("[OTHER SCHOOLS] Book school_id:", book.school_id);

      console.log("[OTHER SCHOOLS] Book id:", book.id);

      if (!searchTitle) {
        console.log("[OTHER SCHOOLS] Empty title, aborting");

        setShowOtherSchoolsModal(true);

        return;
      }

      const searchParams = new URLSearchParams();

      searchParams.append("title", searchTitle);

      searchParams.append("exclude_school_id", currentSchoolId);

      console.log(
        "[OTHER SCHOOLS] Request URL:",

        `/books/search-other-schools?${searchParams.toString()}`,
      );

      const response = await api.get(
        `/books/search-other-schools?${searchParams.toString()}`,
      );

      console.log("[OTHER SCHOOLS] API raw response:", response);

      console.log("[OTHER SCHOOLS] API response.success:", response?.success);

      console.log("[OTHER SCHOOLS] API response.data:", response?.data);

      // Handle response structure - backend returns { success: true, data: [...] }

      // After interceptor, response is { success: true, data: [...] }

      const schoolsData =
        response?.success && Array.isArray(response?.data) ? response.data : [];

      console.log("[OTHER SCHOOLS] Schools data:", schoolsData);

      if (schoolsData.length > 0) {
        console.log("[OTHER SCHOOLS] All schools with this book:", schoolsData);

        setOtherSchoolsWithBook(schoolsData);
      } else {
        console.log("[OTHER SCHOOLS] No schools found");

        setOtherSchoolsWithBook([]);
      }

      setShowOtherSchoolsModal(true);
    } catch (error) {
      console.error("[OTHER SCHOOLS] Search error:", error);

      setOtherSchoolsWithBook([]);

      setShowOtherSchoolsModal(true);
    } finally {
      setSearchingOtherSchools(false);
    }
  };

  // Save search to history

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.trim().length > 0) {
      setSearchHistory((prev) => {
        const filtered = prev.filter((item) => item !== debouncedQuery.trim());

        const updated = [debouncedQuery.trim(), ...filtered].slice(0, 10);

        localStorage.setItem("searchHistory", JSON.stringify(updated));

        return updated;
      });
    }
  }, [debouncedQuery]);

  const clearSearchHistory = () => {
    setSearchHistory([]);

    localStorage.removeItem("searchHistory");
  };

  const deleteFromHistory = (item) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((h) => h !== item);

      localStorage.setItem("searchHistory", JSON.stringify(updated));

      return updated;
    });
  };

  const handleHistoryClick = (term) => {
    setSearchQuery(term);

    setShowSearchHistory(false);
  };

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 180);

    return () => window.clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    const loadBooks = async () => {
      const schoolId = localStorage.getItem("schoolId");

      if (!schoolId) {
        console.error("No schoolId found in localStorage");

        setBooks([]);

        setLoading(false);

        return;
      }

      try {
        const response = await api.get(`/books/school?school_id=${schoolId}`);

        if (response.data) {
          const mappedBooks = (response.data || []).map((book) => ({
            id: book.book_id,

            title: book.title || "Untitled",

            author: book.author || "Unknown Author",

            location: book.shelf_location || "Library",

            shelf: book.call_number || "Unknown",

            floor: "1",

            available: book.real_time_status === "available",

            category: getBookCategoryValue(book),
            categories: book.categories || null,
            category_name: book.category_name || null,
            subject: book.subject || null,
            course: book.course || null,
            program: book.program || null,
            department: book.department || null,

            isbn: book.isbn || "Unknown",

            year: book.publication_year || "Unknown",

            real_time_status: book.real_time_status || "available",

            status_details: book.status_details || null,

            available_copies: book.available_copies || 0,

            total_copies: book.total_copies || 0,

            school_id: book.school_id,

            library: book.schools?.school_name || "Your Library",

            schoolAddress: book.schools?.address || null,

            latitude: book.schools?.latitude || null,

            longitude: book.schools?.longitude || null,
          }));

          setBooks(mappedBooks);
        } else {
          setBooks([]);
        }
      } catch (error) {
        console.error("Unable to load books:", error);

        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBooks();

    // Auto-refresh every 30 seconds if enabled

    let interval;

    if (autoRefresh) {
      interval = setInterval(() => {
        loadBooks();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const subjectKeywords = {
    "Arts & Culture": [
      "art",
      "culture",
      "music",
      "dance",
      "painting",
      "design",
    ],

    Biography: ["biography", "autobiography", "memoir", "life of"],

    Business: [
      "business",
      "accounting",
      "finance",
      "marketing",
      "management",
      "entrepreneur",
    ],

    "Computer & Technology": [
      "computer",
      "technology",
      "programming",
      "software",
      "database",
      "information technology",
      "coding",
    ],

    Education: [
      "education",
      "teaching",
      "teacher",
      "pedagogy",
      "school",
      "learning",
    ],

    Engineering: [
      "engineering",
      "civil",
      "mechanical",
      "electrical",
      "electronics",
      "chemical engineering",
    ],

    "English & Languages": [
      "english",
      "language",
      "grammar",
      "literature",
      "linguistics",
      "dictionary",
    ],

    Environment: [
      "environment",
      "ecology",
      "climate",
      "nature",
      "conservation",
      "agriculture",
    ],

    "Fiction & Stories": [
      "fiction",
      "novel",
      "story",
      "stories",
      "poetry",
      "poem",
      "short story",
      "fantasy",
      "romance",
      "mystery",
    ],

    "Government & Community": [
      "government",
      "barangay",
      "community",
      "civic",
      "public administration",
      "local government",
      "politics",
    ],

    "Health & Medicine": [
      "medical",
      "medicine",
      "health",
      "nursing",
      "doctor",
      "pharmacy",
      "anatomy",
      "disease",
    ],

    History: ["history", "historical", "heritage", "archaeology", "war"],

    "Law & Politics": [
      "law",
      "legal",
      "politics",
      "constitution",
      "justice",
      "rights",
      "government",
    ],

    Mathematics: [
      "math",
      "mathematics",
      "algebra",
      "geometry",
      "calculus",
      "statistics",
      "trigonometry",
    ],

    "Philosophy & Religion": [
      "philosophy",
      "religion",
      "christian",
      "bible",
      "islam",
      "ethics",
      "theology",
    ],

    Science: [
      "science",
      "biology",
      "chemistry",
      "physics",
      "astronomy",
      "geology",
      "zoology",
    ],

    "Social Science": [
      "social science",
      "sociology",
      "psychology",
      "economics",
      "anthropology",
      "society",
      "humanities",
    ],
  };

  const filteredBooks = books.filter((book) => {
    const searchableBookText = [
      book.title,

      book.author,

      book.isbn,

      book.category?.category_name,

      book.category_name,

      book.category,

      book.subject,

      book.course,

      book.program,

      book.department,

      book.description,

      book.keywords,
    ]

      .filter(Boolean)

      .join(" ")

      .toLowerCase();

    const searchTerms = debouncedQuery
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const matchesSearch = searchTerms.every((term) => searchableBookText.includes(term));

    const selectedKeywords = subjectKeywords[selectedCategory] || [
      selectedCategory.toLowerCase(),
    ];

    const matchesCategory =
      selectedCategory === "All Books" ||
      selectedKeywords.some((keyword) => searchableBookText.includes(keyword));

    const matchesAvailability =
      filterAvailability === "all" ||
      getBookDisplayStatus(book) === "available";

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const getBookCategory = (book) => getBookCategoryValue(book);

  const orderedBooks = [...filteredBooks].sort((firstBook, secondBook) => {
    if (sortBy === "title") return (firstBook.title || "").localeCompare(secondBook.title || "");
    if (sortBy === "author") return (firstBook.author || "").localeCompare(secondBook.author || "");
    if (sortBy === "available") {
      return Number(getBookDisplayStatus(secondBook) === "available") - Number(getBookDisplayStatus(firstBook) === "available");
    }

    const firstCategory = getBookCategory(firstBook);
    const secondCategory = getBookCategory(secondBook);
    const firstIsUncategorized = firstCategory === "Other Subjects";
    const secondIsUncategorized = secondCategory === "Other Subjects";

    if (firstIsUncategorized !== secondIsUncategorized) {
      return firstIsUncategorized ? 1 : -1;
    }

    const categoryOrder = firstCategory.localeCompare(secondCategory);
    if (categoryOrder !== 0) return categoryOrder;

    return Number(getBookDisplayStatus(secondBook) === "available") - Number(getBookDisplayStatus(firstBook) === "available");
  });

  const bookGroups = orderedBooks.reduce((groups, book) => {
    const category = getBookCategory(book);
    const existingGroup = groups.find((group) => group.category === category);

    if (existingGroup) {
      existingGroup.books.push(book);
    } else {
      groups.push({ category, books: [book] });
    }

    return groups;
  }, []);

  const smartSearchResults = searchQuery.trim()
    ? books
        .filter((book) => {
          const searchableText = [
            book.title,
            book.author,
            book.isbn,
            getBookCategory(book),
            book.subject,
            book.course,
            book.program,
            book.department,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchQuery
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .every((term) => searchableText.includes(term));
        })
        .slice(0, 6)
    : [];

  const searchSuggestions = searchQuery.trim()
    ? smartSearchResults
    : orderedBooks.slice(0, 6);

  const initialBooksPerCategory = 12;
  const displayedBookGroups = categoryView
    ? bookGroups.filter(({ category }) => category === categoryView)
    : bookGroups;

  useEffect(() => {
    if (!selectedBook) return;

    const savedReview = readingReviews[selectedBook.id];
    setReviewRating(savedReview?.rating || 0);
    setReviewNote(savedReview?.note || "");
  }, [selectedBook, readingReviews]);

  const saveReadingReview = () => {
    if (!selectedBook || !reviewRating) return;

    setReadingReviews((previousReviews) => {
      const updatedReviews = {
        ...previousReviews,
        [selectedBook.id]: {
          rating: reviewRating,
          note: reviewNote.trim(),
          updatedAt: new Date().toISOString(),
        },
      };

      localStorage.setItem("studentReadingReviews", JSON.stringify(updatedReviews));
      return updatedReviews;
    });
  };

  const filterCategories = [
    "All Books",

    "Arts & Culture",

    "Biography",

    "Business",

    "Computer & Technology",

    "Education",

    "Engineering",

    "English & Languages",

    "Environment",

    "Fiction & Stories",

    "Government & Community",

    "Health & Medicine",

    "History",

    "Law & Politics",

    "Mathematics",

    "Philosophy & Religion",

    "Science",

    "Social Science",
  ];

  const subjectIcons = {
    "All Books": BookOpen,

    "Arts & Culture": Palette,

    Biography: User,

    Business: BriefcaseBusiness,

    "Computer & Technology": Cpu,

    Education: GraduationCap,

    Engineering: Calculator,

    "English & Languages": Languages,

    Environment: Leaf,

    "Fiction & Stories": Book,

    "Government & Community": Landmark,

    "Health & Medicine": Stethoscope,

    History: HistoryIcon,

    "Law & Politics": Scale,

    Mathematics: Calculator,

    "Philosophy & Religion": Church,

    Science: FlaskConical,

    "Social Science": Users,
  };

  const popularAuthors = [
    "Jose Rizal",

    "William Shakespeare",

    "Jane Austen",

    "George Orwell",

    "J.K. Rowling",

    "Maya Angelou",
  ];

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);

    requestAnimationFrame(() => {
      filterRailRef.current
        ?.querySelector(`[data-category="${category}"]`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
    });
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedCategory !== "All Books" ||
      sortBy !== "recommended" ||
      filterAvailability !== "all"
  );

  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory !== "All Books" ? 1 : 0) +
    (sortBy !== "recommended" ? 1 : 0) +
    (filterAvailability !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedCategory("All Books");
    setSortBy("recommended");
    setFilterAvailability("all");
    setShowSearchHistory(false);
  };

  const toggleFavorite = (bookId) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId];

      localStorage.setItem("favorites", JSON.stringify(newFavorites));

      // Dispatch custom event to notify other components

      window.dispatchEvent(new Event("favoritesUpdated"));

      return newFavorites;
    });
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);

    setShowBookDetailModal(true);
  };

  useLayoutEffect(() => {
    if (!selectedBook) return;

    const panel = bookDetailsPanelRef.current;
    if (!panel) return;

    panel.scrollTo({ top: 0, behavior: "auto" });

    if (window.innerWidth < 1024) {
      const headerHeight = window.innerWidth >= 768 ? 76 : 64;
      const panelTop = panel.getBoundingClientRect().top + window.scrollY;

      window.scrollTo({
        top: Math.max(0, panelTop - headerHeight),
        behavior: "auto",
      });
    }
  }, [selectedBook, showBorrowingForm]);

  const handleCloseOverlay = () => {
    setSelectedBook(null);
  };

  const handleBorrow = () => {
    if (selectedBook) {
      if (!isBookAvailableForBorrow(selectedBook)) {
        alert("This book is not currently available to borrow.");

        return;
      }

      const currentSchoolId = parseInt(localStorage.getItem("schoolId"));

      const isInterSchool =
        selectedBook.school_id && selectedBook.school_id !== currentSchoolId;

      setBorrowingFormList([
        {
          book_id: selectedBook.id,

          title: selectedBook.title,

          author: selectedBook.author,

          isbn: selectedBook.isbn,

          owner_school_id: selectedBook.school_id || currentSchoolId,

          owner_school_name: selectedBook.library || "Your Library",

          partner_school_id: isInterSchool ? currentSchoolId : null,

          borrow_type: isInterSchool ? "INTER_SCHOOL_LIBRARY_USE" : "HOME",
        },
      ]);

      setShowBorrowingForm(true);
    }
  };

  const handleAddToBorrowingList = (book) => {
    if (!book || !isBookAvailableForBorrow(book)) {
      return;
    }

    const schoolId = localStorage.getItem("schoolId");

    const currentSchoolId = parseInt(schoolId);

    setBorrowingList((prev) => {
      const exists = prev.some((item) => item.book_id === book.id);

      if (exists) {
        return prev;
      }

      const newItem = {
        book_id: book.id,

        title: book.title,

        author: book.author,

        isbn: book.isbn,

        owner_school_id: book.school_id,

        owner_school_name: book.library,

        partner_school_id:
          book.school_id !== currentSchoolId ? currentSchoolId : null,

        borrow_type:
          book.school_id !== currentSchoolId
            ? "INTER_SCHOOL_LIBRARY_USE"
            : "HOME",
      };

      const updatedList = [...prev, newItem];

      localStorage.setItem("borrowingList", JSON.stringify(updatedList));
      window.dispatchEvent(new Event('borrowing-list-changed'));

      // Show overlay

      setShowAddedOverlay(true);

      setTimeout(() => setShowAddedOverlay(false), 2000);

      return updatedList;
    });
  };

  const removeFromBorrowingList = (book_id) => {
    const newList = borrowingList.filter((item) => item.book_id !== book_id);

    setBorrowingList(newList);

    localStorage.setItem("borrowingList", JSON.stringify(newList));
    window.dispatchEvent(new Event('borrowing-list-changed'));
  };

  const clearBorrowingList = () => {
    setBorrowingList([]);

    localStorage.removeItem("borrowingList");
    window.dispatchEvent(new Event('borrowing-list-changed'));
  };

  const handleContinueToRequest = () => {
    if (borrowingList.length === 0) {
      setShowBorrowingList(false);
      return;
    }

    setBorrowingFormList([...borrowingList]);
    setShowBorrowingList(false);
    setShowBorrowingForm(true);
  };

  const handleBorrowingSubmit = async (response) => {
    try {
      console.log("handleBorrowingSubmit received:", response);

      // response is the full response from StudentBorrowingForm

      if (response && response.success) {
        setSubmittedRequest(response.data);

        setShowBorrowingForm(false);

        setShowSuccessOverlay(true);

        setBorrowingFormList([]);

        // Clear the borrowing list from localStorage after successful submission

        clearBorrowingList();

        // Refresh inter-school request statuses to update UI

        fetchInterSchoolRequestStatuses();
      } else {
        const errorMsg = response?.message || "Unknown error";

        console.error("Borrowing request failed:", errorMsg);

        alert("Failed to submit borrowing request: " + errorMsg);
      }
    } catch (error) {
      console.error("Error handling borrowing request response:", error);

      alert(
        "Error handling borrowing request: " +
          (error.message || "Unknown error"),
      );
    }
  };

  // Function to clear all borrowing-related history

  const clearBorrowingHistory = () => {
    try {
      // Clear borrowing list

      localStorage.removeItem("borrowingList");

      window.dispatchEvent(new Event('borrowing-list-changed'));

      setBorrowingList([]);

      // Clear any other borrowing-related history items

      localStorage.removeItem("borrowingHistory");

      localStorage.removeItem("recentBorrows");

      localStorage.removeItem("borrowingFormList");

      console.log("Borrowing history cleared successfully");
    } catch (error) {
      console.error("Error clearing borrowing history:", error);
    }
  };

  // Touch handlers for swipe to close

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;

    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!showFilterPanel) return;

    const touchX = e.touches[0].clientX;

    const touchY = e.touches[0].clientY;

    const diffX = touchStartX.current - touchX;

    const diffY = touchStartY.current - touchY;

    // Only close if swiping left (positive diffX) and it's a horizontal swipe

    if (diffX > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      setShowFilterPanel(false);
    }
  };

  // Drag handlers for Borrowing List button

  const handleDragStart = (e) => {
    if (e.type === "touchstart") {
      dragStartPos.current = {
        x: e.touches[0].clientX - buttonPosition.x,

        y: e.touches[0].clientY - buttonPosition.y,
      };
    } else {
      dragStartPos.current = {
        x: e.clientX - buttonPosition.x,

        y: e.clientY - buttonPosition.y,
      };
    }

    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;

    e.preventDefault();

    let clientX, clientY;

    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX;

      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;

      clientY = e.clientY;
    }

    const newX = clientX - dragStartPos.current.x;

    const newY = clientY - dragStartPos.current.y;

    // Constrain to screen bounds

    const maxX = window.innerWidth - 60;

    const maxY = window.innerHeight - 60;

    setButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),

      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    setIsDropped(true);

    setTimeout(() => setIsDropped(false), 300);
  };

  // Close filter panel when clicking outside

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target)
      ) {
        setShowFilterPanel(false);
      }
    };

    if (showFilterPanel) {
      document.addEventListener("mousedown", handleClickOutside);

      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);

      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showFilterPanel]);

  useEffect(() => {
    if (categoryView) {
      setShowSearchHistory(false);
    }
  }, [categoryView]);

  useEffect(() => {
    if (categoryView) {
      setShowSearchHistory(false);
    }
  }, [categoryView]);

  useEffect(() => {
    if (!showSearchHistory) return undefined;

    const handleSearchOutsideClick = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowSearchHistory(false);
      }
    };

    document.addEventListener("mousedown", handleSearchOutsideClick);
    document.addEventListener("touchstart", handleSearchOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleSearchOutsideClick);
      document.removeEventListener("touchstart", handleSearchOutsideClick);
    };
  }, [showSearchHistory]);

  if (showBorrowingForm && !selectedBook) {
    return (
      <main className="fixed inset-0 z-[100] min-h-[100dvh] w-full min-w-0 overflow-y-auto bg-[#F7FAFC] px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <button
            type="button"
            onClick={() => {
              setShowBorrowingForm(false);
              setShowBorrowingList(true);
            }}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600"
          >
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Back to borrowing list
          </button>

          <header className="mb-6 border-b border-slate-200 pb-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Final step
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Continue to borrow request
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Fill in your details so the library can review your request.
            </p>
          </header>

          <StudentBorrowingForm
            borrowingList={borrowingFormList}
            userData={userData}
            onSubmit={handleBorrowingSubmit}
            onCancel={() => {
              setShowBorrowingForm(false);
              setShowBorrowingList(true);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <div
      className={`student-search-shell ${selectedBook ? "student-search-has-details" : ""} box-border -mx-3 w-[calc(100%+1.5rem)] min-w-0 max-w-none px-0 pb-0 sm:mx-0 sm:w-full sm:px-6 lg:pl-[30px] lg:pr-0 ${selectedBook ? "lg:grid lg:h-[calc(100dvh-76px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_var(--book-details-width)] lg:gap-3 lg:overflow-hidden" : "lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-5"}`}
      style={{ "--book-details-width": `${bookDetailsWidth}px` }}
    >
      <div
        ref={searchScrollContainerRef}
        className={`min-w-0 lg:px-0 ${selectedBook ? "overflow-hidden lg:col-start-1 lg:row-start-1 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-none" : ""}`}
      >
        {/* Other school results - 4th panel - Sticky */}

        {showOtherSchoolsModal && (
          <>
            <button
              type="button"
              aria-label="Close other school results"
              onClick={() => setShowOtherSchoolsModal(false)}
              className="fixed inset-0 z-[74] bg-slate-950/35 backdrop-blur-[2px]"
            />
            <section
            ref={otherSchoolsSectionRef}
            className="fixed inset-x-3 top-1/2 z-[75] max-h-[calc(100dvh-2rem)] w-auto -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:inset-x-auto sm:left-1/2 sm:w-[min(680px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  Available in other schools
                </h2>

                <p className="mt-1 truncate text-xs text-[#64748B]">
                  {bookForOtherSchoolSearch?.title || "Matching book"} and its
                  library locations
                </p>
              </div>

              <button
                type="button"

                onClick={() => setShowOtherSchoolsModal(false)}

                className="shrink-0 rounded-lg p-2 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"

                aria-label="Close other school results"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {searchingOtherSchools ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] p-4 text-sm text-[#64748B]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0077B6] border-t-transparent" />
                Searching partner school libraries...
              </div>
            ) : otherSchoolsWithBook.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] p-5 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-[#94A3B8]" />

                <p className="text-sm font-medium text-[#334155]">
                  No available copy found
                </p>

                <p className="mt-1 text-xs text-[#64748B]">
                  Try another book or subject.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between sm:hidden">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                    Swipe to browse
                  </span>

                  <ChevronRight
                    className="h-3.5 w-3.5 text-[#94A3B8]"
                    aria-hidden="true"
                  />
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
                  {otherSchoolsWithBook.map((schoolData) => (
                    <button
                      type="button"

                      key={schoolData.school_id}

                      onClick={() => {
                        setSelectedSchool({
                          school_id: schoolData.school_id,

                          school_name: schoolData.school_name,

                          address: schoolData.address,

                          school_code: schoolData.school_code,
                        });

                        setBookForOtherSchoolSearch({
                          book_id: schoolData.book_id,

                          title: schoolData.title,

                          author: schoolData.author,

                          isbn: schoolData.isbn,

                          available_copies: schoolData.available_copies,

                          total_copies: schoolData.total_copies,
                        });

                        setShowOtherSchoolsModal(false);
                      }}

                      className="flex min-w-[82%] snap-start items-center gap-3 rounded-xl border border-[#E2E8F0] p-3 text-left transition hover:border-[#0077B6] hover:bg-[#F8FCFE] sm:min-w-0"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#BFE3F1] text-[#0077B6]">
                        <Building2 className="h-5 w-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#0F172A]">
                          {schoolData.school_name}
                        </span>

                        <span className="mt-1 block truncate text-xs text-[#64748B]">
                          {schoolData.address || "Address unavailable"}
                        </span>

                        <span className="mt-1 block text-xs font-medium text-emerald-700">
                          {schoolData.available_copies || 0} available{" "}
                          {schoolData.available_copies === 1
                            ? "copy"
                            : "copies"}
                        </span>
                      </span>

                      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                    </button>
                  ))}
                </div>
              </>
            )}
            </section>
          </>
        )}

        {/* Search and filter card */}

        <div className="mb-2 bg-[#F7FAFC] pb-0 pt-3 md:pt-0 sm:mb-3">
          <div className="w-full min-w-0 overflow-visible">
            <div className="mb-4 hidden px-0 pt-2 md:block lg:mb-2">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Library catalogue
                </p>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  Find your next read
                </h1>
              </div>
            </div>

            <div className="lg:h-0">
              <div
                ref={searchBarRef}
                className="student-search-global-bar fixed inset-x-3 top-2 z-30 mx-0 bg-transparent px-0 pb-0 pt-0 backdrop-blur-none md:sticky md:inset-x-auto md:top-0 md:-mx-2 md:border-b md:border-slate-200/50 md:bg-[#F7FAFC] md:px-2 md:pb-3 md:pt-2 md:backdrop-blur-none lg:fixed lg:left-[72px] lg:right-0 lg:z-[60] lg:mx-0 lg:h-[64px] lg:border-b lg:border-slate-200/70 lg:bg-[#F7FAFC] lg:px-0 lg:pb-2 lg:pt-1 lg:backdrop-blur-none"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="relative min-w-0 flex-1">
                    <div
                      className="relative h-12 w-full min-w-0 overflow-visible rounded-[50px] border-0 bg-[#E7E7E4] shadow-none transition focus-within:bg-[#E7E7E4] md:h-[54px]"
                      role="search"
                    >
                      <div className="flex h-full items-center gap-2 px-3 md:px-4">
                        <span
                          className="flex shrink-0 items-center justify-center text-slate-600"
                          aria-hidden="true"
                        >
                          <Search className="h-5 w-5" />
                        </span>

                        <input
                          type="text"
                          placeholder="Search books, authors, or ISBN"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => {
                            if (!categoryView) {
                              setShowSearchHistory(true);
                            }
                          }}
                          className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-600 focus:outline-none sm:text-base"
                        />

                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setShowSearchHistory(false);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-black/5 hover:text-slate-800"
                            aria-label="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden h-full w-[184px] shrink-0 items-center justify-end pr-3 text-slate-900 md:flex md:pr-5">
                    <StudentHeaderActions userInfo={userInfo} onLogout={onLogout} />
                  </div>
                </div>

                {showSearchHistory && (
                  <div className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(22rem,calc(100dvh-8rem))] overflow-y-auto overscroll-contain rounded-[18px] border border-slate-200 bg-white p-2 text-left shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  {searchSuggestions.length > 0 ? (
                    <>
                      <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {searchQuery.trim() ? "Matching books" : "Suggested books"}
                      </p>

                      {searchSuggestions.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setShowSearchHistory(false);
                            handleBookClick(book);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B63C7] to-[#005D9A] text-white shadow-sm">
                            <Book className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-900">
                              {book.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {book.author} · {getBookCategory(book)}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {searchQuery.trim() ? (
                        <p className="px-2 py-5 text-center text-sm text-slate-500">
                          No matching books found.
                        </p>
                      ) : searchHistory.length > 0 ? (
                        <div>
                          <div className="px-2 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              Recent searches
                            </span>
                          </div>
                          {searchHistory.slice(0, 6).map((term) => (
                            <button
                              key={term}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                handleHistoryClick(term);
                                setShowSearchHistory(false);
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-50"
                            >
                              <span className="truncate text-sm text-slate-700">{term}</span>
                              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-5 text-center text-sm text-slate-500">
                          No suggested books yet.
                        </p>
                      )}
                    </>
                  )}
                  </div>
                )}
              </div>
            </div>
            </div>

            <div className="mt-1 flex min-h-[1rem] items-center justify-between gap-3 px-0 lg:mt-0">
              <p className="min-w-0 flex-1 truncate text-[10px] text-slate-500">
                {searchQuery.trim() ? (
                  <>
                    Showing matches for <span className="font-semibold text-slate-700">“{searchQuery.trim()}”</span>
                  </>
                ) : (
                  "Start with a title, author, subject, or ISBN."
                )}
              </p>
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                {filteredBooks.length} results
              </span>
              <button
                type="button"
                onClick={() => setShowFilterPanel(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800 sm:hidden"
                aria-label={`Open filters (${activeFiltersCount} active)`}
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#0077B6] px-1 text-[9px] font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

          </div>

        {/* Other school results - 4th panel */}

        {false && showOtherSchoolsModal && (
          <section
            ref={otherSchoolsSectionRef}
            className="mb-6 w-full scroll-mt-[80px] rounded-2xl border border-[#DDE6EF] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  Available in other schools
                </h2>

                <p className="mt-1 truncate text-xs text-[#64748B]">
                  {bookForOtherSchoolSearch?.title || "Matching book"} and its
                  library locations
                </p>
              </div>

              <button
                type="button"

                onClick={() => setShowOtherSchoolsModal(false)}

                className="shrink-0 rounded-lg p-2 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"

                aria-label="Close other school results"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {searchingOtherSchools ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] p-4 text-sm text-[#64748B]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0077B6] border-t-transparent" />
                Searching partner school libraries...
              </div>
            ) : otherSchoolsWithBook.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] p-5 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-[#94A3B8]" />

                <p className="text-sm font-medium text-[#334155]">
                  No available copy found
                </p>

                <p className="mt-1 text-xs text-[#64748B]">
                  Try another book or subject.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between sm:hidden">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                    Swipe to browse
                  </span>

                  <ChevronRight
                    className="h-3.5 w-3.5 text-[#94A3B8]"
                    aria-hidden="true"
                  />
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
                  {otherSchoolsWithBook.map((schoolData) => (
                    <button
                      type="button"

                      key={schoolData.school_id}

                      onClick={() => {
                        setSelectedSchool({
                          school_id: schoolData.school_id,

                          school_name: schoolData.school_name,

                          address: schoolData.address,

                          school_code: schoolData.school_code,
                        });

                        setBookForOtherSchoolSearch({
                          book_id: schoolData.book_id,

                          title: schoolData.title,

                          author: schoolData.author,

                          isbn: schoolData.isbn,

                          available_copies: schoolData.available_copies,

                          total_copies: schoolData.total_copies,
                        });

                        setShowOtherSchoolsModal(false);
                      }}

                      className="flex min-w-[82%] snap-start items-center gap-3 rounded-xl border border-[#E2E8F0] p-3 text-left transition hover:border-[#0077B6] hover:bg-[#F8FCFE] sm:min-w-0"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#BFE3F1] text-[#0077B6]">
                        <Building2 className="h-5 w-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#0F172A]">
                          {schoolData.school_name}
                        </span>

                        <span className="mt-1 block truncate text-xs text-[#64748B]">
                          {schoolData.address || "Address unavailable"}
                        </span>

                        <span className="mt-1 block text-xs font-medium text-emerald-700">
                          {schoolData.available_copies || 0} available{" "}
                          {schoolData.available_copies === 1
                            ? "copy"
                            : "copies"}
                        </span>
                      </span>

                      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Filter Panel - Google-style slide-out */}

        {showFilterPanel && (
          <>
            {/* Backdrop */}

            <div
              className="fixed inset-0 bg-black/40 z-50 sm:hidden"

              onClick={() => setShowFilterPanel(false)}
            />

            {/* Filter Panel */}

            <div
              ref={filterPanelRef}

              className={`fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                showFilterPanel ? "translate-x-0" : "translate-x-full"
              }`}

              onTouchStart={handleTouchStart}

              onTouchMove={handleTouchMove}
            >
              <div className="h-full flex flex-col">
                {/* Header */}

                <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
                  <h2 className="text-lg font-semibold text-[#0F172A]">
                    Filters
                  </h2>

                  <button
                    onClick={() => setShowFilterPanel(false)}

                    className="p-2 hover:bg-[#F7FAFC] rounded-lg transition-colors"

                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5 text-[#64748B]" />
                  </button>
                </div>

                {/* Filter Content */}

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[#64748B] mb-3">
                      Quick Filters
                    </h3>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setNotificationFilter("all");

                          setShowFilterPanel(false);
                        }}

                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          notificationFilter === "all"
                            ? "bg-[#0077B6] text-white shadow-md"
                            : "hover:bg-[#F7FAFC] text-[#0F172A] border border-[#E2E8F0]"
                        }`}
                      >
                        <Book className="w-5 h-5" />

                        <span className="text-sm font-medium">All Books</span>

                        {notificationFilter === "all" && (
                          <CheckCircle className="w-4 h-4 ml-auto" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setFilterAvailability(filterAvailability === "all" ? "available" : "all");

                          setShowFilterPanel(false);
                        }}

                        aria-pressed={filterAvailability === "available"}

                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          filterAvailability === "available"
                            ? "bg-[#0077B6] text-white shadow-md"
                            : "hover:bg-[#F7FAFC] text-[#0F172A] border border-[#E2E8F0]"
                        }`}
                      >
                        <CheckCircle className="w-5 h-5" />

                        <span className="text-sm font-medium">Available now only</span>

                        {filterAvailability === "available" && (
                          <CheckCircle className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    </div>
                  </div>

                  {searchHistory.length > 0 && (
                    <div className="border-t border-[#EEF2F6] pt-5">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-[#64748B]">
                          Recent searches
                        </h3>
                      </div>

                      <div className="space-y-1.5">
                        {searchHistory.slice(0, 8).map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2.5"
                          >
                            <button
                              onClick={() => {
                                handleHistoryClick(item);

                                setShowFilterPanel(false);
                              }}

                              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-[#334155] hover:text-[#0077B6]"
                            >
                              <Clock className="w-4 h-4 shrink-0 text-[#94A3B8]" />

                              <span className="truncate">{item}</span>
                            </button>

                            <button
                              onClick={() => deleteFromHistory(item)}

                              className="shrink-0 rounded-md p-1 text-[#94A3B8] hover:bg-red-50 hover:text-red-500"

                              aria-label={`Delete recent search ${item}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer - Swipe hint */}

                <div className="p-4 border-t border-[#E2E8F0] sm:hidden">
                  <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                    <ChevronRight className="w-4 h-4" />

                    <span>Swipe left to close</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* School View */}

        {showSchoolView && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E2E8F0] shadow-lg p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0F172A]">
                  Partner Schools
                </h2>

                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-4 h-4" />

                  <input
                    type="text"

                    placeholder="Search schools..."

                    value={schoolSearchQuery}

                    onChange={(e) => setSchoolSearchQuery(e.target.value)}

                    className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-[#E2E8F0] rounded-lg sm:rounded-xl focus:outline-none focus:border-[#0077B6] text-[#0F172A] placeholder-[#64748B] text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools

                  .filter(
                    (school) =>
                      school.school_name
                        ?.toLowerCase()
                        .includes(schoolSearchQuery.toLowerCase()) ||
                      school.school_code
                        ?.toLowerCase()
                        .includes(schoolSearchQuery.toLowerCase()),
                  )

                  .map((school) => (
                    <div
                      key={school.school_id}

                      className={`p-4 rounded-xl border transition-all ${
                        selectedSchool?.school_id === school.school_id
                          ? "border-[#0077B6] bg-[#F7FAFC]"
                          : "border-[#E2E8F0] hover:border-[#0077B6]"
                      }`}
                    >
                      {selectedSchool?.school_id === school.school_id ? (
                        <>
                          {/* School Info */}

                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-12 h-12 bg-[#0077B6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 text-[#0077B6]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[#0F172A] text-sm line-clamp-1">
                                {school.school_name}
                              </h3>

                              <p className="text-xs text-[#64748B] mt-1">
                                {school.school_code}
                              </p>

                              <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                                {school.address}
                              </p>
                            </div>

                            <button
                              onClick={() => setSelectedSchool(null)}

                              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              <X className="w-4 h-4 text-[#64748B]" />
                            </button>
                          </div>

                          {/* Map */}

                          <div className="aspect-square bg-[#F7FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-center mb-4">
                            <MinimalSchoolMap school={school} />
                          </div>

                          {/* Books List */}

                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {filteredBooks.map((book) => (
                              <div
                                key={book.id}

                                className="p-3 bg-white rounded-lg border border-[#E2E8F0] hover:border-[#0077B6] transition-colors"
                              >
                                <div className="flex gap-3">
                                  <div className="w-12 h-16 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded flex items-center justify-center flex-shrink-0">
                                    <Book className="w-6 h-6 text-white/90" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-[#0F172A] text-xs line-clamp-1">
                                      {book.title}
                                    </h4>

                                    <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                                      {book.author}
                                    </p>

                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs text-green-600 font-medium">
                                        Available
                                      </span>

                                      {book.available_copies !== undefined && (
                                        <span className="text-xs text-[#64748B]">
                                          · {book.available_copies} copies
                                        </span>
                                      )}
                                    </div>

                                    {book.school_id !== school.school_id && (
                                      <p className="text-xs text-[#0077B6] mt-1 font-medium">
                                        From: {book.library || "Other School"}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    const currentSchoolId = parseInt(
                                      localStorage.getItem("schoolId"),
                                    );

                                    setBorrowingFormList([
                                      {
                                        book_id: book.id,

                                        title: book.title,

                                        author: book.author,

                                        isbn: book.isbn,

                                        owner_school_id: book.school_id,

                                        owner_school_name:
                                          book.library || school.school_name,

                                        partner_school_id:
                                          book.school_id !== currentSchoolId
                                            ? currentSchoolId
                                            : null,

                                        borrow_type:
                                          book.school_id === school.school_id &&
                                          school.school_id === currentSchoolId
                                            ? "HOME"
                                            : "INTER_SCHOOL_LIBRARY_USE",
                                      },
                                    ]);

                                    setShowBorrowingForm(true);
                                  }}

                                  className="w-full mt-3 bg-[#0077B6] hover:bg-[#005f8f] text-white py-2 rounded-lg font-medium transition-colors text-xs"
                                >
                                  Borrow This Book
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div
                          onClick={() => {
                            console.log(
                              "[SCHOOL SELECT] Selected school:",
                              school,
                            );

                            console.log(
                              "[SCHOOL SELECT] school.school_id:",
                              school.school_id,
                            );

                            setSelectedSchool(school);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-[#0077B6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 text-[#0077B6]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[#0F172A] text-sm line-clamp-1">
                                {school.school_name}
                              </h3>

                              <p className="text-xs text-[#64748B] mt-1">
                                {school.school_code}
                              </p>

                              <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                                {school.address}
                              </p>
                            </div>
                          </div>

                          {/* Show book count for this school */}

                          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                            <p className="text-xs text-[#64748B]">
                              {
                                filteredBooks.filter(
                                  (book) => book.school_id === school.school_id,
                                ).length
                              }{" "}
                              books available
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Book Results Grid */}

        <div className="max-w-7xl px-3 pt-[12px] sm:px-0 lg:pl-0 lg:pt-[4px]">
          {!showSchoolView && (
            <>
              {/* Empty State */}

              {!loading && filteredBooks.length === 0 && (
                <div className="text-center py-20 px-4">
                  <div className="w-16 h-16 bg-[#F7FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-[#64748B]" />
                  </div>

                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                    No books found
                  </h3>

                  <p className="text-sm text-[#64748B]">
                    Try adjusting your search criteria
                  </p>
                </div>
              )}

              {/* Book Grid */}

              {loading && (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-12 text-center">
                  <img
                    src="/L.png"
                    alt="Loading Libralink books"
                    className="h-14 w-14 animate-pulse object-contain"
                  />
                  <p className="text-sm font-medium text-slate-500">Loading books...</p>
                </div>
              )}

              {filteredBooks.length > 0 && (
                <div className="space-y-6">
                  {categoryView && (
                    <button type="button" onClick={() => setSearchParams({})} className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
                      <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                      All book categories
                    </button>
                  )}
                  {displayedBookGroups.map(({ category, books: categoryBooks }) => (
                    <section key={category} aria-labelledby={`category-${category}`} className="scroll-mt-[160px] pt-1 first:pt-2 lg:first:pt-0">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 id={`category-${category}`} className="truncate text-lg font-bold leading-tight tracking-tight text-slate-900 sm:text-xl">{category} books</h3>
                        </div>

                        {!categoryView && categoryBooks.length > initialBooksPerCategory && (
                          <button
                            type="button"
                            onClick={() => setSearchParams({ category })}
                            className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
                          >
                            See all {categoryBooks.length} books
                          </button>
                        )}
                      </div>
                      <div className={categoryView
                        ? "space-y-3"
                        : "flex gap-2 overflow-x-auto pb-3 pl-0 pr-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:snap-none sm:pb-0 sm:pr-0 lg:flex lg:flex-nowrap lg:gap-4 lg:overflow-x-auto lg:pb-4 lg:pr-8 lg:snap-x lg:snap-mandatory scrollbar-hide"}>
                  {categoryBooks
                    .slice(0, categoryView ? categoryBooks.length : initialBooksPerCategory)
                    .map((book) => {
                    const displayStatus = getBookDisplayStatus(book);
                    const personalReview = readingReviews[book.id];

                    const isAvailable = displayStatus === "available";

                    return (
                      <div
                        key={book.id}

                        onClick={() => handleBookClick(book)}

                        className={`group min-w-0 cursor-pointer overflow-hidden bg-transparent p-0 transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 ${categoryView ? "w-full rounded-xl px-0 py-1.5 transition hover:bg-slate-100/60" : "w-[38%] shrink-0 snap-start sm:w-full sm:min-w-0 lg:w-[188px] lg:min-w-[188px] lg:shrink-0 lg:snap-start"}`}

                        role="button"

                        tabIndex={0}

                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();

                            handleBookClick(book);
                          }
                        }}
                      >
                        {categoryView ? (
                          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
                            <div className="relative flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-inner">
                              <div className="absolute inset-y-0 left-0 w-1.5 bg-white/15" />
                              <Book className="h-6 w-6 text-white" />
                              <span className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-md bg-slate-950/35 px-1 py-0.5 text-[7px] font-semibold text-white backdrop-blur-sm">
                                {getBookCategory(book)}
                              </span>
                              {personalReview && (
                                <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-md bg-amber-400 px-1 py-0.5 text-[7px] font-bold text-amber-950 shadow-sm">
                                  <Star className="h-2.5 w-2.5 fill-current" />
                                  {personalReview.rating}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="truncate text-[13px] font-bold leading-4 text-[#0F172A]" title={book.title}>
                                    {book.title}
                                  </h3>
                                  <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                                    {book.author}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <BookStatusBadge status={displayStatus} compact />
                                    <span className="text-[9px] font-medium text-slate-500">
                                      {getBookCategory(book)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBookClick(book);
                                    }}
                                    className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-200"
                                    type="button"
                                  >
                                    Details
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isAvailable) {
                                        handleAddToBorrowingList(book);
                                      } else {
                                        searchBookInOtherSchools(book);
                                      }
                                    }}
                                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                                      isAvailable
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                                    type="button"
                                  >
                                    {isAvailable ? "Borrow" : "Check"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="relative mb-1.5 flex aspect-[4/5] min-h-[118px] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-inner sm:min-h-[164px]">
                              <div className="absolute inset-y-0 left-0 w-2 bg-white/15" />
                              <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/10" />
                              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-sm"><Book className="h-6 w-6 text-white" /></div>
                              <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-slate-950/35 px-1.5 py-1 text-[9px] font-semibold text-white backdrop-blur-sm">{getBookCategory(book)}</span>
                              {personalReview && <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-amber-400 px-1.5 py-1 text-[9px] font-bold text-amber-950 shadow-sm"><Star className="h-2.5 w-2.5 fill-current" /> {personalReview.rating}</span>}
                            </div>

                            <div className="min-w-0 space-y-1.5">
                              <h3 className="h-8 overflow-hidden text-ellipsis text-[11px] font-bold leading-4 text-[#0F172A] line-clamp-2" title={book.title}>
                                {book.title}
                              </h3>

                              <p className="text-[#64748B] text-[10px] line-clamp-1">
                                {book.author}
                              </p>

                              <div className="flex items-center justify-between gap-1 pt-1">
                                <BookStatusBadge status={displayStatus} compact />

                                <div className="flex items-center gap-1">
                                  {displayStatus !== "available" ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        searchBookInOtherSchools(book);
                                      }}

                                      className="rounded-lg p-1.5 transition-colors hover:bg-[#0077B6]/10"

                                      aria-label="Find in other schools"

                                      title="Find in other schools"
                                    >
                                      <Globe className="w-3.5 h-3.5 text-[#0077B6]" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        handleAddToBorrowingList(book);
                                      }}

                                      className="rounded-lg p-1.5 transition-colors hover:bg-[#0077B6]/10"

                                      aria-label="Add to borrowing list"

                                      disabled={displayStatus !== "available"}
                                    >
                                      <Plus
                                        className={`w-3.5 h-3.5 ${displayStatus === "available" ? "text-[#0077B6] hover:text-[#005f8f]" : "text-gray-300 cursor-not-allowed"}`}
                                      />
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      toggleFavorite(book.id);
                                    }}

                                    className="rounded-lg p-1.5 transition-colors hover:bg-red-50"

                                    aria-label={
                                      favorites.includes(book.id)
                                        ? "Remove from favorites"
                                        : "Add to favorites"
                                    }

                                    aria-pressed={favorites.includes(book.id)}
                                  >
                                    <Heart
                                      className={`w-3.5 h-3.5 ${favorites.includes(book.id) ? "text-red-500 fill-current" : "text-[#64748B] hover:text-red-400"}`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Book Grid with Map - Selected School */}

        {selectedSchool && (
          <div className="max-w-7xl mx-auto px-0 sm:px-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#0F172A]">
                  Books at {selectedSchool.school_name}
                </h2>

                <button
                  onClick={() => setSelectedSchool(null)}

                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>

              {/* School Information */}

              <div className="mb-6">
                <div className="p-4 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white/90" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#0F172A] text-lg">
                        {selectedSchool.school_name}
                      </h3>

                      <p className="text-sm text-[#64748B]">Library</p>
                    </div>
                  </div>

                  <p className="text-sm text-[#64748B] mb-2">
                    {selectedSchool.address}
                  </p>

                  <p className="text-sm text-[#64748B]">
                    <span className="font-medium">School Code:</span>{" "}
                    {selectedSchool.school_code}
                  </p>
                </div>
              </div>

              {/* Map */}

              <div className="mb-6">
                <div className="aspect-video bg-[#F7FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-center">
                  <MinimalSchoolMap school={selectedSchool} />
                </div>
              </div>

              {/* Show specific searched book if coming from inter-school search */}

              {bookForOtherSchoolSearch && (
                <div className="mb-6 p-5 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
                  <h3 className="font-semibold text-[#0F172A] mb-4">
                    Book Available at {selectedSchool.school_name}
                  </h3>

                  <div className="flex gap-4">
                    <div className="w-24 h-32 flex-shrink-0 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-lg flex items-center justify-center shadow-sm">
                      <Book className="w-10 h-10 text-white/90" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-[#0F172A] mb-1">
                        {bookForOtherSchoolSearch.title}
                      </h4>

                      <p className="text-sm text-[#64748B] mb-2">
                        {bookForOtherSchoolSearch.author}
                      </p>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-white text-[#64748B] rounded-md font-medium">
                          {bookForOtherSchoolSearch.category || "General"}
                        </span>

                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                          Available —{" "}
                          {bookForOtherSchoolSearch.available_copies || 1}{" "}
                          {bookForOtherSchoolSearch.available_copies === 1
                            ? "copy"
                            : "copies"}
                        </span>
                      </div>

                      <p className="text-sm text-[#64748B] mb-3">
                        ISBN: {bookForOtherSchoolSearch.isbn}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleBookClick(bookForOtherSchoolSearch);
                          }}

                          className="py-2 px-4 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] text-sm font-medium rounded-lg transition-all"
                        >
                          View Details
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            const currentSchoolId = parseInt(
                              localStorage.getItem("schoolId"),
                            );

                            console.log(
                              "[FIND OTHER SCHOOLS] currentSchoolId:",
                              currentSchoolId,
                            );

                            console.log(
                              "[FIND OTHER SCHOOLS] selectedSchool:",
                              selectedSchool,
                            );

                            console.log(
                              "[FIND OTHER SCHOOLS] selectedSchool.school_id:",
                              selectedSchool.school_id,
                            );

                            const item = {
                              book_id:
                                bookForOtherSchoolSearch.book_id ||
                                bookForOtherSchoolSearch.id,

                              title: bookForOtherSchoolSearch.title,

                              author: bookForOtherSchoolSearch.author,

                              isbn: bookForOtherSchoolSearch.isbn,

                              owner_school_id: selectedSchool.school_id,

                              owner_school_name: selectedSchool.school_name,

                              partner_school_id:
                                selectedSchool.school_id !== currentSchoolId
                                  ? currentSchoolId
                                  : null,

                              borrow_type:
                                selectedSchool.school_id !== currentSchoolId
                                  ? "INTER_SCHOOL_LIBRARY_USE"
                                  : "HOME",
                            };

                            console.log(
                              "[FIND OTHER SCHOOLS] Setting borrowing form item:",
                              item,
                            );

                            setBorrowingFormList([item]);

                            setShowBorrowingForm(true);
                          }}

                          className="py-2 px-4 bg-[#0077B6] hover:bg-[#005f8f] text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
                        >
                          <Book className="w-4 h-4" />
                          Request to Borrow
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* See All Books Button */}

              <button
                onClick={() => {
                  setBookForOtherSchoolSearch(null);

                  setOtherSchoolsWithBook([]);
                }}

                className="w-full py-3 px-4 bg-[#0077B6]/10 hover:bg-[#0077B6]/20 text-[#0077B6] font-medium rounded-xl transition-all flex items-center justify-center gap-2 mb-6"
              >
                <Book className="w-5 h-5" />
                See All Books at {selectedSchool.school_name}
              </button>

              {/* Book cards */}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredBooks

                  .filter((book) => book.school_id === selectedSchool.school_id)

                  .map((book) => (
                    <div
                      key={book.id}

                      onClick={() => handleBookClick(book)}

                      className="bg-[#F7FAFC] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#E2E8F0] hover:shadow-md transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                        {/* Book Cover */}

                        <div className="w-full sm:w-32 h-48 sm:h-44 flex-shrink-0 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <div className="text-center p-3">
                            <Book className="w-12 h-12 text-white/90 mx-auto mb-2" />

                            <p className="text-white/80 text-xs font-medium line-clamp-2">
                              {book.title}
                            </p>
                          </div>
                        </div>

                        {/* Book Information */}

                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* Favorite Icon */}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();

                              toggleFavorite(book.id);
                            }}

                            className="self-end mb-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                          >
                            <Heart
                              className={`w-5 h-5 ${favorites.includes(book.id) ? "text-red-500 fill-current" : "text-[#64748B] hover:text-red-400"}`}
                            />
                          </button>

                          {/* Title */}

                          <h3 className="font-semibold text-[#0F172A] text-base mb-1 line-clamp-2 leading-tight">
                            {book.title}
                          </h3>

                          {/* Author */}

                          <p className="text-[#64748B] text-sm mb-3 line-clamp-1">
                            {book.author}
                          </p>

                          {/* Category Tag */}

                          <div className="mb-3">
                            <span className="text-xs px-2.5 py-1 bg-white text-[#64748B] rounded-md font-medium">
                              {book.category}
                            </span>
                          </div>

                          {/* Spacer */}

                          <div className="flex-1"></div>

                          {/* Availability Status */}

                          <div className="space-y-2">
                            {(() => {
                              // Check if user has an inter-school request for this book

                              const requestKey = `${book.id}_${selectedSchool?.school_id}`;

                              const requestStatus =
                                interSchoolRequestStatuses[requestKey];

                              let status = book.real_time_status || "available";

                              let statusColors = {
                                available: "text-green-600",

                                requested: "text-yellow-600",

                                waiting_pickup: "text-blue-600",

                                borrowed: "text-red-600",
                              };

                              let statusLabels = {
                                available: "Available",

                                requested: "Requested",

                                waiting_pickup: "Waiting Pickup",

                                borrowed: "Borrowed",
                              };

                              // Override status if there's a pending inter-school request

                              if (requestStatus) {
                                if (requestStatus === "pending") {
                                  status = "requested";
                                } else if (requestStatus === "approved") {
                                  status = "waiting_pickup";
                                } else if (requestStatus === "borrowed") {
                                  status = "borrowed";
                                }
                              }

                              return (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm font-medium ${statusColors[status]}`}
                                  >
                                    {statusLabels[status]}
                                  </span>

                                  {book.available_copies !== undefined &&
                                    book.total_copies > 0 && (
                                      <span className="text-xs text-[#64748B]">
                                        · {book.available_copies}/
                                        {book.total_copies}{" "}
                                        {book.available_copies === 1
                                          ? "copy"
                                          : "copies"}
                                      </span>
                                    )}
                                </div>
                              );
                            })()}

                            {book.status_details && (
                              <p className="text-xs text-[#64748B] line-clamp-1">
                                {book.status_details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Borrow Button */}

                      <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            if (selectedSchool) {
                              const currentSchoolId = parseInt(
                                localStorage.getItem("schoolId"),
                              );

                              setBorrowingFormList([
                                {
                                  book_id: book.id,

                                  title: book.title,

                                  author: book.author,

                                  isbn: book.isbn,

                                  owner_school_id: selectedSchool.school_id,

                                  owner_school_name: selectedSchool.school_name,

                                  partner_school_id:
                                    selectedSchool.school_id !== currentSchoolId
                                      ? currentSchoolId
                                      : null,

                                  borrow_type:
                                    selectedSchool.school_id !== currentSchoolId
                                      ? "INTER_SCHOOL_LIBRARY_USE"
                                      : "HOME",
                                },
                              ]);

                              setShowBorrowingForm(true);
                            }
                          }}

                          className="w-full bg-[#0077B6] hover:bg-[#005f8f] text-white py-2.5 rounded-lg font-medium transition-colors text-sm"
                        >
                          Borrow This Book
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedBook && (
        <aside className="student-search-recommendations hidden self-start lg:sticky lg:top-[80px] lg:block lg:h-[calc(100vh-96px)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-[#F7FAFC] lg:p-4 lg:shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <img src="/L.png" alt="Libralink" className="h-9 w-9 object-contain" />
            <span className="text-base font-bold tracking-tight text-slate-900">Libralink</span>
          </div>

          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Recommended</p>
              <h2 className="text-sm font-bold text-slate-900">Books for you</h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {orderedBooks.slice(0, 6).map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => handleBookClick(book)}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/60"
              >
                <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-sm">
                  <Book className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900">{book.title}</span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">{book.author}</span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-slate-400">
                    {getBookCategory(book)}
                    {book.library ? ` · ${book.library}` : ""}
                  </span>
                  <span className={`mt-1 block text-[10px] font-semibold ${getBookDisplayStatus(book) === "available" ? "text-emerald-600" : "text-amber-600"}`}>
                    {getBookDisplayStatus(book) === "available"
                      ? book.total_copies > 0
                        ? `${book.available_copies} of ${book.total_copies} available`
                        : "Available"
                      : "Check availability"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            ))}
          </div>

          {orderedBooks.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">Search for books to see recommendations.</p>
          )}
        </aside>
      )}

      {/* Book Details Panel */}

      {selectedBook &&
        (() => {
          const selectedBookDisplayStatus = getBookDisplayStatus(selectedBook);

          const selectedBookAvailable =
            selectedBookDisplayStatus === "available";

          return (
            <div
              ref={bookDetailsPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Book details for ${selectedBook.title}`}
              className="book-details-panel fixed inset-0 z-[70] w-full min-w-0 max-w-none overflow-y-auto overscroll-contain bg-[#F7FAFC] lg:relative lg:col-start-2 lg:row-start-1 lg:z-auto lg:h-full lg:w-full lg:min-h-0 lg:max-h-none lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-slate-200 animate-panel-slide-in"
            >
              <button
                type="button"
                aria-label="Resize book details panel"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setIsResizingBookDetails(true);
                }}
                className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-[#0077B6]/40 active:bg-[#0077B6]/60"
              />

              <div className="w-full">
                {/* Modal Header */}

                <div className="sticky top-0 z-10 border-b border-slate-200 bg-[#F7FAFC] px-3 pb-2.5 pt-3 sm:px-5 sm:pb-4 sm:pt-5">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <span className="flex h-8 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 text-white sm:h-9 sm:w-8" aria-hidden="true">
                      <Book className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600 sm:mb-1 sm:text-[10px] sm:tracking-[0.16em]">
                        Book Details
                      </p>

                      <h2 className="mb-0.5 pr-1 text-sm font-bold leading-5 tracking-normal text-slate-900 sm:mb-1 sm:pr-2 sm:text-lg sm:leading-snug">
                        {selectedBook.title}
                      </h2>

                      <p className="truncate text-xs text-slate-500 sm:text-sm">
                        {selectedBook.author}
                      </p>
                    </div>

                    <button
                      type="button"

                      onClick={handleCloseOverlay}

                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:w-9"
                    >
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
                  {/* Show Borrowing Form Inline */}

                  {showBorrowingForm ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1">
                        <StudentBorrowingForm
                          borrowingList={borrowingFormList}

                          userData={userData}

                          compact

                          onSubmit={handleBorrowingSubmit}

                          onCancel={() => setShowBorrowingForm(false)}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-3 border-y border-slate-200 py-3">
                          <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Calendar className="h-4 w-4" aria-hidden="true" /></span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Shelf</p>
                              <p className="mt-1 break-words text-sm font-medium text-slate-900">{selectedBook.shelf || "Shelf not available"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><User className="h-4 w-4" aria-hidden="true" /></span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Library</p>
                              <p className="mt-1 break-words text-sm font-medium text-slate-900">{selectedBook.library || "Library not available"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Category</span><span className="mt-1 block truncate font-semibold text-slate-700">{selectedBook.category || "Not specified"}</span></p>
                          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">ISBN</span><span className="mt-1 block truncate font-semibold text-slate-700">{selectedBook.isbn || "Not available"}</span></p>
                        </div>
                      </div>

                      <div className="border-b border-slate-100 pb-6">
                        <div className="flex items-center justify-between gap-3 pb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#0077B6]" />

                            <span className="text-sm font-semibold text-[#0F172A]">
                              Library location
                            </span>
                          </div>

                        </div>

                        <div className="book-details-map relative isolate -mx-4 h-56 min-h-0 overflow-hidden bg-slate-100 sm:-mx-5 sm:h-64 lg:h-64">
                          <MinimalSchoolMap
                            school={{
                              school_id: selectedBook.school_id,
                              latitude: selectedBook.latitude,
                              longitude: selectedBook.longitude,
                              school_name: selectedBook.library,
                              address: selectedBook.schoolAddress,
                            }}
                          />
                        </div>
                      </div>

                       <div className="border-y border-slate-200 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <span className="text-sm font-bold text-slate-900">Availability</span>
                            <p className="mt-0.5 text-xs text-slate-500">Check this copy before requesting it.</p>
                          </div>

                          <BookStatusBadge status={selectedBookDisplayStatus} />
                        </div>

                         {selectedBook.status_details && (
                           <div className="mt-3 rounded-xl bg-slate-50 p-3">
                             <p className="text-xs leading-5 text-slate-600">
                               {selectedBook.status_details}
                             </p>
                           </div>
                         )}

                         {selectedBook.available_copies !== undefined &&
                           selectedBook.total_copies > 0 && (
                             <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5">
                               <p className="text-xs text-emerald-800">
                                 <span className="font-bold">{selectedBook.available_copies} of {selectedBook.total_copies}</span> copies available
                               </p>
                             </div>
                           )}

                        <div className="mt-4 grid grid-cols-1 gap-2">
                          <button
                            type="button"

                            onClick={handleBorrow}

                            disabled={!selectedBookAvailable}

                            className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                              selectedBookAvailable
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "cursor-not-allowed bg-slate-100 text-gray-400"
                            }`}
                          >
                            <Book className="w-5 h-5" />

                            {selectedBookAvailable
                              ? "Borrow Now"
                              : "Not Available"}
                          </button>

                          <button
                            type="button"

                            onClick={() =>
                              searchBookInOtherSchools(selectedBook)
                            }

                            className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Globe className="w-5 h-5" />
                            Find in Other Schools
                          </button>

                          <button
                            type="button"

                            onClick={() =>
                              handleAddToBorrowingList(selectedBook)
                            }

                            disabled={!selectedBookAvailable}

                            className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                              selectedBookAvailable
                                ? "border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                : "cursor-not-allowed border-slate-100 text-gray-400"
                            }`}
                          >
                            <Plus className="w-5 h-5" />
                            Add to List
                          </button>
                        </div>
                      </div>

                      <section className="pt-5 pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#0077B6]">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Your reading review</h3>
                              <p className="mt-0.5 text-xs leading-5 text-slate-500">Save a personal rating or note for this book.</p>
                            </div>
                          </div>
                          {readingReviews[selectedBook.id] && <span className="shrink-0 text-[10px] font-semibold text-emerald-600">Saved</span>}
                        </div>

                        <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Your book rating">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setReviewRating(rating)}
                              className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              role="radio"
                              aria-checked={reviewRating === rating}
                              aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                            >
                              <Star className={`h-6 w-6 ${rating <= reviewRating ? "fill-amber-400 text-amber-400" : "text-amber-200"}`} />
                            </button>
                          ))}
                          <span className="ml-1 text-xs font-medium text-slate-500">{reviewRating ? `${reviewRating}/5` : "Rate this book"}</span>
                        </div>

                        <textarea
                          value={reviewNote}
                          onChange={(event) => setReviewNote(event.target.value)}
                          maxLength={280}
                          rows={3}
                          placeholder="What would you like to remember about it?"
                          className="mt-3 w-full resize-none border-b border-slate-200 bg-transparent px-0 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0077B6]"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-[10px] text-slate-400">Private to this browser</span>
                          <button type="button" onClick={saveReadingReview} disabled={!reviewRating} className="text-xs font-bold text-[#0077B6] transition hover:text-[#005f8f] disabled:cursor-not-allowed disabled:text-slate-300">Save review</button>
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Added to Borrowing List Overlay */}

      {showAddedOverlay && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#0077B6] text-white px-6 py-3 rounded-full shadow-lg z-[10000] flex items-center gap-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />

          <span className="font-semibold text-sm">Added to borrowing list</span>
        </div>
      )}

      {/* Borrowing List Modal */}

      {showBorrowingList && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"

          onClick={() => setShowBorrowingList(false)}
        >
          <div
            className="mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:my-8 sm:max-h-[82vh] sm:rounded-3xl"

            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />

            {/* Modal Header */}

            <div className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Ready to borrow</p>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Borrowing List
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {borrowingList.length}{" "}
                    {borrowingList.length === 1 ? "book" : "books"} selected
                  </p>
                </div>

                <button
                  onClick={() => setShowBorrowingList(false)}

                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"

                  aria-label="Close borrowing list"
                >
                  <X className="w-6 h-6 text-[#64748B]" />
                </button>
              </div>
            </div>

            {/* Modal Content */}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {borrowingList.length === 0 ? (
                <div className="py-10 text-center sm:py-14">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 shadow-inner">
                    <Book className="h-10 w-10 text-blue-600" />
                  </div>

                  <h3 className="mb-2 text-xl font-bold text-slate-900">
                    Your borrowing list is empty
                  </h3>

                  <p className="mx-auto mb-7 max-w-[280px] text-sm leading-6 text-slate-500">
                    Add books from the search results to start borrowing
                  </p>

                  <button
                    onClick={() => setShowBorrowingList(false)}

                    className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98] hover:bg-blue-700"
                  >
                    Browse Books
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {borrowingList.map((item) => (
                    <div
                      key={item.book_id}

                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-200"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-[82px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-sm">
                          <Book className="h-7 w-7 text-white/90" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="mb-1 line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                            {item.title}
                          </h4>

                          <p className="mb-2 truncate text-xs text-slate-500">
                            {item.author}
                          </p>

                          <div className="mb-2 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />

                            <span className="truncate text-[11px] text-slate-500">
                              {item.owner_school_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                              {item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' ? 'Partner library' : 'Home library'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromBorrowingList(item.book_id)}

                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"

                          aria-label={`Remove ${item.title} from borrowing list`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}

            {borrowingList.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                <p className="mb-3 text-center text-[11px] text-slate-500">Review your selected books before submitting a request.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    type="button"
                    onClick={clearBorrowingList}

                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98]"
                  >
                    Clear All
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueToRequest}

                    className="group flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <span>Continue to borrow request</span>
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal - Only shown when request is approved */}

      {showSuccessOverlay && submittedRequest && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
          <section
            className="animate-success-sheet relative w-full max-w-[410px] overflow-hidden rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-success-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Borrowing request</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessOverlay(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-5 text-center">
              <div className="animate-success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-blue-600 text-white shadow-[0_12px_25px_rgba(37,99,235,0.25)]">
                <CheckCircle className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Request sent successfully</p>
              <h2 id="request-success-title" className="mt-1 text-[23px] font-bold tracking-tight text-slate-900">
                Request Submitted Successfully
              </h2>
              <p className="mx-auto mt-2 max-w-[300px] text-sm leading-6 text-slate-500">
                Your borrowing request has been submitted. Please wait for librarian approval.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Request ID</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-900">{submittedRequest?.request_id || "Pending"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">Pending review</span>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessOverlay(false)}
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition hover:bg-blue-700 active:scale-[0.99]"
            >
              Continue
            </button>
          </section>
        </div>
      )}

      {showQRCode && submittedRequest && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 overflow-y-auto"

          onClick={() => setShowQRCode(false)}
        >
          <div className="min-h-screen flex items-center justify-center py-8">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto"

              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Request Approved!
                    </h2>

                    <p className="text-green-100 text-sm">
                      Your borrowing request has been approved
                    </p>
                  </div>

                  <button
                    onClick={() => setShowQRCode(false)}

                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>

                  <p className="text-gray-700 mb-2">
                    Request ID:{" "}
                    <span className="font-bold">
                      {submittedRequest.request_id || "LL-2026-000001"}
                    </span>
                  </p>

                  <p className="text-gray-600 text-sm">
                    Status:{" "}
                    <span className="text-green-600 font-semibold">
                      Approved
                    </span>
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 text-center">
                    Your QR Code
                  </h3>

                  <div className="bg-white rounded-lg p-4 flex items-center justify-center">
                    {submittedRequest.qr_token ? (
                      <QRCodeDisplay
                        token={submittedRequest.qr_token}

                        requestId={
                          submittedRequest.request_id || "LL-2026-000001"
                        }
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                          <Book className="w-12 h-12 text-gray-400" />
                        </div>

                        <p className="text-sm text-gray-600">
                          QR Code will be generated by librarian
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Next Steps:
                  </h4>

                  <ol className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        1
                      </span>

                      <span>
                        Present your QR code and request ID at your home library
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        2
                      </span>

                      <span>
                        Get your permission letter from the home library using
                        the request ID
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        3
                      </span>

                      <span>
                        Show the QR code and permission letter to the partner
                        school librarian for release
                      </span>
                    </li>
                  </ol>
                </div>

                <button
                  onClick={() => setShowQRCode(false)}

                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Schools Availability Modal */}

      {false && showOtherSchoolsModal && (
        <div className="relative z-30 w-full mb-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
          <div className="w-full p-3 sm:p-5 lg:p-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col">
              {/* Modal Header */}

              <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A]">
                    Available in Other Schools
                  </h2>

                  <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                    "{bookForOtherSchoolSearch?.title}" is available at these
                    partner schools
                  </p>
                </div>

                <button
                  onClick={() => setShowOtherSchoolsModal(false)}

                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#64748B]" />
                </button>
              </div>

              {/* Modal Content */}

              <div className="p-4 sm:p-5">
                {searchingOtherSchools ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

                    <p className="text-[#64748B]">Searching other schools...</p>
                  </div>
                ) : otherSchoolsWithBook.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#F7FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-[#64748B]" />
                    </div>

                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                      No Available Copies Found
                    </h3>

                    <p className="text-sm text-[#64748B] mb-6">
                      This book is not currently available in any partner school
                      library.
                    </p>

                    <button
                      onClick={() => setShowOtherSchoolsModal(false)}

                      className="bg-[#0077B6] hover:bg-[#005f8f] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                    {otherSchoolsWithBook.map((schoolData) => (
                      <div
                        key={schoolData.school_id}

                        className="bg-[#F7FAFC] rounded-2xl p-5 border border-[#E2E8F0] hover:border-[#0077B6] transition-all cursor-pointer group"

                        onClick={() => {
                          setSelectedSchool({
                            school_id: schoolData.school_id,

                            school_name: schoolData.school_name,

                            address: schoolData.address,

                            school_code: schoolData.school_code,
                          });

                          setBookForOtherSchoolSearch({
                            book_id: schoolData.book_id,

                            title: schoolData.title,

                            author: schoolData.author,

                            isbn: schoolData.isbn,

                            available_copies: schoolData.available_copies,

                            total_copies: schoolData.total_copies,
                          });

                          setShowOtherSchoolsModal(false);
                        }}
                      >
                        {/* School Logo */}

                        <div className="w-16 h-16 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-xl flex items-center justify-center mb-4 group-hover:shadow-md transition-shadow">
                          <Building2 className="w-8 h-8 text-white/90" />
                        </div>

                        {/* School Name */}

                        <h3 className="font-semibold text-[#0F172A] text-base mb-2 line-clamp-2">
                          {schoolData.school_name}
                        </h3>

                        {/* School Address */}

                        <p className="text-sm text-[#64748B] mb-4 line-clamp-2">
                          {schoolData.address}
                        </p>

                        {/* Book Info */}

                        <div className="bg-white rounded-lg p-3 mb-4 border border-[#E2E8F0]">
                          <div className="flex gap-3">
                            <div className="w-10 h-14 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded flex items-center justify-center flex-shrink-0">
                              <Book className="w-5 h-5 text-white/90" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[#0F172A] text-xs line-clamp-2 mb-1">
                                {schoolData.title}
                              </h4>

                              <p className="text-[10px] text-[#64748B] line-clamp-1 mb-1">
                                {schoolData.author}
                              </p>

                              <p className="text-[10px] text-[#94A3B8]">
                                ISBN: {schoolData.isbn}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Availability */}

                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>

                          <span className="text-sm font-medium text-green-600">
                            Available
                          </span>

                          <span className="text-sm text-[#64748B]">
                            · {schoolData.available_copies}{" "}
                            {schoolData.available_copies === 1
                              ? "copy"
                              : "copies"}
                          </span>
                        </div>

                        {/* View Button */}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setSelectedBook({
                              id: schoolData.book_id,

                              title: schoolData.title,

                              author: schoolData.author,

                              isbn: schoolData.isbn,

                              library: schoolData.school_name,

                              location: schoolData.address,

                              real_time_status: schoolData.real_time_status,

                              available_copies: schoolData.available_copies,

                              total_copies: schoolData.total_copies,

                              school_id: schoolData.school_id,
                            });

                            setShowOtherSchoolsModal(false);

                            setShowBookDetailModal(true);
                          }}

                          className="w-full py-2.5 px-4 bg-[#0077B6] hover:bg-[#005f8f] text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                        >
                          View Book & Location
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Detail - Inline */}

      {false && showBookDetailModal && selectedBook && (
        <div className="bg-white rounded-2xl p-0 border border-[#E2E8F0] shadow-sm mb-6">
          {/* Header */}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#0F172A]">
              Book Details
            </h2>

            <button
              onClick={() => {
                setShowBookDetailModal(false);

                setSelectedBook(null);
              }}

              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-[#64748B]" />
            </button>
          </div>

          {/* Content */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Book Info */}

            <div className="space-y-6">
              {/* Book Cover */}

              <div className="w-full h-64 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-xl flex items-center justify-center shadow-sm">
                <Book className="w-24 h-24 text-white/90" />
              </div>

              {/* Title */}

              <h3 className="text-2xl font-bold text-[#0F172A]">
                {selectedBook.title}
              </h3>

              {/* Author */}

              <div className="flex items-center gap-2 text-[#64748B]">
                <User className="w-4 h-4" />

                <span className="text-sm">
                  {selectedBook.author || "Unknown Author"}
                </span>
              </div>

              {/* ISBN */}

              {selectedBook.isbn && (
                <div className="text-sm text-[#94A3B8]">
                  ISBN: {selectedBook.isbn}
                </div>
              )}

              {/* Status */}

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedBook.real_time_status === "available"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedBook.real_time_status === "available"
                    ? "Available"
                    : "Unavailable"}
                </span>

                {selectedBook.available_copies !== undefined &&
                  selectedBook.total_copies > 0 && (
                    <span className="text-sm text-[#64748B]">
                      {selectedBook.available_copies}/
                      {selectedBook.total_copies} copies
                    </span>
                  )}
              </div>

              {/* Location Info */}

              <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-[#0077B6] mt-0.5" />

                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">
                      Library
                    </p>

                    <p className="text-sm text-[#64748B]">
                      {selectedBook.library || "Your Library"}
                    </p>
                  </div>
                </div>

                {selectedBook.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#0077B6] mt-0.5" />

                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        Shelf Location
                      </p>

                      <p className="text-sm text-[#64748B]">
                        {selectedBook.location}
                      </p>
                    </div>
                  </div>
                )}

                {selectedBook.shelf && (
                  <div className="flex items-start gap-3">
                    <Book className="w-5 h-5 text-[#0077B6] mt-0.5" />

                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        Shelf
                      </p>

                      <p className="text-sm text-[#64748B]">
                        {selectedBook.shelf}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Borrow Button */}

              <div className="pt-4">
                <button
                  onClick={() => {
                    setShowBookDetailModal(false);

                    handleBorrow();
                  }}

                  disabled={selectedBook.real_time_status !== "available"}

                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
                    selectedBook.real_time_status === "available"
                      ? "bg-[#0077B6] hover:bg-[#005f8f] shadow-md hover:shadow-lg"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {selectedBook.real_time_status === "available"
                    ? "Borrow This Book"
                    : "Currently Unavailable"}
                </button>
              </div>
            </div>

            {/* Map & User Info */}

            <div className="space-y-6">
              {/* Map */}

              <div className="bg-[#F7FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                <h4 className="text-lg font-semibold text-[#0F172A] mb-4">
                  Location Map
                </h4>

                <div className="h-64 bg-white rounded-lg overflow-hidden">
                  {selectedBook.latitude && selectedBook.longitude ? (
                    <MinimalSchoolMap
                      school={{
                        latitude: selectedBook.latitude,

                        longitude: selectedBook.longitude,

                        school_name: selectedBook.library,
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#64748B]">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />

                        <p className="text-sm">Library Location</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}

              {userData && (
                <div className="bg-[#F7FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                  <h4 className="text-lg font-semibold text-[#0F172A] mb-4">
                    Your Information
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0077B6]/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#0077B6]" />
                      </div>

                      <div>
                        <p className="font-medium text-[#0F172A]">
                          {userData.full_name || userData.name || "User"}
                        </p>

                        <p className="text-sm text-[#64748B]">
                          {userData.email || ""}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-[#0077B6]" />

                        <span className="text-[#64748B]">School:</span>

                        <span className="font-medium text-[#0F172A]">
                          {userData.school_name || userData.college || "N/A"}
                        </span>
                      </div>

                      {userData.student_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-[#0077B6]" />

                          <span className="text-[#64748B]">Student No:</span>

                          <span className="font-medium text-[#0F172A]">
                            {userData.student_number}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentSearch;
