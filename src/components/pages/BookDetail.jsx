import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiBook, FiUser, FiMapPin, FiCalendar, FiArrowLeft, FiHome, FiTag, FiCopy } from 'react-icons/fi';
import api from '../../utils/api';
import StudentBorrowingForm from '../collegeTabs/StudentTabs/StudentBorrowingForm';
import { MinimalSchoolMap } from '../collegeTabs/StudentTabs/SchoolMap';

function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showBorrowingForm, setShowBorrowingForm] = useState(false);
  const [borrowingFormList, setBorrowingFormList] = useState([]);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    // Load user data
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        setUserData(JSON.parse(userStr));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }

    const loadBook = async () => {
      try {
        const response = await api.get(`/books/${bookId}`);
        if (response.data) {
          setBook(response.data);
        }
      } catch (error) {
        console.error('Error loading book:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      loadBook();
    }
  }, [bookId]);

  const handleBorrow = () => {
    if (book) {
      const currentSchoolId = parseInt(localStorage.getItem('schoolId'));
      const isInterSchool = book.school_id && book.school_id !== currentSchoolId;
      setBorrowingFormList([{
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        owner_school_id: book.school_id || currentSchoolId,
        owner_school_name: book.schools?.school_name || 'Your Library',
        borrow_type: isInterSchool ? 'INTER_SCHOOL_LIBRARY_USE' : 'HOME',
      }]);
      setShowBorrowingForm(true);
    }
  };

  const handleBorrowingSubmit = async (response) => {
    try {
      if (response && response.success) {
        setSubmittedRequest(response.data);
        setShowBorrowingForm(false);
        setShowSuccessOverlay(true);
        setBorrowingFormList([]);
      } else {
        const errorMsg = response?.message || 'Unknown error';
        alert('Failed to submit borrowing request: ' + errorMsg);
      }
    } catch (error) {
      alert('Error handling borrowing request: ' + (error.message || 'Unknown error'));
    }
  };

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
                  <span className={`px-2 py-0.5 text-xs font-semibold border sm:px-3 sm:py-1 sm:text-sm ${
                  book.real_time_status === 'available' 
                    ? 'bg-green-100 text-green-700 border-green-200' 
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {book.real_time_status === 'available' ? 'Available' : 'Unavailable'}
                </span>
                {book.available_copies !== undefined && book.total_copies > 0 && (
                  <span className="text-xs text-[#64748B] sm:text-sm">
                    {book.available_copies}/{book.total_copies} copies
                  </span>
                )}
              </div>

              {/* Location Info */}
              <div className="space-y-3 pt-3 border-t border-[#E2E8F0] sm:pt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <FiHome className="w-4 h-4 text-[#0077B6] mt-0.5 sm:w-5 sm:h-5" />
                  <div>
                    <p className="text-xs font-medium text-[#0F172A] sm:text-sm">Library</p>
                    <p className="text-xs text-[#64748B] sm:text-sm">{book.schools?.school_name || 'Your Library'}</p>
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
            </div>

            {/* Map Section */}
            <div className="border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-7">
              <h3 className="text-base font-semibold text-[#0F172A] mb-3 sm:text-lg sm:mb-4">Location Map</h3>
              <div className="h-56 overflow-hidden bg-[#F8FAFC] sm:h-80">
                {book.schools?.latitude && book.schools?.longitude ? (
                  <MinimalSchoolMap school={book.schools} />
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
          </div>
        </div>
      </div>

      {/* Footer with Borrow Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white/95 shadow-lg backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <button
            onClick={handleBorrow}
            disabled={book.real_time_status !== 'available'}
            className={`w-full min-h-11 px-4 text-xs font-semibold text-white transition-all sm:min-h-12 sm:px-6 sm:text-sm ${
              book.real_time_status === 'available'
                ? 'bg-[#0077B6] hover:bg-[#005f8f] shadow-md shadow-[#0077B6]/20 hover:shadow-lg'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {book.real_time_status === 'available' ? 'Borrow This Book' : 'Currently Unavailable'}
          </button>
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
            <p className="text-sm text-[#64748B] mb-4 sm:text-base sm:mb-6">
              Your borrowing request has been submitted successfully. You will be notified when it's approved.
            </p>
            <button
              onClick={() => {
                setShowSuccessOverlay(false);
                navigate(-1);
              }}
              className="w-full py-2.5 px-4 bg-[#0077B6] text-white rounded-xl font-semibold hover:bg-[#005f8f] transition-all sm:py-3 sm:px-6"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookDetail;
