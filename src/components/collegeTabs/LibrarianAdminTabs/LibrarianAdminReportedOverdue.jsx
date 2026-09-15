import { useState, useEffect, useMemo } from "react";
import { 
  FiAlertTriangle, FiClock, FiUser, FiBook, FiCalendar, FiPhone, 
  FiMail, FiSearch, FiCheckCircle, FiDollarSign, FiAlertCircle, 
  FiMessageSquare, FiX, FiRefreshCw, FiShield, FiExternalLink, FiFileText
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";
import { AnimatedCounter } from "../../common";

function LibrarianAdminReportedOverdue({ darkMode, schoolId }) {
  const [reportedBooks, setReportedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBook, setSelectedBook] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [actionType, setActionType] = useState('resolved');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const effectiveSchoolId = schoolId || localStorage.getItem('schoolId');

  useEffect(() => {
    fetchReportedBooks();
  }, [effectiveSchoolId]);

  const fetchReportedBooks = async () => {
    if (!effectiveSchoolId) {
      setReportedBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/borrow/overdue/reported?school_id=${effectiveSchoolId}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setReportedBooks(data);
    } catch (error) {
      console.error('Error fetching reported overdue books:', error);
      setReportedBooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReportedBooks();
  };

  const getSeverity = (daysOverdue) => {
    const days = Number(daysOverdue) || 0;
    if (days >= 30) {
      return {
        level: 'Critical',
        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        indicator: 'bg-rose-500'
      };
    }
    if (days >= 14) {
      return {
        level: 'Severe',
        color: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
        indicator: 'bg-amber-500'
      };
    }
    return {
      level: 'Moderate',
      color: 'bg-yellow-50 text-yellow-800 border-yellow-200 font-semibold',
      indicator: 'bg-yellow-500'
    };
  };

  const filteredBooks = useMemo(() => {
    return reportedBooks.filter(book => {
      // Status filter
      if (statusFilter === 'pending' && book.status !== 'pending') return false;
      if (statusFilter === 'resolved' && book.status !== 'resolved') return false;
      if (statusFilter === 'critical' && (book.days_overdue < 30 || book.status === 'resolved')) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const studentName = `${book.borrow_transactions?.student?.firstname || ''} ${book.borrow_transactions?.student?.lastname || ''}`.toLowerCase();
      const bookTitle = (book.borrow_transactions?.book_copies?.books?.title || '').toLowerCase();
      const studentNumber = (book.borrow_transactions?.student?.student_number || '').toLowerCase();
      const reporter = `${book.reporter?.firstname || ''} ${book.reporter?.lastname || ''}`.toLowerCase();

      return studentName.includes(q) || bookTitle.includes(q) || studentNumber.includes(q) || reporter.includes(q);
    });
  }, [reportedBooks, statusFilter, searchTerm]);

  // Summary Metrics
  const stats = useMemo(() => {
    let pending = 0;
    let critical = 0;
    let severe = 0;
    let resolved = 0;

    reportedBooks.forEach(b => {
      if (b.status === 'resolved') {
        resolved++;
      } else {
        pending++;
        if (b.days_overdue >= 30) critical++;
        else if (b.days_overdue >= 14) severe++;
      }
    });

    return { total: reportedBooks.length, pending, critical, severe, resolved };
  }, [reportedBooks]);

  const handleActionSubmit = async (reportId) => {
    if (!notes.trim()) {
      setErrorMessage('Please provide administrative notes or remarks for this action.');
      return;
    }

    setProcessing(true);
    setErrorMessage('');
    try {
      const response = await api.put(`/borrow/overdue/reported/${reportId}`, {
        status: actionType === 'warning' ? 'pending' : 'resolved',
        action: actionType,
        notes: notes.trim()
      });

      if (response.data?.success || response.status === 200) {
        setActionSuccess(true);
        setTimeout(() => {
          setActionSuccess(false);
          setNotes('');
          setSelectedBook(null);
          fetchReportedBooks();
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating report:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to update report. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Escalated Overdue Reports</h2>
              <p className="text-xs text-slate-500">Delinquent loans flagged by desk librarians for administrative intervention</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Reports'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reports</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600"><FiFileText className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            <AnimatedCounter value={stats.total} />
          </p>
          <span className="text-[11px] text-slate-400">All escalated cases</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Action</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100"><FiClock className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-amber-700">
            <AnimatedCounter value={stats.pending} />
          </p>
          <span className="text-[11px] text-slate-400">Awaiting admin decision</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Critical (30d+)</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100"><FiAlertTriangle className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-rose-700">
            <AnimatedCounter value={stats.critical} />
          </p>
          <span className="text-[11px] text-slate-400">Severe overdue cases</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Resolved</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100"><FiCheckCircle className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            <AnimatedCounter value={stats.resolved} />
          </p>
          <span className="text-[11px] text-slate-400">Settled or returned</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, ID number, book title..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'All Cases', count: stats.total },
              { id: 'pending', label: 'Pending Only', count: stats.pending },
              { id: 'critical', label: 'Critical (30d+)', count: stats.critical },
              { id: 'resolved', label: 'Resolved', count: stats.resolved },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Reported Books Directory ({filteredBooks.length})
          </h3>
          <span className="text-[11px] text-slate-400">Click any card to review and resolve</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching escalated reports...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FiCheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Overdue Reports Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm ? `No reports matched "${searchTerm}". Try resetting your filter.` : 'There are currently no overdue books flagged for admin intervention.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBooks.map((book) => {
              const days = Number(book.days_overdue) || 0;
              const sev = getSeverity(days);
              const tx = book.borrow_transactions || {};
              const student = tx.student || {};
              const studentName = [student.firstname, student.lastname].filter(Boolean).join(' ') || 'Unknown Student';
              const bookInfo = tx.book_copies?.books || {};
              const bookTitle = bookInfo.title || 'Untitled Publication';
              const dueDate = tx.due_date ? new Date(tx.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
              const reporterName = [book.reporter?.firstname, book.reporter?.lastname].filter(Boolean).join(' ') || 'Desk Librarian';
              const isResolved = book.status === 'resolved';

              return (
                <div
                  key={book.report_id}
                  onClick={() => setSelectedBook(book)}
                  className="p-5 hover:bg-slate-50/70 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Book Icon Thumbnail */}
                    <div className="w-11 h-14 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-500 shadow-xs group-hover:border-blue-300 transition-colors">
                      <FiBook className="w-5 h-5 text-slate-600" />
                    </div>

                    {/* Book & Student Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {bookTitle}
                        </h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sev.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.indicator}`}></span>
                          {sev.level} ({days}d overdue)
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isResolved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isResolved ? 'Resolved' : 'Pending Action'}
                        </span>
                      </div>

                      {/* Student row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mb-1.5">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <FiUser className="w-3.5 h-3.5 text-slate-400" />
                          {studentName}
                        </span>
                        {student.student_number && (
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {student.student_number}
                          </span>
                        )}
                        {student.email && (
                          <span className="text-slate-400 text-[11px] hidden sm:inline">
                            {student.email}
                          </span>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>Due: <strong className="text-rose-600 font-semibold">{dueDate}</strong></span>
                        <span>•</span>
                        <span>Flagged by: <strong className="text-slate-600">{reporterName}</strong></span>
                        {book.report_reason && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-500 line-clamp-1">"{book.report_reason}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Button */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBook(book);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer shadow-xs"
                    >
                      {isResolved ? 'View Case File' : 'Take Action →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution & Case File Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col animate-scale-up overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <FiAlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Overdue Case Resolution</h3>
                  <p className="text-xs text-slate-500">Report ID: #{selectedBook.report_id || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Action processed successfully! Updating records...</span>
                </div>
              )}

              {/* Case Brief Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Book Details</span>
                  <p className="text-sm font-bold text-slate-900">{selectedBook.borrow_transactions?.book_copies?.books?.title || 'Unknown Title'}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedBook.borrow_transactions?.book_copies?.books?.isbn || 'No ISBN'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Borrower</span>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedBook.borrow_transactions?.student?.firstname} {selectedBook.borrow_transactions?.student?.lastname}
                    </p>
                    <p className="text-[11px] text-slate-500">{selectedBook.borrow_transactions?.student?.student_number}</p>
                    <p className="text-[11px] text-blue-600 truncate">{selectedBook.borrow_transactions?.student?.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delinquency Status</span>
                    <p className="text-xs font-bold text-rose-600">{selectedBook.days_overdue} Days Overdue</p>
                    <p className="text-[11px] text-slate-500">
                      Due: {selectedBook.borrow_transactions?.due_date ? new Date(selectedBook.borrow_transactions.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Administrative Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'resolved', label: 'Mark Resolved', icon: FiCheckCircle, color: 'text-emerald-700' },
                    { id: 'warning', label: 'Send Warning Notice', icon: FiMessageSquare, color: 'text-blue-700' },
                    { id: 'waived', label: 'Waive Overdue', icon: FiShield, color: 'text-purple-700' },
                  ].map((act) => {
                    const Icon = act.icon;
                    const isSelected = actionType === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setActionType(act.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${act.color}`} />
                        <span className="text-[11px] leading-tight">{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Administrative Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Resolution Notes / Official Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record justification, student interview outcome, receipt code, or settlement details..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all leading-relaxed"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleActionSubmit(selectedBook.report_id)}
                disabled={processing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Action & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminReportedOverdue;
