import { useState, useEffect, useRef } from "react";
import { Book, Heart, Search, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../utils/api";

function StudentFavorite() {
  const navigate = useNavigate();
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
    <div className="animate-slide-up mx-auto w-full max-w-[1280px] px-0 sm:px-5 lg:px-8">
      <header className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">Your reading list</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Favorites</h1>
          <p className="mt-1 text-sm text-slate-500">{favoriteBooks.length} {favoriteBooks.length === 1 ? 'book' : 'books'} saved for later</p>
        </div>
        <button onClick={() => navigate('/studentpage/search')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-blue-600 shadow-sm transition active:scale-[0.98] hover:border-blue-200 hover:bg-blue-50">
          Browse <Search className="h-3.5 w-3.5" />
        </button>
      </header>
      
      {favoriteBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center sm:py-24">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50">
            <Heart className="h-10 w-10 text-rose-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-2">No favorites yet</h3>
          <p className="max-w-xs text-sm leading-6 text-slate-500">Save books you want to read later by tapping the heart icon in the collection.</p>
          <button onClick={() => navigate('/studentpage/search')} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98] hover:bg-blue-700">Discover books <ArrowUpRight className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {favoriteBooks.map((book) => (
            <article key={book.id} className="group relative flex min-w-0 items-center gap-2.5 py-2.5 transition-colors hover:bg-slate-50 sm:gap-3">
              <button
                onClick={() => removeFavorite(book.id)}
                className="order-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50"
                aria-label="Remove from favorites"
              >
                <Heart className="h-4 w-4 fill-current" />
              </button>
              <div className="relative flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-inner">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-white/15" />
                <Book className="h-6 w-6 text-white" />
                <span className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-md bg-slate-950/35 px-1 py-0.5 text-[7px] font-semibold text-white">{book.category || "General"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[13px] font-bold leading-4 text-slate-900" title={book.title}>{book.title}</h3>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{book.author}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const status = book.real_time_status || "available";
                    const statusStyles = {
                      available: "bg-emerald-50 text-emerald-700",
                      requested: "bg-amber-50 text-amber-700",
                      waiting_pickup: "bg-blue-50 text-blue-700",
                      borrowed: "bg-rose-50 text-rose-700",
                    };
                    const statusLabels = {
                      available: "Available",
                      requested: "Requested",
                      waiting_pickup: "Waiting",
                      borrowed: "Borrowed",
                    };
                    return <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${statusStyles[status] || statusStyles.available}`}>{statusLabels[status] || "Available"}</span>;
                  })()}
                  <span className="text-[9px] font-medium text-slate-500">{book.category || "General"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentFavorite;
