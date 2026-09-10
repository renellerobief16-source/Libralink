import { useState, useEffect, useMemo, useRef } from "react";
import {
  Book,
  Clock,
  Users,
  AlertTriangle,
  AlertCircle,
  QrCode,
  CheckCircle2,
  Hourglass,
  XCircle,
  X,
  Send,
  RefreshCw,
  Building2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home,
  Library,
  BookOpen,
  Shuffle,
  GraduationCap,
  Filter,
  Check,
  Trophy,
  Dices,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StudentRecommendedShelf } from "./StudentRecommendedShelf";
import QRCodeDisplay from "./QRCodeDisplay";
import api, { API_ORIGIN, requestBorrowCancellation } from "../../../utils/api";
import {
  STUDENT_TOPICS,
  STUDENT_COURSES,
  getStudentPreferences,
  scoreBookForStudent,
  getTopicBookCover,
} from "../../../utils/studentRecommendations";

function SchoolAvatar({ schoolName, logo }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = (schoolName || "SC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-0.5 shadow-2xs transition hover:border-blue-500">
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
        {logo && !imageFailed ? (
          <img
            src={logo}
            alt={`${schoolName} logo`}
            className="h-full w-full rounded-xl object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
            {initials}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * ShuffledBookCard
 * Modern, clean, gradient-free card with real cover + grey L.png fallback,
 * partner school badge, course syllabus pill, and one-tap borrow action.
 */
function ShuffledBookCard({ book, onBookClick }) {
  const [imageError, setImageError] = useState(false);
  const coverUrl = getTopicBookCover(book);
  const ownerSchool =
    book.schools?.school_name || book.school_name || "Partner Library";
  const categoryName =
    book.categories?.category_name || book.category || "General";
  const isAvailable = (book.available_copies ?? 1) > 0;

  return (
    <div
      onClick={() => onBookClick(book)}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Cover with 4/5 ratio and grey L.png fallback (no gradient) */}
        <div className="relative mb-2.5 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs">
          {coverUrl && !imageError ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 z-[1]"
              onError={() => setImageError(true)}
            />
          ) : null}

          {/* Grey L.png Libralink Fallback */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-2 text-center select-none z-0">
            <img
              src="/L.png"
              alt="Libralink"
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain grayscale opacity-35 drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
            />
            <span className="mt-1.5 line-clamp-1 max-w-[85%] text-center text-[9px] font-semibold text-slate-400">
              {categoryName}
            </span>
          </div>

          {/* Book Spine border line (solid subtle, no gradient) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-black/10 border-r border-black/5 z-[2]" />

          {/* Category Pill */}
          <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs z-10">
            {categoryName}
          </div>
        </div>

        {/* School Badge */}
        <div className="mb-1.5 flex items-center gap-1">
          <span className="inline-flex items-center gap-1 max-w-full truncate rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            <Building2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{ownerSchool}</span>
          </span>
        </div>

        {/* Course Match Pill if relevant */}
        {book._matchReason && (
          <div className="mb-1.5">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
              <GraduationCap className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{book._matchReason}</span>
            </span>
          </div>
        )}

        {/* Title */}
        <h4
          className="line-clamp-2 text-xs sm:text-sm font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors"
          title={book.title}
        >
          {book.title}
        </h4>

        {/* Author */}
        <p className="mt-1 truncate text-xs text-slate-500 font-medium">
          {book.author || "Unknown Author"}
        </p>
      </div>

      {/* Footer Availability & Action */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold ${
            isAvailable ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isAvailable ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {isAvailable ? "Available" : "Checked Out"}
        </span>

        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all">
          Borrow
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function StudentHome({ bookCount = 0, schoolInfo }) {
  const navigate = useNavigate();

  // Active top navigation tab: "home" | "all" | "libraries"
  const [activeTab, setActiveTab] = useState("home");

  const [displayName, setDisplayName] = useState("Student");
  const [statsLoading, setStatsLoading] = useState(true);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [profileImage, setProfileImage] = useState("");
  const [partnerSchools, setPartnerSchools] = useState([]);

  // Student preferences & Course info
  const [studentPrefs, setStudentPrefs] = useState(() => getStudentPreferences());

  // Borrow requests & Access Token state
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequestForQR, setSelectedRequestForQR] = useState(null);

  // Cancellation States
  const [cancellationModalItem, setCancellationModalItem] = useState(null);
  const [selectedReasonPreset, setSelectedReasonPreset] = useState(
    "No longer needed for coursework / study"
  );
  const [cancellationCustomNote, setCancellationCustomNote] = useState("");
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);
  const [toastFeedback, setToastFeedback] = useState(null);

  // All Catalog & Shuffling State
  const [allCatalogBooks, setAllCatalogBooks] = useState([]);
  const [shuffledBooks, setShuffledBooks] = useState([]);
  const [loadingAllBooks, setLoadingAllBooks] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Raffle Challenge States
  const [raffleState, setRaffleState] = useState("idle"); // "idle" | "spinning" | "winner"
  const [raffleCandidateIndex, setRaffleCandidateIndex] = useState(0);
  const [wonRaffleBook, setWonRaffleBook] = useState(null);
  const raffleIntervalRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToastFeedback({ message, type });
    setTimeout(() => setToastFeedback(null), 4500);
  };

  /**
   * Helper to format official school logo
   */
  const getSchoolLogoUrl = (logo) => {
    if (!logo) return "/L.png";
    if (
      logo.startsWith("http://") ||
      logo.startsWith("https://") ||
      logo.startsWith("data:") ||
      logo.startsWith("blob:")
    ) {
      return logo;
    }
    if (logo.startsWith("/")) return `${API_ORIGIN}${logo}`;
    return `${API_ORIGIN}/${logo}`;
  };

  /**
   * Fisher-Yates course-prioritized shuffle:
   * Boosts books relevant to the student's degree/syllabus while mixing in
   * exciting diverse selections from partner school libraries.
   */
  const shuffleCatalog = (booksList, prefs) => {
    if (!Array.isArray(booksList) || booksList.length === 0) return [];

    const scored = booksList.map((book) => {
      const scoreInfo = scoreBookForStudent(book, prefs);
      return {
        ...book,
        _matchScore: scoreInfo?.score || 0,
        _matchReason: scoreInfo?.primaryReason || "",
        _matchedTopic: scoreInfo?.matchedTopic || null,
      };
    });

    const fyShuffle = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const courseMatched = fyShuffle(scored.filter((b) => b._matchScore > 0));
    const generalBooks = fyShuffle(scored.filter((b) => b._matchScore <= 0));

    if (courseMatched.length === 0) {
      return generalBooks;
    }

    const combined = [];
    let c = 0;
    let g = 0;

    // Interleave: 3 course-matched books to 2 diverse partner library books
    while (c < courseMatched.length || g < generalBooks.length) {
      for (let i = 0; i < 3 && c < courseMatched.length; i++) {
        combined.push(courseMatched[c++]);
      }
      for (let i = 0; i < 2 && g < generalBooks.length; i++) {
        combined.push(generalBooks[g++]);
      }
    }

    return combined;
  };

  const handleShuffleAction = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setShuffledBooks(shuffleCatalog(allCatalogBooks, studentPrefs));
      setIsShuffling(false);
    }, 300);
  };

  /**
   * Interactive Raffle Challenge Animation
   * Rapidly cycles candidate books across partner schools and lands on a winner!
   */
  const handleSpinRaffle = () => {
    if (raffleState === "spinning" || shuffledBooks.length === 0) return;

    setRaffleState("spinning");
    setWonRaffleBook(null);

    // Pick a candidate pool of up to 25 books
    const pool = shuffledBooks.slice(0, 25);
    if (pool.length === 0) return;

    let currentIndex = 0;
    let speed = 50; // fast start in ms
    let elapsedSteps = 0;
    const maxSteps = 28; // ~2.6s total spin

    const spinStep = () => {
      currentIndex = (currentIndex + 1) % pool.length;
      setRaffleCandidateIndex(currentIndex);
      elapsedSteps++;

      if (elapsedSteps > maxSteps) {
        // Stop on selected winner
        // Prioritize course matched book from pool
        const winner = pool[currentIndex] || pool[0];
        setWonRaffleBook(winner);
        setRaffleState("winner");
      } else {
        // Gradually slow down
        if (elapsedSteps > 15) speed += 18;
        else if (elapsedSteps > 22) speed += 35;
        raffleIntervalRef.current = setTimeout(spinStep, speed);
      }
    };

    raffleIntervalRef.current = setTimeout(spinStep, speed);
  };

  useEffect(() => {
    return () => {
      if (raffleIntervalRef.current) clearTimeout(raffleIntervalRef.current);
    };
  }, []);

  const fetchStudentRequests = async () => {
    try {
      const reqRes = await api.get("/borrow-requests/my-requests");
      const reqList = reqRes.data?.data || reqRes.data || [];
      setBorrowRequests(Array.isArray(reqList) ? reqList : []);
    } catch (reqError) {
      console.error("Error fetching borrow requests:", reqError);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem("currentUser");
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const currentUserId = localStorage.getItem("currentUserId");
        const schoolId = localStorage.getItem("schoolId");

        if (currentUser) {
          const firstName =
            currentUser?.first_name || currentUser?.name || "Student";
          setDisplayName(firstName);
          const profilePic =
            currentUser?.profile_picture || currentUser?.profile_image || "";
          setProfileImage(profilePic);
        }

        const prefs = getStudentPreferences();
        setStudentPrefs(prefs);

        if (currentUserId && schoolId) {
          // 1. Fetch borrowed books for current student
          try {
            const borrowRes = await api.get(`/borrow/student/${currentUserId}`);
            if (borrowRes.data) {
              const books = borrowRes.data.map((borrow) => {
                const dueDate = new Date(borrow.due_date);
                const today = new Date();
                const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                let status = "onTime";
                if (daysDiff < 0) status = "overdue";
                else if (daysDiff <= 3) status = "dueSoon";

                const ownerSchool =
                  borrow.book_copies?.books?.schools?.school_name ||
                  borrow.school_name ||
                  "";

                return {
                  id: borrow.borrow_id,
                  title: borrow.book_title || borrow.title || "Unknown Book",
                  author: borrow.author || "Unknown Author",
                  dueDate: borrow.due_date,
                  dueIn:
                    daysDiff < 0
                      ? `${Math.abs(daysDiff)} days overdue`
                      : daysDiff === 0
                      ? "Due today"
                      : daysDiff === 1
                      ? "Due tomorrow"
                      : `${daysDiff} days left`,
                  status: status,
                  borrowId: borrow.borrow_id,
                  ownerSchool: ownerSchool,
                };
              });
              setBorrowedBooks(books);
              setDueSoonCount(books.filter((b) => b.status === "dueSoon").length);
              setOverdueCount(books.filter((b) => b.status === "overdue").length);
            }
          } catch (borrowError) {
            console.error("Error fetching borrowed books:", borrowError);
          }

          // 2. Fetch student's borrow requests
          await fetchStudentRequests();

          // 3. Fetch registered partner schools
          try {
            const partnersRes = await api.get("/schools");
            setPartnerSchools(
              partnersRes.data?.data || partnersRes.data || []
            );
          } catch (partnersError) {
            console.error("Error fetching registered schools:", partnersError);
          }

          // 4. Fetch all books across partner libraries (load full catalog limit 500)
          try {
            setLoadingAllBooks(true);
            const booksRes = await api.get("/books?limit=500");
            const rawBooks = booksRes.data?.data || booksRes.data || [];
            const safeBooks = Array.isArray(rawBooks) ? rawBooks : [];
            setAllCatalogBooks(safeBooks);
            setShuffledBooks(shuffleCatalog(safeBooks, prefs));
          } catch (booksErr) {
            console.error("Error fetching partner books:", booksErr);
          } finally {
            setLoadingAllBooks(false);
          }
        }
      } catch (err) {
        console.error("Error loading user info:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Listen for preference updates to re-align recommendations
  useEffect(() => {
    const handlePrefsUpdate = (e) => {
      const updated = e.detail || getStudentPreferences();
      setStudentPrefs(updated);
      if (allCatalogBooks.length > 0) {
        setShuffledBooks(shuffleCatalog(allCatalogBooks, updated));
      }
    };
    window.addEventListener("libralink-preferences-updated", handlePrefsUpdate);
    return () => window.removeEventListener("libralink-preferences-updated", handlePrefsUpdate);
  }, [allCatalogBooks]);

  const handleBorrowedClick = () => {
    navigate("/studentpage/history");
  };

  const handleDueSoonClick = () => {
    navigate("/studentpage/history");
  };

  const handleBookSelect = (book) => {
    if (!book) return;
    const normalizedBook = {
      ...book,
      id: book.id || book.book_id,
      book_id: book.book_id || book.id,
      school_id: book.school_id || book.schools?.school_id || parseInt(localStorage.getItem("schoolId") || "0"),
      school_name: book.schools?.school_name || book.school_name || "Campus Library",
      category: book.categories?.category_name || book.category || book.category_name || "General",
      category_name: book.categories?.category_name || book.category || book.category_name || "General",
      cover_image: book.cover_image || null,
      available_copies: book.available_copies !== undefined ? book.available_copies : 1,
      status: book.status || "available",
    };
    navigate("/studentpage/search", {
      state: {
        selectedBook: normalizedBook,
        query: book.title,
      },
    });
  };

  // Submission and modal handler for cancellation requests
  const handleOpenCancellationModal = (req) => {
    const titles = (req.items || [])
      .map((item) => item.book?.title || item.book_title || item.title)
      .filter(Boolean);
    const displayTitle =
      titles.length > 0 ? titles.join(", ") : "Library Request";

    const authors = (req.items || [])
      .map((item) => item.book?.author || item.author)
      .filter(Boolean);
    const displayAuthor =
      authors.length > 0 ? authors.join(", ") : "Various Authors";

    const schoolNames = (req.items || [])
      .map((item) => item.owner_school?.school_name || item.owner_school_name)
      .filter(Boolean);
    const owningSchool = schoolNames[0] || "Partner Library";

    setCancellationModalItem({
      requestId: req.request_id,
      title: displayTitle,
      author: displayAuthor,
      schoolName: owningSchool,
      status: req.status,
      rawRequest: req,
    });
    setSelectedReasonPreset("No longer needed for coursework / study");
    setCancellationCustomNote("");
  };

  const handleSubmitCancellation = async (e) => {
    e?.preventDefault();
    if (!cancellationModalItem) return;

    const combinedReason = cancellationCustomNote.trim()
      ? `${selectedReasonPreset}: ${cancellationCustomNote.trim()}`
      : selectedReasonPreset;

    setCancellationSubmitting(true);
    try {
      const res = await requestBorrowCancellation(
        cancellationModalItem.requestId,
        combinedReason
      );
      if (res.error) {
        showToast(
          res.error?.response?.data?.message ||
            "Failed to submit cancellation request",
          "error"
        );
      } else {
        showToast(
          "Cancellation request submitted! Library staff has been notified to review and confirm."
        );
        setCancellationModalItem(null);
        setCancellationCustomNote("");
        await fetchStudentRequests();
      }
    } catch (err) {
      console.error("Error submitting cancellation request:", err);
      showToast("An unexpected error occurred.", "error");
    } finally {
      setCancellationSubmitting(false);
    }
  };

  // Active access token pass
  const approvedRequestsWithQR = borrowRequests.filter(
    (req) => (req.status === "approved" || req.status === "ready") && req.qr_token
  );
  const pendingRequestsCount = borrowRequests.filter(
    (req) => req.status === "pending"
  ).length;

  // Filtered books in the "All" view (search is removed as requested)
  const filteredCatalogBooks = useMemo(() => {
    return shuffledBooks.filter((book) => {
      // School filter
      if (selectedSchoolFilter !== "all") {
        const bookSchoolId = String(book.school_id || book.schools?.school_id || "");
        if (bookSchoolId !== String(selectedSchoolFilter)) return false;
      }

      // Category / Course filter
      if (selectedCategoryFilter === "course_only") {
        if (book._matchScore <= 0) return false;
      } else if (selectedCategoryFilter !== "all") {
        const catName = (book.categories?.category_name || book.category || "").toLowerCase();
        if (!catName.includes(selectedCategoryFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [shuffledBooks, selectedSchoolFilter, selectedCategoryFilter]);

  // Candidate book currently displayed in raffle reel
  const currentRaffleCandidate =
    shuffledBooks.length > 0
      ? shuffledBooks[raffleCandidateIndex % shuffledBooks.length]
      : null;

  return (
    <div className="space-y-6">
      {/* 1. TOP SEGMENTED NAVIGATION BAR: Home | All Books | Participating Libraries (Beside each other, Mobile-Friendly) */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 backdrop-blur-md bg-slate-50/95 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 transition-all">
        {/* Responsive Horizontal Pill Container (Swipeable on Mobile) */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5 max-w-full p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          {/* Home button */}
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === "home"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>

          {/* All Books button */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Library className="h-4 w-4" />
            <span>All Books</span>
            {allCatalogBooks.length > 0 && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "all"
                    ? "bg-white/20 text-white"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {allCatalogBooks.length}
              </span>
            )}
          </button>

          {/* Participating Libraries button (Directly beside Home and All) */}
          <button
            type="button"
            onClick={() => setActiveTab("libraries")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === "libraries"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Participating Libraries</span>
            {partnerSchools.length > 0 && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "libraries"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {partnerSchools.length}
              </span>
            )}
          </button>
        </div>

        {/* Right side helper info / Quick Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {activeTab === "all" ? (
            <button
              type="button"
              onClick={handleShuffleAction}
              disabled={isShuffling || loadingAllBooks}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 sm:py-2 text-xs font-bold text-slate-700 shadow-xs hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all active:scale-95 disabled:opacity-50"
              title="Shuffle all books across libraries"
            >
              <Shuffle className={`h-3.5 w-3.5 text-blue-600 ${isShuffling ? "animate-spin" : ""}`} />
              <span>{isShuffling ? "Shuffling..." : "Shuffle Books"}</span>
            </button>
          ) : (
            studentPrefs.course && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                <span>{studentPrefs.course}</span>
              </span>
            )
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: HOME VIEW (Clean, Aesthetic, Solid White, No Gradients) */}
      {/* ========================================================= */}
      {activeTab === "home" && (
        <div className="animate-in fade-in duration-200 space-y-6">
          {/* Welcome Header with Official School Logo & Responsive Mobile Layout */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left: School Logo & Greeting */}
              <div className="flex items-center gap-3.5 sm:gap-4">
                {/* Official School Logo */}
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-1 shadow-xs">
                  <img
                    src={getSchoolLogoUrl(schoolInfo?.logo)}
                    alt={schoolInfo?.school_name || "School logo"}
                    className="h-full w-full object-contain rounded-xl"
                    onError={(e) => {
                      e.target.src = "/L.png";
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      <Building2 className="h-3 w-3 text-slate-500" />
                      <span className="truncate">{schoolInfo?.school_name || "Campus Library"}</span>
                    </span>
                    {studentPrefs.course && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                        <GraduationCap className="h-3 w-3" />
                        <span>{studentPrefs.course}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Welcome back, {displayName}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Manage your active loans and discover academic resources across partner campus libraries.
                  </p>
                </div>
              </div>

              {/* Right: Quick Action */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Browse All Books</span>
                </button>
              </div>
            </div>
          </section>

          {/* ACTIVE ACCESS TOKEN PASS (Clean Solid Border, No Gradient) */}
          {approvedRequestsWithQR.length > 0 && (
            <section aria-label="Active Library Access Pass">
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                      <QrCode className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Ready for Pick-up
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Pass ID: {approvedRequestsWithQR[0].request_id}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900">
                        Your Borrow Request Access Token is Active!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-xl">
                        Please present this QR code token at the participating library circulation desk to claim your approved books.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedRequestForQR(approvedRequestsWithQR[0])}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    >
                      <QrCode className="h-4 w-4" />
                      Show Access Token
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cancellationModalItem) {
                          setCancellationModalItem(null);
                        } else {
                          handleOpenCancellationModal(approvedRequestsWithQR[0]);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition active:scale-95 shadow-xs"
                      title="Cancel pickup hold"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      {cancellationModalItem ? "Close Cancellation" : "Cancel Hold"}
                    </button>
                  </div>
                </div>

                {/* Inline Cancellation Accordion (No Modal Overlay) */}
                {cancellationModalItem && (
                  <div className="mt-5 pt-5 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold">Cancel Borrow Request</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({cancellationModalItem.requestId})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCancellationModalItem(null)}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-amber-200/80 bg-amber-100/60 p-2.5 text-[11px] text-amber-900 leading-relaxed mb-3">
                      <strong>Librarian Confirmation Required:</strong> Submitting this cancellation notifies the librarian to confirm and restock the copy back into available inventory.
                    </div>

                    <form onSubmit={handleSubmitCancellation} className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Select Reason for Cancellation:
                        </label>
                        {[
                          "No longer needed for coursework / study",
                          "Found another copy or digital resource",
                          "Schedule conflict / Unable to pick up from library",
                          "Requested by mistake / Duplicate request",
                          "Other reason",
                        ].map((reason) => (
                          <label
                            key={reason}
                            className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium cursor-pointer transition ${
                              selectedReasonPreset === reason
                                ? "border-amber-400 bg-amber-50/80 text-amber-900 shadow-2xs"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="cancellationReason"
                              value={reason}
                              checked={selectedReasonPreset === reason}
                              onChange={(e) => setSelectedReasonPreset(e.target.value)}
                              className="text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                            />
                            <span>{reason}</span>
                          </label>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Additional Note for Library Staff <span className="font-normal text-slate-400">(Optional)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={cancellationCustomNote}
                          onChange={(e) => setCancellationCustomNote(e.target.value)}
                          placeholder="Provide any additional notes or context..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCancellationModalItem(null)}
                          disabled={cancellationSubmitting}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Keep Reservation
                        </button>
                        <button
                          type="submit"
                          disabled={cancellationSubmitting}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition active:scale-95 disabled:opacity-60"
                        >
                          {cancellationSubmitting ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Submit Cancellation Request
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Overdue Urgent Alert (If any) */}
          {overdueCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-rose-900">
                  You have {overdueCount} overdue book{overdueCount > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-rose-700">
                  Please return or renew immediately to avoid accumulated library fines.
                </p>
              </div>
              <button
                onClick={handleBorrowedClick}
                className="w-full sm:w-auto px-4 py-2 min-h-[40px] bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition font-medium text-sm active:scale-95"
              >
                View Overdue Books
              </button>
            </div>
          )}

          {/* 4-METRIC SUMMARY CARDS (Responsive: 2 cols on mobile, 4 on desktop) */}
          <section aria-label="Library Summary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Active Loans */}
              <button
                type="button"
                onClick={handleBorrowedClick}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-left shadow-xs transition hover:border-blue-400 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Book className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    On Loan
                  </span>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">
                  {borrowedBooks.length}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Currently borrowed</p>
              </button>

              {/* Due Soon */}
              <button
                type="button"
                onClick={handleDueSoonClick}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-left shadow-xs transition hover:border-amber-400 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Due Soon
                  </span>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-amber-600">
                  {dueSoonCount}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Approaching return</p>
              </button>

              {/* Pending Requests */}
              <button
                type="button"
                onClick={() => navigate("/studentpage/inbox")}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-left shadow-xs transition hover:border-indigo-400 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Hourglass className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pending
                  </span>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-indigo-600">
                  {pendingRequestsCount}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Under review</p>
              </button>

              {/* Overdue */}
              <button
                type="button"
                onClick={handleBorrowedClick}
                className={`flex flex-col rounded-2xl border p-3.5 sm:p-4 text-left shadow-xs transition hover:shadow-md active:scale-[0.98] ${
                  overdueCount > 0
                    ? "border-rose-300 bg-rose-50/40 hover:border-rose-400"
                    : "border-slate-200 bg-white hover:border-emerald-400"
                }`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl ${
                      overdueCount > 0
                        ? "bg-rose-100 text-rose-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Overdue
                  </span>
                </div>
                <p
                  className={`text-xl sm:text-3xl font-bold ${
                    overdueCount > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {overdueCount}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
                  {overdueCount > 0 ? "Requires return" : "All books on time"}
                </p>
              </button>
            </div>
          </section>

          {/* CURATED COURSE RECOMMENDATIONS (Clean Shelf) */}
          <StudentRecommendedShelf
            books={allCatalogBooks}
            onBookClick={handleBookSelect}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ALL BOOKS (Raffle Challenge + Full Catalog, No Search, No Gradients) */}
      {/* ========================================================= */}
      {activeTab === "all" && (
        <div className="animate-in fade-in duration-200 space-y-5">
          {/* 1. ANIMATED RAFFLE CHALLENGE (Interactive Mystery Slot Reel) */}
          <section className="relative overflow-hidden rounded-3xl border-2 border-blue-500/80 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 mb-2">
                  <Dices className="h-3.5 w-3.5 text-blue-600" />
                  <span>Daily Reading Challenge Raffle</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Course Book Raffle Challenge
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xl">
                  Press the raffle button to spin and draw today&apos;s mystery reading challenge tailored for{" "}
                  <strong className="text-slate-800 font-bold">{studentPrefs.course || "your course"}</strong> across our partner libraries!
                </p>
              </div>

              {/* Spin Raffle Button */}
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleSpinRaffle}
                  disabled={raffleState === "spinning" || shuffledBooks.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
                >
                  <Dices className={`h-4 w-4 ${raffleState === "spinning" ? "animate-spin text-amber-300" : ""}`} />
                  <span>
                    {raffleState === "spinning"
                      ? "Spinning Reel..."
                      : raffleState === "winner"
                      ? "Spin Again"
                      : "Spin Raffle Challenge"}
                  </span>
                </button>
              </div>
            </div>

            {/* Reel Display / Winner Showcase */}
            <div className="mt-5">
              {raffleState === "spinning" && currentRaffleCandidate && (
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40 p-4 transition-all animate-pulse">
                  <div className="relative aspect-[4/5] w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    <img
                      src={getTopicBookCover(currentRaffleCandidate) || "/L.png"}
                      alt="Spinning Candidate"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = "/L.png";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                      <Sparkles className="h-3 w-3 animate-spin" /> Drawing candidate...
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {currentRaffleCandidate.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentRaffleCandidate.author || "Various Authors"} •{" "}
                      {currentRaffleCandidate.schools?.school_name || "Partner Library"}
                    </p>
                  </div>
                </div>
              )}

              {raffleState === "winner" && wonRaffleBook && (
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-4 sm:p-5 animate-in zoom-in-95 duration-200">
                  {/* Book Cover */}
                  <div className="relative aspect-[4/5] w-28 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-white border border-emerald-200 shadow-sm">
                    <img
                      src={getTopicBookCover(wonRaffleBook) || "/L.png"}
                      alt={wonRaffleBook.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = "/L.png";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                        <Trophy className="h-3 w-3 text-amber-300" />
                        Today&apos;s Challenge Pick
                      </span>
                      <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        {wonRaffleBook.schools?.school_name || "Partner Campus Library"}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {wonRaffleBook.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      By {wonRaffleBook.author || "Unknown Author"}
                    </p>

                    {wonRaffleBook._matchReason && (
                      <p className="mt-1.5 inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        {wonRaffleBook._matchReason}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleBookSelect(wonRaffleBook)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
                      >
                        <span>Accept Challenge & Borrow</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSpinRaffle}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                        <span>Draw Another</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {raffleState === "idle" && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        Ready to take on your daily reading challenge?
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Spin the raffle wheel above to let the system draw a recommended book for your study syllabus.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSpinRaffle}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition active:scale-95 shadow-2xs shrink-0"
                  >
                    <Dices className="h-3.5 w-3.5" />
                    <span>Try Challenge Spin</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. FILTER STRIP (Search Removed as Requested) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Filters:
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    selectedCategoryFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All
                </button>

                {studentPrefs.course && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter("course_only")}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      selectedCategoryFilter === "course_only"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Aligned with {studentPrefs.course}</span>
                  </button>
                )}

                {STUDENT_TOPICS.slice(0, 6).map((topic) => {
                  const isActive = selectedCategoryFilter === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() =>
                        setSelectedCategoryFilter(isActive ? "all" : topic.id)
                      }
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {topic.badge}
                    </button>
                  );
                })}
              </div>

              {/* School Library Dropdown */}
              <div className="sm:w-60 shrink-0">
                <select
                  value={selectedSchoolFilter}
                  onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  <option value="all">All School Libraries ({partnerSchools.length})</option>
                  {partnerSchools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.school_name || s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(selectedSchoolFilter !== "all" || selectedCategoryFilter !== "all") && (
              <div className="flex justify-end pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchoolFilter("all");
                    setSelectedCategoryFilter("all");
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </section>

          {/* Results Summary Counter */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-slate-600">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {filteredCatalogBooks.length}
              </span>{" "}
              books across{" "}
              <span className="font-bold text-slate-900">
                {partnerSchools.length}
              </span>{" "}
              participating libraries
            </p>

            <span className="text-[11px] text-slate-400 font-medium">
              Click any book to borrow
            </span>
          </div>

          {/* Books Responsive Grid */}
          {loadingAllBooks ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3 space-y-3"
                >
                  <div className="aspect-[4/5] rounded-xl bg-slate-200" />
                  <div className="h-3 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : filteredCatalogBooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No matching books found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try resetting filters to browse the full collection of books from all partner campuses.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSchoolFilter("all");
                  setSelectedCategoryFilter("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredCatalogBooks.map((book) => (
                <ShuffledBookCard
                  key={book.book_id || book.id}
                  book={book}
                  onBookClick={handleBookSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PARTICIPATING LIBRARIES (Beside Home & All Books) */}
      {/* ========================================================= */}
      {activeTab === "libraries" && (
        <div className="animate-in fade-in duration-200 space-y-5">
          {/* Header Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Inter-Library Network</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Participating Campus Libraries
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Explore member university and college libraries connected to LibraLink. Click any campus to view all its books.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
                  {partnerSchools.length} Partner Universities
                </span>
              </div>
            </div>
          </section>

          {/* Libraries Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerSchools.map((school) => {
              const logo =
                school.logo &&
                (school.logo.startsWith("http") || school.logo.startsWith("data:")
                  ? school.logo
                  : `${API_ORIGIN}${school.logo.startsWith("/") ? "" : "/"}${school.logo}`);
              const schoolName = school.school_name || school.name || "School";
              const schoolCode = school.school_code || school.code || "";
              const address = school.address || school.location || "";

              return (
                <div
                  key={school.school_id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start gap-3.5 mb-3">
                      <SchoolAvatar schoolName={schoolName} logo={logo} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                          {schoolName}
                        </h3>
                        {schoolCode && (
                          <span className="inline-block mt-0.5 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {schoolCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {address && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                        {address}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      Campus Library
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchoolFilter(school.school_id);
                        setActiveTab("all");
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95"
                    >
                      <span>View Books</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Access Token QR Code Modal */}
      {selectedRequestForQR && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 scrollbar-thin">
            <QRCodeDisplay
              request={selectedRequestForQR}
              token={selectedRequestForQR.qr_token}
              requestId={selectedRequestForQR.request_id}
              onClose={() => setSelectedRequestForQR(null)}
            />
          </div>
        </div>
      )}



      {/* Toast Notification */}
      {toastFeedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl transition-all duration-300 animate-slide-up border ${
            toastFeedback.type === "error"
              ? "bg-rose-600 text-white border-rose-700 shadow-rose-600/20"
              : "bg-slate-900 text-white border-slate-800 shadow-slate-900/30"
          }`}
        >
          {toastFeedback.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-200" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          )}
          <span>{toastFeedback.message}</span>
          <button
            type="button"
            onClick={() => setToastFeedback(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentHome;
