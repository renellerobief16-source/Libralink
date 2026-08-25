import { useState, useEffect } from "react";
import { FiBook, FiSearch, FiMapPin, FiStar } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    const schoolId = localStorage.getItem('schoolId');
    
    setIsAuthenticated(!!currentUser && !!schoolId);
    
    // Load all books from the books table (public endpoint)
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      console.log('Loading books from:', `${API_BASE_URL}/books`);
      // Use axios without authentication for public book access
      const response = await axios.get(`${API_BASE_URL}/books`);
      console.log('Response:', response.data);
      if (response.data && response.data.success) {
        const mappedBooks = (response.data.data || []).map((book) => ({
          id: book.book_id,
          title: book.title || "Untitled",
          author: book.author || "Unknown Author",
          isbn: book.isbn || "Unknown",
          location: book.shelf_location || "Library",
          status: book.real_time_status === "available" ? "Available" : null,
          category: book.categories?.category_name || "General",
          genre: book.genre || "General",
          school_name: book.schools?.school_name || "Your Library"
        }));
        setBooks(mappedBooks);
        setFilteredBooks(mappedBooks);
      } else {
        console.error('Invalid response format:', response.data);
        setError("Failed to load books. Invalid response format.");
      }
    } catch (err) {
      console.error("Error loading books:", err);
      console.error("Error details:", err.response?.data);
      setError(`Failed to load books: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
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
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.isbn.toLowerCase().includes(query)
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
    return [...options, ...schools, ...categories, ...genres];
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
    // Navigate to book detail or borrow page
    console.log('Borrow book:', book);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4 sm:mb-6">Library Catalog</h1>
          <p className="text-base sm:text-lg lg:text-xl text-[#64748B] max-w-3xl mx-auto">
            Browse our extensive collection of books across all categories
          </p>
        </div>
      </div>

      <section className="py-10 sm:py-12 px-4 sm:px-6 bg-[#F7FAFC]">
        <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E2E8F0] shadow-lg">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#64748B] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-[#F7FAFC] to-white border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition-all text-sm sm:text-base"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {getFilterOptions().map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterClick(filter)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${
                      selectedFilter === filter
                        ? "bg-gradient-to-r from-[#0077B6] to-[#0096C7] text-white shadow-lg shadow-[#0077B6]/30"
                        : "bg-gradient-to-r from-gray-50 to-white text-[#64748B] border border-[#E2E8F0] hover:border-[#0077B6] hover:text-[#0077B6] hover:shadow-md"
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
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <FiBook className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#64748B]">No books found matching your search.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-xl p-4 sm:p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0077B6]/10 rounded-lg flex items-center justify-center">
                      <FiBook className="text-[#0077B6] text-lg sm:text-xl" />
                    </div>
                    {book.status === "Available" && (
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(book.status)}`}>
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
                    className="w-full mt-3 sm:mt-4 bg-[#0077B6] hover:bg-[#005f8f] text-white py-2 sm:py-2.5 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                  >
                    {isAuthenticated ? 'Borrow Book' : 'Login to Borrow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Library;
