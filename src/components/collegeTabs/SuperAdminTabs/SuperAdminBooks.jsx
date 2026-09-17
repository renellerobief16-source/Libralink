import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiBook, FiFilter, FiSearch, FiGlobe, FiLayers, 
  FiGrid, FiList, FiRefreshCw, FiX, FiCheckCircle, FiClock,
  FiShare2, FiMapPin, FiExternalLink, FiInfo, FiTag, FiAlertCircle,
  FiTruck, FiArrowRight, FiSend, FiChevronLeft, FiChevronRight, FiSliders
} from 'react-icons/fi';
import api, { getBackendAssetUrl } from '../../../utils/api';
import { LoadingOverlay } from '../../common';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import EmptyState from '../../ui/EmptyState';
import useAlert from '../../../hooks/useAlert';

// Auto-resolve book cover image: local database URL -> OpenLibrary ISBN -> Procedural Jacket
function BookCoverBadge({ book, className = "w-14 h-20", onClick }) {
  const [imgError, setImgError] = useState(false);

  // Compute cover image URL
  const coverUrl = useMemo(() => {
    if (book?.cover_image) {
      return getBackendAssetUrl(book.cover_image);
    }
    if (book?.isbn) {
      const cleanIsbn = String(book.isbn).replace(/[^0-9X]/gi, '').trim();
      if (cleanIsbn.length >= 9) {
        return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false`;
      }
    }
    return null;
  }, [book?.cover_image, book?.isbn]);

  if (coverUrl && !imgError) {
    return (
      <div 
        onClick={onClick}
        className={`${className} rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs relative cursor-pointer group-hover:scale-105 transition-transform`}
      >
        <img 
          src={coverUrl} 
          alt="" 
          className="w-full h-full object-cover" 
          onError={() => setImgError(true)} 
        />
      </div>
    );
  }

  // Elegant procedural book cover jacket with title & author typography
  const title = book?.title || 'Book';
  const author = book?.author || 'Unknown Author';
  const initials = title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'BK';

  return (
    <div 
      onClick={onClick}
      className={`${className} rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 border border-indigo-900/60 p-1.5 flex flex-col justify-between flex-shrink-0 overflow-hidden shadow-xs relative select-none text-white cursor-pointer group-hover:scale-105 transition-transform`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-mono font-bold tracking-widest text-indigo-300 opacity-90">LIB</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-80" />
      </div>
      <div className="my-auto text-center px-0.5">
        <span className="text-xs font-black tracking-wider text-white block truncate leading-tight">{initials}</span>
        <span className="text-[8px] text-slate-300 block line-clamp-2 mt-0.5 leading-tight font-medium opacity-90">{title}</span>
      </div>
      <div className="pt-0.5 border-t border-indigo-700/50 flex items-center justify-between text-[7px] text-indigo-200">
        <span className="truncate max-w-[50px]">{author}</span>
        <FiBook className="w-2 h-2 text-indigo-300 shrink-0" />
      </div>
    </div>
  );
}

function SuperAdminBooks() {
  const { showSuccess, showError } = useAlert();

  // Data states
  const [books, setBooks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    borrowedCopies: 0,
    schoolCounts: {}
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 24,
    totalPages: 1
  });

  // Filter & Navigation controls
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'available' | 'borrowed' | 'low_stock'
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('title_asc');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State for Multi-Campus Breakdown & Circulation Telemetry
  const [selectedBook, setSelectedBook] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [campusMatches, setCampusMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [bookCirculationDetails, setBookCirculationDetails] = useState(null);
  const [loadingCirculationDetails, setLoadingCirculationDetails] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('campuses'); // 'campuses' | 'borrowers' | 'history'

  // Inter-Campus Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceSchool, setTransferSourceSchool] = useState('');
  const [transferDestSchool, setTransferDestSchool] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferReason, setTransferReason] = useState('Consortium Stock Rebalance');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Search debounce timer
  const searchTimerRef = useRef(null);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(val.trim());
      setPage(1);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  // Initial load for schools
  useEffect(() => {
    fetchSchools();
  }, []);

  // Main catalog fetch effect
  useEffect(() => {
    fetchCatalog();
  }, [page, limit, filterSchool, filterCategory, filterStatus, searchQuery, sortOption]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      const list = response.data || (Array.isArray(response) ? response : []);
      setSchools(list);
    } catch (err) {
      console.error('Error loading schools:', err);
    }
  };

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        school_id: filterSchool,
        category_id: filterCategory,
        status: filterStatus,
        q: searchQuery,
        sort: sortOption
      };

      const res = await api.get('/books/consortium-catalog', { params });

      if (res && res.success) {
        setBooks(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.stats) {
          setStats(res.stats);
          if (res.stats.categories && res.stats.categories.length > 0) {
            setCategories(res.stats.categories);
          }
        }
      } else {
        // Fallback if legacy endpoint returned
        const list = res.data || (Array.isArray(res) ? res : []);
        setBooks(list);
      }
    } catch (error) {
      console.error('Error fetching consortium catalog:', error);
      showError('Unable to load consortium books catalog.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchSchools(), fetchCatalog()]);
  };

  // Fetch real-time cross-campus holdings for the inspected book title/ISBN
  const fetchCampusMatches = async (book) => {
    if (!book) return;
    try {
      setLoadingMatches(true);
      const res = await api.get('/books/consortium-catalog', {
        params: {
          q: book.title?.trim() || '',
          limit: 100,
          page: 1
        }
      });
      if (res && res.success && Array.isArray(res.data)) {
        const targetTitle = (book.title || '').trim().toLowerCase();
        const targetIsbn = (book.isbn || '').trim().toLowerCase();
        const matches = res.data.filter(b => 
          (targetIsbn && b.isbn?.trim().toLowerCase() === targetIsbn) ||
          (targetTitle && b.title?.trim().toLowerCase() === targetTitle)
        );
        setCampusMatches(matches);
      }
    } catch (err) {
      console.error('Error loading cross-campus stock:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Multi-Campus Availability Breakdown for Selected Book
  const campusAvailability = useMemo(() => {
    if (!selectedBook) return [];
    const targetIsbn = selectedBook.isbn?.trim().toLowerCase();
    const targetTitle = selectedBook.title?.trim().toLowerCase();
    const candidateList = campusMatches.length > 0 ? campusMatches : books;

    return schools.map(school => {
      const match = candidateList.find(b => 
        String(b.school_id) === String(school.school_id) && 
        ((targetIsbn && b.isbn?.trim().toLowerCase() === targetIsbn) || 
         (targetTitle && b.title?.trim().toLowerCase() === targetTitle))
      );

      const isCurrentHome = String(selectedBook.school_id) === String(school.school_id);
      const hasBook = !!match || isCurrentHome;
      const effectiveRecord = match || (isCurrentHome ? selectedBook : null);
      const avail = effectiveRecord ? (effectiveRecord.available_copies ?? effectiveRecord.available_quantity ?? 0) : 0;
      const total = effectiveRecord ? (effectiveRecord.total_copies ?? effectiveRecord.quantity ?? 1) : 0;
      const copyCount = effectiveRecord?.copy_count ?? (effectiveRecord ? 1 : 0);
      const bookId = effectiveRecord?.book_id || (isCurrentHome ? selectedBook.book_id : null);

      return {
        school,
        hasBook,
        bookId,
        availableCopies: avail,
        totalCopies: total,
        copyCount,
        isCurrentHome,
        crossBorrowEligible: true,
      };
    });
  }, [selectedBook, campusMatches, books, schools]);

  const fetchBookCirculationDetails = async (book) => {
    if (!book?.book_id) return;
    try {
      setLoadingCirculationDetails(true);
      const res = await api.get(`/books/${book.book_id}/details`);
      if (res && res.success && res.data) {
        setBookCirculationDetails(res.data);
      }
    } catch (err) {
      console.warn('Circulation telemetry fetch warning:', err);
    } finally {
      setLoadingCirculationDetails(false);
    }
  };

  const handleOpenBookModal = (book) => {
    setSelectedBook(book);
    setCampusMatches([]);
    setBookCirculationDetails(null);
    setModalActiveTab('campuses');
    fetchCampusMatches(book);
    fetchBookCirculationDetails(book);
    setShowDetailModal(true);
  };

  const handleOpenTransfer = (book, fromSchoolId = null) => {
    setSelectedBook(book);
    setCampusMatches([]);
    fetchCampusMatches(book);
    const targetIsbn = book.isbn?.trim().toLowerCase();
    const targetTitle = book.title?.trim().toLowerCase();

    // Campuses that have stock
    const campusesWithStock = schools.filter(school => {
      const match = books.find(b => 
        String(b.school_id) === String(school.school_id) && 
        ((targetIsbn && b.isbn?.trim().toLowerCase() === targetIsbn) || 
         (targetTitle && b.title?.trim().toLowerCase() === targetTitle))
      );
      const isCurrentHome = String(book.school_id) === String(school.school_id);
      const avail = match ? (match.available_copies ?? match.available_quantity ?? 0) : (isCurrentHome ? (book.available_copies ?? book.available_quantity ?? 0) : 0);
      return avail > 0;
    });

    const defaultSource = fromSchoolId 
      ? String(fromSchoolId) 
      : (campusesWithStock[0] ? String(campusesWithStock[0].school_id) : String(book.school_id));

    const defaultTarget = schools.find(s => String(s.school_id) !== defaultSource)?.school_id || '';

    setTransferSourceSchool(defaultSource);
    setTransferDestSchool(defaultTarget ? String(defaultTarget) : '');
    setTransferQuantity(1);
    setTransferReason('Consortium Stock Rebalance');
    setTransferNotes('Rebalancing physical copies to support inter-library student access.');
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = async () => {
    if (!selectedBook) return;
    if (!transferSourceSchool || !transferDestSchool) {
      showError('Please select both a source campus and a destination campus.');
      return;
    }
    if (String(transferSourceSchool) === String(transferDestSchool)) {
      showError('Source campus and destination campus cannot be the same.');
      return;
    }

    const targetIsbn = selectedBook.isbn?.trim().toLowerCase();
    const targetTitle = selectedBook.title?.trim().toLowerCase();
    const srcMatch = books.find(b =>
      String(b.school_id) === String(transferSourceSchool) &&
      ((targetIsbn && b.isbn?.trim().toLowerCase() === targetIsbn) ||
       (targetTitle && b.title?.trim().toLowerCase() === targetTitle))
    );

    const sourceBookId = srcMatch?.book_id || (String(selectedBook.school_id) === String(transferSourceSchool) ? selectedBook.book_id : null);

    if (!sourceBookId) {
      showError('Could not locate source book inventory record for this campus.');
      return;
    }

    try {
      setSubmittingTransfer(true);
      const res = await api.post('/books/consortium-transfer', {
        source_book_id: sourceBookId,
        from_school_id: transferSourceSchool,
        to_school_id: transferDestSchool,
        quantity: transferQuantity,
        notes: `${transferReason}: ${transferNotes}`.trim()
      });

      if (res && res.success) {
        showSuccess(res.message || `Successfully transferred ${transferQuantity} copy/copies!`);
        setShowTransferModal(false);
        await fetchCatalog();
      } else {
        showError(res?.message || 'Transfer failed. Please check stock availability.');
      }
    } catch (err) {
      console.error('Error executing transfer:', err);
      showError(err?.data?.message || err?.message || 'Failed to dispatch inter-campus transfer.');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Pagination page buttons generator
  const getPaginationPages = () => {
    const totalPages = pagination.totalPages || 1;
    const current = pagination.page || 1;
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (current < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const totalTitlesCount = stats.totalTitles || pagination.total || 0;
  const fromItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const toItem = Math.min(pagination.page * pagination.limit, pagination.total || 0);

  return (
    <div className="space-y-6 animate-slide-up pb-16">
      <LoadingOverlay show={loading && books.length === 0} text="Loading consortium catalog index..." />

      {/* ─────────────────────────────────────────────────────────────
          1. CONSORTIUM BOOKS MASTER HERO (Dark Navy Gradient)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30 mb-2">
              <FiLayers className="w-3.5 h-3.5 text-blue-400" />
              Consortium Master Union Catalog
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Consortium Library Catalog
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Consolidated index of physical books, monographs, and shared inter-library resources across all {schools.length} member campuses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              title="Refresh Books Index"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>Refresh Index</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY KPI CHIPS (Clean White Surfaces)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog Titles</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {totalTitlesCount.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Consortium Union</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
            <FiBook className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On-Shelf Copies</span>
            <div className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
              {(stats.availableCopies || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Ready to Borrow</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
            <FiCheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Circulation</span>
            <div className="text-2xl font-black text-blue-600 tracking-tight mt-0.5">
              {(stats.borrowedCopies || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-blue-700 font-medium">Active Patron Loans</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
            <FiClock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus Nodes</span>
            <div className="text-2xl font-black text-purple-600 tracking-tight mt-0.5">
              {schools.length}
            </div>
            <span className="text-[11px] text-purple-700 font-medium">Universities Synced</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs">
            <FiGlobe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CAMPUS QUICK-FILTER HORIZONTAL STRIP
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex-shrink-0 flex items-center gap-1">
            <FiMapPin className="w-3.5 h-3.5 text-slate-400" />
            Campuses:
          </span>

          <button
            onClick={() => { setFilterSchool('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterSchool === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>All Campuses</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterSchool === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {totalTitlesCount.toLocaleString()}
            </span>
          </button>

          {schools.map(school => {
            const isSelected = String(filterSchool) === String(school.school_id);
            const count = stats.schoolCounts?.[school.school_id] ?? 0;

            return (
              <button
                key={school.school_id}
                onClick={() => { setFilterSchool(school.school_id); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={school.school_name}
              >
                <span>{school.school_code || school.school_name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SEARCH, CATEGORY, STATUS & VIEW CONTROLS (Clean White Surface)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search all 11,520 books by title, author, ISBN, or call number..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdowns and Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>

          {/* Availability Pills */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'available', label: 'Available' },
              { id: 'borrowed', label: 'Borrowed' },
              { id: 'low_stock', label: 'Low Stock' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => { setFilterStatus(st.id); setPage(1); }}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="title_asc">Title (A → Z)</option>
            <option value="title_desc">Title (Z → A)</option>
            <option value="copies_desc">Most Copies First</option>
            <option value="copies_asc">Least Copies First</option>
            <option value="newest">Newest Additions</option>
          </select>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table List View"
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BOOKS DISPLAY (Clean White Cards or Table)
      ───────────────────────────────────────────────────────────── */}
      {books.length === 0 && !loading ? (
        <Card padding="lg" className="text-center py-16">
          <EmptyState
            icon={<FiBook className="w-14 h-14 text-slate-300 mx-auto" />}
            title="No matching books found"
            description="Try clearing your search query or choosing All Campuses / All Categories."
            action={{
              label: 'Reset Filters',
              onClick: () => {
                setSearchInput('');
                setSearchQuery('');
                setFilterSchool('all');
                setFilterCategory('all');
                setFilterStatus('all');
                setPage(1);
              }
            }}
          />
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => {
            const coverUrl = book.cover_image ? getBackendAssetUrl(book.cover_image) : null;
            const avail = book.available_copies ?? book.available_quantity ?? (book.status === 'Available' ? 1 : 0);
            const total = book.total_copies ?? book.quantity ?? 1;
            const isAvail = avail > 0;
            const schoolCode = book.schools?.school_code || schools.find(s => String(s.school_id) === String(book.school_id))?.school_code || 'ALL';
            const categoryName = book.categories?.category_name || 'General';

            return (
              <div
                key={book.book_id}
                className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <BookCoverBadge 
                      book={book} 
                      className="w-14 h-20" 
                      onClick={() => handleOpenBookModal(book)} 
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {schoolCode}
                        </span>
                        {book.copy_count > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title={`${book.copy_count} physical copies registered at ${schoolCode}`}>
                            {book.copy_count} copies
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          ID: #{book.book_id}
                        </span>
                      </div>
                      <h3 
                        onClick={() => handleOpenBookModal(book)}
                        className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer"
                        title={book.title}
                      >
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {book.author || 'Unknown Author'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {categoryName}
                    </span>
                    {book.isbn && (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-50 text-slate-500 border border-slate-200 truncate">
                        {book.isbn}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    isAvail 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {isAvail ? `${avail} / ${total} pcs in stock` : '0 pcs - Loaned Out'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenBookModal(book)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      title="View Multi-Campus Stock Breakdown"
                    >
                      <FiShare2 className="w-3.5 h-3.5" />
                      <span>Stock</span>
                    </button>

                    <button
                      onClick={() => handleOpenTransfer(book)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Transfer copies to another campus"
                    >
                      <FiTruck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Book & Details</th>
                  <th className="px-4 py-3">Campus</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Call Number</th>
                  <th className="px-4 py-3 text-center">Shelf Availability</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map(book => {
                  const avail = book.available_copies ?? book.available_quantity ?? 0;
                  const total = book.total_copies ?? book.quantity ?? 1;
                  const isAvail = avail > 0;
                  const schoolCode = book.schools?.school_code || 'ALL';

                  return (
                    <tr key={book.book_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BookCoverBadge 
                            book={book} 
                            className="w-10 h-14" 
                            onClick={() => handleOpenBookModal(book)} 
                          />
                          <div className="min-w-0">
                            <h4 
                              onClick={() => handleOpenBookModal(book)}
                              className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer truncate max-w-sm"
                            >
                              {book.title}
                            </h4>
                            <p className="text-slate-500 text-xs truncate">By {book.author || 'Unknown'}</p>
                            {book.isbn && <span className="text-[10px] font-mono text-slate-400">ISBN: {book.isbn}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {schoolCode}
                          </span>
                          {book.copy_count > 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title={`${book.copy_count} physical copies registered at ${schoolCode}`}>
                              {book.copy_count} copies
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {book.categories?.category_name || 'General'}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-500">
                        {book.call_number || '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isAvail ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isAvail ? `${avail} / ${total} pcs in stock` : '0 pcs - Loaned Out'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenBookModal(book)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            Breakdown
                          </button>
                          <button
                            onClick={() => handleOpenTransfer(book)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FiTruck className="w-3 h-3" />
                            <span>Transfer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. EASY NAVIGATION & PAGINATION BAR
      ───────────────────────────────────────────────────────────── */}
      {pagination.total > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{fromItem.toLocaleString()}</strong>–<strong className="text-slate-800">{toItem.toLocaleString()}</strong> of <strong className="text-blue-600">{pagination.total.toLocaleString()}</strong> books (Page {pagination.page} of {pagination.totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            {/* Previous Page Button */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page <= 1 || loading}
              className="p-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <FiChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page Number Buttons */}
            {getPaginationPages().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 text-xs font-mono">
                    ...
                  </span>
                );
              }

              const isCurrent = p === pagination.page;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  disabled={loading}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Page Button */}
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Items per page selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="py-1 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none"
            >
              <option value="24">24</option>
              <option value="48">48</option>
              <option value="96">96</option>
            </select>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MULTI-CAMPUS AVAILABILITY BREAKDOWN MODAL
      ───────────────────────────────────────────────────────────── */}
      {showDetailModal && selectedBook && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBook(null);
          }}
          title={
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FiBook className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block truncate text-base">
                  {selectedBook.title}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  Consortium Union Catalog Inspection
                </span>
              </div>
            </div>
          }
          description={`Bibliographic details and multi-campus stock distribution across ${schools.length} universities.`}
          size="lg"
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <FiShare2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Consortium Inter-Library Transit active across all participating campuses.</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedBook(null);
                  }}
                  className="text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleOpenTransfer(selectedBook)}
                  className="!bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <FiTruck className="w-3.5 h-3.5" />
                  <span>Dispatch Stock Transfer</span>
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Top Book Summary Card */}
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <BookCoverBadge book={selectedBook} className="w-20 h-28" />

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                    {selectedBook.schools?.school_code || 'ALL'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ISBN: {selectedBook.isbn || 'N/A'}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedBook.title}
                </h2>
                <p className="text-xs text-slate-600">
                  By <strong className="text-slate-800">{selectedBook.author || 'Unknown'}</strong>
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                    {selectedBook.categories?.category_name || selectedBook.category || 'General'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {(selectedBook.available_copies ?? selectedBook.available_quantity ?? 0)} / {(selectedBook.total_copies ?? selectedBook.quantity ?? 1)} pcs in stock
                  </span>
                  {bookCirculationDetails?.current_borrowers?.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <FiClock className="w-3 h-3 text-blue-600" />
                      {bookCirculationDetails.current_borrowers.length} loaned out
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setModalActiveTab('campuses')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalActiveTab === 'campuses'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <FiGlobe className="w-3.5 h-3.5" />
                <span>Campuses Stock Breakdown</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  modalActiveTab === 'campuses' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {schools.length}
                </span>
              </button>

              <button
                onClick={() => setModalActiveTab('borrowers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalActiveTab === 'borrowers'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <FiUsers className="w-3.5 h-3.5" />
                <span>Active Borrowers Monitoring</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  modalActiveTab === 'borrowers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {bookCirculationDetails?.current_borrowers?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setModalActiveTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalActiveTab === 'history'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <FiClock className="w-3.5 h-3.5" />
                <span>Circulation History</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  modalActiveTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {bookCirculationDetails?.borrow_history?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB 1: Participating Campuses Stock Breakdown Table */}
            {modalActiveTab === 'campuses' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiGlobe className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Consortium Campus Holdings
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Real-Time Node Telemetry
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Campus / Institution</th>
                        <th className="px-4 py-3">Consortium Code</th>
                        <th className="px-4 py-3 text-center">Available Stock</th>
                        <th className="px-4 py-3 text-center">Inter-Library Transit</th>
                        <th className="px-4 py-3 text-right">Direct Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campusAvailability.map(({ school, hasBook, availableCopies, totalCopies, copyCount, isCurrentHome }) => {
                        return (
                          <tr key={school.school_id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{school.school_name}</span>
                                {isCurrentHome && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{school.address || 'Address not registered'}</div>
                            </td>

                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 text-slate-700">
                                {school.school_code}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              {hasBook ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    availableCopies > 0 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${availableCopies > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {availableCopies} / {totalCopies} pcs
                                  </span>
                                  {copyCount > 1 && (
                                    <span className="text-[10px] text-purple-600 font-semibold">
                                      {copyCount} copies merged
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium">
                                  Not Acquired
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {hasBook && availableCopies > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <FiCheckCircle className="w-3 h-3" />
                                  Cross-Borrow Ready
                                </span>
                              ) : hasBook ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                                  <FiClock className="w-3 h-3" />
                                  All Loaned Out
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">
                                  Unavailable
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right">
                              {hasBook && availableCopies > 0 ? (
                                <button
                                  onClick={() => handleOpenTransfer(selectedBook, school.school_id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                                  title="Transfer copies out from this campus"
                                >
                                  <FiTruck className="w-3 h-3" />
                                  <span>Transfer Out</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Active Borrowers Monitoring Panel */}
            {modalActiveTab === 'borrowers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiUsers className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Live Patron Loans Monitoring
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {loadingCirculationDetails ? 'Loading telemetry...' : `${bookCirculationDetails?.current_borrowers?.length || 0} Active Loans`}
                  </span>
                </div>

                {loadingCirculationDetails ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <FiRefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                    Loading circulation and borrower telemetry...
                  </div>
                ) : (!bookCirculationDetails?.current_borrowers || bookCirculationDetails.current_borrowers.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <FiCheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">All Registered Copies On Shelf</p>
                    <p className="text-slate-500 mt-1">There are currently no active student or faculty loans recorded for this catalog title.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Borrower / Student</th>
                          <th className="px-4 py-3">Campus</th>
                          <th className="px-4 py-3">Borrowed On</th>
                          <th className="px-4 py-3">Due Date</th>
                          <th className="px-4 py-3 text-center">Loan Status</th>
                          <th className="px-4 py-3 font-mono">Accession / Barcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookCirculationDetails.current_borrowers.map((borrower) => {
                          const isOverdue = borrower.is_overdue || (borrower.due_date && new Date(borrower.due_date) < new Date());
                          return (
                            <tr key={borrower.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {borrower.student_name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {borrower.student_number || borrower.email || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {borrower.school_code || borrower.school_name || 'Home'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-mono">
                                {borrower.borrow_date ? new Date(borrower.borrow_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 font-mono font-semibold">
                                <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                  {borrower.due_date ? new Date(borrower.due_date).toLocaleDateString() : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  isOverdue 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                  {isOverdue ? 'Overdue' : 'Active Loan'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-500">
                                {borrower.barcode || borrower.accession_number || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Historical Circulation Records */}
            {modalActiveTab === 'history' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Circulation & Return Records
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {bookCirculationDetails?.borrow_history?.length || 0} Historical Records
                  </span>
                </div>

                {(!bookCirculationDetails?.borrow_history || bookCirculationDetails.borrow_history.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <FiClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No Past Circulation Records</p>
                    <p className="text-slate-500 mt-1">This book title has not been returned or closed from any previous loans yet.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Patron Name</th>
                          <th className="px-4 py-3">Campus</th>
                          <th className="px-4 py-3">Borrowed</th>
                          <th className="px-4 py-3">Returned On</th>
                          <th className="px-4 py-3 text-center">Final Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookCirculationDetails.borrow_history.slice(0, 20).map((hist) => (
                          <tr key={hist.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{hist.student_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{hist.student_number || hist.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                {hist.school_name || 'Home Campus'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {hist.borrow_date ? new Date(hist.borrow_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {hist.return_date ? new Date(hist.return_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                {hist.status || 'Completed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. INTER-CAMPUS TRANSFER DISPATCH MODAL
      ───────────────────────────────────────────────────────────── */}
      {showTransferModal && selectedBook && (
        <Modal
          isOpen={showTransferModal}
          onClose={() => !submittingTransfer && setShowTransferModal(false)}
          title="Dispatch Inter-Campus Book Transfer"
          description="Allocate and transfer physical book inventory between participating consortium university libraries."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="secondary"
                onClick={() => setShowTransferModal(false)}
                disabled={submittingTransfer}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteTransfer}
                disabled={submittingTransfer || !transferSourceSchool || !transferDestSchool || transferSourceSchool === transferDestSchool}
                className="!bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {submittingTransfer ? (
                  <>
                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Transfer...</span>
                  </>
                ) : (
                  <>
                    <FiTruck className="w-3.5 h-3.5" />
                    <span>Confirm & Dispatch Transfer</span>
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Book Info Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-12 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
                {selectedBook.cover_image ? (
                  <img
                    src={getBackendAssetUrl(selectedBook.cover_image)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <FiBook className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {selectedBook.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  By {selectedBook.author || 'Unknown'} • ISBN: {selectedBook.isbn || 'N/A'}
                </p>
                <div className="text-[11px] text-blue-600 font-medium mt-1">
                  Consortium Union Resource
                </div>
              </div>
            </div>

            {/* Source & Destination Route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative">
              {/* Source Campus */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Origin (Source Campus)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase">Stock Out</span>
                </label>
                <select
                  value={transferSourceSchool}
                  onChange={(e) => {
                    setTransferSourceSchool(e.target.value);
                    setTransferQuantity(1);
                  }}
                  className="w-full p-2 rounded-lg text-xs border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>Select Source Campus</option>
                  {schools.map(s => {
                    const match = books.find(b => 
                      String(b.school_id) === String(s.school_id) && 
                      ((selectedBook.isbn && b.isbn?.trim().toLowerCase() === selectedBook.isbn?.trim().toLowerCase()) || 
                       (b.title?.trim().toLowerCase() === selectedBook.title?.trim().toLowerCase()))
                    );
                    const isHome = String(selectedBook.school_id) === String(s.school_id);
                    const avail = match ? (match.available_copies ?? match.available_quantity ?? 0) : (isHome ? (selectedBook.available_copies ?? selectedBook.available_quantity ?? 0) : 0);
                    return (
                      <option key={s.school_id} value={s.school_id} disabled={avail <= 0}>
                        {s.school_name} ({avail} available)
                      </option>
                    );
                  })}
                </select>
                <div className="text-[11px] text-slate-400">
                  Copies will be deducted from this campus inventory.
                </div>
              </div>

              {/* Destination Campus */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Destination (Target Campus)</span>
                  <span className="text-[10px] text-blue-600 font-semibold uppercase">Stock In</span>
                </label>
                <select
                  value={transferDestSchool}
                  onChange={(e) => setTransferDestSchool(e.target.value)}
                  className="w-full p-2 rounded-lg text-xs border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>Select Destination Campus</option>
                  {schools.filter(s => String(s.school_id) !== String(transferSourceSchool)).map(s => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.school_name} ({s.school_code})
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-400">
                  Copies will be added to this campus receiving shelf.
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            {(() => {
              const srcMatch = books.find(b => 
                String(b.school_id) === String(transferSourceSchool) && 
                ((selectedBook.isbn && b.isbn?.trim().toLowerCase() === selectedBook.isbn?.trim().toLowerCase()) || 
                 (b.title?.trim().toLowerCase() === selectedBook.title?.trim().toLowerCase()))
              );
              const isHome = String(selectedBook.school_id) === String(transferSourceSchool);
              const maxAvail = srcMatch ? (srcMatch.available_copies ?? srcMatch.available_quantity ?? 1) : (isHome ? (selectedBook.available_copies ?? selectedBook.available_quantity ?? 1) : 1);

              return (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Quantity to Transfer</span>
                    <span className="text-xs text-slate-500">
                      Available to Move: <strong className="text-slate-800">{maxAvail} copies</strong>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl bg-white border border-slate-200 p-1">
                      <button
                        type="button"
                        onClick={() => setTransferQuantity(q => Math.max(1, q - 1))}
                        disabled={transferQuantity <= 1}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={maxAvail}
                        value={transferQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setTransferQuantity(Math.min(Math.max(1, val), maxAvail));
                          }
                        }}
                        className="w-14 text-center font-bold text-sm text-slate-900 border-none focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setTransferQuantity(q => Math.min(maxAvail, q + 1))}
                        disabled={transferQuantity >= maxAvail}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTransferQuantity(maxAvail)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Max ({maxAvail})
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Purpose & Notes */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Transfer Purpose / Classification
                </label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Consortium Stock Rebalance">Consortium Stock Rebalance (Equalize Campus Availability)</option>
                  <option value="Inter-Library Loan Fulfillment">Inter-Library Loan (ILL) Fulfillment (Pending Student Requests)</option>
                  <option value="Permanent Inventory Relocation">Permanent Inventory Relocation (Course Curriculum Shift)</option>
                  <option value="Course Reserve Sharing">Course Reserve Sharing (Exam / Term Reference)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Consortium Dispatch Notes (Optional)
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Transferred for engineering semester curriculum support..."
                  className="w-full p-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SuperAdminBooks;
