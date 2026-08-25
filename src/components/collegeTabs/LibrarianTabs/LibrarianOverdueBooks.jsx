import { useState, useEffect } from "react";
import { AlertTriangle, Clock, User, Book, Calendar, Phone, Mail, Search, Filter, Send, CheckCircle } from "lucide-react";
import api from "../../../utils/api";

function LibrarianOverdueBooks({ schoolId, librarianId }) {
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    fetchOverdueBooks();
  }, [schoolId]);

  const fetchOverdueBooks = async () => {
    if (!schoolId) {
      console.error('[OVERDUE FRONTEND] No schoolId provided');
      setOverdueBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[OVERDUE FRONTEND] Fetching with schoolId:', schoolId);
      const response = await api.get(`/borrow/overdue?school_id=${schoolId}`);
      console.log('[OVERDUE FRONTEND] Response:', response);
      console.log('[OVERDUE FRONTEND] Data received:', response.data);
      setOverdueBooks(response.data || []);
    } catch (error) {
      console.error('[OVERDUE FRONTEND] Error fetching overdue books:', error);
      setOverdueBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = overdueBooks.filter(book => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const studentName = `${book.student?.firstname || ''} ${book.student?.lastname || ''}`.toLowerCase();
    const bookTitle = book.book_copies?.books?.title?.toLowerCase() || '';
    const studentNumber = book.student?.student_number?.toLowerCase() || '';
    
    return studentName.includes(searchLower) || 
           bookTitle.includes(searchLower) || 
           studentNumber.includes(searchLower);
  });

  const getSeverityColor = (daysOverdue) => {
    if (daysOverdue >= 30) return 'bg-red-500';
    if (daysOverdue >= 14) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const getSeverityText = (daysOverdue) => {
    if (daysOverdue >= 30) return 'Critical';
    if (daysOverdue >= 14) return 'Severe';
    return 'Moderate';
  };

  const handleReportToAdmin = async (borrowId) => {
    if (!librarianId || !schoolId) {
      alert('Missing librarian or school information');
      return;
    }

    setReporting(true);
    try {
      const response = await api.post('/borrow/overdue/report', {
        borrow_id: borrowId,
        librarian_id: librarianId,
        school_id: schoolId,
        notes: `Overdue book reported by librarian`
      });

      if (response.data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportSuccess(false);
          setSelectedBook(null);
          fetchOverdueBooks();
        }, 2000);
      }
    } catch (error) {
      console.error('Error reporting overdue book:', error);
      alert(error.response?.data?.message || 'Failed to report overdue book');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172033]">Overdue Books</h1>
            <p className="text-sm text-[#64748B]">Books not returned on time</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Total Overdue</span>
          </div>
          <h3 className="text-2xl font-bold text-[#172033]">{overdueBooks.length}</h3>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">14+ Days</span>
          </div>
          <h3 className="text-2xl font-bold text-[#172033]">
            {overdueBooks.filter(b => b.days_overdue >= 14).length}
          </h3>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">30+ Days</span>
          </div>
          <h3 className="text-2xl font-bold text-[#172033]">
            {overdueBooks.filter(b => b.days_overdue >= 30).length}
          </h3>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search by student name, book title, or student number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Overdue Books List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-[#64748B]">Loading overdue books...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-[#172033]">No Overdue Books</h3>
            <p className="text-sm text-[#64748B]">Great! No books are overdue.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredBooks.map((book) => (
              <div 
                key={book.borrow_id} 
                className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedBook(book)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded flex items-center justify-center flex-shrink-0">
                        <Book className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#172033] text-sm line-clamp-2 mb-1">
                          {book.book_copies?.books?.title || 'Unknown Book'}
                        </h3>
                        <p className="text-xs text-[#64748B] mb-2">
                          {book.book_copies?.books?.isbn || 'No ISBN'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(book.days_overdue)}`}>
                            {getSeverityText(book.days_overdue)}
                          </span>
                          <span className="text-xs text-red-600 font-semibold">
                            {book.days_overdue} days overdue
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#172033]">
                        {book.student?.firstname} {book.student?.lastname}
                      </span>
                      <span className="text-xs text-[#64748B]">
                        ({book.student?.student_number || 'No ID'})
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="flex items-center gap-4 text-xs text-[#64748B]">
                      {book.student?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{book.student.email}</span>
                        </div>
                      )}
                      {book.student?.contact_number && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{book.student.contact_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Due Date */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <Calendar className="w-4 h-4 text-[#64748B]" />
                      <span className="text-xs text-[#64748B]">Due Date</span>
                    </div>
                    <p className="text-sm font-semibold text-red-600">
                      {book.due_date ? new Date(book.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4" onClick={() => setSelectedBook(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-auto my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Overdue Book Details</h2>
                  <p className="text-red-100 text-sm">
                    {selectedBook.days_overdue} days overdue
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Book Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-[#172033] mb-3 flex items-center gap-2">
                  <Book className="w-5 h-5" />
                  Book Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[#64748B] mb-1">Title</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.book_copies?.books?.title || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">ISBN</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.book_copies?.books?.isbn || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Accession Number</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.book_copies?.accession_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-[#172033] mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Student Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[#64748B] mb-1">Name</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.student?.firstname} {selectedBook.student?.lastname}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Student Number</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.student?.student_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Email</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.student?.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Contact Number</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.student?.contact_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Borrow Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-[#172033] mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Borrow Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[#64748B] mb-1">Borrow Date</p>
                    <p className="font-medium text-[#172033]">
                      {selectedBook.borrow_date ? new Date(selectedBook.borrow_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Due Date</p>
                    <p className="font-medium text-red-600">
                      {selectedBook.due_date ? new Date(selectedBook.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B] mb-1">Days Overdue</p>
                    <p className="font-medium text-red-600 font-semibold">
                      {selectedBook.days_overdue} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleReportToAdmin(selectedBook.borrow_id)}
                  disabled={reporting || reportSuccess}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {reporting ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Reporting...
                    </>
                  ) : reportSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Reported!
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Report to Admin-Librarian
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianOverdueBooks;
