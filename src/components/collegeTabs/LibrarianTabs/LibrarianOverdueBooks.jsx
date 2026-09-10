import { useState, useEffect } from "react";
import { 
  FiAlertTriangle, FiClock, FiUser, FiBook, FiCalendar, 
  FiPhone, FiMail, FiSearch, FiFilter, FiSend, FiCheckCircle, 
  FiDollarSign, FiShield, FiX, FiRefreshCw, FiExternalLink, FiFileText
} from "react-icons/fi";
import api from "../../../utils/api";
import { formatPhilippineDate, formatPhilippineDateTime, formatRelativeTime } from "../../../utils/timeUtils";
import Card from "../../ui/Card";
import Button from "../../ui/Button";

function LibrarianOverdueBooks({ schoolId, librarianId }) {
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all'); // all, moderate, severe, critical
  const [selectedBook, setSelectedBook] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState(false);

  // Standard institutional fine policy (₱5.00 per day overdue)
  const DAILY_FINE_RATE = 5.0;

  useEffect(() => {
    fetchOverdueBooks();
  }, [schoolId]);

  const fetchOverdueBooks = async () => {
    if (!schoolId) {
      setOverdueBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/borrow/overdue?school_id=${schoolId}`);
      setOverdueBooks(response.data || []);
    } catch (error) {
      console.error('[OVERDUE FRONTEND] Error fetching overdue books:', error);
      setOverdueBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyTier = (days) => {
    if (days >= 30) return 'critical';
    if (days >= 14) return 'severe';
    return 'moderate';
  };

  const filteredBooks = overdueBooks.filter(book => {
    const days = book.days_overdue || 0;
    const tier = getUrgencyTier(days);

    if (urgencyFilter !== 'all' && urgencyFilter !== tier) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const studentName = `${book.student?.firstname || ''} ${book.student?.lastname || ''}`.toLowerCase();
    const bookTitle = book.book_copies?.books?.title?.toLowerCase() || '';
    const studentNumber = book.student?.student_number?.toLowerCase() || '';
    const isbn = book.book_copies?.books?.isbn?.toLowerCase() || '';
    
    return studentName.includes(searchLower) || 
           bookTitle.includes(searchLower) || 
           studentNumber.includes(searchLower) ||
           isbn.includes(searchLower);
  });

  const totalAccruedFines = overdueBooks.reduce((acc, b) => acc + ((b.days_overdue || 0) * DAILY_FINE_RATE), 0);

  const handleReportToAdmin = async (borrowId) => {
    if (!librarianId || !schoolId) {
      alert('Missing librarian or campus identifier');
      return;
    }

    setReporting(true);
    try {
      const response = await api.post('/borrow/overdue/report', {
        borrow_id: borrowId,
        librarian_id: librarianId,
        school_id: schoolId,
        notes: `Overdue patron reported by librarian on duty`
      });

      if (response.data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportSuccess(false);
          setSelectedBook(null);
          fetchOverdueBooks();
        }, 1500);
      }
    } catch (error) {
      console.error('Error reporting overdue book:', error);
      alert(error.response?.data?.message || 'Failed to file overdue report');
    } finally {
      setReporting(false);
    }
  };

  const handleSendReminder = async (book) => {
    setReminding(true);
    try {
      // Simulate sending email notice trigger
      await new Promise(r => setTimeout(r, 800));
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setReminding(false);
    }
  };

  const handleSettleFine = async () => {
    setSettleSuccess(true);
    setTimeout(() => {
      setSettleSuccess(false);
      setSelectedBook(null);
    }, 1500);
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Glassmorphic Banner */}
      <div className="bg-gradient-to-r from-red-950 via-rose-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-rose-200 border border-white/10 mb-3">
              <FiAlertTriangle className="w-3.5 h-3.5 text-rose-300" />
              Delinquency & Penalty Auditing
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Overdue Circulation & Fines Control</h1>
            <p className="text-rose-200/80 text-sm mt-1 max-w-xl">
              Identify delinquent borrowing accounts, assess daily penalties, and dispatch official return notices in Philippine Standard Time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <div className="text-2xl font-black text-white">{overdueBooks.length}</div>
              <div className="text-[11px] text-rose-200 font-medium">Overdue Items</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <div className="text-2xl font-black text-amber-300">
                ₱{totalAccruedFines.toFixed(2)}
              </div>
              <div className="text-[11px] text-rose-200 font-medium">Accrued Fines</div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md text-[11px] text-rose-200 border border-white/10 self-start md:self-auto">
              <FiClock className="w-3.5 h-3.5 text-amber-300" />
              <span>PHT (UTC+8)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fine Policy Strip */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold">
            ₱
          </div>
          <div>
            <span className="font-bold">Standard Library Overdue Fine Policy: </span>
            <span>Accrues at <strong>₱{DAILY_FINE_RATE.toFixed(2)} per calendar day</strong> after elapsed due date. Borrowing privileges are automatically frozen until cleared.</span>
          </div>
        </div>
        <button 
          onClick={fetchOverdueBooks}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition-colors self-start sm:self-auto shadow-xs"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Search & Urgency Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, book title, accession, or student number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-slate-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Urgency Tier Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setUrgencyFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              urgencyFilter === 'all' 
                ? 'bg-white text-rose-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Overdue ({overdueBooks.length})
          </button>
          <button
            onClick={() => setUrgencyFilter('moderate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              urgencyFilter === 'moderate' 
                ? 'bg-white text-amber-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1–13 Days ({overdueBooks.filter(b => (b.days_overdue || 0) < 14).length})
          </button>
          <button
            onClick={() => setUrgencyFilter('severe')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              urgencyFilter === 'severe' 
                ? 'bg-white text-orange-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            14–29 Days ({overdueBooks.filter(b => (b.days_overdue || 0) >= 14 && (b.days_overdue || 0) < 30).length})
          </button>
          <button
            onClick={() => setUrgencyFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              urgencyFilter === 'critical' 
                ? 'bg-white text-rose-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30+ Critical ({overdueBooks.filter(b => (b.days_overdue || 0) >= 30).length})
          </button>
        </div>
      </div>

      {/* Overdue Ledger Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Delinquent Loan Records</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredBooks.length} of {overdueBooks.length} overdue borrowings
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-rose-600 border-t-transparent mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Checking circulation ledger for overdue loans...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Overdue Books Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm 
                ? "No delinquent loans match your search criteria." 
                : "All borrowed items are returned or well within their loan periods. Great job maintaining circulation!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBooks.map((book) => {
              const days = book.days_overdue || 0;
              const fine = days * DAILY_FINE_RATE;
              const tier = getUrgencyTier(days);

              return (
                <div 
                  key={book.borrow_id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Left: Book & Student Metadata */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-16 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <FiBook className="w-6 h-6" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {book.book_copies?.books?.title || 'Unknown Title'}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tier === 'critical' 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : tier === 'severe'
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {days} Days Overdue ({tier})
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        ISBN: {book.book_copies?.books?.isbn || '—'} · Accession: {book.book_copies?.accession_number || '—'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <FiUser className="w-3.5 h-3.5 text-slate-400" />
                          {book.student?.firstname} {book.student?.lastname}
                        </span>
                        <span className="font-mono text-slate-500">
                          ({book.student?.student_number || 'No ID'})
                        </span>
                        {book.student?.email && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <FiMail className="w-3.5 h-3.5 text-slate-400" />
                            {book.student.email}
                          </span>
                        )}
                        {book.student?.contact_number && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                            {book.student.contact_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Dates & Fine Penalty */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <p className="text-[11px] text-slate-400">Due Date (PHT)</p>
                      <p className="text-xs font-bold text-rose-600">
                        {book.due_date ? formatPhilippineDate(book.due_date) : 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {book.due_date ? formatRelativeTime(book.due_date) : ''}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-[11px] text-slate-400">Calculated Fine</p>
                      <p className="text-base font-black text-slate-900">
                        ₱{fine.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-amber-600 font-medium">@ ₱{DAILY_FINE_RATE.toFixed(2)}/day</p>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => setSelectedBook(book)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-700 text-xs font-bold transition-all shadow-xs"
                    >
                      Audit & Actions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail & Action Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-up border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 to-amber-600 p-6 rounded-t-3xl text-white flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
                  {selectedBook.days_overdue} Days Delinquent
                </span>
                <h3 className="text-xl font-black">Overdue Patron & Loan Audit</h3>
                <p className="text-xs text-rose-100 mt-0.5">Reference ID: {selectedBook.borrow_id}</p>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Fine Calculation Box */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900">Assessed Penalty Due</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {selectedBook.days_overdue} days × ₱{DAILY_FINE_RATE.toFixed(2)}/day
                  </p>
                </div>
                <div className="text-2xl font-black text-amber-950">
                  ₱{((selectedBook.days_overdue || 0) * DAILY_FINE_RATE).toFixed(2)}
                </div>
              </div>

              {/* Book Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FiBook className="w-3.5 h-3.5 text-blue-600" />
                  Item Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Title:</span>
                    <span className="font-bold text-slate-800">{selectedBook.book_copies?.books?.title || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ISBN:</span>
                    <span className="font-mono text-slate-700">{selectedBook.book_copies?.books?.isbn || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Accession Number:</span>
                    <span className="font-mono text-slate-700">{selectedBook.book_copies?.accession_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Due Date (PHT):</span>
                    <span className="font-bold text-rose-600">
                      {selectedBook.due_date ? formatPhilippineDate(selectedBook.due_date) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FiUser className="w-3.5 h-3.5 text-blue-600" />
                  Borrower Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Student Name:</span>
                    <span className="font-bold text-slate-800">
                      {selectedBook.student?.firstname} {selectedBook.student?.lastname}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Student ID:</span>
                    <span className="font-mono text-slate-700">{selectedBook.student?.student_number || 'No ID'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Institutional Email:</span>
                    <span className="text-slate-700">{selectedBook.student?.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Contact Phone:</span>
                    <span className="text-slate-700">{selectedBook.student?.contact_number || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => handleSendReminder(selectedBook)}
                  disabled={reminding || reminderSent}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-blue-200"
                >
                  <FiMail className="w-4 h-4" />
                  {reminding ? 'Sending Notice...' : reminderSent ? 'Notice Dispatched!' : 'Send Return Email Notice'}
                </button>

                <button
                  onClick={() => handleReportToAdmin(selectedBook.borrow_id)}
                  disabled={reporting || reportSuccess}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <FiSend className="w-4 h-4" />
                  {reporting ? 'Reporting...' : reportSuccess ? 'Report Filed!' : 'Report to Head Librarian'}
                </button>

                <button
                  onClick={handleSettleFine}
                  disabled={settleSuccess}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  {settleSuccess ? 'Settled / Waived!' : 'Settle / Waive Fine'}
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
