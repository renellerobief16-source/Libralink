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
    <div className="min-h-screen bg-[#F8FAFC] pb-28 sm:pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#64748B] hover:text-[#0077B6] transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-lg font-semibold text-[#0F172A]">Book Details</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Info Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Book Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
              {/* Book Cover */}
              <div className="w-full h-64 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <FiBook className="w-24 h-24 text-[#0077B6]" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{book.title}</h2>

              {/* Author */}
              <div className="flex items-center gap-2 text-[#64748B] mb-4">
                <FiUser className="w-4 h-4" />
                <span className="text-sm">{book.author || 'Unknown Author'}</span>
              </div>

              {/* ISBN */}
              {book.isbn && (
                <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-6">
                  <FiCopy className="w-4 h-4" />
                  <span>ISBN: {book.isbn}</span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                  book.real_time_status === 'available' 
                    ? 'bg-green-100 text-green-700 border-green-200' 
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {book.real_time_status === 'available' ? 'Available' : 'Unavailable'}
                </span>
                {book.available_copies !== undefined && book.total_copies > 0 && (
                  <span className="text-sm text-[#64748B]">
                    {book.available_copies}/{book.total_copies} copies
                  </span>
                )}
              </div>

              {/* Location Info */}
              <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-start gap-3">
                  <FiHome className="w-5 h-5 text-[#0077B6] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Library</p>
                    <p className="text-sm text-[#64748B]">{book.schools?.school_name || 'Your Library'}</p>
                  </div>
                </div>
                {book.shelf_location && (
                  <div className="flex items-start gap-3">
                    <FiMapPin className="w-5 h-5 text-[#0077B6] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Shelf Location</p>
                      <p className="text-sm text-[#64748B]">{book.shelf_location}</p>
                    </div>
                  </div>
                )}
                {book.call_number && (
                  <div className="flex items-start gap-3">
                    <FiCopy className="w-5 h-5 text-[#0077B6] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Call Number</p>
                      <p className="text-sm text-[#64748B]">{book.call_number}</p>
                    </div>
                  </div>
                )}
                {book.publication_year && (
                  <div className="flex items-start gap-3">
                    <FiCalendar className="w-5 h-5 text-[#0077B6] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Publication Year</p>
                      <p className="text-sm text-[#64748B]">{book.publication_year}</p>
                    </div>
                  </div>
                )}
                {book.categories?.category_name && (
                  <div className="flex items-start gap-3">
                    <FiTag className="w-5 h-5 text-[#0077B6] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Category</p>
                      <p className="text-sm text-[#64748B]">{book.categories.category_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
              <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Location Map</h3>
              <div className="h-80 bg-[#F8FAFC] rounded-xl overflow-hidden">
                {book.schools?.latitude && book.schools?.longitude ? (
                  <MinimalSchoolMap school={book.schools} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[#64748B]">
                    <div className="text-center">
                      <FiMapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Map location not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Info Sidebar */}
          <div className="space-y-6">
            {/* User Card */}
            {userData && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Your Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-full flex items-center justify-center">
                      <FiUser className="w-6 h-6 text-[#0077B6]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">{userData.full_name || userData.name || 'User'}</p>
                      <p className="text-sm text-[#64748B]">{userData.email || ''}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FiHome className="w-4 h-4 text-[#0077B6]" />
                      <span className="text-[#64748B]">School:</span>
                      <span className="font-medium text-[#0F172A]">{userData.school_name || userData.college || 'N/A'}</span>
                    </div>
                    {userData.student_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <FiUser className="w-4 h-4 text-[#0077B6]" />
                        <span className="text-[#64748B]">Student No:</span>
                        <span className="font-medium text-[#0F172A]">{userData.student_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <FiUser className="w-4 h-4 text-[#0077B6]" />
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBorrow}
            disabled={book.real_time_status !== 'available'}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
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
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Request Submitted!</h3>
            <p className="text-[#64748B] mb-6">
              Your borrowing request has been submitted successfully. You will be notified when it's approved.
            </p>
            <button
              onClick={() => {
                setShowSuccessOverlay(false);
                navigate(-1);
              }}
              className="w-full py-3 px-6 bg-[#0077B6] text-white rounded-xl font-semibold hover:bg-[#005f8f] transition-all"
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
