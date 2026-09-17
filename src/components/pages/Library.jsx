import { useState, useEffect, useRef } from "react";
import { FiBook, FiSearch, FiMapPin, FiStar, FiX, FiCompass } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "./Navigation";
import axios from "axios";
import { API_BASE_URL, getBackendAssetUrl } from "../../utils/api";

function Library() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [pagination, setPagination] = useState({ total: 0, offset: 0, hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    const schoolId = localStorage.getItem('schoolId');
    const initialQuery = (searchParams.get('search') || '').trim();

    setIsAuthenticated(!!currentUser && !!schoolId);
    setSearchQuery(initialQuery);
    loadBooks({ query: initialQuery, offset: 0 });
    return () => window.clearTimeout(searchTimerRef.current);
  }, [searchParams]);

  const loadBooks = async ({ query = "", offset = 0, append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      // Clean query of characters that break PostgREST or query parsers
      const cleanQuery = query ? query.replace(/[(),"%_&/]/g, ' ').replace(/\s+/g, ' ').trim() : '';

      let response = await axios.get(`${API_BASE_URL}/books`, {
        params: { limit: 48, offset, q: cleanQuery || undefined },
      });

      // If exact multi-word query returned 0 results, retry with primary keywords
      if (response.data?.success && (!response.data.data || response.data.data.length === 0) && cleanQuery) {
        const tokens = cleanQuery.split(/\s+/).filter(t => t.length >= 4);
        if (tokens.length > 1) {
          const primaryTokens = tokens.slice(0, 2).join(' ');
          const retryRes = await axios.get(`${API_BASE_URL}/books`, {
            params: { limit: 48, offset: 0, q: primaryTokens },
          });
          if (retryRes.data?.success && retryRes.data.data?.length > 0) {
            response = retryRes;
          }
        }
      }

      if (response.data?.success) {
        const mappedBooks = (response.data.data || []).map((book) => ({
          id: book.book_id,
          title: book.title || "Untitled",
          author: book.author || "Unknown Author",
          isbn: book.isbn || "Unknown",
          location: book.shelf_location || "Main Stacks",
          callNumber: book.call_number || "",
          status: book.real_time_status === "available" ? "Available" : (book.status === "available" ? "Available" : "Checked Out"),
          category: book.categories?.category_name || "General",
          genre: book.genre || "General",
          school_name: book.schools?.school_name || "Participating Library",
          school_code: book.schools?.school_code || "",
          cover_image: book.cover_image || null,
        }));
        const nextBooks = append ? [...books, ...mappedBooks] : mappedBooks;
        setBooks(nextBooks);
        applyFilters(query, selectedFilter, nextBooks);
        setPagination({
          total: response.data.pagination?.total ?? nextBooks.length,
          offset,
          hasMore: Boolean(response.data.pagination?.has_more),
        });
      } else {
        setError("Unable to load the catalog.");
      }
    } catch (err) {
      console.error("Error loading books:", err);
      setError("We couldn’t reach the catalog right now. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setSelectedFilter("All");
      loadBooks({ query, offset: 0 });
    }, 300);
  };

  const applyFilters = (query, filter, bookList = books) => {
    let filtered = bookList;

    // Apply category/school filter
    if (filter !== "All") {
      if (filter === "Available") {
        filtered = filtered.filter(book => book.status === "Available");
      } else {
        filtered = filtered.filter(book => 
          book.school_name === filter || 
          book.category === filter || 
          book.genre === filter
        );
      }
    }

    // Apply search query with resilient multi-token matching
    if (query && query.trim() !== "") {
      const sanitized = query.replace(/[(),"%_&/]/g, ' ').toLowerCase();
      const tokens = sanitized.split(/\s+/).filter(t => t.length >= 2);
      if (tokens.length > 0) {
        filtered = filtered.filter((book) => {
          const haystack = `${book.title} ${book.author} ${book.isbn} ${book.category} ${book.genre} ${book.school_name} ${book.location} ${book.callNumber}`.toLowerCase();
          return tokens.some(tok => haystack.includes(tok));
        });
      }
    }

    setFilteredBooks(filtered);
  };

  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const getFilterOptions = () => {
    const options = ["All", "Available"];
    const schools = [...new Set(books.map(book => book.school_name).filter(Boolean))].slice(0, 5);
    const categories = [...new Set(books.map(book => book.category).filter(Boolean))].slice(0, 5);
    return [...new Set([...options, ...schools, ...categories])];
  };

  const handleBorrow = (book) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/book/${book.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />

      {/* Catalog Header Banner */}
      <div className="border-b border-slate-200 bg-white px-4 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-[#0077B6] border border-sky-200 mb-3">
            <FiCompass className="w-3.5 h-3.5" />
            <span>INTER-LIBRARY UNION CATALOG</span>
            <span>•</span>
            <span>PAMPANGA CONSORTIUM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight text-slate-900">
            Find and request books across partner campuses.
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Search 11,000+ curriculum resources, check live physical shelf locations, and borrow directly from your home library or inter-school network.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <section className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto mb-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4">
              {/* Search input box */}
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title, author, subject, or ISBN (e.g. Accounting, Python, Nursing)..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-12 pr-10 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0077B6] focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedFilter("All");
                      loadBooks({ query: "", offset: 0 });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 transition"
                    aria-label="Clear search"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400 mr-1">Filter by:</span>
                {getFilterOptions().map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterClick(filter)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      selectedFilter === filter
                        ? "bg-[#0077B6] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0077B6] border-t-transparent"></div>
              <p className="mt-4 text-sm font-semibold text-slate-600">Connecting to union catalog…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center sm:p-12 shadow-sm">
              <FiBook className="mx-auto h-12 w-12 text-red-400" />
              <h2 className="mt-3 text-lg font-bold text-slate-900">Catalog connection issue</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{error}</p>
              <button
                type="button"
                onClick={() => loadBooks()}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#0077B6] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#00669d]"
              >
                Retry Search
              </button>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center sm:p-14 shadow-sm">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-50 text-[#0077B6] flex items-center justify-center mb-4">
                <FiBook className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">No books found matching your criteria</h3>
              <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                {searchQuery ? `We couldn't find exact matches for "${searchQuery}".` : "No books match the selected filter."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedFilter("All");
                    loadBooks({ query: "", offset: 0 });
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Clear search & filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("Accounting");
                    loadBooks({ query: "Accounting", offset: 0 });
                  }}
                  className="rounded-xl bg-sky-50 text-[#0077B6] border border-sky-200 px-4 py-2 text-xs font-bold hover:bg-sky-100 transition"
                >
                  Browse Accounting
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("History");
                    loadBooks({ query: "History", offset: 0 });
                  }}
                  className="rounded-xl bg-sky-50 text-[#0077B6] border border-sky-200 px-4 py-2 text-xs font-bold hover:bg-sky-100 transition"
                >
                  Browse History
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header stats bar */}
              <div className="mb-4 flex items-center justify-between text-xs sm:text-sm text-slate-500 font-medium">
                <span>
                  Showing <strong className="text-slate-900 font-bold">{filteredBooks.length}</strong> of {pagination.total.toLocaleString()} total copies
                  {searchQuery && <span className="ml-1 text-slate-400">matching "{searchQuery}"</span>}
                </span>
                {selectedFilter !== "All" && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 font-semibold">
                    Filter: {selectedFilter}
                  </span>
                )}
              </div>

              {/* Books Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredBooks.map((book) => {
                  const coverUrl = book.cover_image ? getBackendAssetUrl(book.cover_image) : null;
                  const isAvailable = book.status === "Available";

                  return (
                    <div
                      key={book.id}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
                    >
                      <div>
                        {/* Book Cover + Availability Header */}
                        <div className="relative mb-3 flex items-start justify-between gap-2">
                          <div className="relative w-16 h-22 rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 shadow-xs flex-shrink-0">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={book.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-1.5 text-center bg-gradient-to-tr from-sky-600 to-indigo-700 text-white">
                                <FiBook className="w-5 h-5 mb-1 opacity-80" />
                                <span className="text-[8px] font-black line-clamp-2 leading-tight uppercase opacity-90">
                                  {book.category}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                isAvailable
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {book.status}
                            </span>

                            {book.school_name && (
                              <span className="text-right text-[10px] font-bold text-[#0077B6] line-clamp-1 max-w-[140px]" title={book.school_name}>
                                {book.school_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Author */}
                        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0077B6] transition-colors" title={book.title}>
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          by <span className="font-semibold text-slate-700">{book.author}</span>
                        </p>

                        {/* Book Metadata Pills */}
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                          {book.location && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <FiMapPin className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                              <span className="line-clamp-1">{book.location}</span>
                            </div>
                          )}
                          {book.category && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <FiStar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="line-clamp-1">{book.category}</span>
                            </div>
                          )}
                          {book.isbn && book.isbn !== "Unknown" && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
                              <span>ISBN:</span>
                              <span className="text-slate-600">{book.isbn}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Request / Borrow Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleBorrow(book)}
                          className="w-full rounded-xl bg-[#0077B6] py-2 px-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-[#00669d] hover:shadow-md flex items-center justify-center gap-1.5"
                        >
                          <span>{isAuthenticated ? 'View details & request' : 'Login to borrow'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {pagination.hasMore && selectedFilter === "All" && (
                <div className="mt-8 text-center sm:mt-10">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() =>
                      loadBooks({
                        query: searchQuery,
                        offset: pagination.offset + books.length,
                        append: true,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-[#0077B6] shadow-2xs transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading more books…' : 'Load more books from catalog'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Library;
