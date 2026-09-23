import { useState, useEffect, useRef } from "react";
import { 
  FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle,
  FiSearch, FiBook, FiUser, FiDownload, FiX, FiRefreshCw,
  FiArrowRight, FiFileText, FiCalendar, FiFilter, FiCopy,
  FiCheck, FiPrinter, FiBookmark, FiHash, FiMapPin, FiExternalLink
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";
import { 
  formatPhilippineDate, 
  formatPhilippineDateTime,
  formatRelativeTime 
} from "../../../utils/timeUtils";

// ── helpers ──────────────────────────────────────────────────────────────────

const isOverdue = (dueDate, status) => {
  const s = String(status || '').toLowerCase();
  if (!dueDate || s === 'returned' || s === 'cancelled' || s === 'rejected') return false;
  return new Date(dueDate) < new Date();
};

const getStatusMeta = (item) => {
  const s = String(item.status || '').toLowerCase();
  if (isOverdue(item.due_date, s)) {
    return { 
      label: 'Overdue',
      color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
      dot: 'bg-rose-500', 
      bar: 'bg-rose-400' 
    };
  }
  if (s === 'returned') {
    return { 
      label: 'Returned',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      dot: 'bg-emerald-500', 
      bar: 'bg-emerald-400' 
    };
  }
  if (s === 'released' || s === 'borrowed') {
    return { 
      label: 'Active Loan',
      color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
      dot: 'bg-blue-500', 
      bar: 'bg-blue-400' 
    };
  }
  if (s === 'approved') {
    return { 
      label: 'Pending Pickup',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
      dot: 'bg-indigo-500', 
      bar: 'bg-indigo-400' 
    };
  }
  if (s === 'cancelled' || s === 'rejected') {
    return { 
      label: 'Cancelled',
      color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      dot: 'bg-slate-400', 
      bar: 'bg-slate-500' 
    };
  }
  return { 
    label: s ? (s.charAt(0).toUpperCase() + s.slice(1)) : 'Pending',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    dot: 'bg-amber-400', 
    bar: 'bg-amber-400' 
  };
};

const Avatar = ({ student, size = "md", className = "" }) => {
  const [imageError, setImageError] = useState(false);
  const initials = `${student?.firstname?.[0] || 'S'}${student?.lastname?.[0] || ''}`.toUpperCase();

  const sizeMap = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-14 h-14 text-base"
  };
  const sizeClasses = sizeMap[size] || sizeMap.md;
  const hasImage = student?.profile_image && !imageError;

  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-800 text-white font-bold flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs border border-white/20 ring-1 ring-slate-200 dark:ring-slate-700 ${className}`}>
      {hasImage ? (
        <img
          src={getBackendAssetUrl(student.profile_image)}
          alt={initials}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="tracking-tight">{initials}</span>
      )}
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────

function LibrarianHistory({ darkMode }) {
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState('all');
  const [typeFilter, setTypeFilter]         = useState('all');
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [copiedId, setCopiedId]             = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => { fetchHistory(); }, []);

  // Close drawer on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setSelectedRecord(null); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const fetchHistory = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) { setHistory([]); setLoading(false); return; }
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
              book: item.book || item.book_copies?.books || { 
                title: item.title || 'Unknown Title', 
                author: item.author || '—',
                cover_image: item.cover_image || null,
                category: item.category || null,
                isbn: item.isbn || null
              },
              book_copies: item.book_copies,
              borrow_date: req.borrow_date || req.pickup_date || req.created_at,
              due_date: req.due_date,
              return_date: req.return_date || (req.status === 'returned' ? req.updated_at : null),
              status: item.status || req.status || 'pending',
              created_at: req.created_at,
              partner_school: req.partner_school,
              cancellation_reason: req.cancellation_reason,
            });
          });
        } else {
          records.push({
            item_id: req.request_id,
            request_id: req.request_id,
            request_type: req.request_type || 'home_school',
            student: req.student,
            book: req.book || { 
              title: req.book_title || 'General Request', 
              author: '—',
              cover_image: req.cover_image || null,
              category: req.category || null,
              isbn: req.isbn || null
            },
            book_copies: req.book_copies || null,
            borrow_date: req.borrow_date || req.pickup_date || req.created_at,
            due_date: req.due_date,
            return_date: req.return_date || (req.status === 'returned' ? req.updated_at : null),
            status: req.status || 'pending',
            created_at: req.created_at,
            partner_school: req.partner_school,
            cancellation_reason: req.cancellation_reason,
          });
        }
      });
      setHistory(records);
    } catch (err) {
      console.error('Error fetching history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const s = String(item.status || '').toLowerCase();
    const overdue = isOverdue(item.due_date, s);

    if (filter === 'overdue' && !overdue) return false;
    if (filter === 'active' && !(s === 'released' || s === 'borrowed' || s === 'approved')) return false;
    if (filter === 'returned' && s !== 'returned') return false;
    if (filter === 'cancelled' && s !== 'cancelled' && s !== 'rejected') return false;
    if (typeFilter === 'home' && item.request_type !== 'home_school') return false;
    if (typeFilter === 'inter' && item.request_type !== 'inter_school') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = `${item.student?.firstname || ''} ${item.student?.lastname || ''}`.toLowerCase();
      const num  = (item.student?.student_number || '').toLowerCase();
      const title = (item.book?.title || '').toLowerCase();
      const rid  = String(item.request_id || '').toLowerCase();
      return name.includes(q) || num.includes(q) || title.includes(q) || rid.includes(q);
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ["Request ID","Type","Student Name","Student ID","Book Title","Borrow Date (PHT)","Due Date (PHT)","Return Date (PHT)","Status"];
    const rows = filteredHistory.map(item => [
      item.request_id || '',
      item.request_type === 'inter_school' ? 'Inter-School' : 'Home Campus',
      `"${(item.student?.firstname || '')} ${(item.student?.lastname || '')}"`,
      `"${item.student?.student_number || ''}"`,
      `"${(item.book?.title || '').replace(/"/g, '""')}"`,
      item.borrow_date ? `"${formatPhilippineDate(item.borrow_date)}"` : 'N/A',
      item.due_date    ? `"${formatPhilippineDate(item.due_date)}"` : 'N/A',
      item.return_date ? `"${formatPhilippineDate(item.return_date)}"` : 'N/A',
      item.status || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Circulation_History_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── stat pills ────────────────────────────────────────────────────────────
  const stats = {
    total:    history.length,
    active:   history.filter(h => { const s = h.status?.toLowerCase(); return s === 'released' || s === 'borrowed' || s === 'approved'; }).length,
    returned: history.filter(h => h.status?.toLowerCase() === 'returned').length,
    overdue:  history.filter(h => isOverdue(h.due_date, h.status)).length,
  };

  // ── STATUS FILTER TABS ────────────────────────────────────────────────────
  const statusTabs = [
    { id: 'all',       label: 'All',       count: history.length },
    { id: 'active',    label: 'Active',    count: stats.active },
    { id: 'returned',  label: 'Returned',  count: stats.returned },
    { id: 'overdue',   label: 'Overdue',   count: stats.overdue },
    { id: 'cancelled', label: 'Cancelled', count: null },
  ];

  return (
    <div className={`space-y-4 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* ── Compact page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <FiFileText className="w-5 h-5 text-blue-500" />
            Circulation History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full audit trail of all borrowing transactions & circulation lifecycle
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatPill label="Total"    value={stats.total}    color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
          <StatPill label="Active"   value={stats.active}   color="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" />
          <StatPill label="Returned" value={stats.returned} color="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300" />
          {stats.overdue > 0 && <StatPill label="Overdue" value={stats.overdue} color="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300" />}

          <button
            onClick={exportToCSV}
            disabled={filteredHistory.length === 0}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold hover:bg-slate-700 dark:hover:bg-blue-500 disabled:opacity-40 transition-colors shadow-xs"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Search + filters bar ─────────────────────────────────────── */}
      <div className={`border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
        darkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, book title, student ID, request ID…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-8 py-2 text-xs rounded-lg transition-all placeholder-slate-400 ${
              darkMode 
                ? 'bg-slate-900 border border-slate-700 text-slate-100 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500' 
                : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className={`flex items-center gap-0.5 p-0.5 rounded-lg shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                filter === tab.id 
                  ? (darkMode ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs') 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.id 
                    ? (darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600') 
                    : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type toggle */}
        <div className={`flex items-center gap-0.5 p-0.5 rounded-lg shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          {[{ id: 'all', label: 'All' }, { id: 'home', label: 'Home' }, { id: 'inter', label: 'Inter' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                typeFilter === t.id 
                  ? (darkMode ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs') 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table area ──────────────────────────────────────────────── */}
      <div className={`border rounded-xl overflow-hidden ${
        darkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        {/* Table header bar */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {loading ? 'Loading records…' : `${filteredHistory.length} of ${history.length} records`}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <FiClock className="w-3 h-3" /> Timestamps in Philippine Standard Time (PST UTC+8)
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading circulation records…</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center">
            <FiFileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                  darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Request</th>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Book</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredHistory.map(item => {
                  const meta = getStatusMeta(item);
                  return (
                    <tr
                      key={item.item_id}
                      className={`transition-colors group cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedRecord(item)}
                    >
                      {/* Request ID + type */}
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-[11px] leading-tight text-slate-900 dark:text-white">
                          {item.request_id}
                        </p>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                          item.request_type === 'inter_school'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {item.request_type === 'inter_school' ? 'Inter-School' : 'Home Campus'}
                        </span>
                      </td>

                      {/* Borrower */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar student={item.student} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[150px]">
                              {item.student?.firstname} {item.student?.lastname}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.student?.student_number || 'No ID'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Book */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {item.book?.title}
                        </p>
                        {item.book?.author && (
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            by {item.book.author}
                          </p>
                        )}
                      </td>

                      {/* Timeline */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="text-slate-500 dark:text-slate-400">
                            <span className="opacity-70">Borrowed: </span>
                            <span>{item.borrow_date ? formatPhilippineDate(item.borrow_date) : '—'}</span>
                          </div>
                          <div className={isOverdue(item.due_date, item.status) ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                            <span className="opacity-70">Due: </span>
                            <span>{item.due_date ? formatPhilippineDate(item.due_date) : 'N/A'}</span>
                          </div>
                          {item.return_date && (
                            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="opacity-70">Returned: </span>
                              <span>{formatPhilippineDate(item.return_date)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${meta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedRecord(item); }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto"
                        >
                          Details
                          <FiArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over details drawer ──────────────────────────────────── */}
      {selectedRecord && (
        <>
          {/* Backdrop with frosted glass effect */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedRecord(null)}
          />

          {/* Drawer container */}
          <div
            ref={drawerRef}
            className={`fixed top-0 right-0 h-full w-full max-w-xl z-50 flex flex-col shadow-2xl transition-all duration-300 ease-out ${
              darkMode 
                ? 'bg-slate-900 text-slate-100 border-l border-slate-800' 
                : 'bg-white text-slate-900 border-l border-slate-200'
            }`}
            style={{ animation: 'drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Drawer Header */}
            <div className={`px-6 py-4.5 border-b flex items-start justify-between gap-4 shrink-0 ${
              darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                    Transaction Record
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
                    selectedRecord.request_type === 'inter_school'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                  }`}>
                    {selectedRecord.request_type === 'inter_school' ? 'Inter-School Loan' : 'Home Campus Loan'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <h2 className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {selectedRecord.request_id}
                  </h2>
                  <button
                    onClick={() => handleCopyId(selectedRecord.request_id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    title="Copy Transaction ID"
                  >
                    {copiedId ? <FiCheck className="w-4 h-4 text-emerald-500" /> : <FiCopy className="w-4 h-4" />}
                  </button>
                  {copiedId && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Copied!</span>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close drawer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body - Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
              {/* Circulation Status Card */}
              {(() => {
                const meta = getStatusMeta(selectedRecord);
                const overdue = isOverdue(selectedRecord.due_date, selectedRecord.status);
                return (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
                    darkMode
                      ? overdue
                        ? 'bg-rose-950/30 border-rose-900/60 text-rose-300'
                        : meta.label === 'Returned'
                        ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : meta.color
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full ${meta.dot} ring-4 ${
                        overdue 
                          ? 'ring-rose-200 dark:ring-rose-900/40 animate-pulse' 
                          : 'ring-blue-100 dark:ring-blue-900/40'
                      }`} />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                          Circulation Status
                        </span>
                        <span className="text-base font-black tracking-tight">
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold opacity-75 block">
                        Lifecycle State
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {overdue ? 'Action Required' : (selectedRecord.status || 'Active')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Stepped Visual Audit Timeline */}
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200/80 bg-slate-50/60'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Circulation Audit Timeline
                    </h3>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 font-mono">
                    PST (UTC+8)
                  </span>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {/* Step 1: Requested / Issued */}
                  <TimelineNode
                    icon={FiCalendar}
                    title="Transaction Initiated & Issued"
                    subtitle={selectedRecord.borrow_date ? `Processed: ${formatPhilippineDateTime(selectedRecord.borrow_date)} (${formatRelativeTime(selectedRecord.borrow_date)})` : 'Pending release'}
                    status="completed"
                    darkMode={darkMode}
                  />

                  {/* Step 2: Due Date */}
                  <TimelineNode
                    icon={FiAlertTriangle}
                    title={isOverdue(selectedRecord.due_date, selectedRecord.status) ? "Return Overdue Notice" : "Scheduled Return Due"}
                    subtitle={selectedRecord.due_date ? `${formatPhilippineDateTime(selectedRecord.due_date)} (${formatRelativeTime(selectedRecord.due_date)})` : 'No specific due date assigned'}
                    status={
                      selectedRecord.return_date ? 'completed' :
                      isOverdue(selectedRecord.due_date, selectedRecord.status) ? 'overdue' : 'active'
                    }
                    darkMode={darkMode}
                    badge={isOverdue(selectedRecord.due_date, selectedRecord.status) ? "Overdue" : null}
                  />

                  {/* Step 3: Return / Resolution */}
                  <TimelineNode
                    icon={selectedRecord.return_date ? FiCheckCircle : (selectedRecord.cancellation_reason ? FiXCircle : FiClock)}
                    title={
                      selectedRecord.return_date ? "Returned to Library" :
                      (selectedRecord.cancellation_reason || selectedRecord.status === 'cancelled') ? "Cancelled / Rejected" :
                      "Currently in Circulation"
                    }
                    subtitle={
                      selectedRecord.return_date
                        ? `Inventory Restored: ${formatPhilippineDateTime(selectedRecord.return_date)} (${formatRelativeTime(selectedRecord.return_date)})`
                        : selectedRecord.cancellation_reason
                        ? `Cancellation note: "${selectedRecord.cancellation_reason}"`
                        : "Book is actively checked out to the borrower"
                    }
                    status={
                      selectedRecord.return_date ? 'completed' :
                      (selectedRecord.cancellation_reason || selectedRecord.status === 'cancelled') ? 'cancelled' : 'pending'
                    }
                    darkMode={darkMode}
                  />
                </div>
              </div>

              {/* Borrower Profile Card */}
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200/80 bg-white'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <FiUser className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Borrower Profile
                  </h3>
                </div>

                <div className="flex items-center gap-3.5 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <Avatar student={selectedRecord.student} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedRecord.student?.firstname} {selectedRecord.student?.lastname}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {selectedRecord.student?.student_number || 'No Student ID'}
                      </span>
                      {selectedRecord.student?.school_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {selectedRecord.student.school_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Email Address:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 select-all font-mono">
                      {selectedRecord.student?.email || '—'}
                    </span>
                  </div>
                  {selectedRecord.partner_school && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Partner School:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {selectedRecord.partner_school}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Book Details Card with Cover Artwork */}
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200/80 bg-white'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <FiBook className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Book & Copy Information
                  </h3>
                </div>

                <div className="flex items-start gap-3.5 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  {/* Book Cover Thumbnail with spine styling */}
                  <div className="relative w-16 h-22 flex-shrink-0 rounded-lg overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-slate-900">
                    {selectedRecord.book?.cover_image ? (
                      <img
                        src={getBackendAssetUrl(selectedRecord.book.cover_image)}
                        alt={selectedRecord.book?.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 flex items-center justify-center text-white">
                        <FiBook className="w-6 h-6 opacity-75" />
                      </div>
                    )}
                    <div className="absolute inset-y-0 left-0 w-1 bg-white/20 shadow-inner" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {selectedRecord.book?.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          {selectedRecord.book.category}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedRecord.request_type === 'inter_school' ? 'Inter-School' : 'Home Campus'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {selectedRecord.book?.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      by {selectedRecord.book?.author || 'Unknown Author'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">ISBN:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {selectedRecord.book?.isbn || '—'}
                    </span>
                  </div>
                  {selectedRecord.book_copies?.accession_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Accession Number:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        {selectedRecord.book_copies.accession_number}
                      </span>
                    </div>
                  )}
                  {selectedRecord.book_copies?.shelf_location && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Shelf Location:</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">
                        {selectedRecord.book_copies.shelf_location}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancellation Reason alert if present */}
              {selectedRecord.cancellation_reason && (
                <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-0.5">
                    Cancellation / Rejection Reason
                  </p>
                  <p className="text-xs font-medium">
                    {selectedRecord.cancellation_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className={`px-6 py-4 border-t flex items-center gap-3 shrink-0 ${
              darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/70'
            }`}>
              <button
                onClick={handlePrintSlip}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                <FiPrinter className="w-4 h-4" />
                Print Slip
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── small reusable sub-components ─────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent ${color}`}>
      <span className="font-black">{value}</span>
      <span className="font-medium opacity-70">{label}</span>
    </div>
  );
}

function TimelineNode({ icon: Icon, title, subtitle, status, darkMode, badge }) {
  const statusStyles = {
    completed: {
      dot: 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60',
      title: 'text-slate-900 dark:text-slate-100 font-bold',
    },
    active: {
      dot: 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950/60',
      title: 'text-blue-700 dark:text-blue-300 font-bold',
    },
    overdue: {
      dot: 'bg-rose-500 text-white ring-4 ring-rose-100 dark:ring-rose-950/60 animate-pulse',
      title: 'text-rose-600 dark:text-rose-400 font-black',
    },
    cancelled: {
      dot: 'bg-slate-400 text-white ring-4 ring-slate-100 dark:ring-slate-800',
      title: 'text-slate-500 dark:text-slate-400 font-medium',
    },
    pending: {
      dot: 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 ring-4 ring-slate-100 dark:ring-slate-800/40',
      title: 'text-slate-600 dark:text-slate-400 font-medium',
    },
  };

  const currentStyle = statusStyles[status] || statusStyles.pending;

  return (
    <div className="relative flex items-start gap-3.5">
      <div className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-xs ${currentStyle.dot}`}>
        <Icon className="w-2.5 h-2.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs ${currentStyle.title}`}>{title}</span>
          {badge && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export default LibrarianHistory;
