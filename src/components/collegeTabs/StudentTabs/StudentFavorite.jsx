import { useState, useEffect, useMemo } from "react";
import {
  Book,
  Heart,
  Search,
  ArrowUpRight,
  Building2,
  RefreshCw,
  X,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { getBackendAssetUrl } from "../../../utils/api";

function StudentFavorite({ isDrawer = false, onClose }) {
  const navigate = useNavigate();

  // Instant in-memory / local storage cache for 0ms initial render
  const [allBooks, setAllBooks] = useState(() => {
    try {
      const cached = localStorage.getItem("libralink_cached_fav_books");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Only show skeleton if we have favorites to load AND no cached books to display
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem("favorites");
      const favs = saved ? JSON.parse(saved) : [];
      if (!favs || favs.length === 0) return false;
      const cached = localStorage.getItem("libralink_cached_fav_books");
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return false;
    }
  });

  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'available'
  const [searchQuery, setSearchQuery] = useState("");

  // Targeted, fast direct fetch for favorited IDs only
  const loadBooks = async (targetFavs = favorites) => {
    if (!targetFavs || targetFavs.length === 0) {
      setAllBooks([]);
      setLoading(false);
      localStorage.removeItem("libralink_cached_fav_books");
      return;
    }

    if (allBooks.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      // 1. Direct targeted fetch for each favorited book ID in parallel
      const fetchPromises = targetFavs.map(async (favId) => {
        try {
          const res = await api.get(`/books/${favId}`);
          const book = res?.data ?? res;
          if (!book || !book.title) return null;

          const availableCopies =
            book.available_copies !== undefined
              ? book.available_copies
              : (book.book_copies?.filter((c) => c.status === "available")?.length ??
                (book.is_available ? 1 : 0));
          const totalCopies =
            book.total_copies !== undefined
              ? book.total_copies
              : (book.book_copies?.length || Math.max(availableCopies, 1));
          const isAvailable =
            book.real_time_status === "available" ||
            (book.is_available !== false && availableCopies > 0);

          return {
            id: book.book_id ?? book.id ?? favId,
            title: book.title || "Untitled Book",
            author: book.author || "Unknown Author",
            category: book.categories?.category_name || book.category || "General",
            isbn: book.isbn || "N/A",
            publication_year: book.publication_year || "",
            real_time_status: isAvailable ? "available" : (book.real_time_status || "borrowed"),
            status_details:
              book.status_details ||
              (isAvailable ? `${availableCopies} copies available` : "Checked Out"),
            available_copies: availableCopies,
            total_copies: totalCopies,
            school_id: book.school_id,
            library: book.schools?.school_name || book.school_name || "Main Campus Library",
            cover_image: book.cover_image || null,
          };
        } catch (singleErr) {
          console.warn(`Could not fetch book ${favId} directly:`, singleErr);
          return null;
        }
      });

      const resolvedBooks = (await Promise.all(fetchPromises)).filter(Boolean);

      if (resolvedBooks.length > 0) {
        setAllBooks(resolvedBooks);
        localStorage.setItem("libralink_cached_fav_books", JSON.stringify(resolvedBooks));
      } else {
        // Fallback: If targeted ID endpoints failed, try catalog
        try {
          const fallbackRes = await api.get("/books?limit=100&group=true");
          const catalog = Array.isArray(fallbackRes?.data?.books)
            ? fallbackRes.data.books
            : Array.isArray(fallbackRes?.data)
            ? fallbackRes.data
            : [];

          const matched = catalog
            .filter((b) => targetFavs.some((id) => String(id) === String(b.book_id ?? b.id)))
            .map((b) => ({
              id: b.book_id ?? b.id,
              title: b.title || "Untitled Book",
              author: b.author || "Unknown Author",
              category: b.categories?.category_name || b.category || "General",
              isbn: b.isbn || "N/A",
              publication_year: b.publication_year || "",
              real_time_status: "available",
              status_details: null,
              available_copies: 1,
              total_copies: 1,
              school_id: b.school_id,
              library: b.schools?.school_name || "Main Campus Library",
              cover_image: b.cover_image || null,
            }));

          if (matched.length > 0) {
            setAllBooks(matched);
            localStorage.setItem("libralink_cached_fav_books", JSON.stringify(matched));
          }
        } catch (catErr) {
          console.warn("Catalog fallback also failed:", catErr);
        }
      }
    } catch (err) {
      console.error("Error in loadBooks:", err);
      if (allBooks.length === 0) {
        setError("Unable to load saved books right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks(favorites);
  }, []);

  // Sync favorites when changed in other tabs/components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem("favorites");
        const nextFavs = saved ? JSON.parse(saved) : [];
        setFavorites(nextFavs);
        if (nextFavs.length === 0) {
          setAllBooks([]);
          localStorage.removeItem("libralink_cached_fav_books");
        } else {
          loadBooks(nextFavs);
        }
      } catch {
        setFavorites([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("favoritesUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("favoritesUpdated", handleStorageChange);
    };
  }, []);

  // Filter books by favorites list
  const allFavoriteBooks = useMemo(() => {
    return allBooks.filter((book) =>
      favorites.includes(book.id) ||
      favorites.includes(String(book.id)) ||
      (typeof book.id === "string" && favorites.includes(Number(book.id)))
    );
  }, [allBooks, favorites]);

  const availableFavoriteBooks = useMemo(() => {
    return allFavoriteBooks.filter((book) => book.real_time_status === "available");
  }, [allFavoriteBooks]);

  const totalSavedCount = allFavoriteBooks.length;
  const availableCount = availableFavoriteBooks.length;

  // Filter by active tab + search query
  const displayedBooks = useMemo(() => {
    const base = activeFilter === "available" ? availableFavoriteBooks : allFavoriteBooks;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (b) =>
        b.title?.toLowerCase().includes(query) ||
        b.author?.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query) ||
        b.isbn?.toLowerCase().includes(query)
    );
  }, [activeFilter, availableFavoriteBooks, allFavoriteBooks, searchQuery]);

  const removeFavorite = (bookId, e) => {
    e?.stopPropagation();
    const newFavorites = favorites.filter(
      (id) => id !== bookId && String(id) !== String(bookId)
    );
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify(newFavorites));

    // Update local state and cache immediately for 0ms UI update
    const updatedBooks = allBooks.filter(
      (b) => b.id !== bookId && String(b.id) !== String(bookId)
    );
    setAllBooks(updatedBooks);
    localStorage.setItem("libralink_cached_fav_books", JSON.stringify(updatedBooks));

    window.dispatchEvent(new Event("favoritesUpdated"));
  };

  const handleBookClick = (book) => {
    onClose?.();
    navigate("/studentpage/search", {
      state: {
        query: book.title,
      },
    });
  };

  const handleBrowseCatalog = () => {
    onClose?.();
    navigate("/studentpage/search");
  };

  // Error State with Retry Button
  if (error && allBooks.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <Heart className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Unable to load favorites
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-xs mx-auto">
          {error}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => loadBooks(favorites)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 active:scale-95"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
          <button
            type="button"
            onClick={handleBrowseCatalog}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
          >
            <Search className="h-3 w-3" /> Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isDrawer ? "w-full pb-6 text-slate-800" : "mx-auto w-full max-w-2xl px-3 sm:px-6 py-4 sm:py-6 text-slate-800"}>
      {/* Standalone Page Header (hidden in drawer to avoid duplicate titles) */}
      {!isDrawer && (
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                <Heart className="h-3.5 w-3.5 fill-current" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-500">
                Saved Books
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Favorites
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalSavedCount} {totalSavedCount === 1 ? "title" : "titles"} in your personal reading list
            </p>
          </div>

          <button
            onClick={handleBrowseCatalog}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:text-blue-600 active:scale-95"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" /> Browse Catalog
          </button>
        </header>
      )}

      {/* Top Filter & Search Controls */}
      {totalSavedCount > 0 && (
        <div className="mb-3 space-y-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter saved books..."
              className="w-full rounded-xl border border-slate-200/80 bg-white pl-8.5 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Minimalist Segmented Tabs + Quick Counter */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-medium border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({totalSavedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("available")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold transition-all ${
                  activeFilter === "available"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeFilter === "available" ? "bg-emerald-500" : "bg-emerald-400"
                  } ${availableCount > 0 ? "animate-pulse" : ""}`}
                />
                Available ({availableCount})
              </button>
            </div>

            {isDrawer && (
              <button
                type="button"
                onClick={handleBrowseCatalog}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 shrink-0"
              >
                Browse <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && allBooks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-2 divide-y divide-slate-100 shadow-2xs overflow-hidden">
          {[1, 2, 3].map((n) => (
            <div key={`fav-skel-${n}`} className="flex items-center gap-3 p-3 animate-pulse">
              <div className="h-16 w-12 shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-20 rounded bg-slate-200" />
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
              <div className="h-7 w-7 rounded-lg bg-slate-100 shrink-0" />
            </div>
          ))}
        </div>
      ) : displayedBooks.length === 0 ? (
        /* Minimalist Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white/70 py-10 px-4 text-center shadow-2xs my-2">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100">
            <Heart className="h-5 w-5 fill-rose-50 text-rose-500" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {totalSavedCount === 0
              ? "No saved books yet"
              : searchQuery
              ? "No books match your search"
              : "No available books right now"}
          </h3>

          <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
            {totalSavedCount === 0
              ? "Tap the heart icon on any book while browsing the library to save it here for quick access."
              : searchQuery
              ? `No titles or authors match "${searchQuery}". Try a different keyword.`
              : "All your saved books are currently checked out by other students. Check back soon!"}
          </p>

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              Clear Search Filter
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBrowseCatalog}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 active:scale-95"
            >
              Explore Catalog <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Clean Minimalist List (Apple / Notion Style) */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="divide-y divide-slate-100">
            {displayedBooks.map((book) => {
              const isAvailable = book.real_time_status === "available";
              const coverUrl = getBackendAssetUrl(book.cover_image);

              return (
                <div
                  key={`fav-row-${book.id}`}
                  onClick={() => handleBookClick(book)}
                  className="group relative flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-slate-50/80"
                >
                  {/* Left: Clean Rounded Cover Thumbnail */}
                  <div className="relative h-16 w-11 sm:h-[68px] sm:w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200/70 shadow-2xs">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : null}

                    {/* Fallback Clean Graphic */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-slate-50 select-none">
                      <BookOpen className="h-4 w-4 text-slate-400 mb-0.5" />
                      <span className="text-[7px] font-semibold text-slate-400 text-center line-clamp-1 leading-tight">
                        {book.category || "Book"}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Clean Typography & Metadata */}
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    {/* Top Tag & Availability Pill */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 truncate max-w-[120px]">
                        {book.category || "General"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                          isAvailable
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                            : "bg-slate-100 text-slate-500 border border-slate-200/50"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {isAvailable ? "Available" : "Checked Out"}
                      </span>
                    </div>

                    {/* Book Title */}
                    <h3 className="line-clamp-1 text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {book.title}
                    </h3>

                    {/* Author & Campus Location */}
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 flex items-center gap-1">
                      <span>{book.author && book.author !== "Unknown Author" ? book.author : "Academic Collection"}</span>
                      {book.library && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="truncate text-slate-400 text-[10px]">{book.library}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Right: Quick Remove Heart Button */}
                  <div className="shrink-0 pl-1">
                    <button
                      type="button"
                      onClick={(e) => removeFavorite(book.id, e)}
                      title="Remove from favorites"
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:scale-110 active:scale-95 transition-all"
                    >
                      <Heart className="h-4 w-4 fill-current text-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentFavorite;
