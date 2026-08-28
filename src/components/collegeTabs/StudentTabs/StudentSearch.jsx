import { useState, useEffect, useLayoutEffect, useRef } from "react";

import { useLocation } from "react-router-dom";

import {
  Search,
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
} from "lucide-react";

import api from "../../../utils/api";

import { MinimalSchoolMap } from "./SchoolMap";

import StudentBorrowingForm from "./StudentBorrowingForm";

import QRCodeDisplay from "./QRCodeDisplay";

import { BookGridSkeleton } from "../../ui/Skeleton";

function BookStatusBadge({ status }) {
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

      <span className="truncate">{config.label}</span>
    </span>
  );
}

function StudentSearch({ onBookClick, onBorrowClick }) {
  const location = useLocation();

  const initialSearchQuery = location.state?.query || "";

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");

    return saved ? JSON.parse(saved) : [];
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterPanelRef = useRef(null);

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

  const [books, setBooks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedBook, setSelectedBook] = useState(null);

  const [bookDetailsWidth, setBookDetailsWidth] = useState(360);

  const [isResizingBookDetails, setIsResizingBookDetails] = useState(false);

  const [borrowingList, setBorrowingList] = useState(() => {
    const saved = localStorage.getItem("borrowingList");

    return saved ? JSON.parse(saved) : [];
  });

  const [showBorrowingList, setShowBorrowingList] = useState(false);

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

  useEffect(() => {
    if (!isResizingBookDetails) return undefined;

    const handlePointerMove = (event) => {
      const nextWidth = window.innerWidth - event.clientX;
      setBookDetailsWidth(Math.min(620, Math.max(320, nextWidth)));
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
    setDebouncedQuery(searchQuery);
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

            category: "General",

            isbn: book.isbn || "Unknown",

            year: book.publication_year || "Unknown",

            real_time_status: book.real_time_status || "available",

            status_details: book.status_details || null,

            available_copies: book.available_copies || 0,

            total_copies: book.total_copies || 0,

            school_id: book.school_id,

            library: book.schools?.school_name || "Your Library",

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

      book.description,

      book.keywords,
    ]

      .filter(Boolean)

      .join(" ")

      .toLowerCase();

    const matchesSearch =
      debouncedQuery === "" ||
      searchableBookText.includes(debouncedQuery.toLowerCase());

    const selectedKeywords = subjectKeywords[selectedCategory] || [
      selectedCategory.toLowerCase(),
    ];

    const matchesCategory =
      selectedCategory === "All Books" ||
      selectedKeywords.some((keyword) => searchableBookText.includes(keyword));

    return matchesSearch && matchesCategory;
  });

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
  };

  const clearBorrowingList = () => {
    setBorrowingList([]);

    localStorage.removeItem("borrowingList");
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

  return (
    <div
      className={`animate-slide-up box-border w-full min-w-0 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-0 pb-8 sm:pb-6 lg:pb-0 lg:-mt-[76px] ${selectedBook ? "lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_var(--book-details-width)] lg:gap-0" : ""}`}
      style={{ "--book-details-width": `${bookDetailsWidth}px` }}
    >
      <div
        className={`min-w-0 lg:px-0 ${selectedBook ? "lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain" : ""}`}
      >
        {/* Other school results - 4th panel - Sticky */}

        {showOtherSchoolsModal && (
          <section
            ref={otherSchoolsSectionRef}
            className="mb-4 sm:mb-6 w-full scroll-mt-[80px] rounded-2xl border border-[#DDE6EF] bg-white p-4 shadow-sm sm:p-5 sticky top-[64px] md:top-[76px] z-40"
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

        {/* Search and filter card */}

        <div className="mb-4 sm:mb-6 md:-mt-6 sticky top-[64px] md:top-[76px] z-30 bg-[#F8FAFC] pb-2">
          <div className="w-full min-w-0 overflow-hidden bg-white border border-[#DDE6EF] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-2">
            <div className="px-2 pt-0 pb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                Search your books
              </h1>

              <p className="text-sm sm:text-base text-[#64748B] mt-1">
                Find and explore books from your library
              </p>
            </div>

            <div className="relative w-full min-w-0 overflow-hidden border border-[#E2E8F0] rounded-xl bg-[#FBFDFF]">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4 sm:w-5 sm:h-5" />

              <input
                type="text"

                placeholder="Search by title, author, or ISBN..."

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

                onFocus={() => setShowSearchHistory(true)}

                className="w-full pl-10 sm:pl-12 pr-12 py-1 bg-transparent focus:outline-none focus:border-[#0077B6] focus:ring-0 text-[#0F172A] placeholder-[#94A3B8] text-sm touch-manipulation transition-all"
              />

              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");

                      setShowSearchHistory(false);
                    }}

                    className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F7FAFC] rounded-lg transition-colors"

                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setShowFilterPanel(true)}

                  className="p-2 text-[#64748B] hover:text-[#0077B6] hover:bg-[#F7FAFC] rounded-lg transition-colors"

                  aria-label="Open filters"
                >
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Search History Dropdown */}

              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between p-3 border-b border-[#E2E8F0]">
                    <span className="text-sm font-medium text-[#0F172A]">
                      Recent Searches
                    </span>

                    <button
                      onClick={clearSearchHistory}

                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear all
                    </button>
                  </div>

                  {searchHistory.map((item, index) => (
                    <div
                      key={index}

                      className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F7FAFC] transition-colors cursor-pointer group"

                      onClick={() => handleHistoryClick(item)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Clock className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />

                        <span className="text-sm text-[#0F172A] truncate">
                          {item}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          deleteFromHistory(item);
                        }}

                        className="p-1 text-[#94A3B8] hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mt-2 pt-2 border-t border-[#EEF2F6]">
              <div className="flex items-center justify-between gap-3 mb-1.5 px-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Browse by subject
                  </p>

                  <span
                    className="flex items-center gap-0.5 text-[9px] font-medium normal-case tracking-normal text-[#94A3B8] sm:hidden"
                    aria-hidden="true"
                  >
                    Swipe <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>

                <span className="text-[10px] text-[#64748B] whitespace-nowrap">
                  {filteredBooks.length}{" "}
                  {filteredBooks.length === 1 ? "result" : "results"}
                </span>
              </div>

              <div className="relative min-w-0">
                <div
                  ref={filterRailRef}
                  className="flex min-w-0 max-w-full gap-1.5 overflow-x-auto scroll-smooth overscroll-x-contain touch-pan-x pb-0.5 scrollbar-hide snap-x snap-mandatory animate-filter-rail"
                  role="tablist"
                  aria-label="Swipe book subjects horizontally"
                >
                  {filterCategories.map((category) => (
                    <button
                      key={category}

                      onClick={() => handleCategoryChange(category)}

                      data-category={category}

                      role="tab"

                      aria-selected={selectedCategory === category}

                      className={`snap-center shrink-0 min-h-8 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 border active:scale-95 touch-manipulation inline-flex items-center justify-start gap-1.5 ${
                        selectedCategory === category
                          ? "bg-transparent text-[#0077B6] border-[#0077B6] ring-2 ring-[#0077B6]/15"
                          : "bg-transparent text-[#334155] border-[#E2E8F0] hover:border-[#0077B6] hover:text-[#0077B6]"
                      }`}
                    >
                      {(() => {
                        const SubjectIcon = subjectIcons[category] || BookOpen;

                        return (
                          <span
                            className="flex shrink-0 items-center justify-center w-4 h-4 rounded-md border border-current/25"
                            aria-hidden="true"
                          >
                            <SubjectIcon className="w-3 h-3" />
                          </span>
                        );
                      })()}

                      <span>{category}</span>
                    </button>
                  ))}
                </div>

                <div
                  className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FBFDFF] to-transparent sm:hidden"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-2 pt-2 border-t border-[#EEF2F6]">
                <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Popular authors
                    </p>

                    <span className="text-[9px] text-[#94A3B8]">
                      Tap to search
                    </span>
                  </div>

                  <span
                    className="flex items-center gap-0.5 text-[9px] font-medium text-[#94A3B8] sm:hidden"
                    aria-hidden="true"
                  >
                    Swipe <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="relative">
                  <div
                    className="flex gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-0.5 px-0.5 scrollbar-hide snap-x snap-mandatory"
                    role="list"
                    aria-label="Popular authors"
                  >
                    {popularAuthors.map((author) => (
                      <button
                        key={author}

                        onClick={() => {
                          setSearchQuery(author);

                          setShowSearchHistory(false);
                        }}

                        className="snap-start shrink-0 inline-flex items-center gap-1.5 min-h-8 px-2 rounded-xl border border-[#DDE6EF] bg-transparent text-[10px] font-medium text-[#475569] hover:border-[#0077B6] hover:text-[#0077B6] transition-colors active:scale-95 touch-manipulation"
                      >
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded-md border border-[#DDE6EF] text-[#64748B]"
                          aria-hidden="true"
                        >
                          <PenLine className="w-3 h-3" />
                        </span>

                        {author}
                      </button>
                    ))}
                  </div>

                  <div
                    className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FBFDFF] to-transparent sm:hidden"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other school results - 4th panel */}

        {showOtherSchoolsModal && (
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
                    </div>
                  </div>

                  {searchHistory.length > 0 && (
                    <div className="border-t border-[#EEF2F6] pt-5">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="text-sm font-semibold text-[#64748B]">
                          Recent searches
                        </h3>

                        <button
                          onClick={clearSearchHistory}

                          className="text-xs font-medium text-[#0077B6] hover:text-[#005f8f]"
                        >
                          Clear all
                        </button>
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

        {/* Results Count */}

        <div className="mb-4 sm:mb-6">
          <p className="text-[#64748B] text-xs sm:text-sm font-medium">
            {filteredBooks.length}{" "}
            {filteredBooks.length === 1 ? "book" : "books"} found
          </p>
        </div>

        {/* Book Results Grid */}

        <div className="max-w-7xl">
          {!showSchoolView && (
            <>
              {/* Empty State */}

              {loading && <BookGridSkeleton count={6} />}

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

              {filteredBooks.length > 0 && (
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 ${selectedBook ? "lg:grid-cols-4" : "lg:grid-cols-4 xl:grid-cols-5"}`}
                >
                  {filteredBooks.map((book) => {
                    const displayStatus = getBookDisplayStatus(book);

                    return (
                      <div
                        key={book.id}

                        onClick={() => handleBookClick(book)}

                        className="min-w-0 bg-white rounded-lg p-2 border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#0077B6] transition-all duration-300 cursor-pointer group active:scale-[0.98]"

                        role="button"

                        tabIndex={0}

                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();

                            handleBookClick(book);
                          }
                        }}
                      >
                        {/* Book Cover */}

                        <div className="h-44 sm:h-52 lg:h-56 w-full bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-md flex items-center justify-center mb-2">
                          <Book className="w-7 h-7 text-white/90" />
                        </div>

                        {/* Book Info */}

                        <div className="space-y-1 min-w-0">
                          {/* Title */}

                          <h3 className="font-semibold text-[#0F172A] text-xs line-clamp-2 leading-tight min-h-[2rem]">
                            {book.title}
                          </h3>

                          {/* Author */}

                          <p className="text-[#64748B] text-xs line-clamp-1">
                            {book.author}
                          </p>

                          {/* Category Badge */}

                          <span className="inline-block text-xs px-1.5 py-0.5 bg-[#F7FAFC] text-[#64748B] rounded-sm font-medium">
                            {book.category || "General"}
                          </span>

                          {/* Availability Status */}

                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <BookStatusBadge status={displayStatus} />

                            <div className="flex items-center gap-1">
                              {displayStatus !== "available" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    searchBookInOtherSchools(book);
                                  }}

                                  className="p-1 hover:bg-[#0077B6]/10 rounded transition-colors"

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

                                  className="p-1 hover:bg-[#0077B6]/10 rounded transition-colors"

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

                                className="p-1 hover:bg-red-50 rounded transition-colors"

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
                      </div>
                    );
                  })}
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

      {/* Book Details Panel */}

      {selectedBook &&
        (() => {
          const selectedBookDisplayStatus = getBookDisplayStatus(selectedBook);

          const selectedBookAvailable =
            selectedBookDisplayStatus === "available";

          return (
            <div
              ref={bookDetailsPanelRef}
              className="relative w-full sm:w-[340px] lg:w-full lg:-mr-8 lg:self-start lg:mt-[76px] lg:h-[calc(100vh-76px)] lg:min-h-0 lg:max-h-[calc(100vh-76px)] lg:overflow-y-scroll lg:overscroll-contain bg-white shadow-lg border border-[#E2E8F0] rounded-xl animate-slide-up"
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

                <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#E2E8F0]">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0077B6] mb-1">
                        Book Details
                      </p>

                      <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1 line-clamp-2 pr-2">
                        {selectedBook.title}
                      </h2>

                      <p className="text-[#64748B] text-sm">
                        {selectedBook.author}
                      </p>
                    </div>

                    <button
                      type="button"

                      onClick={handleCloseOverlay}

                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-[#64748B]" />
                    </button>
                  </div>
                </div>

                <div className="px-4 sm:px-5 pt-5 sm:pt-6">
                  {/* Show Borrowing Form Inline */}

                  {showBorrowingForm ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[#0F172A]">
                          Borrowing Request
                        </h3>

                        <button
                          type="button"

                          onClick={() => setShowBorrowingForm(false)}

                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5 text-[#64748B]" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto">
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
                       <div className="grid grid-cols-1 gap-4">
                        <div className="flex gap-3 min-w-0">
                          <div className="w-24 h-36 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm">
                            <div className="text-center p-3">
                              <Book className="w-10 h-10 text-white/90 mx-auto mb-2" />

                              <p className="text-white/80 text-xs font-medium line-clamp-2">
                                {selectedBook.title}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <span className="px-2 py-1 border border-[#E2E8F0] text-[#64748B] text-xs rounded-md font-medium">
                                {selectedBook.category}
                              </span>

                              <span className="px-2 py-1 border border-[#E2E8F0] text-[#64748B] text-xs rounded-md font-medium">
                                {selectedBook.year}
                              </span>
                            </div>

                            <p className="text-sm text-[#64748B] mb-2">
                              <span className="font-semibold text-[#0F172A]">
                                Author:
                              </span>{" "}
                              {selectedBook.author}
                            </p>

                            <p className="text-sm text-[#64748B]">
                              <span className="font-semibold text-[#0F172A]">
                                ISBN:
                              </span>{" "}
                              {selectedBook.isbn}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                            <div className="w-8 h-8 bg-[#0077B6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-[#0077B6]" />
                            </div>

                            <span className="min-w-0 break-words text-[#0F172A]">
                              <span className="font-semibold">Location:</span>{" "}
                              {selectedBook.location}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                            <div className="w-8 h-8 bg-[#0077B6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-[#0077B6]" />
                            </div>

                            <span className="min-w-0 break-words text-[#0F172A]">
                              <span className="font-semibold">Shelf:</span>{" "}
                              {selectedBook.shelf}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                            <div className="w-8 h-8 bg-[#0077B6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-[#0077B6]" />
                            </div>

                            <span className="min-w-0 break-words text-[#0F172A]">
                              <span className="font-semibold">Library:</span>{" "}
                              {selectedBook.library}
                            </span>
                          </div>
                        </div>
                      </div>

                       <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#0077B6]" />

                            <span className="text-sm font-semibold text-[#0F172A]">
                              Library location
                            </span>
                          </div>

                          {selectedBook.latitude && selectedBook.longitude && (
                            <button
                              type="button"

                              onClick={() =>
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${selectedBook.latitude},${selectedBook.longitude}`,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }

                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0077B6] px-2.5 py-1.5 text-xs font-semibold text-[#0077B6] hover:bg-[#EAF6FB]"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Directions
                            </button>
                          )}
                        </div>

                        <div className="h-44 sm:h-52 bg-white">
                          <MinimalSchoolMap
                            school={{
                              latitude: selectedBook.latitude,

                              longitude: selectedBook.longitude,

                              school_name: selectedBook.library,

                              address: selectedBook.location,
                            }}
                          />
                        </div>
                      </div>

                       <div className="border-t border-[#E2E8F0] pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-[#64748B]">
                            Availability Status
                          </span>

                          <BookStatusBadge status={selectedBookDisplayStatus} />
                        </div>

                         {selectedBook.status_details && (
                           <div className="p-3 bg-[#F7FAFC] rounded-lg border border-[#E2E8F0]">
                             <p className="text-sm text-[#64748B]">
                               {selectedBook.status_details}
                             </p>
                           </div>
                         )}

                         {selectedBook.available_copies !== undefined &&
                           selectedBook.total_copies > 0 && (
                             <div className="p-3 bg-[#F7FAFC] rounded-lg border border-[#E2E8F0]">
                               <p className="text-sm text-[#0F172A]">
                                 <span className="font-semibold">
                                   Available Copies:
                                 </span>{" "}
                                 {selectedBook.available_copies} /{" "}
                                 {selectedBook.total_copies}
                               </p>
                             </div>
                           )}

                        <div className="grid grid-cols-1 gap-2.5">
                          <button
                            type="button"

                            onClick={handleBorrow}

                            disabled={!selectedBookAvailable}

                            className={`w-full min-w-0 py-3 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                              selectedBookAvailable
                                ? "bg-[#0077B6] hover:bg-[#005f8f] text-white shadow-sm"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
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

                            className="w-full min-w-0 py-3 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm bg-white border-2 border-[#0077B6] text-[#0077B6] hover:bg-[#F7FAFC]"
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

                            className={`w-full min-w-0 py-3 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                              selectedBookAvailable
                                ? "bg-white border-2 border-[#0077B6] text-[#0077B6] hover:bg-[#F7FAFC]"
                                : "bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <Plus className="w-5 h-5" />
                            Add to List
                          </button>
                        </div>
                      </div>
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

      {/* Borrowing List Button - Mobile Only */}

      <button
        ref={buttonRef}

        onClick={(e) => {
          if (!isDragging) {
            setShowBorrowingList(true);
          }
        }}

        onTouchStart={handleDragStart}

        onTouchMove={handleDragMove}

        onTouchEnd={handleDragEnd}

        style={{
          position: "fixed",

          bottom: buttonPosition.y || 24,

          right: buttonPosition.x || 24,

          zIndex: 9999,

          display: "flex",

          alignItems: "center",

          justifyContent: "center",

          border: "none",

          cursor: "pointer",

          transform: isDragging ? "scale(1.1)" : "scale(1)",

          transition: "transform 0.15s ease, opacity 0.3s ease",

          opacity: isDragging ? 0.5 : 1,
        }}

        className="sm:hidden w-14 h-14 bg-[#0077B6] text-white shadow-lg rounded-full"
      >
        <ShoppingCart className="w-6 h-6" />

        {borrowingList.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
            {borrowingList.length}
          </span>
        )}
      </button>

      {/* Borrowing List Modal */}

      {showBorrowingList && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-0 sm:p-4 flex items-end sm:items-center justify-center"

          onClick={() => setShowBorrowingList(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-auto my-8"

            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}

            <div className="p-6 border-b border-[#E2E8F0]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-1">
                    Borrowing List
                  </h2>

                  <p className="text-[#64748B] text-sm">
                    {borrowingList.length}{" "}
                    {borrowingList.length === 1 ? "book" : "books"} selected
                  </p>
                </div>

                <button
                  onClick={() => setShowBorrowingList(false)}

                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#64748B]" />
                </button>
              </div>
            </div>

            {/* Modal Content */}

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {borrowingList.length === 0 ? (
                <div className="text-center py-12">
                  <Book className="w-16 h-16 text-[#64748B] mx-auto mb-4" />

                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                    Your borrowing list is empty
                  </h3>

                  <p className="text-sm text-[#64748B] mb-6">
                    Add books from the search results to start borrowing
                  </p>

                  <button
                    onClick={() => setShowBorrowingList(false)}

                    className="bg-[#0077B6] hover:bg-[#005f8f] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    Browse Books
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {borrowingList.map((item) => (
                    <div
                      key={item.book_id}

                      className="bg-[#F7FAFC] rounded-xl p-4 border border-[#E2E8F0] hover:border-[#0077B6] transition-colors"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-28 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-lg flex-shrink-0 flex items-center justify-center">
                          <Book className="w-10 h-10 text-white/90" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#0F172A] mb-1 line-clamp-2">
                            {item.title}
                          </h4>

                          <p className="text-sm text-[#64748B] mb-2">
                            {item.author}
                          </p>

                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-[#64748B]" />

                            <span className="text-xs text-[#64748B]">
                              {item.owner_school_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-md font-medium bg-[#0077B6]/10 text-[#0077B6]">
                              Home Library
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromBorrowingList(item.book_id)}

                          className="p-2 text-[#64748B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="border-t border-[#E2E8F0] p-6 bg-[#F7FAFC]">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={clearBorrowingList}

                    className="flex-1 px-6 py-3 rounded-xl border-2 border-[#E2E8F0] text-[#0F172A] font-semibold hover:bg-gray-100 transition-all"
                  >
                    Clear All
                  </button>

                  <button
                    onClick={() => {
                      setBorrowingFormList(borrowingList);

                      setShowBorrowingForm(true);

                      setShowBorrowingList(false);
                    }}

                    className="flex-1 bg-[#0077B6] hover:bg-[#005f8f] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Borrow All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Overlay */}

      {showSuccessOverlay && submittedRequest && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-600/90 to-cyan-600/90 backdrop-blur-sm z-50 p-4 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center py-8">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>

                    <h2 className="text-xl font-bold text-white">
                      Request Submitted!
                    </h2>
                  </div>

                  <button
                    onClick={() => setShowSuccessOverlay(false)}

                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />

                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Request ID:{" "}
                        {submittedRequest?.request_id || "LL-2026-000001"}
                      </p>

                      <p className="text-xs text-green-700">
                        Status: <span className="font-semibold">Pending</span>
                      </p>
                    </div>
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
                        Wait for the partner library to approve your request
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        2
                      </span>

                      <span>
                        Once approved, you will receive a notification and your
                        QR code
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        3
                      </span>

                      <span>
                        Bring the QR code and request ID to your home library
                        for the permission letter
                      </span>
                    </li>
                  </ol>
                </div>

                <div className="text-center text-sm text-gray-600 mb-6">
                  <p>
                    Your borrowing request has been submitted successfully.
                    Please wait for the librarian to review and approve your
                    request.
                  </p>
                </div>

                <button
                  onClick={() => setShowSuccessOverlay(false)}

                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal - Only shown when request is approved */}

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
