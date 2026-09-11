import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Clock,
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
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
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
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
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
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
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
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
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
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
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
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
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
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
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
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
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
  { name: "Nursing & Health", query: "Nursing", icon: Stethoscope, color: "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100" },
  { name: "Technology & IT", query: "Technology", icon: Cpu, color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { name: "Business & Finance", query: "Business", icon: BriefcaseBusiness, color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { name: "Literature & Fiction", query: "Literature", icon: Book, color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { name: "Law & Justice", query: "Law", icon: Scale, color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100" },
  { name: "Science & Math", query: "Science", icon: FlaskConical, color: "text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100" },
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
        const res = await api.get(`/books/school?school_id=${schoolId}`);
        const raw = res?.data?.books || res?.data || (Array.isArray(res) ? res : []);
        const list = Array.isArray(raw) ? raw : [];
        if (isMounted) {
          setHomeBooks(list);
        }
      } catch (err) {
        console.warn("[StudentHeaderSearch] Error loading home books:", err);
      }
    };
    loadHomeBooks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch partner school books with debounce when query is typed (1-letter trigger)
  useEffect(() => {
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
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
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
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: trimmed }));
    } else {
      navigate("/studentpage/search", { state: { query: trimmed } });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsOpen(true);
    setActiveIndex(-1);
    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: "" }));
    }
    inputRef.current?.focus();
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
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: book.title }));
      window.dispatchEvent(new CustomEvent("libralink-select-book", { detail: book }));
    } else {
      navigate("/studentpage/search", {
        state: { query: book.title, selectedBook: book },
      });
    }
  };

  const handleSelectPartnerBook = (partnerBook) => {
    saveToHistory(partnerBook.title);
    setSearchQuery(partnerBook.title);
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: partnerBook.title }));
      window.dispatchEvent(new CustomEvent("libralink-select-partner-book", { detail: partnerBook }));
    } else {
      navigate("/studentpage/search", {
        state: { query: partnerBook.title, partnerBook: partnerBook },
      });
    }
  };

  const handleTopicClick = (topicQuery) => {
    setSearchQuery(topicQuery);
    saveToHistory(topicQuery);
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: topicQuery }));
    } else {
      navigate("/studentpage/search", { state: { query: topicQuery } });
    }
  };

  const handleHistoryClick = (term) => {
    setSearchQuery(term);
    saveToHistory(term);
    setIsOpen(false);
    setActiveIndex(-1);

    if (isSearchPage) {
      window.dispatchEvent(new CustomEvent("libralink-search-input", { detail: term }));
    } else {
      navigate("/studentpage/search", { state: { query: term } });
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
    setIsOpen(false);
    setActiveIndex(-1);
    setSearchQuery("");
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
        placeholder={isHomePage ? "Search controllers, tabs, or settings..." : "Search books, authors, subjects, or ISBN..."}
        aria-label="Search student portal"
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
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
        className="h-12 w-full rounded-full border border-slate-200/90 bg-white pl-11 pr-11 text-sm font-medium text-slate-800 shadow-sm transition-all placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:text-[15px]"
      />

      {/* Clear Button */}
      {searchQuery && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
          className="absolute right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* RICH SEARCH DROPDOWN */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(540px,82vh)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] backdrop-blur-md">
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
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 mb-1">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearAllHistory}
                      className="text-red-500 hover:text-red-700 text-[11px] font-medium transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {safeSearchHistory.map((item, idx) => (
                      <div
                        key={`${item}-${idx}`}
                        onClick={() => handleHistoryClick(item)}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Clock className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-blue-600 transition-colors" />
                          <span className="truncate">{item}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => deleteHistoryItem(item, e)}
                          title="Remove from history"
                          className="p-1 text-slate-300 hover:text-red-500 rounded-md transition-colors opacity-80 group-hover:opacity-100"
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Popular Topics
                </div>
                <div className="flex flex-wrap gap-1.5 p-1.5">
                  {POPULAR_TOPICS.map((topic) => {
                    const TopicIcon = topic.icon;
                    return (
                      <button
                        key={topic.name}
                        type="button"
                        onClick={() => handleTopicClick(topic.query)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 shadow-2xs ${topic.color}`}
                      >
                        <TopicIcon className="h-3.5 w-3.5 shrink-0" />
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
            <div className="space-y-3 p-1">
              {/* SECTION 1: Google-style Search Predictions */}
              {predictions.length > 0 && (
                <div className="space-y-0.5">
                  {predictions.map((term, pIdx) => {
                    const isSelected = activeIndex === pIdx;
                    return (
                      <div
                        key={`pred-${term}-${pIdx}`}
                        onClick={() => executeSearch(term)}
                        onMouseEnter={() => setActiveIndex(pIdx)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50 text-blue-900 font-semibold" : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Search className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="truncate text-xs sm:text-sm">
                            <HighlightMatch text={term} query={searchQuery} />
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: Local Library Matches */}
              {homeMatches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-100 mb-1">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-700 font-bold">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      Home Library Books ({homeMatches.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Available on campus</span>
                  </div>

                  <div className="space-y-1">
                    {homeMatches.map((book, bIdx) => {
                      const itemFlatIdx = predictions.length + bIdx;
                      const isSelected = activeIndex === itemFlatIdx;
                      const isAvail = book.real_time_status === "available" || book.available_copies > 0;
                      return (
                        <div
                          key={book.id || book.book_id}
                          onClick={() => handleSelectHomeBook(book)}
                          onMouseEnter={() => setActiveIndex(itemFlatIdx)}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-blue-50/90 border-blue-300 shadow-2xs"
                              : "border-transparent hover:bg-blue-50/50 hover:border-blue-200"
                          }`}
                        >
                          {/* Book cover / icon */}
                          <div className="relative flex h-10 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 border border-slate-200/80 shadow-2xs overflow-hidden select-none">
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
                              <img src="/L.png" alt="Libralink" className="h-5 w-5 object-contain grayscale opacity-35" />
                            </div>
                          </div>

                          {/* Book Details */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                              <HighlightMatch text={book.title} query={searchQuery} />
                            </h4>
                            <p className="text-xs text-slate-500 truncate">
                              By <HighlightMatch text={book.author || "Unknown author"} query={searchQuery} />
                              {book.category && (
                                <span className="ml-2 inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {book.category}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Availability badge */}
                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                isAvail
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isAvail ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>{book.available_copies || 1} avail</span>
                                </>
                              ) : (
                                "Unavailable"
                              )}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: Available in Partner Libraries (Consortium Inter-Library) */}
              {(safePartnerBooks.length > 0 || searchingPartner) && (
                <div className="pt-1">
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold border-b border-indigo-100 bg-indigo-50/50 rounded-lg mb-1.5">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-indigo-800 font-bold">
                      <Globe className="h-3.5 w-3.5 text-indigo-600" />
                      Available in Partner Libraries
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-bold tracking-wide">
                      Consortium Network
                    </span>
                  </div>

                  {searchingPartner ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-indigo-700">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>Checking consortium partner campuses...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {safePartnerBooks.map((partnerBook, pbIdx) => {
                        const itemFlatIdx = predictions.length + homeMatches.length + pbIdx;
                        const isSelected = activeIndex === itemFlatIdx;
                        return (
                          <div
                            key={`${partnerBook.school_id}-${partnerBook.book_id}`}
                            onClick={() => handleSelectPartnerBook(partnerBook)}
                            onMouseEnter={() => setActiveIndex(itemFlatIdx)}
                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? "bg-indigo-50/95 border-indigo-400 shadow-2xs"
                                : "border-indigo-100/70 hover:bg-indigo-50/80 hover:border-indigo-300"
                            }`}
                          >
                            {/* School Badge Icon */}
                            <div className="flex h-10 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                              <Building2 className="h-4 w-4 text-white" />
                              <span className="text-[8px] font-bold uppercase tracking-tighter text-indigo-200 mt-0.5 truncate max-w-[34px]">
                                {partnerBook.school_code || "SCH"}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 truncate max-w-[150px]">
                                  {partnerBook.school_name}
                                </span>
                                {partnerBook.enable_visiting_fee && Number(partnerBook.visiting_fee_amount) > 0 ? (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 rounded">
                                    ₱{Number(partnerBook.visiting_fee_amount).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                    Free
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                                <HighlightMatch text={partnerBook.title} query={searchQuery} />
                              </h4>
                              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{partnerBook.address || "Consortium Partner Campus"}</span>
                              </p>
                            </div>

                            {/* Copy count badge & call to action */}
                            <div className="shrink-0 text-right flex flex-col items-end">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {partnerBook.available_copies || 1} available
                              </span>
                              <span className="text-[9px] text-indigo-600 font-semibold mt-0.5">
                                View Details & Pass
                              </span>
                            </div>

                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: If no local or partner matches found */}
              {!hasResults && !searchingPartner && (
                <div className="p-4 text-center">
                  <Search className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    No direct matches found for “{searchQuery}”
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Press Enter to search the entire library catalogue.
                  </p>
                </div>
              )}

              {/* SECTION 5: Bottom Quick Search Execution Button */}
              <div className="border-t border-slate-100 pt-1.5">
                <button
                  type="button"
                  onClick={() => executeSearch(searchQuery)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    activeIndex === flatItems.length - 1
                      ? "bg-blue-100 text-blue-900"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Search className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">
                      Search catalogue for <span className="font-bold">“{searchQuery}”</span>
                    </span>
                  </div>
                  <span className="shrink-0 rounded bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                    Press Enter ↵
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
        </div>
      )}
    </div>
  );
}

export default StudentHeaderSearch;
