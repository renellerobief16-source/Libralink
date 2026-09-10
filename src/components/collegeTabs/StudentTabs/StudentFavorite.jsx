import { useState, useEffect } from "react";
import {
  Book,
  Heart,
  Search,
  ArrowUpRight,
  Building2,
  RefreshCw,
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

  // Targeted, fast direct fetch for favorited IDs only
  const loadBooks = async (targetFavs = favorites) => {
    if (!targetFavs || targetFavs.length === 0) {
      setAllBooks([]);
      setLoading(false);
      localStorage.removeItem("libralink_cached_fav_books");
      return;
    }

    // If no cached books are shown, show skeleton
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
            library: book.schools?.school_name || book.school_name || "Main Library",
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
              library: b.schools?.school_name || "Main Library",
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

  // Filter books
  const allFavoriteBooks = allBooks.filter((book) =>
    favorites.includes(book.id) ||
    favorites.includes(String(book.id)) ||
    (typeof book.id === "string" && favorites.includes(Number(book.id)))
  );

  const availableFavoriteBooks = allFavoriteBooks.filter(
    (book) => book.real_time_status === "available"
  );

  const displayedBooks =
    activeFilter === "available" ? availableFavoriteBooks : allFavoriteBooks;

  const totalSavedCount = allFavoriteBooks.length;
  const availableCount = availableFavoriteBooks.length;

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
      <div className="p-4 text-center">
        <div className="mb-3 flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <Heart className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Unable to load favorites
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          {error}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => loadBooks(favorites)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
          <button
            type="button"
            onClick={handleBrowseCatalog}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
          >
            <Search className="h-3 w-3" /> Browse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isDrawer ? "w-full pb-6" : "mx-auto w-full max-w-[1280px] px-3 sm:px-5 lg:px-8 py-4 sm:py-6"}>
      {/* Standalone Page Header (hidden in drawer to avoid duplicate titles) */}
      {!isDrawer && (
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                <Heart className="h-3.5 w-3.5 fill-current" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">
                Your Reading List
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Favorites
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {totalSavedCount} {totalSavedCount === 1 ? "book" : "books"} saved in your personal collection
            </p>
          </div>

          <button
            onClick={handleBrowseCatalog}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]"
          >
            <Search className="h-3.5 w-3.5" /> Browse Catalog
          </button>
        </header>
      )}

      {/* Unified Sub-Header: Filter Chips + Quick Counter (Sticky at top) */}
      <div className={`z-10 flex items-center justify-between gap-2 ${
        isDrawer
          ? "sticky -top-2 bg-[#F7FAFC]/95 backdrop-blur-md -mx-3 px-3 py-2 border-b border-slate-200/60 mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
          : "mb-3 px-1"
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              activeFilter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            All ({totalSavedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("available")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              activeFilter === "available"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${activeFilter === "available" ? "bg-white" : "bg-emerald-500"} animate-pulse`} />
              <span>Available ({availableCount})</span>
            </span>
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

      {/* Loading Skeleton (Only shown when no cache exists) */}
      {loading && allBooks.length === 0 ? (
        <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          {[1, 2, 3].map((n) => (
            <div key={`fav-skel-${n}`} className="flex items-start gap-3 py-3 animate-pulse">
              <div className="h-[76px] w-[52px] shrink-0 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedBooks.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {totalSavedCount === 0 ? "No favorites yet" : "No available books matching filter"}
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
            {totalSavedCount === 0
              ? "Save books by tapping the heart icon on any book card while exploring the collection."
              : "All your saved books are currently borrowed. Check back later or switch filter to 'All'."}
          </p>
          <button
            type="button"
            onClick={handleBrowseCatalog}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            Explore Catalog <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Horizon Line List with Dividers */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="divide-y divide-slate-200/80">
            {displayedBooks.map((book) => {
              const isAvailable = book.real_time_status === "available";
              const coverUrl = getBackendAssetUrl(book.cover_image);

              return (
                <div
                  key={`fav-horizon-${book.id}`}
                  onClick={() => handleBookClick(book)}
                  className="group relative flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-blue-50/60"
                >
                  {/* Left: Real Book Cover or Grey Libralink Fallback */}
                  <div className="relative h-[76px] w-[52px] flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-2xs transition-transform duration-200 group-hover:scale-105 border border-slate-200/80">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        className="absolute inset-0 h-full w-full object-cover z-[1]"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : null}

                    {/* Fallback Icon with Grey L.png */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-slate-100 z-0 select-none"
                    >
                      <img
                        src="/L.png"
                        alt="Libralink"
                        className="h-7 w-7 object-contain grayscale opacity-35"
                      />
                      <span className="mt-1 text-center text-[6.5px] font-semibold text-slate-400 line-clamp-1">
                        {book.category || "Libralink"}
                      </span>
                    </div>

                    {/* 3D Spine Crease Effect */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent z-[2]" />
                  </div>

                  {/* Middle: Crisp Details */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
                    <div>
                      {/* Top Badges Row */}
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[8.5px] font-bold text-blue-700 border border-blue-200/60 truncate max-w-[130px]">
                          {book.category || "General"}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold shrink-0 ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-500 border border-slate-200/60"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {isAvailable ? "Available" : "Checked Out"}
                        </span>
                      </div>

                      {/* Title: 2-line clamp */}
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors">
                        {book.title}
                      </h3>

                      {/* Author: 1-line clamp */}
                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                        {book.author && book.author !== "Unknown Author"
                          ? book.author
                          : "Academic Research"}
                      </p>
                    </div>

                    {/* Bottom Metadata: Single-Line Campus + Live Copies */}
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1 min-w-0 max-w-[190px]">
                        <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="truncate font-medium text-slate-600">{book.library}</span>
                        {book.available_copies > 0 && (
                          <span className="shrink-0 text-slate-400">· {book.available_copies}c</span>
                        )}
                      </div>

                      <span className="text-blue-600 font-semibold group-hover:underline text-[9.5px] shrink-0">
                        View Details →
                      </span>
                    </div>
                  </div>

                  {/* Right: Quick Remove Heart */}
                  <div className="shrink-0 self-center pl-0.5">
                    <button
                      type="button"
                      onClick={(e) => removeFavorite(book.id, e)}
                      title="Remove from favorites"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all"
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
