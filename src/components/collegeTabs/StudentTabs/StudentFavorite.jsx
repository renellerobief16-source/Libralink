import { useState, useEffect, useRef } from "react";
import { Book, Heart } from "lucide-react";
import api from "../../../utils/api";
import { CardSkeleton } from "../../ui/Skeleton";

function StudentFavorite() {
  const [allBooks, setAllBooks] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Prevent multiple loads
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadBooks = async () => {
      try {
        const schoolId = localStorage.getItem('schoolId');
        if (!schoolId) {
          console.error('No schoolId found in localStorage');
          setAllBooks([]);
          setLoading(false);
          return;
        }
        
        const response = await api.get(`/books/school?school_id=${schoolId}`);
        if (response.data) {
          const mappedBooks = (response.data || []).map((book) => ({
            id: book.book_id,
            title: book.title || 'Untitled',
            author: book.author || 'Unknown Author',
            category: book.category || 'General',
            isbn: book.isbn || 'Unknown',
            publication_year: book.publication_year || 'Unknown',
            real_time_status: book.real_time_status || 'available',
            status_details: book.status_details || null,
            available_copies: book.available_copies || 0,
            total_copies: book.total_copies || 0,
            school_id: book.school_id,
            library: book.schools?.school_name || 'Your Library',
          }));
          setAllBooks(mappedBooks);
        } else {
          setAllBooks([]);
        }
      } catch (error) {
        console.error('Error loading books:', error);
        setError('Failed to load books. Please try again later.');
        setAllBooks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, []);

  // Sync favorites from localStorage when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('favorites');
      setFavorites(saved ? JSON.parse(saved) : []);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('favoritesUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesUpdated', handleStorageChange);
    };
  }, []);

  // Recalculate favoriteBooks when favorites or allBooks change
  const favoriteBooks = allBooks.filter(book => favorites.includes(book.id));

  const removeFavorite = (bookId) => {
    const newFavorites = favorites.filter(id => id !== bookId);
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  if (loading) {
    return (
      <div className="animate-slide-up w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">My Favorites</h1>
          <p className="text-sm sm:text-base text-[#64748B] mt-1">Your saved books</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-slide-up w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">My Favorites</h1>
          <p className="text-sm sm:text-base text-[#64748B] mt-1">Your saved books</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Error loading books</h3>
          <p className="text-sm text-[#64748B] text-center max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">My Favorites</h1>
        <p className="text-sm sm:text-base text-[#64748B] mt-1">{favoriteBooks.length} {favoriteBooks.length === 1 ? 'book' : 'books'} saved</p>
      </div>
      
      {favoriteBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-24">
          <div className="w-20 h-20 bg-[#F7FAFC] rounded-full flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-[#64748B]" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-2">No favorites yet</h3>
          <p className="text-sm text-[#64748B] text-center max-w-xs">Start adding books to your favorites by clicking the heart icon on any book</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2">
          {favoriteBooks.map((book) => (
            <div key={book.id} className="bg-white rounded-md p-1.5 border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#0077B6] transition-all duration-300 relative group">
              <button
                onClick={() => removeFavorite(book.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 hover:bg-red-50 transition-colors z-10 opacity-0 group-hover:opacity-100 shadow-sm"
                aria-label="Remove from favorites"
              >
                <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
              </button>
              <div className="aspect-[9/16] w-full bg-gradient-to-br from-[#0077B6] to-[#005f8f] rounded-md flex items-center justify-center mb-1.5">
                <Book className="w-6 h-6 text-white/90" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-semibold text-[#0F172A] text-xs line-clamp-2 leading-tight">
                  {book.title}
                </h3>
                <p className="text-[#64748B] text-xs line-clamp-1">{book.author}</p>
                <span className="inline-block text-xs px-1.5 py-0.5 bg-[#F7FAFC] text-[#64748B] rounded-sm font-medium">
                  {book.category || "General"}
                </span>
                <div className="flex items-center justify-between pt-0.5">
                  {(() => {
                    const status = book.real_time_status || "available";
                    const statusColors = {
                      available: "text-green-600",
                      requested: "text-yellow-600",
                      waiting_pickup: "text-blue-600",
                      borrowed: "text-red-600",
                    };
                    const statusLabels = {
                      available: "Available",
                      requested: "Requested",
                      waiting_pickup: "Waiting",
                      borrowed: "Borrowed",
                    };
                    return (
                      <span className={`text-xs font-semibold ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentFavorite;
