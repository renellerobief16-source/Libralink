import { useState, useEffect, useRef } from "react";
import { FiBook, FiSearch, FiMapPin, FiStar, FiX } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "./Navigation";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";

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
      const response = await axios.get(`${API_BASE_URL}/books`, {
        params: { limit: 48, offset, q: query || undefined },
      });
      if (response.data?.success) {
        const mappedBooks = (response.data.data || []).map((book) => ({
          id: book.book_id,
          title: book.title || "Untitled",
          author: book.author || "Unknown Author",
          isbn: book.isbn || "Unknown",
          location: book.shelf_location || "Library",
          callNumber: book.call_number || "",
          status: book.real_time_status === "available" ? "Available" : null,
          category: book.categories?.category_name || "General",
          genre: book.genre || "General",
          school_name: book.schools?.school_name || "Your Library"
        }));
        const nextBooks = append ? [...books, ...mappedBooks] : mappedBooks;
        setBooks(nextBooks);
        setFilteredBooks(nextBooks);
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
      console.error("Error details:", err.response?.data);
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
    }, 280);
  };

  const applyFilters = (query, filter) => {
    let filtered = books;
    
    // Apply category/school filter
    if (filter !== "All") {
      if (filter === "Available") {
        filtered = filtered.filter(book => book.status === "Available");
      } else {
        // Check if filter is a school name, category, or genre
        const isSchool = books.some(book => book.school_name === filter);
        const isCategory = books.some(book => book.category === filter);
        const isGenre = books.some(book => book.genre === filter);
        
        if (isSchool) {
          filtered = filtered.filter(book => book.school_name === filter);
        } else if (isCategory) {
          filtered = filtered.filter(book => book.category === filter);
        } else if (isGenre) {
          filtered = filtered.filter(book => book.genre === filter);
        }
      }
    }
    
    // Apply search query
    if (query !== "") {
      const normalizedQuery = query.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(normalizedQuery) ||
          book.author.toLowerCase().includes(normalizedQuery) ||
          book.isbn.toLowerCase().includes(normalizedQuery) ||
          book.category.toLowerCase().includes(normalizedQuery) ||
          book.genre.toLowerCase().includes(normalizedQuery) ||
          book.school_name.toLowerCase().includes(normalizedQuery) ||
          book.location.toLowerCase().includes(normalizedQuery) ||
          book.callNumber.toLowerCase().includes(normalizedQuery)
      );
    }
    
    setFilteredBooks(filtered);
  };

  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const getFilterOptions = () => {
    const options = ["All", "Available"];
    const schools = [...new Set(books.map(book => book.school_name))];
    const categories = [...new Set(books.map(book => book.category))];
    const genres = [...new Set(books.map(book => book.genre))];
    return [...new Set([...options, ...schools, ...categories, ...genres])];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
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
      <div className="bg-white px-4 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pb-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#0077B6] sm:text-xs">Public catalog</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-[#0F172A] sm:mt-3 sm:text-3xl lg:text-5xl">Find your next book.</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748B] max-w-2xl sm:mt-4 sm:text-base sm:leading-7">Search titles across participating libraries and see where a copy is available.</p>
        </div>
      </div>

      <section className="py-8 sm:py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto mb-4 sm:mb-6 sm:mb-8">
          <div className="border-b border-[#E2E8F0] pb-4 sm:pb-5 sm:pb-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-4 h-4 sm:left-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="min-h-11 w-full border-b border-[#CBD5E1] bg-transparent pl-10 pr-9 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition focus:border-[#0077B6] sm:min-h-12 sm:pl-11 sm:pr-10 sm:text-base"
                />
                {searchQuery && <button onClick={() => { setSearchQuery(""); setSelectedFilter("All"); loadBooks(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 sm:right-3 sm:p-2" aria-label="Clear search"><FiX /></button>}
              </div>
              
              <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1">
                {getFilterOptions().map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterClick(filter)}
                    className={`border-b-2 px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                      selectedFilter === filter
                        ? "border-[#0077B6] text-[#0077B6]"
                        : "border-transparent text-[#64748B] hover:border-slate-300 hover:text-[#0077B6]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-10 sm:py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0077B6] border-t-transparent sm:h-12 sm:w-12"></div>
              <p className="mt-3 text-sm text-[#64748B] sm:mt-4">Loading books...</p>
            </div>
          ) : error ? (
            <div className="border border-red-100 bg-white px-4 py-10 text-center sm:px-5 sm:py-12">
              <FiBook className="mx-auto h-10 w-10 text-red-300 sm:h-12 sm:w-12" />
              <h2 className="mt-3 text-base font-semibold text-[#0F172A] sm:mt-4 sm:text-lg">Catalog unavailable</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">{error}</p>
              <button type="button" onClick={loadBooks} className="mt-4 inline-flex min-h-10 items-center justify-center bg-[#0077B6] px-4 text-xs font-semibold text-white transition hover:bg-[#00669d] sm:min-h-11 sm:text-sm">Try again</button>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <FiBook className="w-12 h-12 text-[#64748B] mx-auto mb-3 sm:w-16 sm:h-16 sm:mb-4" />
              <p className="text-sm text-[#64748B]">No books found matching your search.</p>
            </div>
          ) : (
            <>
            <p className="mb-4 text-xs text-[#64748B] sm:mb-5 sm:text-sm">{pagination.total.toLocaleString()} {pagination.total === 1 ? "book" : "books"} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 sm:gap-5">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group border border-[#E2E8F0] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#BDE3F6] hover:shadow-md sm:p-4 lg:p-5"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4">
                    <div className="flex h-10 w-8 items-center justify-center bg-[#0077B6] text-white shadow-sm transition-transform duration-200 group-hover:-rotate-2 group-hover:translate-y-[-2px] sm:h-11 sm:w-9">
                      <FiBook className="text-base text-white sm:text-lg lg:text-xl" />
                    </div>
                    {book.status === "Available" && (
                      <span className={`px-2 py-0.5 text-[10px] font-semibold border sm:px-2 sm:py-1 sm:text-xs ${getStatusColor(book.status)}`}>
                        {book.status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-1 sm:text-base lg:text-xl sm:mb-1.5 lg:mb-2 line-clamp-2">by {book.author}</h3>
                  <p className="text-[#64748B] mb-2 text-xs sm:text-sm sm:mb-3 sm:text-base">{book.title}</p>
                  <div className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-[10px] sm:text-xs lg:text-sm">
                    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 text-[#64748B]">
                      <FiMapPin className="text-[#0077B6] w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                      <span>{book.location}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 text-[#64748B]">
                      <FiStar className="text-[#0077B6] w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                      <span>{book.category}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 text-[#64748B]">
                      <span className="text-[#94A3B8]">ISBN:</span>
                      <span className="font-mono text-[9px] sm:text-xs">{book.isbn}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleBorrow(book)}
                    className="mt-3 inline-flex min-h-9 w-full items-center justify-center bg-[#0077B6] px-3 text-xs font-semibold text-white transition hover:bg-[#00669d] sm:mt-4 sm:min-h-10 sm:text-sm"
                  >
                    {isAuthenticated ? 'View details' : 'Login to borrow'}
                  </button>
                </div>
              ))}
            </div>
            {pagination.hasMore && selectedFilter === "All" && (
              <div className="mt-6 text-center sm:mt-8">
                <button type="button" disabled={loadingMore} onClick={() => loadBooks({ query: searchQuery, offset: pagination.offset + books.length, append: true })} className="min-h-10 border border-[#0077B6] px-4 text-xs font-semibold text-[#0077B6] transition hover:bg-[#E0F2FE] disabled:cursor-wait disabled:opacity-60 sm:min-h-11 sm:px-5 sm:text-sm">
                  {loadingMore ? 'Loading more books…' : 'Load more books'}
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
