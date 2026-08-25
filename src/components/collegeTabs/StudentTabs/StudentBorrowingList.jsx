import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Book, X, MapPin, AlertCircle, CheckCircle, Clock, Shield, Loader2 } from 'lucide-react';
import api from '../../../utils/api';

const StudentBorrowingList = forwardRef(({ onCheckout, onContinueBrowsing }, ref) => {
  const [borrowingList, setBorrowingList] = useState(() => {
    try {
      const saved = localStorage.getItem('borrowingList');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading borrowing list:', error);
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [availabilityChecks, setAvailabilityChecks] = useState({});

  // Maximum books allowed per request
  const MAX_BOOKS = 5;

  useEffect(() => {
    try {
      localStorage.setItem('borrowingList', JSON.stringify(borrowingList));
    } catch (error) {
      console.error('Error saving borrowing list:', error);
    }
  }, [borrowingList]);

  // Validate book before adding
  const validateBook = (book) => {
    if (!book || !book.book_id) {
      return { valid: false, error: 'Invalid book data' };
    }
    if (!book.title || !book.author) {
      return { valid: false, error: 'Book information incomplete' };
    }
    if (!book.school_id) {
      return { valid: false, error: 'School information missing' };
    }
    return { valid: true };
  };

  // Check book availability before adding
  const checkBookAvailability = async (bookId, schoolId) => {
    try {
      const response = await api.get(`/books/school?school_id=${schoolId}`);
      const books = response.data || [];
      const book = books.find(b => b.book_id === bookId);
      
      if (!book) {
        return { available: false, reason: 'Book not found' };
      }
      
      if (book.available_copies === 0) {
        return { available: false, reason: 'No copies available' };
      }
      
      if (book.real_time_status === 'borrowed') {
        return { available: false, reason: 'Book is currently borrowed' };
      }
      
      return { available: true, copies: book.available_copies };
    } catch (error) {
      console.error('Error checking book availability:', error);
      return { available: true }; // Allow adding if check fails
    }
  };

  const addToBorrowingList = async (book) => {
    console.log('Adding book to borrowing list:', book);
    
    // Validate book data
    const validation = validateBook(book);
    if (!validation.valid) {
      setError(validation.error);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check maximum limit
    if (borrowingList.length >= MAX_BOOKS) {
      setError(`Maximum ${MAX_BOOKS} books allowed per request`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check for duplicates
    const exists = borrowingList.some(item => item.book_id === book.book_id);
    if (exists) {
      setError('This book is already in your borrowing list');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check availability
    setIsLoading(true);
    const availability = await checkBookAvailability(book.book_id, book.school_id);
    setIsLoading(false);

    if (!availability.available) {
      setError(`Cannot add: ${availability.reason}`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const borrowingItem = {
      book_id: book.book_id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      owner_school_id: book.school_id,
      owner_school_name: book.school_name || book.schools?.school_name || 'Unknown School',
      borrow_type: 'HOME',
      status: 'pending',
      available_copies: availability.copies || 1,
      added_at: new Date().toISOString(),
    };

    setBorrowingList([...borrowingList, borrowingItem]);
    setIsOpen(true);
    setError(null);
  };

  const removeFromBorrowingList = (book_id) => {
    setBorrowingList(borrowingList.filter(item => item.book_id !== book_id));
    setAvailabilityChecks(prev => {
      const newChecks = { ...prev };
      delete newChecks[book_id];
      return newChecks;
    });
  };

  const clearBorrowingList = () => {
    if (showClearConfirm) {
      setBorrowingList([]);
      setAvailabilityChecks({});
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  const getTotalItems = () => borrowingList.length;

  const getBorrowTypeText = (type) => {
    return type === 'INTER_SCHOOL_LIBRARY_USE' ? 'Inter-School (Library Use Only)' : 'Home Library';
  };

  const handleCheckout = () => {
    if (borrowingList.length === 0) {
      setError('Please add books to your borrowing list');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validate all items before checkout
    const invalidItems = borrowingList.filter(item => !item.book_id || !item.title);
    if (invalidItems.length > 0) {
      setError('Some books have invalid information. Please remove them and try again.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (onCheckout) {
      onCheckout(borrowingList);
    }
  };

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    addToBorrowingList,
    removeFromBorrowingList,
    clearBorrowingList,
    getTotalItems,
  }));

  return (
    <>
      {/* Borrowing List Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-[#0077B6] to-[#005f8f] hover:from-[#005f8f] hover:to-[#004d73] text-white px-6 py-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-3 z-40"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Book className="w-5 h-5" />
        )}
        <span className="font-semibold">Borrowing List</span>
        {getTotalItems() > 0 && (
          <span className="bg-white text-[#0077B6] px-2.5 py-1 rounded-full text-sm font-bold">
            {getTotalItems()}/{MAX_BOOKS}
          </span>
        )}
      </button>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-down">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Borrowing List Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-auto my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0077B6] to-[#005f8f] p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-white/80" />
                    <h2 className="text-2xl font-bold text-white">Borrowing List</h2>
                  </div>
                  <p className="text-blue-100 text-sm">
                    {getTotalItems()} {getTotalItems() === 1 ? 'book' : 'books'} selected (Max: {MAX_BOOKS})
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {borrowingList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-[#F7FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Book className="w-10 h-10 text-[#64748B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Your borrowing list is empty</h3>
                  <p className="text-sm text-[#64748B] mb-6">Add books from the search results to start borrowing</p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onContinueBrowsing) onContinueBrowsing();
                    }}
                    className="bg-[#0077B6] hover:bg-[#005f8f] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    Browse Books
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {borrowingList.map((item) => (
                    <div
                      key={item.book_id}
                      className="bg-[#F7FAFC] rounded-xl p-4 border border-[#E2E8F0] hover:border-[#0077B6] transition-colors"
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-gradient-to-br from-[#0077B6]/10 to-[#005f8f]/10 rounded-lg flex-shrink-0 flex items-center justify-center border border-[#0077B6]/20">
                          <Book className="w-8 h-8 text-[#0077B6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#0F172A] mb-1 line-clamp-2">{item.title}</h4>
                          <p className="text-sm text-[#64748B] mb-2">{item.author}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-[#64748B]" />
                            <span className="text-xs text-[#64748B]">{item.owner_school_name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {getBorrowTypeText(item.borrow_type)}
                            </span>
                            {item.available_copies !== undefined && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                {item.available_copies} {item.available_copies === 1 ? 'copy' : 'copies'} available
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromBorrowingList(item.book_id)}
                          className="p-2 text-[#64748B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove from list"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {borrowingList.length > 0 && (
              <div className="border-t border-[#E2E8F0] p-6 bg-[#F7FAFC]">
                {showClearConfirm ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Clear all books?</p>
                        <p className="text-xs text-yellow-700">This action cannot be undone.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={cancelClear}
                        className="flex-1 px-6 py-3 rounded-xl border-2 border-[#E2E8F0] text-[#64748B] font-semibold hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={clearBorrowingList}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                      >
                        Yes, Clear All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="flex-1 px-6 py-3 rounded-xl border-2 border-[#E2E8F0] text-[#64748B] font-semibold hover:bg-gray-100 transition-all"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-[#0077B6] to-[#005f8f] hover:from-[#005f8f] hover:to-[#004d73] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Proceed to Checkout
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

StudentBorrowingList.displayName = 'StudentBorrowingList';

export default StudentBorrowingList;
