import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiBook, FiUser, FiMapPin, FiCalendar, FiArrowLeft, FiHome, FiTag, FiCopy, FiChevronDown, FiAlertCircle, FiClock, FiShield } from 'react-icons/fi';
import api, { getLibraryPolicy } from '../../utils/api';
import { subscribeToBookCopies } from '../../utils/realtime';
import StudentBorrowingForm from '../collegeTabs/StudentTabs/StudentBorrowingForm';
import { MinimalSchoolMap } from '../collegeTabs/StudentTabs/SchoolMap';

function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [owningPolicy, setOwningPolicy] = useState(null);
  const [activeLoanCount, setActiveLoanCount] = useState(0);
  const [showBorrowingForm, setShowBorrowingForm] = useState(false);
  const [borrowingFormList, setBorrowingFormList] = useState([]);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    // Load user data
    let currentUserId = null;
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserData(u);
        currentUserId = u.user_id;
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }

    const loadBook = async () => {
      try {
        const response = await api.get(`/books/${bookId}`);
        if (response.data) {
          const bookData = response.data;
          setBook(bookData);

          // Fetch policy of the library that owns this book
          const targetSchoolId = bookData.school_id || parseInt(localStorage.getItem('schoolId'));
          if (targetSchoolId) {
            const policyRes = await getLibraryPolicy(targetSchoolId);
            if (policyRes.data) {
              setOwningPolicy(policyRes.data);
            }
          }
        }

        // Fetch student's active commitment count
        if (currentUserId) {
          try {
            const activeRes = await api.get(`/borrow/active/student/${currentUserId}`);
            const count = Array.isArray(activeRes.data?.data) ? activeRes.data.data.length : (Array.isArray(activeRes.data) ? activeRes.data.length : 0);
            setActiveLoanCount(count);
          } catch {
            // fallback
          }
        }
      } catch (error) {
        console.error('Error loading book:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      loadBook();

      const unsubscribe = subscribeToBookCopies(null, (payload) => {
        if (payload?.new?.book_id && String(payload.new.book_id) === String(bookId)) {
          loadBook();
        }
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [bookId]);

  const handleBorrow = (targetLocation = null) => {
    const targetBook = targetLocation || book;
    if (targetBook) {
      const resolvedBookId = Number(targetBook.book_id || book.book_id || book.id);
      if (!resolvedBookId || isNaN(resolvedBookId)) return;

      const userSchoolId = userData?.school_id || localStorage.getItem('schoolId');
      const bookSchoolId = targetBook.school_id || book.school_id;
      const isInter = userSchoolId && bookSchoolId && String(userSchoolId) !== String(bookSchoolId);

      setBorrowingFormList([{
        book_id: resolvedBookId,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        library_id: targetBook.library_id || book.library_id || null,
        library_name: targetBook.library_name || book.libraries?.name || 'Main Library',
        owner_school_id: bookSchoolId || userSchoolId,
        owner_school_name: targetBook.campus_name || book.schools?.school_name || 'Your Library',
        borrow_type: isInter ? 'INTER_SCHOOL_LIBRARY_USE' : 'HOME',
      }]);
      setShowBorrowingForm(true);
    }
  };

  const handleBorrowingSubmit = async (response) => {
    try {
      const isSuccess = Boolean(
        response &&
        response.success !== false &&
        (response.success === true || response.request_id || response.data?.request_id)
      );
      if (isSuccess) {
        setSubmittedRequest(response.data || response);
        setShowBorrowingForm(false);
        setShowSuccessOverlay(true);
        setBorrowingFormList([]);

        // Realtime optimistic deduction of copies (0ms latency)
        setBook((prev) => {
          if (!prev) return null;
          const currentAvail = prev.available_copies !== undefined ? Number(prev.available_copies) : 1;
          const newAvail = Math.max(0, currentAvail - 1);
          const total = prev.total_copies !== undefined ? Number(prev.total_copies) : Math.max(1, currentAvail);
          return {
            ...prev,
            available_copies: newAvail,
            total_copies: total,
            availability_ratio: `${newAvail}/${total}`,
            real_time_status: newAvail > 0 ? 'available' : 'unavailable',
            is_available: newAvail > 0,
          };
        });
      } else {
        const errorMsg = response?.message || 'Unknown error';
        alert('Failed to submit borrowing request: ' + errorMsg);
      }
    } catch (error) {
      alert('Error handling borrowing request: ' + (error.message || 'Unknown error'));
    }
  };

  // Automatically redirect user to Borrow History tab after successful borrowing request
  useEffect(() => {
    if (!showSuccessOverlay || !submittedRequest) return;
    const timer = setTimeout(() => {
      setShowSuccessOverlay(false);
      navigate("/studentpage/history", { state: { tab: "requests" } });
    }, 1800);
    return () => clearTimeout(timer);
  }, [showSuccessOverlay, submittedRequest, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0077B6] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <FiBook className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
          <p className="text-[#64748B]">Book not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-[#0077B6] text-white rounded-lg hover:bg-[#005f8f]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 sm:pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#64748B] hover:text-[#0077B6] transition-colors"
            >
              <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>
            <h1 className="text-base font-semibold text-[#0F172A] sm:text-lg">Book Details</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Book Info Section */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Book Card */}
            <div className="border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-7">
              {/* Book Cover */}
              <div className="relative mb-5 flex h-56 w-full items-center justify-center overflow-hidden bg-[#E0F2FE] sm:mb-7 sm:h-64">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#0077B6]/10 sm:-right-12 sm:-top-12 sm:h-40 sm:w-40" />
                <div className="book-cover-float flex h-36 w-24 items-center justify-center bg-[#0077B6] shadow-xl shadow-sky-900/20 sm:h-40 sm:w-28"><FiBook className="h-12 w-12 text-white sm:h-14 sm:w-14" /></div>
              </div>

              {/* Title */}
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#0077B6] sm:mb-2 sm:text-xs">Book details</p><h2 className="text-xl font-semibold tracking-[-.03em] text-[#0F172A] mb-1.5 sm:mb-2 sm:text-2xl lg:text-3xl">{book.title}</h2>

              {/* Author */}
              <div className="flex items-center gap-2 text-[#64748B] mb-3 sm:mb-4">
                <FiUser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">{book.author || 'Unknown Author'}</span>
              </div>

              {/* ISBN */}
              {book.isbn && (
                <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-4 sm:mb-6 sm:text-sm">
                  <FiCopy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>ISBN: {book.isbn}</span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <span className={`px-2 py-0.5 text-xs font-semibold border sm:px-3 sm:py-1 sm:text-sm ${book.available_copies > 0 && book.real_time_status === 'available'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-rose-100 text-rose-700 border-rose-200'
                  }`}>
                  {book.available_copies > 0 && book.real_time_status === 'available' ? 'Available' : 'Out of Stock'}
                </span>
                {book.available_copies !== undefined && book.total_copies > 0 && (
                  <span className="text-xs text-[#64748B] sm:text-sm">
                    {book.available_copies}/{book.total_copies} copies
                  </span>
                )}
              </div>

              {/* Current Borrowers */}
              {book.current_borrowers && book.current_borrowers.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <details className="group">
                    <summary className="flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600 transition-colors sm:text-sm">
                      <FiUser className="w-3.5 h-3.5 text-[#64748B] sm:w-4 sm:h-4" />
                      <span className="text-[#64748B] font-medium">
                        {book.current_borrowers.length} borrower{book.current_borrowers.length > 1 ? 's' : ''}
                      </span>
                      <FiChevronDown className="w-3 h-3 text-[#64748B] group-open:rotate-180 transition-transform sm:w-4 sm:h-4" />
                    </summary>
                    <div className="mt-2 pl-5 space-y-1.5 sm:pl-6 sm:space-y-2">
                      {book.current_borrowers.map((borrower, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-[#64748B]">{borrower.username}</span>
                          <span className={`text-xs font-medium ${borrower.status === 'borrowed' ? 'text-blue-600' : 'text-orange-600'
                            }`}>
                            ({borrower.status === 'borrowed' ? 'Borrowed' : 'Waiting'})
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Location Info */}
              <div className="space-y-3 pt-3 border-t border-[#E2E8F0] sm:pt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <FiHome className="w-4 h-4 text-[#0077B6] mt-0.5 sm:w-5 sm:h-5" />
                  <div>
                    <p className="text-xs font-medium text-[#0F172A] sm:text-sm">Current Library</p>
                    <p className="text-xs text-[#64748B] sm:text-sm">
                      {book.schools?.school_name || 'Your Campus'}{book.libraries?.name ? ` • ${book.libraries.name}` : ''}
                    </p>
                  </div>
                </div>
                {book.shelf_location && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <FiMapPin className="w-4 h-4 text-[#0077B6] mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-medium text-[#0F172A] sm:text-sm">Shelf Location</p>
                      <p className="text-xs text-[#64748B] sm:text-sm">{book.shelf_location}</p>
                    </div>
                  </div>
                )}
                {book.call_number && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <FiCopy className="w-4 h-4 text-[#0077B6] mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-medium text-[#0F172A] sm:text-sm">Call Number</p>
                      <p className="text-xs text-[#64748B] sm:text-sm">{book.call_number}</p>
                    </div>
                  </div>
                )}
                {book.publication_year && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <FiCalendar className="w-4 h-4 text-[#0077B6] mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-medium text-[#0F172A] sm:text-sm">Publication Year</p>
                      <p className="text-xs text-[#64748B] sm:text-sm">{book.publication_year}</p>
                    </div>
                  </div>
                )}
                {book.categories?.category_name && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <FiTag className="w-4 h-4 text-[#0077B6] mt-0.5 sm:w-5 sm:h-5" />
                    <div>
                      <p className="text-xs font-medium text-[#0F172A] sm:text-sm">Category</p>
                      <p className="text-xs text-[#64748B] sm:text-sm">{book.categories.category_name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Library Campus & Unit Holdings */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Available Locations & Libraries</h3>
                    <p className="text-xs text-[#64748B]">Copies of this title across campus and consortium units</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {book.locations?.length || 1} {book.locations?.length === 1 ? 'Location' : 'Locations'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(book.locations && book.locations.length > 0 ? book.locations : [
                    {
                      book_id: book.book_id,
                      campus_name: book.schools?.school_name || 'Main Campus',
                      library_name: book.libraries?.name || 'Main Library',
                      library_type: book.libraries?.library_type || 'college',
                      shelf_location: book.shelf_location || 'Main Stacks',
                      status: book.available_copies > 0 ? 'Available' : 'Borrowed',
                      available_copies: book.available_copies || 0,
                      total_copies: book.total_copies || 1,
                      is_current: true
                    }
                  ]).map((loc, idx) => {
                    const isAvailable = loc.status === 'Available' || loc.available_copies > 0;
                    return (
                      <div 
                        key={loc.book_id || idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          loc.is_current 
                            ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20' 
                            : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#0F172A]">
                                Campus: {loc.campus_name}
                              </span>
                              {loc.is_current && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                  Viewing
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <span>{loc.library_type === 'senior_high_school' ? '🎓' : loc.library_type === 'junior_high_school' ? '🎒' : loc.library_type === 'elementary' ? '🧸' : '📚'}</span>
                                Library: <strong className="text-blue-900">{loc.library_name}</strong>
                              </span>
                              {loc.shelf_location && (
                                <span className="text-[11px] text-slate-500">
                                  • Shelf: {loc.shelf_location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              isAvailable 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              Status: {isAvailable ? 'Available' : 'Borrowed'}
                              {loc.total_copies > 0 && ` (${loc.available_copies}/${loc.total_copies})`}
                            </span>

                            {isAvailable && (
                              <button
                                onClick={() => handleBorrow(loc)}
                                className="px-3 py-1 bg-[#0077B6] hover:bg-[#005f8f] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                              >
                                Borrow Here
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Map Section */}
            <div className="border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-7">
              <h3 className="text-base font-semibold text-[#0F172A] mb-3 sm:text-lg sm:mb-4">Location Map</h3>
              <div className="h-72 overflow-hidden rounded-xl bg-[#F8FAFC] sm:h-80">
                {book?.schools || book?.school_id ? (
                  <MinimalSchoolMap
                    school={
                      book.schools || {
                        school_id: book.school_id,
                        school_name: book.school_name,
                        address: book.address || book.school_address,
                        latitude: book.latitude,
                        longitude: book.longitude,
                      }
                    }
                    height={320}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-[#64748B]">
                    <div className="text-center">
                      <FiMapPin className="w-10 h-10 mx-auto mb-2 opacity-50 sm:w-12 sm:h-12" />
                      <p className="text-xs sm:text-sm">Map location not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Info Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* User Card */}
            {userData && (
              <div className="border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                <h3 className="text-base font-semibold text-[#0F172A] mb-3 sm:text-lg sm:mb-4">Your Information</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0F2FE] sm:h-12 sm:w-12">
                      <FiUser className="w-5 h-5 text-[#0077B6] sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A] text-sm sm:text-base">{userData.full_name || userData.name || 'User'}</p>
                      <p className="text-xs text-[#64748B] sm:text-sm">{userData.email || ''}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#E2E8F0] space-y-2 sm:pt-4 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FiHome className="w-3.5 h-3.5 text-[#0077B6] sm:w-4 sm:h-4" />
                      <span className="text-[#64748B]">School:</span>
                      <span className="font-medium text-[#0F172A]">{userData.school_name || userData.college || 'N/A'}</span>
                    </div>
                    {userData.student_number && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <FiUser className="w-3.5 h-3.5 text-[#0077B6] sm:w-4 sm:h-4" />
                        <span className="text-[#64748B]">Student No:</span>
                        <span className="font-medium text-[#0F172A]">{userData.student_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FiUser className="w-3.5 h-3.5 text-[#0077B6] sm:w-4 sm:h-4" />
                      <span className="text-[#64748B]">Role:</span>
                      <span className="font-medium text-[#0F172A] capitalize">{userData.role_name || userData.role || 'Student'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Borrowing Terms & Policy Card */}
            <div className="border border-[#E2E8F0] bg-white p-4 sm:p-5 lg:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#0F172A]">Borrowing Policy</h3>
                <span className="text-[10px] font-semibold text-[#0077B6] bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full">
                  {book.schools?.school_name || 'Owning Library'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Loan Period</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {book.school_id && userData?.school_id && book.school_id !== userData.school_id && owningPolicy?.inter_school_library_use_only
                      ? 'In-Library Reading Room Only (Partner School)'
                      : `${owningPolicy?.home_borrowing_days || 7} Days Loan`}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Borrowing Limit</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    Up to {owningPolicy?.max_borrow_limit || 5} active books per student
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Overdue Penalty</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {owningPolicy?.enable_fines
                      ? `₱${Number(owningPolicy.fine_amount_per_day).toFixed(2)}/day after due date`
                      : 'Fine-free borrowing'}
                  </span>
                  {owningPolicy?.enable_fines && owningPolicy.grace_period_days > 0 && (
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      ({owningPolicy.grace_period_days}-day grace period applies)
                    </span>
                  )}
                </div>
              </div>

              {/* Student quota notice */}
              {activeLoanCount >= (owningPolicy?.max_borrow_limit || 5) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                  <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Borrowing Limit Reached</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      You currently have {activeLoanCount} active book(s). Please return an active loan before requesting additional books.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Borrow Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white/95 shadow-lg backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          {activeLoanCount >= (owningPolicy?.max_borrow_limit || 5) ? (
            <button
              disabled
              className="w-full min-h-11 px-4 text-xs font-semibold text-slate-400 bg-slate-200 cursor-not-allowed sm:min-h-12 sm:px-6 sm:text-sm rounded-lg"
            >
              Borrowing Limit Reached ({activeLoanCount}/{owningPolicy?.max_borrow_limit || 5} Books)
            </button>
          ) : (
            <button
              onClick={handleBorrow}
              disabled={book.available_copies <= 0 || book.real_time_status !== 'available'}
              className={`w-full min-h-11 px-4 text-xs font-semibold text-white transition-all sm:min-h-12 sm:px-6 sm:text-sm rounded-lg ${
                book.available_copies > 0 && book.real_time_status === 'available'
                  ? 'bg-[#0077B6] hover:bg-[#005f8f] shadow-md shadow-[#0077B6]/20 hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                }`}
            >
              {book.available_copies > 0 && book.real_time_status === 'available' ? 'Borrow This Book' : 'Out of Stock'}
            </button>
          )}
        </div>
      </div>

      {/* Borrowing Form Modal */}
      {showBorrowingForm && (
        <StudentBorrowingForm
          isOpen={showBorrowingForm}
          onClose={() => setShowBorrowingForm(false)}
          borrowingList={borrowingFormList}
          onSubmit={handleBorrowingSubmit}
        />
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && submittedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center sm:p-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:w-16 sm:h-16 sm:mb-4">
              <FiBook className="w-7 h-7 text-green-600 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2 sm:text-xl">Request Submitted!</h3>
            <p className="text-sm text-[#64748B] mb-2 sm:text-base sm:mb-4">
              Your borrowing request has been submitted successfully. You will be notified when it's approved.
            </p>
            <p className="text-xs text-blue-600 font-semibold mb-4 animate-pulse">
              Redirecting to Borrow History in a moment...
            </p>
            <button
              onClick={() => {
                setShowSuccessOverlay(false);
                navigate('/studentpage/history', { state: { tab: 'requests' } });
              }}
              className="w-full py-2.5 px-4 bg-[#0077B6] text-white rounded-xl font-semibold hover:bg-[#005f8f] transition-all sm:py-3 sm:px-6"
            >
              Go to Borrow History →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookDetail;
