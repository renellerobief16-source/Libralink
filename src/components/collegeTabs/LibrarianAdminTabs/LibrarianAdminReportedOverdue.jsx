import { useState, useEffect } from "react";
import { AlertTriangle, Clock, User, Book, Calendar, Phone, Mail, Search, CheckCircle, DollarSign, AlertCircle, MessageSquare, X } from "lucide-react";
import api from "../../../utils/api";

function LibrarianAdminReportedOverdue({ darkMode, schoolId }) {
  const [reportedBooks, setReportedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [actionType, setActionType] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchReportedBooks();
  }, [schoolId]);

  const fetchReportedBooks = async () => {
    if (!schoolId) {
      console.error('No schoolId provided');
      setReportedBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/borrow/overdue/reported?school_id=${schoolId}`);
      setReportedBooks(response.data || []);
    } catch (error) {
      console.error('Error fetching reported overdue books:', error);
      setReportedBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = reportedBooks.filter(book => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const studentName = `${book.borrow_transactions?.student?.firstname || ''} ${book.borrow_transactions?.student?.lastname || ''}`.toLowerCase();
    const bookTitle = book.borrow_transactions?.book_copies?.books?.title?.toLowerCase() || '';
    const studentNumber = book.borrow_transactions?.student?.student_number?.toLowerCase() || '';
    
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAction = async (reportId, action) => {
    if (!notes.trim()) {
      alert('Please add notes for this action');
      return;
    }

    setProcessing(true);
    setActionType(action);
    try {
      const response = await api.put(`/borrow/overdue/reported/${reportId}`, {
        status: 'resolved',
        action,
        notes
      });

      if (response.data.success) {
        setActionSuccess(true);
        setTimeout(() => {
          setActionSuccess(false);
          setActionType('');
          setNotes('');
          setSelectedBook(null);
          fetchReportedBooks();
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert(error.response?.data?.message || 'Failed to update report');
    } finally {
      setProcessing(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'fine': return <DollarSign className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'note': return <MessageSquare className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#172033]'}`}>Reported Overdue Books</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>Books reported by librarians for admin action</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>Pending Reports</span>
          </div>
          <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
            {reportedBooks.filter(b => b.status === 'pending').length}
          </h3>
        </div>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-5 shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>Resolved</span>
          </div>
          <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
            {reportedBooks.filter(b => b.status === 'resolved').length}
          </h3>
        </div>
      </div>

      {/* Search */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 mb-6 shadow-sm`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`} />
          <input
            type="text"
            placeholder="Search by student name, book title, or student number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500' : 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500'} focus:outline-none transition-all`}
          />
        </div>
      </div>

      {/* Reported Books List */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm`}>
        {loading ? (
          <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>Loading reported books...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className={`w-12 h-12 ${darkMode ? 'text-gray-400' : 'text-[#64748B]'} mx-auto mb-4`} />
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#172033]'}`}>No Reported Books</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>No overdue books have been reported yet.</p>
          </div>
        ) : (
          <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredBooks.map((book) => (
              <div 
                key={book.report_id} 
                className={`p-5 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                onClick={() => setSelectedBook(book)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded flex items-center justify-center flex-shrink-0">
                        <Book className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#172033]'} text-sm line-clamp-2 mb-1`}>
                          {book.borrow_transactions?.book_copies?.books?.title || 'Unknown Book'}
                        </h3>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'} mb-2`}>
                          {book.borrow_transactions?.book_copies?.books?.isbn || 'No ISBN'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(book.days_overdue)}`}>
                            {getSeverityText(book.days_overdue)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status)}`}>
                            {book.status}
                          </span>
                          <span className="text-xs text-red-600 font-semibold">
                            {book.days_overdue} days overdue
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <User className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                        {book.borrow_transactions?.student?.firstname} {book.borrow_transactions?.student?.lastname}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
                        ({book.borrow_transactions?.student?.student_number || 'No ID'})
                      </span>
                    </div>

                    {/* Reporter Info */}
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
                      Reported by: {book.reporter?.firstname} {book.reporter?.lastname}
                    </div>
                  </div>

                  {/* Right: Due Date */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`} />
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>Due Date</span>
                    </div>
                    <p className="text-sm font-semibold text-red-600">
                      {book.borrow_transactions?.due_date ? new Date(book.borrow_transactions.due_date).toLocaleDateString() : 'N/A'}
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
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-auto my-8`} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Reported Overdue Book</h2>
                  <p className="text-blue-100 text-sm">
                    {selectedBook.days_overdue} days overdue • {selectedBook.status}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Book Info */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-4`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#172033]'} mb-3 flex items-center gap-2`}>
                  <Book className="w-5 h-5" />
                  Book Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Title</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.borrow_transactions?.book_copies?.books?.title || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>ISBN</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.borrow_transactions?.book_copies?.books?.isbn || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Info */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-4`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#172033]'} mb-3 flex items-center gap-2`}>
                  <User className="w-5 h-5" />
                  Student Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Name</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.borrow_transactions?.student?.firstname} {selectedBook.borrow_transactions?.student?.lastname}
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Student Number</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.borrow_transactions?.student?.student_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Email</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.borrow_transactions?.student?.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Contact Number</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.borrow_transactions?.student?.contact_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Report Info */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-4`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#172033]'} mb-3 flex items-center gap-2`}>
                  <AlertTriangle className="w-5 h-5" />
                  Report Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Reported By</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.reporter?.firstname} {selectedBook.reporter?.lastname}
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Reported Date</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                      {selectedBook.reported_at ? new Date(selectedBook.reported_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {selectedBook.notes && (
                    <div>
                      <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Reporter Notes</p>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                        {selectedBook.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Resolution Info (if resolved) */}
              {selectedBook.status === 'resolved' && (
                <div className={`${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} rounded-xl p-4 mb-4 border`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'} mb-3 flex items-center gap-2`}>
                    <CheckCircle className="w-5 h-5" />
                    Admin Resolution
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Action Taken</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-[#172033]'} uppercase`}>
                        {selectedBook.action || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Admin Notes</p>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                        {selectedBook.notes || 'No notes provided'}
                      </p>
                    </div>
                    <div>
                      <p className={darkMode ? 'text-gray-400' : 'text-[#64748B]'}>Resolved Date</p>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#172033]'}`}>
                        {selectedBook.resolved_at ? new Date(selectedBook.resolved_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Section */}
              {selectedBook.status === 'pending' && (
                <>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-4`}>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#172033]'} mb-3 flex items-center gap-2`}>
                      <CheckCircle className="w-5 h-5" />
                      Admin Decision & Notes
                    </h3>
                    
                    {/* Quick Note Suggestions */}
                    <div className={`mb-3 flex flex-wrap gap-2`}>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'} mr-2 self-center`}>Quick add:</span>
                      <button
                        onClick={() => setNotes(prev => prev + ' Student has been notified via email. ')}
                        className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                      >
                        Notified via email
                      </button>
                      <button
                        onClick={() => setNotes(prev => prev + ' Fine amount: ₱' + (selectedBook.days_overdue * 10) + ' (₱10 per overdue day). ')}
                        className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                      >
                        Auto-calculate fine
                      </button>
                      <button
                        onClick={() => setNotes(prev => prev + ' Student must return book within 3 days to avoid escalation. ')}
                        className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                      >
                        3-day deadline
                      </button>
                    </div>

                    <textarea
                      placeholder="Describe your decision and any specific actions taken. Include fine amount, warning details, or follow-up instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`w-full p-4 rounded-lg border ${darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm leading-relaxed`}
                      rows="5"
                    />
                    <div className={`flex justify-between items-center mt-2`}>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
                        {notes.length} characters
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
                        Required field
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <button
                      onClick={() => handleAction(selectedBook.report_id, 'fine')}
                      disabled={processing || actionSuccess}
                      className="py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processing && actionType === 'fine' ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : actionSuccess && actionType === 'fine' ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Done!
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-5 h-5" />
                          Issue Fine
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAction(selectedBook.report_id, 'warning')}
                      disabled={processing || actionSuccess}
                      className="py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processing && actionType === 'warning' ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : actionSuccess && actionType === 'warning' ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Done!
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Send Warning
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAction(selectedBook.report_id, 'note')}
                      disabled={processing || actionSuccess}
                      className="py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processing && actionType === 'note' ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : actionSuccess && actionType === 'note' ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Done!
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-5 h-5" />
                          Add Note
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedBook(null)}
                className={`w-full py-3 px-6 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} rounded-xl font-semibold transition-all`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminReportedOverdue;
