import { useState, useEffect, useLayoutEffect, useRef } from "react";
import React from "react";

import { useLocation, useSearchParams, useNavigate } from "react-router-dom";

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
  ChevronLeft,
  ShoppingCart,
  Globe,
  Star,
  MessageCircle,
  ArrowDownAZ,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Flame,
  Zap,
} from "lucide-react";

import api, { getLibraryPolicy, getBackendAssetUrl } from "../../../utils/api";
import { subscribeToBookCopies } from "../../../utils/realtime";
import { 
  getStudentPreferences, 
  getRecommendedBooks, 
  getTopicBookCover 
} from "../../../utils/studentRecommendations";
import { useDraggableScroll } from "../../../hooks/useDraggableScroll";
import StudentPreferencesModal from "./StudentPreferencesModal";

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

function BookStatusBadge({
  status,
  compact = false,
  availabilityRatio = null,
  availableCopies = undefined,
  totalCopies = undefined,
}) {
  let copies = availableCopies;
  let total = totalCopies;

  // Always parse availabilityRatio if provided to get the real-time ground truth
  if (availabilityRatio) {
    const parts = String(availabilityRatio).split("/");
    if (parts.length === 2) {
      const parsedAvail = parseInt(parts[0], 10);
      const parsedTot = parseInt(parts[1], 10);
      if (!isNaN(parsedAvail)) copies = parsedAvail;
      if (!isNaN(parsedTot)) total = parsedTot;
    }
  }

  let config = {
    label: "Available",
    icon: CheckCircle,
    className: "text-emerald-700 border-emerald-200 bg-emerald-50",
    animated: false,
  };

  if (status === "requested") {
    config = {
      label: "Requested",
      icon: Clock,
      className: "text-amber-700 border-amber-300 bg-amber-50",
      animated: true,
    };
  } else if (status === "waiting_pickup") {
    config = {
      label: "Waiting for Pickup",
      icon: CheckCircle,
      className: "text-blue-700 border-blue-300 bg-blue-50",
      animated: true,
    };
  } else if (
    status === "unavailable" ||
    status === "borrowed" ||
    (copies !== undefined && !isNaN(copies) && copies <= 0)
  ) {
    config = {
      label: "Unavailable",
      icon: AlertCircle,
      className: "text-rose-700 border-rose-300 bg-rose-50 font-bold",
      animated: false,
    };
  } else if (copies !== undefined && !isNaN(copies)) {
    if (copies >= 1 && copies <= 2) {
      config = {
        label: compact
          ? `Only ${copies} left`
          : `Hurry! Only ${copies} ${copies === 1 ? "copy" : "copies"} left`,
        icon: Flame,
        className: "text-amber-800 border-amber-400 bg-amber-50 font-bold",
        animated: true,
      };
    } else {
      config = {
        label: "Available",
        icon: CheckCircle,
        className: "text-emerald-700 border-emerald-200 bg-emerald-50",
        animated: false,
      };
    }
  }

  const StatusIcon = config.icon;

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold leading-none ${config.className} ${config.animated ? "animate-pulse" : ""}`}
    >
      <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />

      <span className="truncate">{config.label}</span>

      {availabilityRatio && (
        <span className="ml-1 text-[9px] font-medium opacity-80">
          ({availabilityRatio})
        </span>
      )}
    </span>
  );
}

function CategoryShelfRow({
  category,
  categoryBooks,
  categoryView,
  initialBooksPerCategory,
  setSearchParams,
  handleBookClick,
  readingReviews,
  getBookDisplayStatus,
  getBookCategory,
  handleAddToBorrowingList,
  searchBookInOtherSchools,
  toggleFavorite,
  favorites,
}) {
  const scroll = useDraggableScroll({ scrollAmount: 520 });

  return (
    <section key={category} aria-labelledby={`category-${category}`} className="scroll-mt-[160px] pt-1 first:pt-2 lg:first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`category-${category}`} className="truncate text-lg font-bold leading-tight tracking-tight text-slate-900 sm:text-xl">
            {category} books
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {!categoryView && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={scroll.scrollLeftAction}
                disabled={!scroll.canScrollLeft}
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200"
                aria-label={`Scroll ${category} books left`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scroll.scrollRightAction}
                disabled={!scroll.canScrollRight}
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200"
                aria-label={`Scroll ${category} books right`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

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
      </div>

      {categoryView ? (
        <div className="space-y-3">
          {categoryBooks.map((book) => {
            const displayStatus = getBookDisplayStatus(book);
            const personalReview = readingReviews[book.id];
            const isAvailable = displayStatus === "available";
            const cover = book.cover_image
              ? book.cover_image.startsWith("http")
                ? book.cover_image
                : `http://localhost:5000${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`
              : null;

            return (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                className="group min-w-0 cursor-pointer overflow-hidden bg-transparent p-0 transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 w-full rounded-xl px-0 py-1.5 transition hover:bg-slate-100/60"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleBookClick(book);
                  }
                }}
              >
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100 border border-slate-200/80 shadow-2xs">
                    {cover ? (
                      <img
                        src={cover}
                        alt={book.title}
                        className="absolute inset-0 h-full w-full object-cover z-[1]"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-0 select-none">
                      <img
                        src="/L.png"
                        alt="Libralink"
                        className="h-7 w-7 object-contain grayscale opacity-35"
                      />
                      {personalReview && (
                        <span className="absolute right-0.5 top-0.5 inline-flex items-center gap-0.5 rounded bg-amber-400 px-1 py-0.2 text-[6.5px] font-bold text-amber-950 shadow-2xs">
                          <Star className="h-2 w-2 fill-current" />
                          {personalReview.rating}
                        </span>
                      )}
                    </div>
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
                          <BookStatusBadge
                            status={displayStatus}
                            compact
                            availabilityRatio={book.availability_ratio}
                            availableCopies={book.available_copies}
                            totalCopies={book.total_copies}
                          />
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative group/shelf">
          <div
            ref={scroll.ref}
            {...scroll.events}
            className={`flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide select-none transition-all ${
              scroll.isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {categoryBooks
              .slice(0, initialBooksPerCategory)
              .map((book) => {
                const displayStatus = getBookDisplayStatus(book);
                const personalReview = readingReviews[book.id];
                const isAvailable = displayStatus === "available";
                const cover = book.cover_image
                  ? book.cover_image.startsWith("http")
                    ? book.cover_image
                    : `http://localhost:5000${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`
                  : null;

                return (
                  <div
                    key={book.id}
                    onClick={() => handleBookClick(book)}
                    className="group min-w-0 cursor-pointer overflow-hidden bg-transparent p-0 transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 w-[155px] sm:w-[175px] md:w-[190px] shrink-0"
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleBookClick(book);
                      }
                    }}
                  >
                    {/* Cover */}
                    <div className="relative mb-2 flex aspect-[4/5] min-h-[118px] w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition-all duration-300 group-hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] group-hover:-translate-y-1 sm:min-h-[164px]">
                      {cover ? (
                        <img
                          src={cover}
                          alt={book.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 z-[1]"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : null}

                      {/* Always present under image: Grey L.png Libralink Fallback */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-2 text-center select-none z-0">
                        <img
                          src="/L.png"
                          alt="Libralink"
                          className="h-12 w-12 sm:h-14 sm:w-14 object-contain grayscale opacity-35 drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="mt-2 line-clamp-1 max-w-[85%] text-center text-[9px] font-medium text-slate-400">
                          {getBookCategory(book)}
                        </span>
                      </div>

                      {/* 3D spine crease */}
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-black/5 to-transparent z-[2]" />

                      {/* Top Badges & Actions */}
                      <div className="absolute top-2 left-2 max-w-[calc(100%-3rem)] truncate rounded-full bg-slate-900/60 backdrop-blur-md px-2 py-0.5 text-[8px] font-bold text-white shadow-xs z-10 pointer-events-none">
                        {book.library || "Campus Library"}
                      </div>

                      <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-90 transition-opacity group-hover:opacity-100 z-10 pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(book.id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md transition hover:bg-white hover:scale-110 active:scale-95"
                          aria-label="Save to favorites"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 transition-colors ${
                              favorites.includes(book.id)
                                ? "text-red-500 fill-current"
                                : "text-slate-600 hover:text-red-500"
                            }`}
                          />
                        </button>
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToBorrowingList(book);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 hover:scale-110 active:scale-95"
                            aria-label="Add to borrow cart"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Bottom Category and Review */}
                      <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-slate-950/45 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm z-10 pointer-events-none">
                        {getBookCategory(book)}
                      </div>
                      {personalReview && (
                        <span className="absolute right-2 bottom-2 inline-flex items-center gap-0.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-amber-950 shadow-sm z-10 pointer-events-none">
                          <Star className="h-2.5 w-2.5 fill-current" /> {personalReview.rating}
                        </span>
                      )}
                    </div>

                    {/* Book Details */}
                    <div className="min-w-0 space-y-1.5">
                      <h3
                        className="h-8 overflow-hidden text-ellipsis text-[11px] font-bold leading-4 text-[#0F172A] line-clamp-2 group-hover:text-blue-600 transition"
                        title={book.title}
                      >
                        {book.title}
                      </h3>
                      <p className="text-[#64748B] text-[10px] line-clamp-1">
                        {book.author || "Unknown Author"}
                      </p>
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <BookStatusBadge
                          status={displayStatus}
                          compact
                          availabilityRatio={book.availability_ratio}
                          availableCopies={book.available_copies}
                          totalCopies={book.total_copies}
                        />
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
                                className={`w-3.5 h-3.5 ${
                                  displayStatus === "available"
                                    ? "text-[#0077B6] hover:text-[#005f8f]"
                                    : "text-gray-300 cursor-not-allowed"
                                }`}
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
                              className={`w-3.5 h-3.5 ${
                                favorites.includes(book.id)
                                  ? "text-red-500 fill-current"
                                  : "text-[#64748B] hover:text-red-400"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </section>
  );
}

function StudentSearch({ onBookClick, onBorrowClick, userInfo, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
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

  const curatedShelfScroll = useDraggableScroll({ scrollAmount: 480 });
  const filterChipsScroll = useDraggableScroll({ scrollAmount: 240 });

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

  const [totalBooksCount, setTotalBooksCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [selectedBook, setSelectedBook] = useState(null);

  const [bookDetailsWidth, setBookDetailsWidth] = useState(440);

  const [isResizingBookDetails, setIsResizingBookDetails] = useState(false);

  const [borrowingList, setBorrowingList] = useState(() => {
    const saved = localStorage.getItem("borrowingList");

    return saved ? JSON.parse(saved) : [];
  });

  const [showBorrowingList, setShowBorrowingList] = useState(false);
  const [selectedForBorrow, setSelectedForBorrow] = useState(new Set());
  const [cartSchoolFilter, setCartSchoolFilter] = useState("all");
  const [cartMaxLimit, setCartMaxLimit] = useState(5);
  const [cartActiveLoans, setCartActiveLoans] = useState(0);

  // Public/consortium borrowers states for book details
  const [bookBorrowers, setBookBorrowers] = useState([]);
  const [loadingBorrowers, setLoadingBorrowers] = useState(false);
  const [partnerBookBorrowers, setPartnerBookBorrowers] = useState([]);
  const [loadingPartnerBorrowers, setLoadingPartnerBorrowers] = useState(false);

  // Fetch public borrowers whenever selectedBook changes
  useEffect(() => {
    const bookId = selectedBook?.book_id || selectedBook?.id;
    if (!bookId) {
      setBookBorrowers([]);
      return;
    }

    let isMounted = true;
    setLoadingBorrowers(true);

    api
      .get(`/books/${bookId}/borrowers`)
      .then((res) => {
        if (isMounted) {
          if (res?.success && Array.isArray(res.data)) {
            setBookBorrowers(res.data);
          } else {
            setBookBorrowers([]);
          }
        }
      })
      .catch((err) => {
        console.warn("[BOOK BORROWERS] Error fetching borrowers:", err);
        if (isMounted) setBookBorrowers([]);
      })
      .finally(() => {
        if (isMounted) setLoadingBorrowers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBook?.book_id, selectedBook?.id]);

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

  const [noResultsSuggestion, setNoResultsSuggestion] = useState(null);

  const [otherSchoolBooks, setOtherSchoolBooks] = useState([]);

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
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [reviewAccordionOpen, setReviewAccordionOpen] = useState(false);
  const [inlineOtherSchools, setInlineOtherSchools] = useState([]);
  const [loadingInlineOtherSchools, setLoadingInlineOtherSchools] = useState(false);
  const [expandedSchoolId, setExpandedSchoolId] = useState(null);
  const [partnerBookDetailModal, setPartnerBookDetailModal] = useState(null);
  const [mobileSheetState, setMobileSheetState] = useState("half"); // "half" | "full"
  const [recoFilter, setRecoFilter] = useState("all"); // 'all' | 'trending' | 'course' | 'available'
  const [studentPrefs, setStudentPrefs] = useState(() => getStudentPreferences());
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [networkTopicBooks, setNetworkTopicBooks] = useState([]);
  const sheetTouchStartY = useRef(0);

  // Real-time synchronization when preferences change in Onboarding or Preferences Modal
  useEffect(() => {
    const handlePrefsUpdated = (e) => {
      if (e.detail) {
        setStudentPrefs({
          course: e.detail.course || "",
          favorite_topics: Array.isArray(e.detail.favorite_topics) ? e.detail.favorite_topics : []
        });
      } else {
        setStudentPrefs(getStudentPreferences());
      }
    };
    window.addEventListener("libralink-preferences-updated", handlePrefsUpdated);
    return () => window.removeEventListener("libralink-preferences-updated", handlePrefsUpdated);
  }, []);

  // Always fetch live visiting policy & fee from server when partner book is viewed
  useEffect(() => {
    const schoolId = partnerBookDetailModal?.school_id;
    if (!schoolId) return;

    getLibraryPolicy(schoolId)
      .then((res) => {
        if (res?.data) {
          setPartnerBookDetailModal((prev) => {
            if (!prev || String(prev.school_id) !== String(schoolId)) return prev;
            return {
              ...prev,
              enable_visiting_fee: res.data.enable_visiting_fee === true || res.data.enable_visiting_fee === "true",
              visiting_fee_amount: parseFloat(res.data.visiting_fee_amount) || 0.0,
              visiting_fee_type: res.data.visiting_fee_type || "per_visit",
              visiting_policy_notes: res.data.visiting_policy_notes || prev.visiting_policy_notes,
              inter_school_library_use_only:
                res.data.inter_school_library_use_only !== undefined
                  ? (res.data.inter_school_library_use_only === true || res.data.inter_school_library_use_only === "true")
                  : prev.inter_school_library_use_only,
            };
          });
        }
      })
      .catch((err) => console.warn("Could not fetch live partner policy:", err));
  }, [partnerBookDetailModal?.school_id, partnerBookDetailModal?.book_id]);

  // Fetch public borrowers when partnerBookDetailModal opens
  useEffect(() => {
    const bookId = partnerBookDetailModal?.book_id || partnerBookDetailModal?.id;
    if (!bookId) {
      setPartnerBookBorrowers([]);
      return;
    }

    let isMounted = true;
    setLoadingPartnerBorrowers(true);

    api
      .get(`/books/${bookId}/borrowers`)
      .then((res) => {
        if (isMounted) {
          if (res?.success && Array.isArray(res.data)) {
            setPartnerBookBorrowers(res.data);
          } else {
            setPartnerBookBorrowers([]);
          }
        }
      })
      .catch((err) => {
        console.warn("[PARTNER BORROWERS] Error fetching borrowers:", err);
        if (isMounted) setPartnerBookBorrowers([]);
      })
      .finally(() => {
        if (isMounted) setLoadingPartnerBorrowers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [partnerBookDetailModal?.book_id, partnerBookDetailModal?.id]);

  // Fetch network topic books (e.g. Nursing, Medical, Tech) across all connected campuses
  useEffect(() => {
    const fetchNetworkTopicBooks = async () => {
      const prefs = studentPrefs;
      const isNursing = prefs.course === "BSN" || 
        (prefs.course && prefs.course.toLowerCase().includes("nursing")) || 
        prefs.favorite_topics?.includes("science_health");

      let queryTerm = "";
      if (isNursing) {
        queryTerm = "nursing";
      } else if (prefs.course === "BSIT" || prefs.favorite_topics?.includes("tech_coding")) {
        queryTerm = "technology";
      } else if (prefs.course === "BSBA" || prefs.favorite_topics?.includes("business_finance")) {
        queryTerm = "management";
      } else if (prefs.course === "BSCrim" || prefs.favorite_topics?.includes("law_criminology")) {
        queryTerm = "criminology";
      }

      if (queryTerm) {
        try {
          const res = await api.get(`/books?q=${encodeURIComponent(queryTerm)}&limit=30&group=true`);
          if (res.data?.data && Array.isArray(res.data.data)) {
            const mapped = res.data.data.map((b) => ({
              id: b.book_id,
              title: b.title || "Untitled",
              author: b.author || "Unknown Author",
              school_id: b.school_id,
              library: b.schools?.school_name || "Partner Campus",
              category: b.categories?.category_name || (isNursing ? "Medical & Health" : "Academic"),
              available_copies: b.available_copies ?? 1,
              real_time_status: (b.available_copies > 0 || b.is_available) ? "available" : "unavailable",
              cover_image: b.cover_image || "",
              is_partner_book: true,
            }));
            setNetworkTopicBooks(mapped);
          }
        } catch (e) {
          console.error("Error fetching network topic books:", e);
        }
      }
    };
    fetchNetworkTopicBooks();
  }, [studentPrefs]);

  const [selectedBookPolicy, setSelectedBookPolicy] = useState(null);
  const [studentActiveLoanCount, setStudentActiveLoanCount] = useState(0);

  useEffect(() => {
    if (!selectedBook) {
      setSelectedBookPolicy(null);
      return;
    }
    const bookSchoolId = selectedBook.school_id || localStorage.getItem('schoolId');
    if (bookSchoolId) {
      getLibraryPolicy(bookSchoolId).then(res => {
        if (res.data) setSelectedBookPolicy(res.data);
      }).catch(console.error);
    }

    const rawUser = localStorage.getItem('currentUser');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        if (u?.user_id) {
          api.get(`/borrow/active/student/${u.user_id}`).then(res => {
            const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setStudentActiveLoanCount(list.length);
          }).catch(() => { });
        }
      } catch { }
    }
  }, [selectedBook]);


  useEffect(() => {
    if (!isResizingBookDetails) return undefined;

    const handlePointerMove = (event) => {
      const nextWidth = window.innerWidth - event.clientX;
      setBookDetailsWidth(Math.min(560, Math.max(380, nextWidth)));
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

  // Listen for real-time search input and book selections from the top unified header
  useEffect(() => {
    const handleHeaderSearchInput = (event) => {
      const incoming = typeof event.detail === "string" ? event.detail : "";
      setSearchQuery(incoming);
      setShowSearchHistory(false);
    };

    const handleSelectBook = (event) => {
      if (event.detail) {
        setSelectedBook(event.detail);
      }
    };

    const handleSelectPartnerBook = (event) => {
      if (event.detail) {
        setPartnerBookDetailModal(event.detail);
      }
    };

    window.addEventListener("libralink-search-input", handleHeaderSearchInput);
    window.addEventListener("libralink-select-book", handleSelectBook);
    window.addEventListener("libralink-select-partner-book", handleSelectPartnerBook);
    return () => {
      window.removeEventListener("libralink-search-input", handleHeaderSearchInput);
      window.removeEventListener("libralink-select-book", handleSelectBook);
      window.removeEventListener("libralink-select-partner-book", handleSelectPartnerBook);
    };
  }, []);

  useEffect(() => {
    const incomingQuery = location.state?.query || searchParams.get("q");

    if (typeof incomingQuery === "string") {
      setSearchQuery(incomingQuery);
      setShowSearchHistory(false);
    }

    if (location.state?.selectedBook) {
      setSelectedBook(location.state.selectedBook);
      setMobileSheetState("full");
    }

    if (location.state?.partnerBook) {
      setPartnerBookDetailModal(location.state.partnerBook);
    }
  }, [location.state, searchParams]);

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
    if (!book) return "unavailable";

    const requestStatus =
      interSchoolRequestStatuses[`${book.id ?? book.book_id}_${ownerSchoolId}`];

    if (requestStatus === "pending") return "requested";
    if (requestStatus === "approved") return "waiting_pickup";
    if (requestStatus === "released" || requestStatus === "borrowed")
      return "borrowed";
    if (requestStatus === "returned" || requestStatus === "cancelled")
      return "available";

    // Ground-truth check: 0 available copies in availability_ratio
    if (typeof book.availability_ratio === "string") {
      const parts = book.availability_ratio.split("/");
      if (parts.length === 2) {
        const avail = parseInt(parts[0], 10);
        if (!isNaN(avail) && avail <= 0) {
          return "unavailable";
        }
      }
    }

    // Ground-truth check: available_copies number
    if (book.available_copies !== undefined && Number(book.available_copies) <= 0) {
      return "unavailable";
    }

    // Ground-truth check: is_available flag
    if (book.is_available === false) {
      return "unavailable";
    }

    const rawStatus = book.real_time_status || "available";

    if (rawStatus === "pending_approval") return "requested";
    if (rawStatus === "approved") return "waiting_pickup";
    if (rawStatus === "released" || rawStatus === "borrowed") return "borrowed";
    if (rawStatus === "unavailable") return "unavailable";

    return rawStatus;
  };

  const isBookAvailableForBorrow = (book, ownerSchoolId = book?.school_id) => {
    if (!book) return false;
    if (typeof book.availability_ratio === "string") {
      const parts = book.availability_ratio.split("/");
      if (parts.length === 2 && parseInt(parts[0], 10) <= 0) return false;
    }
    if (book.available_copies !== undefined && Number(book.available_copies) <= 0) return false;
    if (book.is_available === false) return false;
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
    // Immediate letter-by-letter live filtering with zero delay
    setDebouncedQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const schoolId = localStorage.getItem("schoolId");

    const loadBooks = async () => {
      if (!schoolId) {
        console.error("No schoolId found in localStorage");

        setBooks([]);

        setLoading(false);

        return;
      }

      try {
        const response = await api.get(`/books/school?school_id=${schoolId}&group=true`);

        if (response.data) {
          // Store total books count (before grouping)
          const totalBooks = response.data.total_books || response.data.books?.length || response.data.length;
          setTotalBooksCount(totalBooks);

          const booksData = response.data.books || response.data || [];

          const mappedBooks = (booksData || []).map((book) => ({
            id: book.book_id,

            title: book.title || "Untitled",

            author: book.author || "Unknown Author",

            location: book.shelf_location || "Library",

            shelf: book.call_number || "Unknown",

            floor: "1",

            available: book.is_available || book.real_time_status === "available",

            category: getBookCategoryValue(book),
            categories: book.categories || null,
            category_name: book.category_name || null,
            subject: book.subject || null,
            course: book.course || null,
            program: book.program || null,
            department: book.department || null,

            isbn: book.isbn || "Unknown",

            year: book.publication_year || "Unknown",

            real_time_status: book.is_available ? "available" : "unavailable",

            status_details: book.status_details || null,

            available_copies: book.available_copies || 0,

            total_copies: book.total_copies || 0,

            availability_ratio: book.availability_ratio || "0/0",

            borrowed_copies: book.borrowed_copies || 0,

            grouped_book_ids: book.grouped_book_ids || [book.book_id],

            school_id: book.school_id,

            library: book.schools?.school_name || "Your Library",

            schoolAddress: book.schools?.address || null,

            latitude: book.schools?.latitude || null,

            longitude: book.schools?.longitude || null,

            cover_image: book.cover_image || '',
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

    // Subscribe to realtime book copy changes for availability updates
    const unsubscribeRealtime = subscribeToBookCopies(schoolId, (payload) => {
      console.log('[StudentSearch] Book copy changed, refreshing availability:', payload);
      // Reload books to get updated availability
      loadBooks();
    });

    // Auto-refresh every 30 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadBooks();
      }, 30000);
    }

    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
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

  // Check if no results and search other schools for suggestions
  useEffect(() => {
    const checkOtherSchools = async () => {
      if (debouncedQuery.trim().length > 0 && filteredBooks.length === 0 && !showOtherSchoolsModal) {
        const currentSchoolId = localStorage.getItem("schoolId");
        const searchTitle = debouncedQuery.trim();

        try {
          const searchParams = new URLSearchParams();
          searchParams.append("title", searchTitle);
          searchParams.append("exclude_school_id", currentSchoolId);

          const response = await api.get(
            `/books/search-other-schools?${searchParams.toString()}`,
          );

          const schoolsData = response?.success && Array.isArray(response?.data) ? response.data : [];

          if (schoolsData.length > 0) {
            // Map the other school books to the same format as home library books
            const mappedOtherSchoolBooks = schoolsData.map((item) => ({
              id: item.book_id,
              title: item.title || "Untitled",
              author: item.author || "Unknown Author",
              isbn: item.isbn || "Unknown",
              school_id: item.school_id,
              school_name: item.school_name,
              address: item.address,
              school_code: item.school_code,
              available_copies: item.available_copies,
              total_copies: item.total_copies,
              current_borrowers: item.current_borrowers || [],
              is_from_other_school: true, // Flag to indicate this is from another school
              category: getBookCategoryValue(item),
              real_time_status: "available",
              cover_image: item.cover_image || '',
            }));

            setOtherSchoolBooks(mappedOtherSchoolBooks);
            setNoResultsSuggestion({
              query: searchTitle,
              schools: schoolsData.slice(0, 3),
            });
          } else {
            setOtherSchoolBooks([]);
            setNoResultsSuggestion(null);
          }
        } catch (error) {
          console.error("Error checking other schools:", error);
          setOtherSchoolBooks([]);
          setNoResultsSuggestion(null);
        }
      } else {
        setOtherSchoolBooks([]);
        setNoResultsSuggestion(null);
      }
    };

    checkOtherSchools();
  }, [debouncedQuery, filteredBooks.length, showOtherSchoolsModal]);

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

  // Combine home library suggestions with other school books when no home results
  const allSearchSuggestions = searchQuery.trim() && filteredBooks.length === 0 && otherSchoolBooks.length > 0
    ? [...searchSuggestions, ...otherSchoolBooks]
    : searchSuggestions;

  const initialBooksPerCategory = 12;
  const displayedBookGroups = categoryView
    ? bookGroups.filter(({ category }) => category === categoryView)
    : bookGroups;

  const recoFilterOptions = [
    { id: "all", label: "All", icon: Sparkles },
    { id: "trending", label: "Trending", icon: Flame },
    { id: "course", label: "For You", icon: GraduationCap },
    { id: "available", label: "Available", icon: Zap },
  ];

  const getHardcoverStyle = (book) => {
    const text = `${book?.title || ""} ${book?.category || ""} ${book?.category_name || ""} ${book?.subject || ""} ${book?.course || ""}`.toLowerCase();

    // Department / Course based leather palette:
    if (text.includes("technology") || text.includes("computer") || text.includes("bsit") || text.includes("bscs") || text.includes("programming") || text.includes("information") || text.includes("database")) {
      return {
        leatherGradient: "from-[#071326] via-[#0c2242] to-[#040c18]", // Deep Oxford Navy Leather
        foilBorder: "border-amber-400/40 ring-amber-400/25",
        foilText: "text-amber-300",
        sealBg: "bg-amber-400/10 border-amber-400/30",
        deptCode: "CICS / IT",
      };
    }
    if (text.includes("education") || text.includes("teaching") || text.includes("tracer") || text.includes("bsed") || text.includes("beed") || text.includes("homeroom")) {
      return {
        leatherGradient: "from-[#3b0811] via-[#5c0f1c] to-[#220409]", // Royal Maroon / Crimson Leather
        foilBorder: "border-amber-300/40 ring-amber-300/25",
        foilText: "text-amber-200",
        sealBg: "bg-amber-300/10 border-amber-300/30",
        deptCode: "COLLEGE OF EDUCATION",
      };
    }
    if (text.includes("business") || text.includes("accountancy") || text.includes("marketing") || text.includes("bsba") || text.includes("bsa") || text.includes("finance")) {
      return {
        leatherGradient: "from-[#042016] via-[#093c2a] to-[#02140d]", // Forest Emerald Leather
        foilBorder: "border-amber-400/40 ring-amber-400/25",
        foilText: "text-amber-300",
        sealBg: "bg-amber-400/10 border-amber-400/30",
        deptCode: "BUSINESS & MGT",
      };
    }
    if (text.includes("barangay") || text.includes("public") || text.includes("government") || text.includes("leadership") || text.includes("servant") || text.includes("social") || text.includes("history")) {
      return {
        leatherGradient: "from-[#180f2d] via-[#2a174f] to-[#0e081c]", // Royal Amethyst / Purple Leather
        foilBorder: "border-amber-300/40 ring-amber-300/25",
        foilText: "text-amber-200",
        sealBg: "bg-amber-300/10 border-amber-300/30",
        deptCode: "PUBLIC ADMIN & SOC",
      };
    }
    if (text.includes("health") || text.includes("nursing") || text.includes("psychosocial") || text.includes("medical")) {
      return {
        leatherGradient: "from-[#062438] via-[#0a4663] to-[#031420]", // Deep Sapphire Leather
        foilBorder: "border-cyan-300/40 ring-cyan-300/25",
        foilText: "text-cyan-200",
        sealBg: "bg-cyan-300/10 border-cyan-300/30",
        deptCode: "HEALTH & SCIENCES",
      };
    }
    // Default / General Academic Thesis:
    return {
      leatherGradient: "from-[#141417] via-[#212126] to-[#08080a]", // Midnight Onyx Leather
      foilBorder: "border-amber-400/40 ring-amber-400/25",
      foilText: "text-amber-300",
      sealBg: "bg-amber-400/10 border-amber-400/30",
      deptCode: "ACADEMIC RESEARCH",
    };
  };

  const getRecommendationReason = (book, index) => {
    if (book.recommendationReason) {
      const isNursing = (book.recommendationReason || "").toLowerCase().includes("nursing") || (book.recommendationReason || "").toLowerCase().includes("bsn");
      return { 
        label: book.recommendationReason, 
        icon: isNursing ? Stethoscope : Sparkles,
        badgeClass: isNursing ? "bg-emerald-600/90 text-white" : "bg-indigo-600/90 text-white" 
      };
    }
    const isAvail = getBookDisplayStatus(book) === "available";
    const userDept = (userData?.department || userData?.program || userData?.course || studentPrefs?.course || "").toLowerCase();
    const bookCategory = (book.category || book.category_name || "").toLowerCase();
    const bookSubject = (book.subject || book.course || "").toLowerCase();

    if (userDept && (bookCategory.includes(userDept) || bookSubject.includes(userDept))) {
      return { label: "For Your Program", icon: GraduationCap, badgeClass: "bg-indigo-600/90 text-white" };
    }
    if (index === 0 || (isAvail && index % 3 === 0)) {
      return { label: "Trending", icon: Flame, badgeClass: "bg-amber-500/90 text-white" };
    }
    if (isAvail) {
      return { label: "Available", icon: Zap, badgeClass: "bg-emerald-600/90 text-white" };
    }
    if (book.category && book.category !== "Other Subjects") {
      return { label: book.category, icon: Book, badgeClass: "bg-blue-600/90 text-white" };
    }
    return { label: "Recommended", icon: Sparkles, badgeClass: "bg-slate-900/80 text-white" };
  };

  const curatedBooks = React.useMemo(() => {
    const localSource = (orderedBooks && orderedBooks.length > 0) ? orderedBooks : books;
    if (!localSource || localSource.length === 0) return [];

    // Combine local catalog with network topic books (such as partner school nursing books)
    const existingIds = new Set(localSource.map(b => String(b.id || b.book_id)));
    const pool = [...localSource];
    for (const nb of networkTopicBooks) {
      if (!existingIds.has(String(nb.id || nb.book_id))) {
        pool.push(nb);
      }
    }

    let result = getRecommendedBooks(pool, studentPrefs, 30);

    if (recoFilter === "trending") {
      result = pool.filter((b, idx) => idx % 2 === 0 || getBookDisplayStatus(b) === "available");
    } else if (recoFilter === "course") {
      const courseCode = studentPrefs?.course || userData?.course || userData?.department || "";
      result = getRecommendedBooks(pool, { course: courseCode, favorite_topics: [] }, 20);
    } else if (recoFilter === "available") {
      result = result.filter((b) => getBookDisplayStatus(b) === "available");
    }

    return result.slice(0, 10);
  }, [orderedBooks, books, networkTopicBooks, recoFilter, userData, studentPrefs, interSchoolRequestStatuses]);

  useEffect(() => {
    if (!selectedBook) {
      setInlineOtherSchools([]);
      setLoadingInlineOtherSchools(false);
      setExpandedSchoolId(null);
      setMobileSheetState("half");
      return;
    }

    const savedReview = readingReviews[selectedBook.id];
    setReviewRating(savedReview?.rating || 0);
    setReviewNote(savedReview?.note || "");
    setExpandedSchoolId(null);
    setMobileSheetState("half");

    // Auto-fetch copies from other partner schools
    const fetchCrossLibraryCopies = async () => {
      setLoadingInlineOtherSchools(true);
      try {
        const currentSchoolId = localStorage.getItem("schoolId");
        const searchTitle = String(selectedBook.title || "").trim();
        if (!searchTitle) {
          setInlineOtherSchools([]);
          setLoadingInlineOtherSchools(false);
          return;
        }

        const searchParams = new URLSearchParams();
        searchParams.append("title", searchTitle);
        if (selectedBook.school_id || currentSchoolId) {
          searchParams.append("exclude_school_id", selectedBook.school_id || currentSchoolId);
        }

        const res = await api.get(`/books/search-other-schools?${searchParams.toString()}`);
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setInlineOtherSchools(data);
      } catch (err) {
        console.error("Failed to auto-fetch cross-library copies:", err);
        setInlineOtherSchools([]);
      } finally {
        setLoadingInlineOtherSchools(false);
      }
    };

    fetchCrossLibraryCopies();
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
    if (showBorrowingForm) {
      setShowBorrowingForm(false);
      setBorrowingFormList([]);
    } else {
      setSelectedBook(null);
    }
  };

  const handleBorrow = () => {
    if (selectedBook) {
      if (!isBookAvailableForBorrow(selectedBook)) {
        alert("This book is not currently available to borrow.");
        return;
      }

      const maxLimit = selectedBookPolicy?.max_borrow_limit || 5;
      if (studentActiveLoanCount >= maxLimit) {
        alert(`You have reached the maximum borrowing limit of ${maxLimit} active books. Please return an active loan before requesting more.`);
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

  // Fetch policy + active loans whenever the borrowing list modal opens
  useEffect(() => {
    if (!showBorrowingList) return;
    const fetchCartLimits = async () => {
      try {
        const schoolId = localStorage.getItem('schoolId');
        if (schoolId) {
          const policyRes = await getLibraryPolicy(schoolId);
          if (policyRes.data?.max_borrow_limit) {
            setCartMaxLimit(parseInt(policyRes.data.max_borrow_limit, 10) || 5);
          }
        }
        // Count active loans using the same approach as StudentProfile
        const res = await api.get('/borrow-requests/my-requests');
        const requests = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
          ? res
          : [];

        let activeCount = 0;
        requests.forEach((req) => {
          const items = Array.isArray(req.items) && req.items.length > 0 ? req.items : [{}];
          items.forEach((item) => {
            const status = (item.status || req.status || '').toLowerCase();
            if (['approved', 'borrowed', 'picked_up', 'active'].includes(status)) {
              activeCount++;
            }
          });
        });
        setCartActiveLoans(activeCount);
      } catch (e) {
        console.error('Failed to fetch cart limits:', e);
      }
    };
    fetchCartLimits();
  }, [showBorrowingList]);

  // Derived: remaining slots the student can still select
  const cartRemainingSlots = Math.max(0, cartMaxLimit - cartActiveLoans);

  // Derived: which school is currently locked (first checked item's school)
  const cartLockedSchoolId = (() => {
    for (const bookId of selectedForBorrow) {
      const item = borrowingList.find((b) => b.book_id === bookId);
      if (item) return item.owner_school_id;
    }
    return null;
  })();

  // Toggle a single book's selection
  const toggleCartSelection = (bookId) => {
    setSelectedForBorrow((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        if (next.size >= cartRemainingSlots) return prev; // limit reached
        const item = borrowingList.find((b) => b.book_id === bookId);
        if (!item) return prev;
        // cross-school check
        if (cartLockedSchoolId !== null && item.owner_school_id !== cartLockedSchoolId) return prev;
        next.add(bookId);
      }
      return next;
    });
  };

  // Select / deselect all books in a school group
  const toggleSchoolGroupSelection = (schoolId) => {
    const groupBooks = borrowingList.filter((b) => b.owner_school_id === schoolId);
    const allChecked = groupBooks.every((b) => selectedForBorrow.has(b.book_id));

    setSelectedForBorrow((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        // deselect all in this group
        groupBooks.forEach((b) => next.delete(b.book_id));
      } else {
        // select as many as remaining slots allow
        for (const b of groupBooks) {
          if (next.size >= cartRemainingSlots) break;
          next.add(b.book_id);
        }
      }
      return next;
    });
  };

  const handleAddToBorrowingList = (book) => {
    if (!book || !isBookAvailableForBorrow(book)) {
      return;
    }

    const schoolId = localStorage.getItem("schoolId");
    const currentSchoolId = parseInt(schoolId);

    setBorrowingList((prev) => {
      const exists = prev.some((item) => item.book_id === book.id);
      if (exists) return prev;

      const newItem = {
        book_id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        cover_image: book.cover_image || '',
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
    // Also remove from selection
    setSelectedForBorrow((prev) => {
      const next = new Set(prev);
      next.delete(book_id);
      return next;
    });
  };

  const clearBorrowingList = () => {
    setBorrowingList([]);
    setSelectedForBorrow(new Set());
    localStorage.removeItem("borrowingList");
    window.dispatchEvent(new Event('borrowing-list-changed'));
  };

  const handleContinueToRequest = () => {
    const selectedItems = borrowingList.filter((item) => selectedForBorrow.has(item.book_id));
    if (selectedItems.length === 0) return;
    setBorrowingFormList(selectedItems);
    setSelectedForBorrow(new Set());
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
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setShowBorrowingForm(false);
                setBorrowingFormList([]);
                setShowBorrowingList(true);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
              Back to borrowing list
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBorrowingForm(false);
                setBorrowingFormList([]);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Exit to Catalogue</span>
            </button>
          </div>

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
              setBorrowingFormList([]);
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
            <div className="mb-3 px-0 pt-1">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Library catalogue
                </p>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  Find your next read
                </h1>
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
              {totalBooksCount || filteredBooks.length} results
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

              className={`fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showFilterPanel ? "translate-x-0" : "translate-x-full"
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

                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${notificationFilter === "all"
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

                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${filterAvailability === "available"
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

                      className={`p-4 rounded-xl border transition-all ${selectedSchool?.school_id === school.school_id
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
                                  <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200/80 shadow-2xs">
                                    {book.cover_image ? (
                                      <img
                                        src={book.cover_image.startsWith("http") ? book.cover_image : `http://localhost:5000${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`}
                                        alt={book.title}
                                        className="absolute inset-0 w-full h-full object-cover z-[1]"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : null}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-0 select-none">
                                      <img src="/L.png" alt="Libralink" className="h-6 w-6 object-contain grayscale opacity-35" />
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-[#0F172A] text-xs line-clamp-1">
                                      {book.title}
                                    </h4>

                                    <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                                      {book.author}
                                    </p>

                                    <div className="flex items-center gap-2 mt-2">
                                      <span className={`text-xs font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                                      </span>

                                      {book.total_copies > 0 && (
                                        <span className="text-xs text-[#64748B]">
                                          · {book.available_copies}/{book.total_copies}
                                        </span>
                                      )}
                                    </div>

                                    {/* Show current borrowers with dropdown */}
                                    {book.current_borrowers && book.current_borrowers.length > 0 && (
                                      <div className="mt-2">
                                        <details className="group">
                                          <summary className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-blue-600 transition-colors">
                                            <User className="w-3 h-3 text-[#64748B]" />
                                            <span className="text-[#64748B]">
                                              {book.current_borrowers.length} borrower{book.current_borrowers.length > 1 ? 's' : ''}
                                            </span>
                                            <svg className="w-3 h-3 text-[#64748B] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </summary>
                                          <div className="mt-2 pl-4 space-y-1">
                                            {book.current_borrowers.map((borrower, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className="text-[#64748B]">{borrower.username}</span>
                                                <span className={`text-xs font-medium ${borrower.status === 'borrowed' ? 'text-blue-600' : 'text-orange-600'
                                                  }`}>
                                                  ({borrower.status === 'borrowed' ? 'Borrowed' : 'Waiting'})
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </details>
                                      </div>
                                    )}

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
              {/* Mobile/Tablet Curated Recommendations Shelf */}
              {!categoryView && !debouncedQuery.trim() && curatedBooks.length > 0 && (
                <section className="mb-6 block lg:hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-3.5 shadow-sm">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600">Curated</p>
                        <h2 className="text-sm font-bold text-slate-900">Recommended for You</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="hidden sm:flex items-center gap-1">
                        <button
                          type="button"
                          onClick={curatedShelfScroll.scrollLeftAction}
                          disabled={!curatedShelfScroll.canScrollLeft}
                          className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200"
                          aria-label="Scroll curated books left"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={curatedShelfScroll.scrollRightAction}
                          disabled={!curatedShelfScroll.canScrollRight}
                          className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition border border-slate-200"
                          aria-label="Scroll curated books right"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreferencesModal(true)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-xs active:scale-95 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        <span>Preferences</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Chips */}
                  <div
                    ref={filterChipsScroll.ref}
                    {...filterChipsScroll.events}
                    className={`mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide select-none ${
                      filterChipsScroll.isDragging ? "cursor-grabbing" : "cursor-grab"
                    }`}
                  >
                    {recoFilterOptions.map((opt) => {
                      const IconComponent = opt.icon;
                      return (
                        <button
                          key={`m-reco-${opt.id}`}
                          type="button"
                          onClick={() => setRecoFilter(opt.id)}
                          className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            recoFilter === opt.id
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          {IconComponent && <IconComponent className="h-3 w-3 shrink-0" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Horizontal Scroll Shelf */}
                  <div className="relative group/shelf">
                    <div
                      ref={curatedShelfScroll.ref}
                      {...curatedShelfScroll.events}
                      className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none transition-all ${
                        curatedShelfScroll.isDragging ? "cursor-grabbing" : "cursor-grab"
                      }`}
                    >
                      {curatedBooks.map((book, idx) => {
                        const isAvailable = getBookDisplayStatus(book) === "available";
                        const recoReason = getRecommendationReason(book, idx);
                        const schoolName = book.school_name || book.library || selectedSchool?.school_name || "Main Library";
                        const availableCopies = book.available_copies !== undefined ? book.available_copies : (book.copies?.length || (isAvailable ? 1 : 0));
                        const isFav = favorites.includes(book.id);
                        const hardcover = getHardcoverStyle(book);
                        const coverPic = getTopicBookCover(book);

                        return (
                          <button
                            key={`mobile-card-${book.id}`}
                            type="button"
                            onClick={() => handleBookClick(book)}
                            className="group relative flex w-[142px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white text-left shadow-md transition-transform active:scale-95 snap-start"
                          >
                            <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-slate-100 border-b border-slate-200/60 pointer-events-none">
                              {coverPic ? (
                                <img
                                  src={coverPic}
                                  alt={book.title}
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 z-[1]"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}

                              {/* Grey L.png Fallback */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-slate-100 z-0 select-none">
                                <img
                                  src="/L.png"
                                  alt="Libralink"
                                  className="h-10 w-10 object-contain grayscale opacity-35"
                                />
                                <span className="mt-1.5 text-center text-[8px] font-semibold text-slate-400 line-clamp-1">
                                  {book.category || "Libralink"}
                                </span>
                              </div>

                              {/* 3D Spine crease */}
                              <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 to-transparent z-[2]" />

                              {/* Top Badges */}
                              <div className="absolute inset-x-1.5 top-1.5 z-10 flex items-center justify-between pointer-events-none">
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[7px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-md bg-black/60 border border-white/20 text-white">
                                  {recoReason.icon && <recoReason.icon className="h-2 w-2 shrink-0" />}
                                  <span>{recoReason.label}</span>
                                </span>

                                <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold shadow-sm backdrop-blur-md ${isAvailable
                                    ? "bg-emerald-950/85 border border-emerald-400/45 text-emerald-300"
                                    : "bg-slate-900/85 border border-slate-600/45 text-slate-300"
                                  }`}>
                                  <span className={`inline-block h-1 w-1 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                                  {isAvailable ? "Available" : "Borrowed"}
                                </span>
                              </div>

                              {/* Quick Favorite */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(book.id);
                                }}
                                className="absolute bottom-[58px] right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 border border-white/25 text-white backdrop-blur-sm active:scale-90 pointer-events-auto"
                                title={isFav ? "Remove favorite" : "Add to favorites"}
                              >
                                <Heart className={`h-3 w-3 ${isFav ? "fill-red-500 text-red-500" : "text-white"}`} />
                              </button>

                              {/* Bottom Scrim */}
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent" />

                              {/* Info at Bottom */}
                              <div className="absolute inset-x-0 bottom-0 z-[3] p-2">
                                <p className="line-clamp-2 text-[10.5px] font-bold leading-tight text-white drop-shadow-sm">
                                  {book.title}
                                </p>
                                <p className="mt-0.5 truncate text-[8.5px] font-medium text-slate-300">
                                  {book.author && book.author !== "Unknown Author" ? book.author : "Academic Thesis"}
                                </p>
                                {/* School/Branch Indicator */}
                                <div className="mt-1 flex items-center gap-1 text-[8px] font-medium text-slate-300">
                                  <Building2 className="h-2.5 w-2.5 shrink-0 text-sky-400" />
                                  <span className="truncate">{schoolName}</span>
                                  {availableCopies > 0 && <span className="shrink-0 text-sky-300 font-semibold">· {availableCopies}c</span>}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

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

              {/* No Results */}
              {filteredBooks.length === 0 && debouncedQuery.trim().length > 0 && !loading && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-[#F7FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-[#64748B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                    No books found
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    "{debouncedQuery}" is not available in your library.
                  </p>
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
                    <CategoryShelfRow
                      key={category}
                      category={category}
                      categoryBooks={categoryBooks}
                      categoryView={categoryView}
                      initialBooksPerCategory={initialBooksPerCategory}
                      setSearchParams={setSearchParams}
                      handleBookClick={handleBookClick}
                      readingReviews={readingReviews}
                      getBookDisplayStatus={getBookDisplayStatus}
                      getBookCategory={getBookCategory}
                      handleAddToBorrowingList={handleAddToBorrowingList}
                      searchBookInOtherSchools={searchBookInOtherSchools}
                      toggleFavorite={toggleFavorite}
                      favorites={favorites}
                    />
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
                    {bookForOtherSchoolSearch.cover_image ? (
                      <img
                        src={`http://localhost:5000${bookForOtherSchoolSearch.cover_image}`}
                        alt={bookForOtherSchoolSearch.title}
                        className="w-24 h-32 object-cover rounded-lg flex-shrink-0 shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.other-school-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-24 h-32 flex-shrink-0 bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-lg flex items-center justify-center shadow-sm other-school-fallback" style={{ display: bookForOtherSchoolSearch.cover_image ? 'none' : 'flex' }}>
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
                        <div className="relative w-full sm:w-32 h-48 sm:h-44 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs group-hover:shadow-md transition-all">
                          {book.cover_image ? (
                            <img
                              src={book.cover_image.startsWith("http") ? book.cover_image : `http://localhost:5000${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`}
                              alt={book.title}
                              className="absolute inset-0 w-full h-full object-cover z-[1]"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 bg-slate-100 z-0 select-none">
                            <img src="/L.png" alt="Libralink" className="h-10 w-10 object-contain grayscale opacity-35 mb-2" />
                            <p className="text-slate-400 text-xs font-semibold text-center line-clamp-2">
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
          {/* Header */}
          <div className="mb-3.5 flex items-center gap-2 border-b border-slate-100 pb-3">
            <img src="/L.png" alt="Libralink" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-slate-900">Libralink</span>
          </div>

          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600">Curated</p>
                <h2 className="text-sm font-bold text-slate-900">Recommended for You</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreferencesModal(true)}
              className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95"
              title="Change Course or Topic Preferences"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Preferences</span>
            </button>
          </div>

          {/* Interactive Filter Pills */}
          <div className="mb-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {recoFilterOptions.map((opt) => {
              const IconComponent = opt.icon;
              return (
                <button
                  key={`d-reco-${opt.id}`}
                  type="button"
                  onClick={() => setRecoFilter(opt.id)}
                  className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    recoFilter === opt.id
                      ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-600"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90"
                  }`}
                >
                  {IconComponent && <IconComponent className="h-3 w-3 shrink-0" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Horizontal Card List (1-Column Rows) with Horizontal Divider Lines */}
          <div className="divide-y divide-slate-200/80">
            {curatedBooks.map((book, idx) => {
              const isAvailable = getBookDisplayStatus(book) === "available";
              const recoReason = getRecommendationReason(book, idx);
              const schoolName = book.school_name || book.library || selectedSchool?.school_name || "Main Library";
              const availableCopies = book.available_copies !== undefined ? book.available_copies : (book.copies?.length || (isAvailable ? 1 : 0));
              const isFav = favorites.includes(book.id);
              const coverPic = getTopicBookCover(book);

              return (
                <div
                  key={`desktop-reco-${book.id}`}
                  onClick={() => handleBookClick(book)}
                  className="group relative flex cursor-pointer items-start gap-3 py-3 transition-all duration-200 hover:bg-blue-50/60 -mx-2 px-2 rounded-xl"
                >
                  {/* Left: Real Book Cover or Grey Libralink Fallback */}
                  <div className="relative h-[88px] w-[62px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-2xs transition-transform duration-200 group-hover:scale-105 group-hover:shadow-md border border-slate-200/80">
                    {coverPic ? (
                      <img
                        src={coverPic}
                        alt={book.title}
                        className="absolute inset-0 h-full w-full object-cover z-[1]"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}

                    {/* Grey L.png Fallback */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-slate-100 select-none z-0">
                      <img
                        src="/L.png"
                        alt="Libralink"
                        className="h-8 w-8 object-contain grayscale opacity-35"
                      />
                      <span className="mt-1 text-center text-[7px] font-semibold text-slate-400 line-clamp-1">
                        {book.category || "Libralink"}
                      </span>
                    </div>

                    {/* 3D Spine crease on left edge */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent z-[2]" />
                  </div>

                  {/* Right: Book Details with crisp typography */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
                    <div>
                      {/* Top Row: Context Badge + Availability Badge */}
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold border truncate max-w-[120px] ${
                          recoReason.label.includes("BSN") || recoReason.label.includes("Nursing")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : "bg-blue-50 text-blue-700 border-blue-200/60"
                        }`}>
                          {recoReason.icon && <recoReason.icon className="h-2.5 w-2.5 shrink-0" />}
                          <span>{recoReason.label}</span>
                        </span>

                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${isAvailable
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-slate-100 text-slate-500 border border-slate-200/60"
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          {isAvailable ? "Available" : "Checked Out"}
                        </span>
                      </div>

                      {/* Title: 2 lines max, hover color transition */}
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors">
                        {book.title}
                      </h3>

                      {/* Author */}
                      <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-500">
                        {book.author && book.author !== "Unknown Author" ? book.author : "Academic Research"}
                      </p>
                    </div>

                    {/* Bottom Row: School / Branch Indicator + Copies + Favorite Heart */}
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 min-w-0 text-[9.5px] text-slate-500">
                        <Building2 className="h-3 w-3 shrink-0 text-blue-500" />
                        <span className="truncate max-w-[130px] font-medium">{schoolName}</span>
                        {availableCopies > 0 && (
                          <span className="shrink-0 text-slate-400 font-normal">· {availableCopies}c</span>
                        )}
                      </div>

                      {/* Quick Heart Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(book.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100"
                        title={isFav ? "Remove from favorites" : "Save to favorites"}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {curatedBooks.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-500">No books found for this filter.</p>
            </div>
          )}
        </aside>
      )}

      {/* Book Details Panel */}

      {/* Book Details Panel */}
      {selectedBook &&
        (() => {
          const selectedBookDisplayStatus = getBookDisplayStatus(selectedBook);
          const selectedAvailCopies = (() => {
            if (typeof selectedBook.availability_ratio === "string") {
              const parts = selectedBook.availability_ratio.split("/");
              if (parts.length === 2) {
                const parsed = parseInt(parts[0], 10);
                if (!isNaN(parsed)) return parsed;
              }
            }
            if (selectedBook.available_copies !== undefined && !isNaN(Number(selectedBook.available_copies))) {
              return Number(selectedBook.available_copies);
            }
            return selectedBookDisplayStatus === "available" ? 1 : 0;
          })();
          const selectedBookAvailable = selectedBookDisplayStatus === "available" && selectedAvailCopies > 0 && isBookAvailableForBorrow(selectedBook);

          return (
            <>
              {/* Mobile backdrop for bottom sheet */}
              <div
                className="fixed inset-0 z-[69] bg-slate-950/40 backdrop-blur-xs transition-opacity lg:hidden"
                onClick={handleCloseOverlay}
                aria-hidden="true"
              />

              <div
                ref={bookDetailsPanelRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Book details for ${selectedBook.title}`}
                onTouchStart={(e) => {
                  sheetTouchStartY.current = e.touches[0].clientY;
                }}
                onTouchEnd={(e) => {
                  const endY = e.changedTouches[0].clientY;
                  const diff = endY - sheetTouchStartY.current;
                  if (diff > 90 && mobileSheetState === "half") {
                    handleCloseOverlay();
                  } else if (diff > 90 && mobileSheetState === "full") {
                    setMobileSheetState("half");
                  } else if (diff < -60 && mobileSheetState === "half") {
                    setMobileSheetState("full");
                  }
                }}
                className={`book-details-panel fixed inset-x-0 bottom-0 z-[70] w-full min-w-0 max-w-none overflow-y-auto overscroll-contain rounded-t-[32px] bg-[#F7FAFC] shadow-2xl transition-all duration-300 lg:relative lg:inset-auto lg:col-start-2 lg:row-start-1 lg:z-auto lg:h-full lg:w-full lg:min-h-0 lg:max-h-none lg:overflow-y-auto lg:overscroll-contain lg:rounded-none lg:border-l lg:border-slate-200 lg:shadow-none animate-panel-slide-in ${
                  showBorrowingForm || mobileSheetState !== "half"
                    ? "max-h-[92dvh] lg:max-h-none"
                    : "max-h-[62dvh] sm:max-h-[70dvh] lg:max-h-none"
                }`}
              >
                {/* Desktop Resize handle */}
                <button
                  type="button"
                  aria-label="Resize book details panel"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setIsResizingBookDetails(true);
                  }}
                  className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-[#0077B6]/40 active:bg-[#0077B6]/60"
                />

                {/* Mobile Drag Indicator Bar */}
                <div
                  className="sticky top-0 z-20 flex w-full cursor-grab justify-center bg-[#F7FAFC] pt-3 pb-1 lg:hidden"
                  onClick={() => setMobileSheetState((prev) => (prev === "half" ? "full" : "half"))}
                >
                  <div className="h-1.5 w-12 rounded-full bg-slate-300 transition hover:bg-slate-400" />
                </div>

                <div className="w-full">
                  {/* Sticky Header with Action & Close */}
                  <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#F7FAFC]/95 px-4 pb-3 pt-3 backdrop-blur-sm sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                          {showBorrowingForm ? "Borrow Request Form" : "Book Details"}
                        </span>
                        <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                          {selectedBook.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(selectedBook.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50"
                          aria-label="Favorite book"
                        >
                          <Heart
                            className={`h-4 w-4 ${favorites.includes(selectedBook.id)
                                ? "fill-red-500 text-red-500"
                                : "text-slate-600"
                              }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseOverlay}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={showBorrowingForm ? "Exit form and return to book details" : "Close book details"}
                          title={showBorrowingForm ? "Exit form and return to book details" : "Close book details"}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-8 pt-4 sm:px-5">
                    {/* If borrowing form is active, render inline */}
                    {showBorrowingForm ? (
                      <div className="h-full flex flex-col">
                        <StudentBorrowingForm
                          borrowingList={borrowingFormList}
                          userData={userData}
                          compact
                          onSubmit={handleBorrowingSubmit}
                          onCancel={() => {
                            setShowBorrowingForm(false);
                            setBorrowingFormList([]);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* 1. HERO COVER SECTION (Apple Books 3D style) */}
                        <div className="flex flex-col items-center pt-1 pb-3 text-center">
                          <div className="relative mb-3 flex h-48 w-36 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-[0_12px_28px_rgba(15,23,42,0.12)] ring-1 ring-black/5 sm:h-52 sm:w-40">
                            {/* Actual Book Cover Image */}
                            {selectedBook.cover_image ? (
                              <img
                                src={selectedBook.cover_image.startsWith("http") ? selectedBook.cover_image : `http://localhost:5000${selectedBook.cover_image.startsWith("/") ? "" : "/"}${selectedBook.cover_image}`}
                                alt={selectedBook.title}
                                className="absolute inset-0 h-full w-full object-cover z-[1]"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : null}

                            {/* Fallback: Grey L.png Libralink */}
                            <div
                              className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 p-3 text-center select-none"
                            >
                              <img
                                src="/L.png"
                                alt="Libralink"
                                className="h-16 w-16 object-contain grayscale opacity-35 drop-shadow-xs"
                              />
                              <span className="mt-2 line-clamp-2 px-1 text-xs font-semibold text-slate-400">
                                {selectedBook.title}
                              </span>
                            </div>

                            {/* Realistic 3D spine crease on left edge */}
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-3 bg-gradient-to-r from-black/25 via-black/5 to-transparent" />
                            <div className="pointer-events-none absolute inset-y-0 left-3 z-[2] w-[1px] bg-white/20" />

                            {/* Ambient Light Reflection */}
                            <div className="pointer-events-none absolute -right-6 -top-6 z-[2] h-24 w-24 rounded-full bg-white/15 blur-sm" />

                            {/* Category Pill on cover bottom */}
                            <span className="absolute bottom-2 left-2 right-2 z-[3] truncate rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm">
                              {getBookCategory(selectedBook)}
                            </span>
                          </div>

                          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                            {selectedBook.title}
                          </h2>
                          <p className="text-xs font-medium text-slate-500 sm:text-sm mt-0.5">
                            by {selectedBook.author || "Unknown Author"}
                          </p>

                          {/* Quick Campus Pill */}
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50/70 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">
                              {selectedBook.school_name || selectedBook.library || "Campus Library"}
                            </span>
                          </div>
                        </div>

                        {/* 2. METADATA HORIZONTAL CHIPS RAIL */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          <div className="flex shrink-0 flex-col rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center min-w-[72px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Year</span>
                            <span className="text-xs font-bold text-slate-800">{selectedBook.year || "2024"}</span>
                          </div>
                          <div className="flex shrink-0 flex-col rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center min-w-[72px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Shelf</span>
                            <span className="text-xs font-bold text-slate-800">{selectedBook.shelf || "A-1"}</span>
                          </div>
                          <div className="flex shrink-0 flex-col rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center min-w-[90px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">ISBN</span>
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
                              {selectedBook.isbn || "N/A"}
                            </span>
                          </div>
                          <div className="flex shrink-0 flex-col rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-center min-w-[80px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                            <span className="text-xs font-bold text-emerald-600">
                              {selectedBookAvailable ? "Available" : "Checked Out"}
                            </span>
                          </div>
                        </div>

                        {/* 3. COLLAPSIBLE SYNOPSIS SECTION */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Synopsis & Overview
                            </span>
                            <button
                              type="button"
                              onClick={() => setSynopsisExpanded((prev) => !prev)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                            >
                              {synopsisExpanded ? "Show less" : "Read more"}
                            </button>
                          </div>
                          <p
                            className={`text-xs leading-relaxed text-slate-600 ${synopsisExpanded ? "" : "line-clamp-3"
                              }`}
                          >
                            {selectedBook.description ||
                              `This academic resource covers comprehensive principles, practical methodologies, and core literature relevant to ${getBookCategory(
                                selectedBook
                              )}. Perfect for college students and researchers at ${selectedBook.library || "our consortium libraries"
                              }.`}
                          </p>
                        </div>

                        {/* Borrowing Terms & Policy Card */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">Borrowing Terms</span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                              {selectedBook.library || 'Owning Library'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-white border border-slate-200/80 rounded-xl">
                              <span className="block text-[10px] uppercase font-bold text-slate-400">Loan Period</span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {selectedBook.school_id && localStorage.getItem('schoolId') && String(selectedBook.school_id) !== String(localStorage.getItem('schoolId')) && selectedBookPolicy?.inter_school_library_use_only
                                  ? 'In-Library Use Only'
                                  : `${selectedBookPolicy?.home_borrowing_days || 7} Days Loan`}
                              </span>
                            </div>
                            <div className="p-2 bg-white border border-slate-200/80 rounded-xl">
                              <span className="block text-[10px] uppercase font-bold text-slate-400">Borrow Limit</span>
                              <span className="font-semibold text-slate-800 text-xs">
                                Up to {selectedBookPolicy?.max_borrow_limit || 5} books
                              </span>
                            </div>
                          </div>

                          <div className="p-2 bg-white border border-slate-200/80 rounded-xl text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Overdue Penalty</span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {selectedBookPolicy?.enable_fines
                                  ? `₱${Number(selectedBookPolicy.fine_amount_per_day || 0).toFixed(2)}/day`
                                  : 'Fine-free'}
                              </span>
                            </div>
                            {selectedBookPolicy?.enable_fines && selectedBookPolicy.grace_period_days > 0 && (
                              <span className="block text-[10px] text-slate-500 mt-0.5">
                                ({selectedBookPolicy.grace_period_days}-day grace period applies)
                              </span>
                            )}
                          </div>

                          {/* Quota reached notice */}
                          {studentActiveLoanCount >= (selectedBookPolicy?.max_borrow_limit || 5) && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-xs">Borrowing Limit Reached</p>
                                <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                                  You currently have {studentActiveLoanCount} active book(s). Return an active loan to borrow more.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 4. MAIN AVAILABILITY & ACTIONS */}
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">Home Campus Copies</span>
                              <span className="text-[11px] text-slate-500">
                                {selectedAvailCopies > 0
                                  ? `${selectedAvailCopies} of ${selectedBook.total_copies || 1} available`
                                  : "Unavailable (0 copies on shelf)"}
                              </span>
                            </div>
                            <BookStatusBadge
                              status={selectedBookDisplayStatus}
                              availabilityRatio={selectedBook.availability_ratio}
                              availableCopies={selectedAvailCopies}
                              totalCopies={selectedBook.total_copies}
                            />
                          </div>

                          {/* Dynamic Availability Urgency Banner */}
                          {selectedAvailCopies <= 0 ? (
                            <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50/95 p-3 text-xs text-rose-800 shadow-2xs">
                              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                              <div>
                                <p className="font-bold text-rose-900">Unavailable — All copies currently borrowed</p>
                                <p className="text-[11px] text-rose-700 leading-tight mt-0.5">
                                  There are 0 copies available in this library. Borrow requests cannot be placed at this time. You may check partner libraries below.
                                </p>
                              </div>
                            </div>
                          ) : selectedAvailCopies <= 2 ? (
                            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/95 p-2.5 text-xs text-amber-900 shadow-2xs">
                              <Flame className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 animate-bounce" />
                              <div>
                                <p className="font-bold">
                                  Hurry! Only {selectedAvailCopies} {selectedAvailCopies === 1 ? 'copy' : 'copies'} left
                                </p>
                                <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                                  Copies are running low. Request now to secure your book before it runs out!
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-xs text-emerald-800">
                              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                              <div>
                                <span className="font-bold">In Stock & Available: </span>
                                <span className="text-[11px] text-emerald-700">{selectedAvailCopies} copies ready on shelf.</span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-2 pt-1">
                            {studentActiveLoanCount >= (selectedBookPolicy?.max_borrow_limit || 5) ? (
                              <button
                                type="button"
                                disabled
                                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-slate-400 bg-slate-200 cursor-not-allowed"
                              >
                                <AlertCircle className="h-4 w-4 text-slate-400" />
                                <span>Borrowing Limit Reached ({studentActiveLoanCount}/{selectedBookPolicy?.max_borrow_limit || 5})</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleBorrow}
                                disabled={!selectedBookAvailable}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-md transition-all active:scale-[0.98] ${selectedBookAvailable
                                    ? "bg-blue-600 shadow-blue-600/20 hover:bg-blue-700"
                                    : "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none"
                                  }`}
                              >
                                <Book className="h-4 w-4" />
                                <span>{selectedBookAvailable ? "Borrow This Book" : "Unavailable — Cannot Request"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddToBorrowingList(selectedBook)}
                              disabled={!selectedBookAvailable || studentActiveLoanCount >= (selectedBookPolicy?.max_borrow_limit || 5)}
                              className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${selectedBookAvailable && studentActiveLoanCount < (selectedBookPolicy?.max_borrow_limit || 5)
                                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 shadow-none"
                                }`}
                            >
                              <Plus className="h-4 w-4" />
                              <span>{selectedBookAvailable ? "Add to Borrowing List" : "Unavailable"}</span>
                            </button>
                          </div>
                        </div>

                        {/* 4.5 PUBLIC / CONSORTIUM BORROWER LIST */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">Currently Borrowed By</h4>
                                <p className="text-[10px] text-slate-500">Public consortium borrow status</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-200">
                              <Globe className="h-3 w-3 text-indigo-500" />
                              <span>Consortium-wide</span>
                            </span>
                          </div>

                          {loadingBorrowers ? (
                            <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                              <span>Loading borrower details...</span>
                            </div>
                          ) : bookBorrowers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3 text-center">
                              <p className="text-xs font-semibold text-emerald-800">No active borrowers or requests</p>
                              <p className="text-[10px] text-emerald-600 mt-0.5">All copies are currently available on shelf!</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {bookBorrowers.map((borrower) => {
                                const isRequested = borrower.status === 'requested';
                                const isWaiting = borrower.status === 'waiting_pickup';
                                const isBorrowed = borrower.status === 'borrowed';

                                const statusBadgeClass = isRequested
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : isWaiting
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : "bg-purple-100 text-purple-800 border-purple-300";

                                const StatusIcon = isRequested ? Clock : isWaiting ? CheckCircle : BookOpen;

                                return (
                                  <div
                                    key={borrower.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition hover:bg-slate-50"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                                        isRequested
                                          ? "bg-amber-100 text-amber-800"
                                          : isWaiting
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-purple-100 text-purple-800"
                                      }`}>
                                        {(borrower.username || "S").substring(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="truncate text-xs font-bold text-slate-800">
                                            @{borrower.username}
                                          </span>
                                          {borrower.full_name && borrower.full_name !== borrower.username && (
                                            <span className="truncate text-[10px] text-slate-400">
                                              ({borrower.full_name})
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                                          <span className="truncate">{borrower.school_name}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusBadgeClass}`}>
                                        <StatusIcon className="h-2.5 w-2.5 shrink-0" />
                                        <span>{borrower.status_label}</span>
                                      </span>
                                      {borrower.date && (
                                        <span className="text-[9px] text-slate-400">
                                          {new Date(borrower.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 5. INLINE "ALSO AVAILABLE AT OTHER SCHOOLS" */}
                        <div className="space-y-2.5 border-t border-slate-200/80 pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-4 w-4 text-indigo-600" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                Also Available at Partner Libraries
                              </h3>
                            </div>
                            {loadingInlineOtherSchools && (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            )}
                          </div>

                          {loadingInlineOtherSchools ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs text-slate-400 animate-pulse">
                              Checking partner school catalogues...
                            </div>
                          ) : inlineOtherSchools.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center text-xs text-slate-500">
                              Exclusive to {selectedBook.library || "this library"} — no copies found at other consortium schools.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {inlineOtherSchools.map((schoolCopy) => {
                                const isExpanded = expandedSchoolId === schoolCopy.school_id;
                                return (
                                  <div
                                    key={schoolCopy.school_id}
                                    className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-indigo-200 space-y-2.5"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                          <h4 className="truncate text-xs font-bold text-slate-900">
                                            {schoolCopy.school_name}
                                          </h4>
                                        </div>
                                        <p className="truncate text-[10px] text-slate-500 mt-0.5">
                                          {schoolCopy.address || "Address unavailable"}
                                        </p>
                                      </div>

                                      {/* Action: Book Detail Button */}
                                      <button
                                        type="button"
                                        onClick={() => setPartnerBookDetailModal(schoolCopy)}
                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition inline-flex items-center gap-1.5 shrink-0"
                                        title="View complete book specs, location, and borrowing terms"
                                      >
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span>Book Detail</span>
                                      </button>
                                    </div>

                                    {/* Book Specific Details & Status Badges */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                                      <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-100">
                                          {schoolCopy.available_copies || 1} available
                                        </span>
                                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                          Library Use Only
                                        </span>
                                        {schoolCopy.call_number && (
                                          <span className="font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                                            Call: {schoolCopy.call_number}
                                          </span>
                                        )}
                                        {schoolCopy.shelf_location && (
                                          <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                            Shelf: {schoolCopy.shelf_location}
                                          </span>
                                        )}
                                        {schoolCopy.publication_year && (
                                          <span className="text-[9px] text-slate-500 font-medium">
                                            Year: {schoolCopy.publication_year}
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedSchoolId((prev) =>
                                            prev === schoolCopy.school_id ? null : schoolCopy.school_id
                                          )
                                        }
                                        className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-0.5 ml-auto"
                                      >
                                        <span>Map</span>
                                        {isExpanded ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>

                                    {/* Expandable School Map */}
                                    {isExpanded && (
                                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                                        <div className="h-40 w-full bg-slate-100">
                                          <MinimalSchoolMap
                                            school={{
                                              school_id: schoolCopy.school_id,
                                              latitude: schoolCopy.latitude,
                                              longitude: schoolCopy.longitude,
                                              school_name: schoolCopy.school_name,
                                              address: schoolCopy.address,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 6. COLLAPSIBLE READING REVIEW ACCORDION */}
                        <div className="border-t border-slate-200/80 pt-4">
                          <button
                            type="button"
                            onClick={() => setReviewAccordionOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-xl bg-slate-100/70 px-3 py-2.5 text-left transition hover:bg-slate-200/60"
                          >
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-slate-600" />
                              <span className="text-xs font-bold text-slate-800">Your Reading Notes</span>
                              {reviewRating > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-amber-950">
                                  <Star className="h-2.5 w-2.5 fill-current" /> {reviewRating}
                                </span>
                              )}
                            </div>
                            {reviewAccordionOpen ? (
                              <ChevronUp className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            )}
                          </button>

                          {reviewAccordionOpen && (
                            <div className="mt-2.5 rounded-xl border border-slate-200/80 bg-white p-3 space-y-2.5 animate-fadeIn">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Rate this book</span>
                                {readingReviews[selectedBook.id] && (
                                  <span className="text-[10px] font-bold text-emerald-600">Saved</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1" role="radiogroup" aria-label="Book rating">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => setReviewRating(rating)}
                                    className="p-1 transition hover:scale-110"
                                    role="radio"
                                    aria-checked={reviewRating === rating}
                                  >
                                    <Star
                                      className={`h-5 w-5 ${rating <= reviewRating
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-slate-200"
                                        }`}
                                    />
                                  </button>
                                ))}
                                <span className="ml-1 text-xs font-medium text-slate-500">
                                  {reviewRating ? `${reviewRating}/5` : "Select"}
                                </span>
                              </div>

                              <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                maxLength={280}
                                rows={2}
                                placeholder="Add a personal study note or summary..."
                                className="w-full resize-none rounded-lg border border-slate-200 p-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                              />

                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-400">Private on this device</span>
                                <button
                                  type="button"
                                  onClick={saveReadingReview}
                                  disabled={!reviewRating}
                                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
                                >
                                  Save Note
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}

      {/* Added to Borrowing List Overlay */}

      {showAddedOverlay && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#0077B6] text-white px-6 py-3 rounded-full shadow-lg z-[10000] flex items-center gap-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />

          <span className="font-semibold text-sm">Added to borrowing list</span>
        </div>
      )}

      {/* Borrowing List Modal — Shopee-style */}

      {showBorrowingList && (() => {
        // Group books by school
        const schoolGroups = {};
        const currentSchoolId = parseInt(localStorage.getItem("schoolId"));
        borrowingList.forEach((item) => {
          const sid = item.owner_school_id;
          if (!schoolGroups[sid]) {
            schoolGroups[sid] = {
              schoolId: sid,
              schoolName: item.owner_school_name || (sid === currentSchoolId ? "My Library" : "Partner Library"),
              isHome: sid === currentSchoolId,
              books: [],
            };
          }
          schoolGroups[sid].books.push(item);
        });
        const schoolGroupList = Object.values(schoolGroups).sort((a, b) => (a.isHome ? -1 : 1) - (b.isHome ? -1 : 1));

        // Filter pills
        const filterOptions = [
          { key: "all", label: "All" },
          ...schoolGroupList.map((g) => ({ key: String(g.schoolId), label: g.isHome ? "My Library" : g.schoolName })),
        ];
        const filteredGroups = cartSchoolFilter === "all"
          ? schoolGroupList
          : schoolGroupList.filter((g) => String(g.schoolId) === cartSchoolFilter);

        const selectedCount = selectedForBorrow.size;
        const limitReached = selectedCount >= cartRemainingSlots;

        // Visiting fee for selected partner books
        const selectedPartnerSchool = cartLockedSchoolId && cartLockedSchoolId !== currentSchoolId ? cartLockedSchoolId : null;

        return (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setShowBorrowingList(false)}
          >
            <div
              className="mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:my-8 sm:max-h-[82vh] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />

              {/* ── HEADER ── */}
              <div className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Borrowing Cart</p>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Borrowing List</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {borrowingList.length} {borrowingList.length === 1 ? "book" : "books"} in cart
                      {cartActiveLoans > 0 && (
                        <span className="ml-1.5 text-[11px] font-medium text-amber-600">
                          · {cartActiveLoans} already borrowed
                        </span>
                      )}
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

                {/* ── FILTER PILLS ── */}
                {schoolGroupList.length > 0 && (
                  <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setCartSchoolFilter(opt.key)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all active:scale-95 ${
                          cartSchoolFilter === opt.key
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Remaining slots indicator */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        limitReached ? "bg-rose-500" : selectedCount > 0 ? "bg-blue-500" : "bg-slate-200"
                      }`}
                      style={{ width: `${cartRemainingSlots > 0 ? Math.min(100, (selectedCount / cartRemainingSlots) * 100) : 100}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold whitespace-nowrap ${limitReached ? "text-rose-600" : "text-slate-500"}`}>
                    {selectedCount}/{cartRemainingSlots} slots
                  </span>
                </div>
              </div>

              {/* ── CONTENT: SCHOOL GROUPS ── */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {borrowingList.length === 0 ? (
                  <div className="py-10 text-center sm:py-14">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 shadow-inner">
                      <Book className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">Your borrowing list is empty</h3>
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
                  <div className="space-y-4">
                    {filteredGroups.map((group) => {
                      const isSchoolLocked = cartLockedSchoolId !== null && cartLockedSchoolId !== group.schoolId;
                      const allGroupChecked = group.books.length > 0 && group.books.every((b) => selectedForBorrow.has(b.book_id));
                      const someGroupChecked = group.books.some((b) => selectedForBorrow.has(b.book_id));

                      return (
                        <div
                          key={group.schoolId}
                          className={`rounded-2xl border transition-all ${
                            isSchoolLocked
                              ? "border-slate-200 bg-slate-50/80 opacity-60"
                              : someGroupChecked
                              ? "border-blue-300 bg-blue-50/30 shadow-sm"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          {/* School Group Header */}
                          <div
                            className={`flex items-center gap-3 px-4 py-3 border-b ${
                              isSchoolLocked ? "border-slate-100" : someGroupChecked ? "border-blue-200" : "border-slate-100"
                            }`}
                          >
                            {/* Group Select-All Checkbox */}
                            <button
                              type="button"
                              disabled={isSchoolLocked}
                              onClick={() => !isSchoolLocked && toggleSchoolGroupSelection(group.schoolId)}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                                isSchoolLocked
                                  ? "border-slate-300 bg-slate-100 cursor-not-allowed"
                                  : allGroupChecked
                                  ? "border-blue-600 bg-blue-600"
                                  : someGroupChecked
                                  ? "border-blue-400 bg-blue-100"
                                  : "border-slate-300 hover:border-blue-400"
                              }`}
                              title={isSchoolLocked ? "You can only borrow from one school at a time" : "Select all"}
                            >
                              {(allGroupChecked || someGroupChecked) && !isSchoolLocked && (
                                <Check className={`h-3.5 w-3.5 ${allGroupChecked ? "text-white" : "text-blue-600"}`} />
                              )}
                            </button>

                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${group.isHome ? "bg-blue-100 text-blue-600" : "bg-indigo-100 text-indigo-600"}`}>
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {group.isHome ? "My Library" : group.schoolName}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {group.books.length} {group.books.length === 1 ? "book" : "books"}
                                {!group.isHome && <span className="ml-1 text-indigo-600 font-semibold">· Partner Campus</span>}
                              </p>
                            </div>
                            {isSchoolLocked && (
                              <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Locked
                              </span>
                            )}
                          </div>

                          {/* Book Items */}
                          <div className="divide-y divide-slate-100">
                            {group.books.map((item) => {
                              const isChecked = selectedForBorrow.has(item.book_id);
                              const isItemUnavailable = !isBookAvailableForBorrow(item);
                              const isDisabled = isSchoolLocked || (!isChecked && limitReached) || isItemUnavailable;

                              return (
                                <div
                                  key={item.book_id}
                                  onClick={() => !isDisabled && toggleCartSelection(item.book_id)}
                                  className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                                    isDisabled
                                      ? "opacity-50 cursor-not-allowed bg-slate-50/50"
                                      : isChecked
                                      ? "bg-blue-50/50"
                                      : "hover:bg-slate-50"
                                  }`}
                                  title={
                                    isItemUnavailable
                                      ? "This book is currently unavailable (all copies borrowed)"
                                      : isSchoolLocked
                                      ? "You can only borrow from one school at a time"
                                      : !isChecked && limitReached
                                      ? `Borrow limit reached (${cartMaxLimit} books max)`
                                      : ""
                                  }
                                >
                                  {/* Checkbox */}
                                  <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                                      isDisabled
                                        ? "border-slate-300 bg-slate-100"
                                        : isChecked
                                        ? "border-blue-600 bg-blue-600"
                                        : "border-slate-300 hover:border-blue-400"
                                    }`}
                                  >
                                    {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
                                  </div>

                                  {/* Book Cover */}
                                  {item.cover_image ? (
                                    <img
                                      src={item.cover_image.startsWith("http") ? item.cover_image : `http://localhost:5000${item.cover_image}`}
                                      alt={item.title}
                                      className="h-[56px] w-[42px] shrink-0 rounded-lg object-cover shadow-sm"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="flex h-[56px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-sm">
                                      <Book className="h-5 w-5 text-white/90" />
                                    </div>
                                  )}

                                  {/* Book Info */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold leading-5 text-slate-900 line-clamp-1">{item.title}</h4>
                                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.author}</p>
                                    <div className="mt-1 flex items-center gap-1.5">
                                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                        item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE'
                                          ? 'bg-indigo-50 text-indigo-700'
                                          : 'bg-blue-50 text-blue-700'
                                      }`}>
                                        {item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE' ? 'Partner' : 'Home'}
                                      </span>
                                      {isItemUnavailable && (
                                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                          Unavailable
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Remove button */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeFromBorrowingList(item.book_id); }}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                    aria-label={`Remove ${item.title}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── STICKY CHECKOUT FOOTER ── */}
              {borrowingList.length > 0 && (
                <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                  {/* Limit message */}
                  {limitReached && selectedCount > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-[11px] font-semibold text-amber-800">
                        Borrow limit reached — {cartMaxLimit} books max ({cartActiveLoans} already borrowed)
                      </p>
                    </div>
                  )}

                  {/* Selection summary */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-extrabold ${selectedCount > 0 ? "text-blue-600" : "text-slate-400"}`}>
                        {selectedCount}
                      </span>
                      <span className="text-sm text-slate-600">
                        / {cartRemainingSlots} selected
                      </span>
                    </div>
                    {selectedPartnerSchool && selectedCount > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] font-medium text-slate-500">Visiting Fee</span>
                        <p className="text-sm font-bold text-amber-700">Check at checkout</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={clearBorrowingList}
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98]"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={handleContinueToRequest}
                      disabled={selectedCount === 0}
                      className={`group flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-lg transition active:scale-[0.98] ${
                        selectedCount > 0
                          ? "bg-blue-600 text-white shadow-blue-600/22 hover:bg-blue-700"
                          : "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                      }`}
                    >
                      <span>Proceed to Borrow ({selectedCount})</span>
                      <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Premium Celebration Success Overlay */}
      {showSuccessOverlay && submittedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          {/* Confetti particles decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute left-[15%] top-[20%] h-3 w-3 rotate-45 rounded-xs bg-amber-400 animate-bounce" />
            <div className="absolute right-[20%] top-[25%] h-3.5 w-2 rotate-12 rounded-xs bg-blue-500 animate-pulse" />
            <div className="absolute left-[30%] top-[15%] h-2.5 w-3.5 -rotate-12 rounded-xs bg-emerald-400 animate-bounce" />
            <div className="absolute right-[35%] top-[18%] h-3 w-3 rotate-45 rounded-xs bg-rose-400 animate-pulse" />
            <div className="absolute left-[22%] top-[32%] h-2 w-2 rounded-full bg-violet-400 animate-ping" />
            <div className="absolute right-[18%] top-[35%] h-2.5 w-2.5 rounded-full bg-amber-300 animate-ping" />
          </div>

          <section
            className="animate-success-sheet relative w-full max-w-[430px] overflow-hidden rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.3)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-success-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Borrow Request Sent
              </span>
              <button
                type="button"
                onClick={() => setShowSuccessOverlay(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-4 text-center">
              <div className="animate-success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)]">
                <CheckCircle className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h2 id="request-success-title" className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                Request Submitted!
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Your request has been routed to the library for review.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request ID</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {submittedRequest?.request_id || "LL-2026-PENDING"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Pending Review
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</span>
                <span className="text-slate-700 font-medium">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Visual 3-step Next Steps Timeline */}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-left">
                What happens next?
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 mt-0.5">
                    1
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-900">Librarian Review:</strong> Library verifies your request and reserves the copy.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 mt-0.5">
                    2
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-900">QR Code Pass:</strong> Once approved, your active QR token will display on your dashboard.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 mt-0.5">
                    3
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-900">Pickup or Read:</strong> Present QR pass to the campus librarian for release.
                  </p>
                </div>
              </div>
            </div>

            {/* Dual CTA Buttons */}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessOverlay(false);
                  navigate('/student/history');
                }}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                View My Requests
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessOverlay(false)}
                className="flex items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.98]"
              >
                Done
              </button>
            </div>
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

      {/* 6. PARTNER BOOK DETAIL MODAL */}
      {partnerBookDetailModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPartnerBookDetailModal(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Partner Library Book Details"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/90 px-5 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Partner Library Catalogue
                  </span>
                  <h3 className="truncate text-sm font-bold text-slate-900">
                    {partnerBookDetailModal.school_name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPartnerBookDetailModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-700 text-xs">
              {/* Book Info Card */}
              <div className="flex gap-4 p-3.5 rounded-xl border border-slate-200 bg-white">
                {/* Book Cover / Thumbnail */}
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 via-blue-600 to-slate-800 shadow-sm border border-slate-200">
                  {partnerBookDetailModal.cover_image ? (
                    <img
                      src={`http://localhost:5000${partnerBookDetailModal.cover_image}`}
                      alt={partnerBookDetailModal.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white/90"
                    style={{ display: partnerBookDetailModal.cover_image ? 'none' : 'flex' }}
                  >
                    <Book className="h-6 w-6 text-white/95" />
                    <span className="mt-1 text-center text-[8px] font-bold uppercase tracking-wider text-white/80 line-clamp-1">
                      Partner Copy
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                    Inter-School Collection
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {partnerBookDetailModal.title || selectedBook?.title}
                  </h4>
                  <p className="text-xs text-slate-600">
                    By <span className="font-semibold text-slate-800">{partnerBookDetailModal.author || selectedBook?.author || "Unknown Author"}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                    {(partnerBookDetailModal.isbn || selectedBook?.isbn) && (
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        ISBN: {partnerBookDetailModal.isbn || selectedBook?.isbn}
                      </span>
                    )}
                    {(partnerBookDetailModal.publication_year || selectedBook?.publication_year) && (
                      <span>Year: {partnerBookDetailModal.publication_year || selectedBook?.publication_year}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shelf Location & Circulation Rules */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Physical Cataloguing & Status
                  </span>
                  <BookStatusBadge
                    availableCopies={partnerBookDetailModal.available_copies !== undefined ? partnerBookDetailModal.available_copies : 1}
                    totalCopies={partnerBookDetailModal.total_copies || 1}
                    availabilityRatio={`${partnerBookDetailModal.available_copies !== undefined ? partnerBookDetailModal.available_copies : 1}/${partnerBookDetailModal.total_copies || 1}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Shelf Location</p>
                    <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                      {partnerBookDetailModal.shelf_location || "Circulation Stacks"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Call Number</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {partnerBookDetailModal.call_number || "Desk Catalogue"}
                    </p>
                  </div>
                </div>

                {/* Inter-Library Policy & Access Terms Card */}
                <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Visiting & Inter-Library Policy</span>
                    </div>

                    {partnerBookDetailModal.enable_visiting_fee && Number(partnerBookDetailModal.visiting_fee_amount) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200 shrink-0">
                        ₱{Number(partnerBookDetailModal.visiting_fee_amount).toFixed(2)} / {partnerBookDetailModal.visiting_fee_type === 'per_day' ? 'Day' : 'Visit'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 shrink-0">
                        Free Access / No Fee
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg bg-white/95 border border-slate-200/80 p-2.5 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                        {partnerBookDetailModal.inter_school_library_use_only !== false ? "Library Use Only (On-Premises)" : "Take-Home Permitted"}
                      </span>
                      {partnerBookDetailModal.enable_visiting_fee && Number(partnerBookDetailModal.visiting_fee_amount) > 0 ? (
                        <span className="text-[10px] text-slate-500">
                          Access fee payable at reception
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Consortium partner free reading privileges
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {partnerBookDetailModal.visiting_policy_notes ||
                        `Visiting students from other consortium schools may review, read, and research this book on-site inside ${partnerBookDetailModal.school_name}'s library premises.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Partner Book Active Borrowers */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Currently Borrowed By
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-200">
                    <Globe className="h-2.5 w-2.5 text-indigo-500" />
                    <span>Consortium-wide</span>
                  </span>
                </div>

                {loadingPartnerBorrowers ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <span>Loading borrower records...</span>
                  </div>
                ) : partnerBookBorrowers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-2.5 text-center text-xs text-emerald-800">
                    No active loans or requests — Ready on shelf at {partnerBookDetailModal.school_name}!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {partnerBookBorrowers.map((borrower) => {
                      const isRequested = borrower.status === 'requested';
                      const isWaiting = borrower.status === 'waiting_pickup';
                      const statusBadgeClass = isRequested
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : isWaiting
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-purple-100 text-purple-800 border-purple-300";
                      const StatusIcon = isRequested ? Clock : isWaiting ? CheckCircle : BookOpen;

                      return (
                        <div
                          key={borrower.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-800">
                              {(borrower.username || "S").substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">@{borrower.username}</span>
                              <span className="text-[10px] text-slate-500 block truncate">{borrower.school_name}</span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold shrink-0 ${statusBadgeClass}`}>
                            <StatusIcon className="h-2.5 w-2.5 shrink-0" />
                            <span>{borrower.status_label}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Campus Location & Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <span>Campus Location & Address</span>
                  </div>
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {partnerBookDetailModal.address || "Consortium Campus"}
                  </span>
                </div>

                <div className="h-44 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <MinimalSchoolMap
                    school={{
                      school_id: partnerBookDetailModal.school_id,
                      latitude: partnerBookDetailModal.latitude,
                      longitude: partnerBookDetailModal.longitude,
                      school_name: partnerBookDetailModal.school_name,
                      address: partnerBookDetailModal.address,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-5 py-3.5 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setPartnerBookDetailModal(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-95 transition"
              >
                Close
              </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentSchoolId = parseInt(localStorage.getItem("schoolId"));
                    const partner = partnerBookDetailModal || {};
                    const selected = selectedBook || {};
                    setBorrowingFormList([
                      {
                        book_id: partner.book_id || partner.id || selected.id || selected.book_id,
                        title: partner.title || selected.title || "Untitled Book",
                        author: partner.author || selected.author || "Unknown Author",
                        isbn: partner.isbn || selected.isbn || "N/A",
                        owner_school_id: partner.school_id || selected.school_id,
                        owner_school_name: partner.school_name || selected.library || "Partner School",
                        partner_school_id:
                          partner.school_id && partner.school_id !== currentSchoolId ? currentSchoolId : null,
                        borrow_type:
                          partner.school_id && partner.school_id !== currentSchoolId
                            ? "INTER_SCHOOL_LIBRARY_USE"
                            : "HOME",
                        visiting_fee: partner.enable_visiting_fee ? (Number(partner.visiting_fee_amount) || 0) : 0,
                        visiting_fee_type: partner.visiting_fee_type || "per_visit",
                        visiting_policy_notes: partner.visiting_policy_notes || "",
                      },
                    ]);
                    setPartnerBookDetailModal(null);
                    setShowBorrowingForm(true);
                  }}
                  disabled={studentActiveLoanCount >= (selectedBookPolicy?.max_borrow_limit || 5)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Book className="h-3.5 w-3.5" />
                  <span>Borrow This Copy</span>
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Preferences Modal for customizing course and reading topics on-the-fly */}
      <StudentPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />

    </div>
  );
}

export default StudentSearch;
