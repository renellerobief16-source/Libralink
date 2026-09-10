import { useState, useEffect } from "react";
import { 
  FiClock, FiAlertTriangle, FiCheckCircle, FiXCircle, FiFilter, 
  FiSearch, FiBook, FiUser, FiCalendar, FiDownload, FiArrowRight, 
  FiFileText, FiLayers, FiEye, FiX, FiRefreshCw, FiCompass
} from "react-icons/fi";
import api from "../../../utils/api";
import { formatPhilippineDate, formatPhilippineDateTime, formatRelativeTime } from "../../../utils/timeUtils";
import Card from "../../ui/Card";
import Button from "../../ui/Button";

function LibrarianHistory({ darkMode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, returned, overdue, cancelled
  const [typeFilter, setTypeFilter] = useState('all'); // all, home, inter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/borrow-requests/school/${schoolId}`);
      const requests = response.dataWithItems || response.data || [];
      
      const records = [];
      requests.forEach(req => {
        if (req.items && req.items.length > 0) {
          req.items.forEach(item => {
            records.push({
              item_id: item.item_id || `${req.request_id}-${item.book_id}`,
              request_id: req.request_id,
              request_type: req.request_type || 'home_school',
              student: req.student,
              book: item.book || item.book_copies?.books || { title: item.title || 'Unknown Title', author: item.author || '—' },
              book_copies: item.book_copies,
              borrow_date: req.borrow_date || req.pickup_date || req.created_at,
              due_date: req.due_date,
              return_date: req.return_date || (req.status === 'returned' ? req.updated_at : null),
              status: item.status || req.status || 'pending',
              created_at: req.created_at,
              partner_school: req.partner_school,
              cancellation_reason: req.cancellation_reason
            });
          });
        } else {
          records.push({
            item_id: req.request_id,
            request_id: req.request_id,
            request_type: req.request_type || 'home_school',
            student: req.student,
            book: req.book || { title: req.book_title || 'General Request Item', author: '—' },
            book_copies: null,
            borrow_date: req.borrow_date || req.pickup_date || req.created_at,
            due_date: req.due_date,
            return_date: req.return_date || (req.status === 'returned' ? req.updated_at : null),
            status: req.status || 'pending',
            created_at: req.created_at,
            partner_school: req.partner_school,
            cancellation_reason: req.cancellation_reason
          });
        }
      });
      
      setHistory(records);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'returned' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  const filteredHistory = history.filter(item => {
    const status = String(item.status || '').toLowerCase();
    const overdue = isOverdue(item.due_date, status);

    // Status filter
    if (filter === 'overdue' && !overdue) return false;
    if (filter === 'active' && !(status === 'released' || status === 'borrowed' || status === 'approved')) return false;
    if (filter === 'returned' && status !== 'returned') return false;
    if (filter === 'cancelled' && status !== 'cancelled' && status !== 'rejected') return false;

    // Type filter
    if (typeFilter === 'home' && item.request_type !== 'home_school') return false;
    if (typeFilter === 'inter' && item.request_type !== 'inter_school') return false;

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const studentName = `${item.student?.firstname || ''} ${item.student?.lastname || ''}`.toLowerCase();
      const studentNumber = (item.student?.student_number || '').toLowerCase();
      const title = (item.book?.title || '').toLowerCase();
      const reqId = (item.request_id || '').toLowerCase();

      return studentName.includes(q) || studentNumber.includes(q) || title.includes(q) || reqId.includes(q);
    }

    return true;
  });

  const getStatusPill = (item) => {
    const status = String(item.status || '').toLowerCase();
    const overdue = isOverdue(item.due_date, status);

    if (overdue) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200">
          Overdue
        </span>
      );
    }

    switch (status) {
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
            Returned
          </span>
        );
      case 'released':
      case 'borrowed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
            Active Loan
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
            Approved (Pending Pickup)
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            {status}
          </span>
        );
    }
  };

  const exportToCSV = () => {
    const headers = ["Request ID", "Type", "Student Name", "Student ID", "Book Title", "Borrow Date (PHT)", "Due Date (PHT)", "Return Date (PHT)", "Status"];
    const rows = filteredHistory.map(item => [
      item.request_id || '',
      item.request_type === 'inter_school' ? 'Inter-School' : 'Home Campus',
      `"${(item.student?.firstname || '')} ${(item.student?.lastname || '')}"`,
      `"${item.student?.student_number || ''}"`,
      `"${(item.book?.title || '').replace(/"/g, '""')}"`,
      item.borrow_date ? `"${formatPhilippineDate(item.borrow_date)}"` : 'N/A',
      item.due_date ? `"${formatPhilippineDate(item.due_date)}"` : 'N/A',
      item.return_date ? `"${formatPhilippineDate(item.return_date)}"` : 'N/A',
      item.status || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Circulation_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiLayers className="w-3.5 h-3.5 text-blue-300" />
              Circulation Ledger & Audit Trail
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Circulation Transaction History</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Complete historical record of checked out, returned, active, and cancelled book transactions with Philippine Standard Time audit logging.
            </p>
          </div>

          {/* Quick Metrics & Export Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-white">{history.length}</div>
              <div className="text-[11px] text-blue-200 font-medium">Total Records</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-emerald-300">
                {history.filter(h => h.status === 'returned').length}
              </div>
              <div className="text-[11px] text-blue-200 font-medium">Returned</div>
            </div>
            <Button
              onClick={exportToCSV}
              disabled={filteredHistory.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md self-start md:self-auto py-2.5"
            >
              <FiDownload className="w-3.5 h-3.5 mr-1.5" />
              Export CSV Ledger
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, book title, student number, or request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
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

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'returned', label: 'Returned' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === opt.id 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('home')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'home' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setTypeFilter('inter')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'inter' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Inter-School
            </button>
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Circulation Entries</h3>
            <p className="text-xs text-slate-500 mt-0.5">Showing {filteredHistory.length} of {history.length} transactions</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">
            <FiClock className="w-3.5 h-3.5 text-blue-600" />
            <span>Timestamps in PHT (UTC+8)</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading circulation ledger...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-16 text-center">
            <FiClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No Circulation Entries Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No historical borrowing transactions match the active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider bg-slate-50/90 border-b border-slate-200/80">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Borrower / Student</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Timeline (PHT)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistory.map((item) => (
                  <tr key={item.item_id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-slate-800 text-[11px] block">
                          {item.request_id}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.request_type === 'inter_school'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.request_type === 'inter_school' ? 'Inter-School' : 'Home Campus'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {item.student?.firstname?.[0] || 'S'}{item.student?.lastname?.[0] || ''}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs leading-snug">
                            {item.student?.firstname} {item.student?.lastname}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {item.student?.student_number || 'No ID'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-slate-900 text-xs line-clamp-1">
                        {item.book?.title}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {item.book?.author ? `by ${item.book.author}` : ''}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-slate-600">
                          <span className="text-slate-400">Borrowed: </span>
                          <span className="font-medium">{item.borrow_date ? formatPhilippineDate(item.borrow_date) : '—'}</span>
                        </div>
                        <div className={isOverdue(item.due_date, item.status) ? "text-rose-600 font-semibold" : "text-slate-600"}>
                          <span className="text-slate-400">Due: </span>
                          <span>{item.due_date ? formatPhilippineDate(item.due_date) : 'N/A'}</span>
                        </div>
                        {item.return_date && (
                          <div className="text-emerald-700 font-medium">
                            <span className="text-slate-400">Returned: </span>
                            <span>{formatPhilippineDate(item.return_date)}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusPill(item)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1 ml-auto"
                      >
                        <FiEye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scale-up border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-t-3xl text-white flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
                  {selectedRecord.request_type === 'inter_school' ? 'Inter-School Loan' : 'Home Campus Circulation'}
                </span>
                <h3 className="text-xl font-black">Transaction Audit Record</h3>
                <p className="text-xs text-blue-200 mt-0.5 font-mono">Reference: {selectedRecord.request_id}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Circulation Status</span>
                <div>{getStatusPill(selectedRecord)}</div>
              </div>

              {/* Book Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FiBook className="w-3.5 h-3.5 text-blue-600" />
                  Item Information
                </h4>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{selectedRecord.book?.title}</p>
                  <p className="text-slate-600">Author: {selectedRecord.book?.author || '—'}</p>
                  <p className="text-slate-500 font-mono">ISBN: {selectedRecord.book?.isbn || '—'}</p>
                  {selectedRecord.book_copies?.accession_number && (
                    <p className="text-slate-500 font-mono">Accession: {selectedRecord.book_copies.accession_number}</p>
                  )}
                </div>
              </div>

              {/* Borrower Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FiUser className="w-3.5 h-3.5 text-blue-600" />
                  Borrower Identity
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block">Name:</span>
                    <span className="font-bold text-slate-900">{selectedRecord.student?.firstname} {selectedRecord.student?.lastname}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Student ID:</span>
                    <span className="font-mono">{selectedRecord.student?.student_number || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Email:</span>
                    <span>{selectedRecord.student?.email || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Timestamp Ledger */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FiClock className="w-3.5 h-3.5 text-blue-600" />
                  Audit Timestamps (Philippine Standard Time)
                </h4>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requested / Issued:</span>
                    <span className="font-medium">{selectedRecord.borrow_date ? formatPhilippineDateTime(selectedRecord.borrow_date) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Designated Due Date:</span>
                    <span className="font-medium text-rose-600">{selectedRecord.due_date ? formatPhilippineDateTime(selectedRecord.due_date) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Returned / Resolved:</span>
                    <span className="font-medium text-emerald-700">{selectedRecord.return_date ? formatPhilippineDateTime(selectedRecord.return_date) : 'In Circulation'}</span>
                  </div>
                  {selectedRecord.cancellation_reason && (
                    <div className="pt-2 border-t border-slate-200 text-rose-700">
                      <span className="font-bold">Cancellation Notes: </span>
                      <span>{selectedRecord.cancellation_reason}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianHistory;
