import { useState, useEffect, useRef } from "react";
import { FiBook, FiSearch, FiMapPin, FiStar, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Navigation from "./Navigation";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";

function Library() {
  const navigate = useNavigate();
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
    
    setIsAuthenticated(!!currentUser && !!schoolId);
    
    loadBooks();
    return () => window.clearTimeout(searchTimerRef.current);
  }, []);

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
      <div className="bg-white px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Public catalog</p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-.04em] text-[#0F172A]">Find your next book.</h1>
          <p className="mt-4 text-base leading-7 text-[#64748B] max-w-2xl">Search titles across participating libraries and see where a copy is available.</p>
        </div>
      </div>

      <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
          <div className="border-b border-[#E2E8F0] pb-5 sm:pb-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#64748B] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="min-h-12 w-full border-b border-[#CBD5E1] bg-transparent pl-11 pr-10 text-base text-[#0F172A] placeholder-[#64748B] outline-none transition focus:border-[#0077B6] sm:text-sm"
                />
                {searchQuery && <button onClick={() => { setSearchQuery(""); setSelectedFilter("All"); loadBooks(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700" aria-label="Clear search"><FiX /></button>}
              </div>
              
              <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1">
                {getFilterOptions().map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterClick(filter)}
                    className={`border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
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
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#0077B6] border-t-transparent"></div>
              <p className="mt-4 text-[#64748B]">Loading books...</p>
            </div>
          ) : error ? (
            <div className="border border-red-100 bg-white px-5 py-12 text-center">
              <FiBook className="mx-auto h-12 w-12 text-red-300" />
              <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">Catalog unavailable</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">{error}</p>
              <button type="button" onClick={loadBooks} className="mt-5 inline-flex min-h-11 items-center justify-center bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d]">Try again</button>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <FiBook className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#64748B]">No books found matching your search.</p>
            </div>
          ) : (
            <>
            <p className="mb-5 text-sm text-[#64748B]">{pagination.total.toLocaleString()} {pagination.total === 1 ? "book" : "books"} found</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group border border-[#E2E8F0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#BDE3F6] hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex h-11 w-9 items-center justify-center bg-[#0077B6] text-white shadow-sm transition-transform duration-200 group-hover:-rotate-2 group-hover:translate-y-[-2px]">
                      <FiBook className="text-lg text-white sm:text-xl" />
                    </div>
                    {book.status === "Available" && (
                      <span className={`px-2 py-1 text-xs font-semibold border ${getStatusColor(book.status)}`}>
                        {book.status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-[#0F172A] mb-1.5 sm:mb-2 line-clamp-2">{book.title}</h3>
                  <p className="text-[#64748B] mb-2 sm:mb-3 text-sm sm:text-base">by {book.author}</p>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[#64748B]">
                      <FiMapPin className="text-[#0077B6] w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{book.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[#64748B]">
                      <FiStar className="text-[#0077B6] w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{book.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[#64748B]">
                      <span className="text-[#94A3B8]">ISBN:</span>
                      <span className="font-mono text-xs">{book.isbn}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleBorrow(book)}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center bg-[#0077B6] px-3 text-sm font-semibold text-white transition hover:bg-[#00669d]"
                  >
                    {isAuthenticated ? 'View book details' : 'Login to borrow'}
                  </button>
                </div>
              ))}
            </div>
            {pagination.hasMore && selectedFilter === "All" && (
              <div className="mt-8 text-center">
                <button type="button" disabled={loadingMore} onClick={() => loadBooks({ query: searchQuery, offset: pagination.offset + books.length, append: true })} className="min-h-11 border border-[#0077B6] px-5 text-sm font-semibold text-[#0077B6] transition hover:bg-[#E0F2FE] disabled:cursor-wait disabled:opacity-60">
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
