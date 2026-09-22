import { useEffect, useState, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Clock,
  ArrowLeft,
  Building2,
  Globe,
  Sparkles,
  BookOpen,
  ChevronRight,
  Stethoscope,
  Cpu,
  BriefcaseBusiness,
  Scale,
  FlaskConical,
  Book,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Home,
  Heart,
  Mail,
  User,
  Settings,
  ShieldCheck,
  ShoppingCart,
  HelpCircle,
  Info,
  FileText,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import api, { getBackendAssetUrl } from "../../../utils/api";

function HighlightMatch({ text = "", query = "" }) {
  if (!text) return null;
  const trimmed = String(query || "").trim();
  if (!trimmed) return <span>{text}</span>;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = String(text).split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <span key={index} className="font-extrabold text-blue-600 underline decoration-blue-300 underline-offset-2">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

export const STUDENT_NAVIGATION_CONTROLLERS = [
  {
    id: "nav-catalog",
    title: "Search Catalog / Explore Books",
    category: "Catalog",
    keywords: ["books", "catalog", "search", "explore", "titles", "library", "author", "find", "shelf"],
    description: "Search books, find titles by author, subject, or ISBN",
    path: "/studentpage/search",
    icon: BookOpen,
    badge: "Catalog",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-home",
    title: "Home Dashboard",
    category: "Main",
    keywords: ["home", "dashboard", "main", "overview", "start"],
    description: "Go to your main student dashboard overview",
    path: "/studentpage",
    icon: Home,
    badge: "Dashboard",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-favorites",
    title: "Favorites / Bookmarked Books",
    category: "My Library",
    keywords: ["favorites", "saved", "bookmarks", "wishlist", "liked", "heart", "paborito"],
    description: "View and manage your saved and favorited books",
    path: "/studentpage/favorites",
    icon: Heart,
    badge: "Saved",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-history",
    title: "Borrow History & Active Loans",
    category: "My Library",
    keywords: ["history", "borrows", "borrowed", "loans", "due dates", "return", "records", "hiram"],
    description: "View past and current borrowed books, loan statuses, and due dates",
    path: "/studentpage/history",
    icon: Clock,
    badge: "History",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-inbox",
    title: "Inbox & Notifications",
    category: "Communication",
    keywords: ["inbox", "notifications", "alerts", "messages", "updates", "reminders", "notif"],
    description: "Check overdue alerts, approval notices, and announcements",
    path: "/studentpage/inbox",
    icon: Mail,
    badge: "Alerts",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-cart",
    title: "Borrowing List (Selection Bag)",
    category: "Borrowing",
    keywords: ["cart", "bag", "borrowing list", "checkout", "selection", "items", "bag"],
    description: "Review your selected books before sending borrow requests",
    action: "open-cart",
    path: "/studentpage/search?cart=open",
    icon: ShoppingCart,
    badge: "Borrow List",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-profile",
    title: "Digital Student ID & Profile",
    category: "Account",
    keywords: ["profile", "id", "digital card", "student id", "card", "account", "info", "avatar"],
    description: "View your digital student library card, edit contact info and photo",
    path: "/studentpage/profile",
    icon: User,
    badge: "ID Card",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-settings",
    title: "Account Settings & Preferences",
    category: "Settings",
    keywords: ["settings", "preferences", "account", "configuration", "options", "control"],
    description: "Manage app settings, notification preferences, and student options",
    path: "/studentpage/settings",
    icon: Settings,
    badge: "Settings",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-password",
    title: "Security & Change Password",
    category: "Security",
    keywords: ["password", "security", "change password", "credential", "auth"],
    description: "Update your account password and security credentials",
    path: "/studentpage/change-password",
    icon: ShieldCheck,
    badge: "Security",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-help",
    title: "Help & Support Center",
    category: "Support",
    keywords: ["help", "support", "faq", "guide", "tutorial", "contact", "assist"],
    description: "Get answers to common questions and student library guides",
    path: "/studentpage/help",
    icon: HelpCircle,
    badge: "Help",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-about",
    title: "About Libralink",
    category: "Information",
    keywords: ["about", "libralink", "version", "info", "consortium"],
    description: "Learn about the Libralink Inter-School Library Consortium",
    path: "/studentpage/about",
    icon: Info,
    badge: "Info",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-terms",
    title: "Terms of Service",
    category: "Legal",
    keywords: ["terms", "conditions", "rules", "service", "policy"],
    description: "Review terms of use and borrower responsibilities",
    path: "/studentpage/terms",
    icon: FileText,
    badge: "Legal",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "nav-privacy",
    title: "Privacy Policy",
    category: "Legal",
    keywords: ["privacy", "data", "confidentiality", "protection"],
    description: "How Libralink protects and manages student data",
    path: "/studentpage/privacy",
    icon: ShieldCheck,
    badge: "Legal",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
  },
];

const POPULAR_TOPICS = [
  { name: "Nursing & Health", query: "Nursing", icon: Stethoscope, color: "text-slate-700 bg-slate-100/90 border-slate-200/80 hover:bg-slate-200/90" },
  { name: "Technology & IT", query: "Technology", icon: Cpu, color: "text-slate-700 bg-slate-100/90 border-slate-200/80 hover:bg-slate-200/90" },
  { name: "Business & Finance", query: "Business", icon: BriefcaseBusiness, color: "text-slate-700 bg-slate-100/90 border-slate-200/80 hover:bg-slate-200/90" },
  { name: "Literature & Fiction", query: "Literature", icon: Book, color: "text-slate-700 bg-slate-100/90 border-slate-200/80 hover:bg-slate-200/90" },
  { name: "Law & Justice", query: "Law", icon: Scale, color: "text-slate-700 bg-slate-100/90 border-slate-200/80 hover:bg-slate-200/90" },
  { name: "Science & Math", query: "Science", icon: FlaskConical, color: "text-slate-700 bg-slate-100/90 border-slate-200/80 hover:bg-slate-200/90" },
];

export function StudentHeaderSearch({ className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isSearchPage = location.pathname.startsWith("/studentpage/search");
  const isHomePage = location.pathname === "/studentpage" || location.pathname === "/studentpage/" || location.pathname.startsWith("/studentpage/home");

  const [searchQuery, setSearchQuery] = useState(() => {
    return location.state?.query || searchParams.get("q") || "";
  });

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("searchHistory");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [homeBooks, setHomeBooks] = useState([]);
  const [partnerBooks, setPartnerBooks] = useState([]);
  const [searchingPartner, setSearchingPartner] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync searchQuery when navigating with state or query params
  useEffect(() => {
    const incoming = location.state?.query || searchParams.get("q");
    if (typeof incoming === "string" && incoming !== searchQuery) {
      setSearchQuery(incoming);
    }
  }, [location.state?.query, searchParams]);

  // Load home library books once for instant autocomplete
  useEffect(() => {
    let isMounted = true;
    const loadHomeBooks = async () => {
      try {
        const schoolId = localStorage.getItem("schoolId");
        if (!schoolId) return;
        const res = await api.get(`/books/school?school_id=${schoolId}&group=true`);
        const raw = res?.data?.data?.books || res?.data?.books || res?.data?.data || res?.data || [];
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.books) ? raw.books : []);
        if (isMounted && list.length > 0) {
          setHomeBooks(list);
        }
      } catch (err) {
        console.warn("[StudentHeaderSearch] Error loading home books:", err);
      }
    };
    loadHomeBooks();

    // Instant sync if books are already loaded on the search page
    const handleBooksSynced = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0 && isMounted) {
        setHomeBooks(e.detail);
      }
    };
    window.addEventListener("libralink-books-synced", handleBooksSynced);

    return () => {
      isMounted = false;
      window.removeEventListener("libralink-books-synced", handleBooksSynced);
    };
  }, []);

  // Fetch partner school books with debounce when query is typed (1-letter trigger)
  useEffect(() => {
    if (isHomePage) {
      setPartnerBooks([]);
      setSearchingPartner(false);
      return undefined;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 1) {
      setPartnerBooks([]);
      setSearchingPartner(false);
      return undefined;
    }

    setSearchingPartner(true);
    const timer = setTimeout(async () => {
      try {
        const currentSchoolId = localStorage.getItem("schoolId") || "";
        const res = await api.get(
          `/books/search-other-schools?title=${encodeURIComponent(trimmed)}&exclude_school_id=${currentSchoolId}`
        );
        const data = res?.success && Array.isArray(res?.data) ? res.data : [];
        setPartnerBooks(data.slice(0, 4));
      } catch (error) {
        console.warn("[StudentHeaderSearch] Error checking partner schools:", error);
        setPartnerBooks([]);
      } finally {
        setSearchingPartner(false);
      }
    }, 140);

    return () => clearTimeout(timer);
  }, [searchQuery, isHomePage]);

  const mobileInputRef = useRef(null);
  const mobilePortalRef = useRef(null);
  const searchStatePushedRef = useRef(false);

  // Close search and pop browser state if pushed
  const closeSearch = useCallback(() => {
    if (searchStatePushedRef.current) {
      searchStatePushedRef.current = false;
      if (window.history.state?.studentSearchOpen) {
        window.history.back();
      }
    }
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    mobileInputRef.current?.blur();
  }, []);

  // Intercept browser / Android hardware back button when search is open
  useEffect(() => {
    if (isOpen) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      if (isMobile && !searchStatePushedRef.current) {
        window.history.pushState({ studentSearchOpen: true }, "");
        searchStatePushedRef.current = true;
      }

      const handlePopState = () => {
        searchStatePushedRef.current = false;
        setIsOpen(false);
        setActiveIndex(-1);
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    } else {
      if (searchStatePushedRef.current) {
        searchStatePushedRef.current = false;
        if (window.history.state?.studentSearchOpen) {
          window.history.back();
        }
      }
    }
  }, [isOpen]);

  // Lock background body scroll on mobile when full-screen search is open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.innerWidth < 640) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Close dropdown on outside click (desktop & outside mobile portal)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !mobilePortalRef.current?.contains(e.target)
      ) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [closeSearch]);

  // Listen for clear-search events from Book Details back button
  useEffect(() => {
    const handleClear = () => {
      setSearchQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
    };
    window.addEventListener("libralink-clear-search", handleClear);
    return () => {
      window.removeEventListener("libralink-clear-search", handleClear);
    };
  }, []);

  // Save term to search history
  const saveToHistory = (term) => {
    const clean = String(term || "").trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("searchHistory", JSON.stringify(updated));
      } catch (err) {
        console.warn("Error saving search history:", err);
      }
      return updated;
    });
  };

  const deleteHistoryItem = (term, e) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== term);
      try {
        localStorage.setItem("searchHistory", JSON.stringify(updated));
      } catch (err) {
        console.warn("Error deleting search history:", err);
      }
      return updated;
    });
  };

  const clearAllHistory = (e) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem("searchHistory");
    } catch (err) {
      console.warn("Error clearing search history:", err);
    }
  };

  const handleInputChange = (e) => {
    const nextQuery = e.target.value;
    setSearchQuery(nextQuery);
    setIsOpen(true);
    setActiveIndex(-1);

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: nextQuery }));
    }
  };

  const executeSearch = (targetQuery = searchQuery) => {
    const trimmed = String(targetQuery || "").trim();
    if (isHomePage) {
      if (!trimmed && controllerMatches.length > 0) {
        handleSelectController(controllerMatches[0]);
        return;
      }
      const match = controllerMatches[0] || STUDENT_NAVIGATION_CONTROLLERS.find((item) => {
        const q = trimmed.toLowerCase();
        return item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q));
      });
      if (match) {
        handleSelectController(match);
      }
      return;
    }

    if (trimmed) {
      saveToHistory(trimmed);
    }
    const hadPushedState = searchStatePushedRef.current;
    searchStatePushedRef.current = false;
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      if (hadPushedState && window.history.state?.studentSearchOpen) {
        window.history.back();
      }
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: trimmed }));
    } else {
      navigate("/studentpage/search", { replace: hadPushedState, state: { query: trimmed } });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsOpen(true);
    setActiveIndex(-1);
    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: "" }));
    }
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      mobileInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  };

  // Local home books matching the current query
  const safeHomeBooks = Array.isArray(homeBooks) ? homeBooks : (Array.isArray(homeBooks?.books) ? homeBooks.books : []);
  const safePartnerBooks = Array.isArray(partnerBooks) ? partnerBooks : [];
  const safeSearchHistory = Array.isArray(searchHistory) ? searchHistory : [];

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = trimmedQuery.length > 0;

  // Google-style predictive keywords (from titles, authors, categories)
  const predictions = useMemo(() => {
    if (!hasQuery) return [];
    const pool = new Set();

    safeHomeBooks.forEach((b) => {
      if (b.title) pool.add(b.title.trim());
      if (b.author) pool.add(b.author.trim());
      if (b.category) pool.add(b.category.trim());
      if (b.categories?.category_name) pool.add(b.categories.category_name.trim());
    });

    POPULAR_TOPICS.forEach((t) => {
      pool.add(t.query);
    });

    const matches = Array.from(pool).filter((term) =>
      term.toLowerCase().includes(trimmedQuery)
    );

    matches.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(trimmedQuery);
      const bStarts = bLower.startsWith(trimmedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.length - b.length;
    });

    return matches.slice(0, 4);
  }, [safeHomeBooks, trimmedQuery, hasQuery]);

  const homeMatches = useMemo(() => {
    if (!hasQuery) return [];
    return safeHomeBooks
      .filter((b) => {
        if (!b) return false;
        const title = (b.title || "").toLowerCase();
        const author = (b.author || "").toLowerCase();
        const isbn = (b.isbn || "").toLowerCase();
        const cat = (b.category || b.categories?.category_name || b.category_name || "").toLowerCase();
        return title.includes(trimmedQuery) || author.includes(trimmedQuery) || isbn.includes(trimmedQuery) || cat.includes(trimmedQuery);
      })
      .slice(0, 4);
  }, [safeHomeBooks, trimmedQuery, hasQuery]);

  const handleSelectHomeBook = (book) => {
    saveToHistory(book.title);
    setSearchQuery(book.title);
    searchStatePushedRef.current = false;
    setIsOpen(false);
    setActiveIndex(-1);

    const normalizedBook = {
      ...book,
      id: book.id || book.book_id,
      book_id: book.book_id || book.id,
    };

    if (window.history.state?.studentSearchOpen) {
      window.history.replaceState(null, "");
    }

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: book.title }));
      window.dispatchEvent(new CustomEvent("libralink-select-book", { detail: normalizedBook }));
    } else {
      navigate("/studentpage/search", {
        state: { query: book.title, selectedBook: normalizedBook },
      });
    }
  };

  const handleSelectPartnerBook = (partnerBook) => {
    saveToHistory(partnerBook.title);
    setSearchQuery(partnerBook.title);
    searchStatePushedRef.current = false;
    setIsOpen(false);
    setActiveIndex(-1);

    const normalizedPartnerBook = {
      ...partnerBook,
      id: partnerBook.id || partnerBook.book_id,
      book_id: partnerBook.book_id || partnerBook.id,
    };

    if (window.history.state?.studentSearchOpen) {
      window.history.replaceState(null, "");
    }

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: partnerBook.title }));
      window.dispatchEvent(new CustomEvent("libralink-select-partner-book", { detail: normalizedPartnerBook }));
    } else {
      navigate("/studentpage/search", {
        state: { query: partnerBook.title, partnerBook: normalizedPartnerBook },
      });
    }
  };

  const handleTopicClick = (topicQuery) => {
    setSearchQuery(topicQuery);
    saveToHistory(topicQuery);
    const hadPushedState = searchStatePushedRef.current;
    searchStatePushedRef.current = false;
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      if (hadPushedState && window.history.state?.studentSearchOpen) {
        window.history.back();
      }
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: topicQuery }));
    } else {
      navigate("/studentpage/search", { replace: hadPushedState, state: { query: topicQuery } });
    }
  };

  const handleHistoryClick = (term) => {
    setSearchQuery(term);
    saveToHistory(term);
    const hadPushedState = searchStatePushedRef.current;
    searchStatePushedRef.current = false;
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      if (hadPushedState && window.history.state?.studentSearchOpen) {
        window.history.back();
      }
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: term }));
    } else {
      navigate("/studentpage/search", { replace: hadPushedState, state: { query: term } });
    }
  };

  // Navigation controllers matching the search query (Active on Home page)
  const controllerMatches = useMemo(() => {
    if (!isHomePage) return [];
    if (!hasQuery) {
      return STUDENT_NAVIGATION_CONTROLLERS.slice(0, 8);
    }
    const q = trimmedQuery;
    return STUDENT_NAVIGATION_CONTROLLERS.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const catMatch = item.category.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return titleMatch || catMatch || descMatch || keywordMatch;
    });
  }, [isHomePage, hasQuery, trimmedQuery]);

  const handleSelectController = (item) => {
    const hadPushedState = searchStatePushedRef.current;
    searchStatePushedRef.current = false;
    setIsOpen(false);
    setActiveIndex(-1);
    setSearchQuery("");
    if (hadPushedState && window.history.state?.studentSearchOpen) {
      window.history.back();
    }
    if (item.action === "open-cart") {
      navigate("/studentpage/search?cart=open");
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // Flatten selectable items for keyboard ArrowUp / ArrowDown navigation
  const flatItems = useMemo(() => {
    if (isHomePage) {
      return controllerMatches.map((ctrl) => ({
        type: "controller",
        label: ctrl.title,
        onSelect: () => handleSelectController(ctrl),
      }));
    }

    if (!hasQuery) return [];
    const list = [];
    predictions.forEach((term) => {
      list.push({ type: "prediction", label: term, onSelect: () => executeSearch(term) });
    });
    homeMatches.forEach((book) => {
      list.push({ type: "home_book", label: book.title, onSelect: () => handleSelectHomeBook(book) });
    });
    safePartnerBooks.forEach((pBook) => {
      list.push({ type: "partner_book", label: pBook.title, onSelect: () => handleSelectPartnerBook(pBook) });
    });
    list.push({ type: "search_all", label: searchQuery, onSelect: () => executeSearch(searchQuery) });
    return list;
  }, [isHomePage, controllerMatches, hasQuery, predictions, homeMatches, safePartnerBooks, searchQuery]);

  const hasResults = isHomePage
    ? controllerMatches.length > 0
    : predictions.length > 0 || homeMatches.length > 0 || safePartnerBooks.length > 0;

  const renderDropdownContent = (isMobile = false) => (
    <>
      {isHomePage ? (
            /* ============================================================ */
            /* HOME PAGE: NAVIGATION CONTROLLERS, TABS, & SETTINGS ONLY     */
            /* ============================================================ */
            <div className="space-y-2 p-1">
              {!hasQuery ? (
                <div className="p-1">
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 mb-2">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold text-slate-700">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                      Quick Navigation & Settings
                    </span>
                    <span className="text-[10px] text-slate-400">Direct shortcuts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {controllerMatches.map((ctrl, cIdx) => {
                      const CtrlIcon = ctrl.icon;
                      const isSelected = activeIndex === cIdx;
                      return (
                        <div
                          key={ctrl.id}
                          onClick={() => handleSelectController(ctrl)}
                          onMouseEnter={() => setActiveIndex(cIdx)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border text-left ${
                            isSelected
                              ? "bg-blue-50/90 border-blue-300 shadow-2xs"
                              : "border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                            <CtrlIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{ctrl.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{ctrl.description}</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 mb-1.5">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold text-blue-700">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                      Controllers & Settings ({controllerMatches.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Press Enter to select</span>
                  </div>

                  {controllerMatches.length > 0 ? (
                    <div className="space-y-1">
                      {controllerMatches.map((ctrl, cIdx) => {
                        const CtrlIcon = ctrl.icon;
                        const isSelected = activeIndex === cIdx;
                        return (
                          <div
                            key={ctrl.id}
                            onClick={() => handleSelectController(ctrl)}
                            onMouseEnter={() => setActiveIndex(cIdx)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? "bg-blue-50/90 border-blue-300 shadow-2xs"
                                : "border-transparent hover:bg-blue-50/40 hover:border-blue-200"
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700 border border-blue-200/60 shadow-2xs">
                              <CtrlIcon className="h-4.5 w-4.5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  <HighlightMatch text={ctrl.title} query={searchQuery} />
                                </h4>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ctrl.badgeColor}`}>
                                  {ctrl.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                <HighlightMatch text={ctrl.description} query={searchQuery} />
                              </p>
                            </div>

                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 text-center">
                      <SlidersHorizontal className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        No controllers or settings match “{searchQuery}”
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Notice: Books cannot be searched here on the Home screen. Try searching for system tabs or settings.
                      </p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {["Explore Catalog", "Favorites", "Borrow History", "Inbox", "Digital ID", "Settings"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSearchQuery(s)}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Enter Shortcut Button */}
                  {controllerMatches.length > 0 && (
                    <div className="mt-2 border-t border-slate-100 pt-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectController(controllerMatches[0])}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">
                            Go to <span className="font-bold">{controllerMatches[0].title}</span>
                          </span>
                        </div>
                        <span className="shrink-0 rounded bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                          Press Enter ↵
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* SEARCH PAGE: BOOK CATALOGUE DISCOVERY & AUTOCOMPLETE        */
            /* ============================================================ */
            <>
              {!hasQuery && (
                <div className="space-y-3 p-1">
                  {/* Recent Searches */}
                  {safeSearchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 mb-1">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={clearAllHistory}
                          className="text-slate-400 hover:text-rose-600 text-[11px] font-medium transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {safeSearchHistory.map((item, idx) => (
                          <div
                            key={`${item}-${idx}`}
                            onClick={() => handleHistoryClick(item)}
                            className="group flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-100/70 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Clock className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                              <span className="truncate">{item}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => deleteHistoryItem(item, e)}
                              title="Remove from history"
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-70 group-hover:opacity-100"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Topics Quick-Discovery Pills */}
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                      Popular Topics
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-1">
                      {POPULAR_TOPICS.map((topic) => {
                        const TopicIcon = topic.icon;
                        return (
                          <button
                            key={topic.name}
                            type="button"
                            onClick={() => handleTopicClick(topic.query)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 shadow-2xs ${topic.color}`}
                          >
                            <TopicIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <span>{topic.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

          {/* ============================================================ */}
          {/* ACTIVE QUERY: PREDICTIONS + LOCAL MATCHES + PARTNER MATCHES */}
          {/* ============================================================ */}
          {hasQuery && (
            <div className={`space-y-2 ${isMobile ? "p-0.5" : "p-1"}`}>
              {/* SECTION 1: Google/Spotify-style Search Suggestions */}
              {predictions.length > 0 && (
                <div className="space-y-0.5">
                  {predictions.map((term, pIdx) => {
                    const isSelected = activeIndex === pIdx;
                    return (
                      <div
                        key={`pred-${term}-${pIdx}`}
                        onClick={() => executeSearch(term)}
                        onMouseEnter={() => setActiveIndex(pIdx)}
                        className={`flex items-center justify-between rounded-xl cursor-pointer transition-colors ${
                          isMobile ? "px-3 py-2.5" : "px-2.5 py-1.5"
                        } ${
                          isSelected ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Search className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className={`${isMobile ? "text-sm" : "text-xs"} line-clamp-1 text-slate-800 font-medium`}>
                            <HighlightMatch text={term} query={searchQuery} />
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: Local Library Matches (Spotify Track Rows) */}
              {homeMatches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      Books ({homeMatches.length})
                    </span>
                    <span className="text-[10px] lowercase font-normal text-slate-400">on campus</span>
                  </div>

                  <div className="space-y-0.5">
                    {homeMatches.map((book, bIdx) => {
                      const itemFlatIdx = predictions.length + bIdx;
                      const isSelected = activeIndex === itemFlatIdx;
                      const isAvail = book.real_time_status === "available" || book.available_copies > 0;
                      const copiesCount = book.available_copies || 1;

                      return (
                        <div
                          key={book.id || book.book_id}
                          onClick={() => handleSelectHomeBook(book)}
                          onMouseEnter={() => setActiveIndex(itemFlatIdx)}
                          className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
                            isSelected ? "bg-slate-100" : "hover:bg-slate-50 active:bg-slate-100"
                          }`}
                        >
                          {/* Spotify-style clean book cover */}
                          <div className={`relative flex shrink-0 items-center justify-center rounded-md bg-slate-100 overflow-hidden select-none shadow-2xs ${
                            isMobile ? "h-13 w-10" : "h-11 w-8"
                          }`}>
                            {book.cover_image ? (
                              <img
                                src={getBackendAssetUrl(book.cover_image)}
                                alt={book.title}
                                className="absolute inset-0 h-full w-full object-cover z-[1]"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-0">
                              <img src="/L.png" alt="Libralink" className="h-4 w-4 object-contain grayscale opacity-30" />
                            </div>
                          </div>

                          {/* Details: Title & Subtitle with bullets */}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h4 className={`font-semibold text-slate-900 truncate leading-snug ${
                              isMobile ? "text-sm" : "text-xs"
                            }`}>
                              <HighlightMatch text={book.title} query={searchQuery} />
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 overflow-hidden whitespace-nowrap">
                              <span className="truncate shrink min-w-0">
                                <HighlightMatch text={book.author || "Unknown author"} query={searchQuery} />
                              </span>
                              {book.category && (
                                <>
                                  <span className="text-slate-300 shrink-0">•</span>
                                  <span className="truncate shrink min-w-0 max-w-[90px]">{book.category}</span>
                                </>
                              )}
                              <span className="text-slate-300 shrink-0">•</span>
                              <span className={`inline-flex items-center gap-1 font-medium shrink-0 ${isAvail ? "text-emerald-600" : "text-slate-400"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isAvail ? "bg-emerald-500" : "bg-slate-400"}`} />
                                <span>{isAvail ? `${copiesCount} avail` : "Unavailable"}</span>
                              </span>
                            </div>
                          </div>

                          {/* Trailing chevron */}
                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: Available in Partner Libraries (Consortium Inter-Library) */}
              {(safePartnerBooks.length > 0 || searchingPartner) && (
                <div>
                  <div className="flex items-center justify-between px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-600" />
                      Partner Libraries ({safePartnerBooks.length})
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      Consortium
                    </span>
                  </div>

                  {searchingPartner ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-blue-700">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Checking consortium campuses...</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {safePartnerBooks.map((partnerBook, pbIdx) => {
                        const itemFlatIdx = predictions.length + homeMatches.length + pbIdx;
                        const isSelected = activeIndex === itemFlatIdx;
                        const hasFee = partnerBook.enable_visiting_fee && Number(partnerBook.visiting_fee_amount) > 0;
                        const feeText = hasFee ? `₱${Number(partnerBook.visiting_fee_amount).toFixed(2)}` : "Free";
                        const availCopies = partnerBook.available_copies || 1;

                        return (
                          <div
                            key={`${partnerBook.school_id}-${partnerBook.book_id}`}
                            onClick={() => handleSelectPartnerBook(partnerBook)}
                            onMouseEnter={() => setActiveIndex(itemFlatIdx)}
                            className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50/90" : "hover:bg-blue-50/50 active:bg-blue-100/60"
                            }`}
                          >
                            {/* School Acronym Badge Thumbnail */}
                            <div className={`flex shrink-0 flex-col items-center justify-center rounded-md bg-[#0077B6] text-white shadow-2xs ${
                              isMobile ? "h-13 w-10" : "h-11 w-8"
                            }`}>
                              <Building2 className="h-4 w-4 text-white mb-0.5" />
                              <span className="text-[8px] font-black uppercase tracking-tighter text-blue-100 truncate max-w-[32px] text-center leading-none">
                                {partnerBook.school_code || "SCH"}
                              </span>
                            </div>

                            {/* Info: Title & Subtitle */}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <h4 className={`font-semibold text-slate-900 truncate leading-snug ${
                                isMobile ? "text-sm" : "text-xs"
                              }`}>
                                <HighlightMatch text={partnerBook.title} query={searchQuery} />
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 overflow-hidden whitespace-nowrap">
                                <span className="font-medium text-blue-700 truncate shrink min-w-0">
                                  {partnerBook.school_name}
                                </span>
                                <span className="text-slate-300 shrink-0">•</span>
                                <span className="truncate shrink min-w-0 max-w-[90px] text-slate-400">
                                  {partnerBook.address || "Campus"}
                                </span>
                                <span className="text-slate-300 shrink-0">•</span>
                                <span className={`shrink-0 ${hasFee ? "font-semibold text-amber-700" : "font-semibold text-emerald-600"}`}>
                                  {feeText}
                                </span>
                                <span className="text-slate-300 shrink-0">•</span>
                                <span className="text-emerald-600 font-medium shrink-0">
                                  {availCopies} avail
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-semibold text-blue-600 opacity-80 group-hover:opacity-100 shrink-0 flex items-center gap-0.5 transition-opacity">
                              View →
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: If no local or partner matches found */}
              {!hasResults && !searchingPartner && (
                <div className="p-6 text-center">
                  <Search className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No direct matches found for “{searchQuery}”
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Press Enter to search the entire library catalogue.
                  </p>
                </div>
              )}

              {/* SECTION 5: Bottom Quick Search Execution Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => executeSearch(searchQuery)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                    activeIndex === flatItems.length - 1
                      ? "bg-slate-100 text-slate-900"
                      : "text-blue-600 hover:bg-slate-50 active:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Search className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="truncate">
                      Search catalogue for <span className="font-bold text-slate-900">“{searchQuery}”</span>
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 font-medium">
                    Press ↵
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div ref={containerRef} className={`relative flex items-center w-full min-w-0 ${className}`}>
      {/* Search Icon */}
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center text-slate-400">
        <Search className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
      </div>

      {/* Main Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        placeholder={isHomePage ? "Search controls, tabs, and settings..." : "Search books, authors, ISBN…"}
        aria-label={isHomePage ? "Search controls, tabs, and settings" : "Search student portal"}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
            setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && flatItems[activeIndex]) {
              flatItems[activeIndex].onSelect();
            } else {
              executeSearch();
            }
          } else if (e.key === "Escape") {
            closeSearch();
          }
        }}
        className="h-10 w-full rounded-full border border-slate-200/90 bg-white pl-11 pr-11 text-sm font-medium text-slate-800 shadow-sm transition-all placeholder:text-slate-400 placeholder:font-normal focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/25 sm:h-11 md:h-12 md:text-[15px]"
      />

      {/* End Action Button (Clear text or Close Recent Searches) */}
      {(searchQuery || isOpen) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (searchQuery) {
              clearSearch();
            } else {
              closeSearch();
            }
          }}
          aria-label={searchQuery ? "Clear search text" : "Close search"}
          className="absolute right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95 z-20"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* RICH SEARCH DROPDOWN — Anchored dropdown on desktop, Full-screen on mobile via Portal */}
      {isOpen && (
        <>
          {/* MOBILE FULL-SCREEN VIEW (sm:hidden) via Portal directly to document.body */}
          {typeof document !== "undefined" &&
            createPortal(
              <div
                ref={mobilePortalRef}
                className="fixed inset-0 z-[99999] flex flex-col bg-white sm:hidden overflow-hidden animate-in fade-in duration-150"
              >
                {/* Mobile Top Header: Back button + Search Input + Clear/Cancel */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-white shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="relative flex-1 min-w-0">
                    <input
                      ref={mobileInputRef}
                      type="text"
                      value={searchQuery}
                      autoFocus
                      placeholder={isHomePage ? "Search controls, tabs, and settings..." : "Search books, authors, ISBN…"}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          executeSearch();
                        }
                      }}
                      className="h-10 w-full rounded-full border border-slate-200 bg-slate-100/90 pl-3.5 pr-8 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    />
                    {(searchQuery || isOpen) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (searchQuery) {
                            clearSearch();
                          } else {
                            closeSearch();
                          }
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={closeSearch}
                    className="px-2 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    Cancel
                  </button>
                </div>

                {/* Mobile Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-3 pb-28">
                  {renderDropdownContent(true)}
                </div>
              </div>,
              document.body
            )}

          {/* DESKTOP FLOATING DROPDOWN (hidden sm:block) */}
          <div className="hidden sm:block absolute top-full left-0 right-0 mt-2 z-[60] max-h-[min(460px,70vh)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl backdrop-blur-md">
            {renderDropdownContent(false)}
          </div>
        </>
      )}
    </div>
  );
}

export default StudentHeaderSearch;
