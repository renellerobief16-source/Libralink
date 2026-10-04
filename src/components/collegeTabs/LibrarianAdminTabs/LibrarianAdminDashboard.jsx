import { useState, useEffect, useMemo } from 'react';
import {
  FiBook, FiUsers, FiClock, FiAlertTriangle, FiTrendingUp, FiTrendingDown,
  FiActivity, FiArrowRight, FiDownload, FiRefreshCw, FiCheckCircle, FiXCircle,
  FiLayers, FiSliders, FiShield, FiCalendar, FiEye, FiEyeOff, FiZap, FiAward,
  FiChevronRight, FiChevronDown, FiChevronUp, FiInfo, FiBookOpen, FiDollarSign, FiFilter, FiExternalLink
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import api, { getBackendAssetUrl, consolidateBookInventory } from '../../../utils/api';
import { formatPhilippineDate, formatPhilippineDateTime, formatDateTimeWithRelative } from '../../../utils/timeUtils';
import { AnimatedCounter } from '../../common';

// Currency Icon Helper
const PesoSymbol = ({ className = 'text-xs font-bold' }) => <span className={className}>₱</span>;

function LibrarianAdminDashboard({ 
  onNavigate = () => {}, 
  selectedLibraryId = 'all', 
  onSelectLibrary = () => {}, 
  libraries = [] 
}) {
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState('7d'); // '7d' | '14d' | '30d' | 'all'
  const [chartMetric, setChartMetric] = useState('all'); // 'all' | 'borrows' | 'returns'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Collapsible state for Campus Libraries section with persistence
  const [isLibrariesCollapsed, setIsLibrariesCollapsed] = useState(() => {
    try {
      return localStorage.getItem('libralink_dashboard_hide_libraries') === 'true';
    } catch {
      return false;
    }
  });

  const toggleLibrariesCollapse = () => {
    setIsLibrariesCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('libralink_dashboard_hide_libraries', String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  // Raw Data State
  const [booksList, setBooksList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [librariansList, setLibrariansList] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [finesList, setFinesList] = useState([]);
  const [librariesStats, setLibrariesStats] = useState([]);

  // Live Philippine Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // ─── DATA FETCHING ──────────────────────────────────────────────────
  const fetchDashboardData = async (isManualRefresh = false) => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) return;

    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        booksRes,
        studentsRes,
        librariansRes,
        activeRes,
        overdueRes,
        requestsRes,
        schoolRes,
        finesRes,
        librariesRes
      ] = await Promise.allSettled([
        api.get(`/books/school?school_id=${schoolId}&group=true`),
        api.get(`/users/school/${schoolId}?role_id=4`),
        api.get(`/users/school/${schoolId}?role_id=3`),
        api.get(`/borrow/active/school?school_id=${schoolId}`),
        api.get(`/borrow/overdue?school_id=${schoolId}`),
        api.get(`/borrow-requests/school/${schoolId}`),
        api.get(`/schools/${schoolId}`),
        api.get(`/fines/school/${schoolId}`),
        api.get(`/libraries/school/${schoolId}/stats`)
      ]);

      if (booksRes.status === 'fulfilled' && booksRes.value) {
        const payload = booksRes.value;
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.data?.books) ? payload.data.books : []));
        setBooksList(list);
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value) {
        const payload = studentsRes.value;
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
        setStudentsList(list);
      }
      if (librariansRes.status === 'fulfilled' && librariansRes.value) {
        const payload = librariansRes.value;
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
        setLibrariansList(list);
      }
      if (activeRes.status === 'fulfilled' && activeRes.value) {
        const payload = activeRes.value;
        const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.data?.data) ? payload.data.data : []));
        setActiveLoans(rows);
      }
      if (overdueRes.status === 'fulfilled' && overdueRes.value) {
        const payload = overdueRes.value;
        const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.data?.data) ? payload.data.data : []));
        setOverdueLoans(rows);
      }
      if (requestsRes.status === 'fulfilled' && requestsRes.value) {
        const payload = requestsRes.value;
        const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.data?.data) ? payload.data.data : []));
        setBorrowRequests(rows);
      }
      if (schoolRes.status === 'fulfilled' && schoolRes.value) {
        const payload = schoolRes.value;
        setSchoolInfo(payload?.data || payload);
      }
      if (finesRes.status === 'fulfilled' && finesRes.value) {
        const payload = finesRes.value;
        const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.data?.data) ? payload.data.data : []));
        setFinesList(rows);
      }
      if (librariesRes.status === 'fulfilled' && librariesRes.value) {
        const payload = librariesRes.value;
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.data?.data) ? payload.data.data : []));
        setLibrariesStats(list);
      }
    } catch (err) {
      console.error('[ADMIN DASHBOARD] Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Effective libraries list
  const displayLibraries = useMemo(() => {
    return librariesStats.length > 0 ? librariesStats : libraries;
  }, [librariesStats, libraries]);

  // ─── FILTERED DATA BY SELECTED LIBRARY SCOPE ──────────────────────
  const scopedBooks = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return booksList;
    return booksList.filter(b => String(b.library_id) === String(selectedLibraryId));
  }, [booksList, selectedLibraryId]);

  const scopedStudents = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return studentsList;
    return studentsList.filter(s => String(s.library_id) === String(selectedLibraryId));
  }, [studentsList, selectedLibraryId]);

  const scopedLibrarians = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return librariansList;
    return librariansList.filter(l => String(l.library_id) === String(selectedLibraryId));
  }, [librariansList, selectedLibraryId]);

  // Fast ID lookups for scoped items
  const scopedBookIds = useMemo(() => new Set(scopedBooks.map(b => String(b.book_id || b.id))), [scopedBooks]);
  const scopedStudentIds = useMemo(() => new Set(scopedStudents.map(s => String(s.user_id || s.id))), [scopedStudents]);

  const scopedActiveLoans = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return activeLoans;
    return activeLoans.filter(loan => {
      if (loan.library_id && String(loan.library_id) === String(selectedLibraryId)) return true;
      const bId = String(loan.book_id || loan.book_copies?.books?.book_id || '');
      if (bId && scopedBookIds.has(bId)) return true;
      const sId = String(loan.student_id || loan.student?.user_id || '');
      if (sId && scopedStudentIds.has(sId)) return true;
      return false;
    });
  }, [activeLoans, selectedLibraryId, scopedBookIds, scopedStudentIds]);

  const scopedOverdueLoans = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return overdueLoans;
    return overdueLoans.filter(loan => {
      if (loan.library_id && String(loan.library_id) === String(selectedLibraryId)) return true;
      const bId = String(loan.book_id || loan.book_copies?.books?.book_id || '');
      if (bId && scopedBookIds.has(bId)) return true;
      const sId = String(loan.student_id || loan.student?.user_id || '');
      if (sId && scopedStudentIds.has(sId)) return true;
      return false;
    });
  }, [overdueLoans, selectedLibraryId, scopedBookIds, scopedStudentIds]);

  const scopedBorrowRequests = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return borrowRequests;
    return borrowRequests.filter(req => {
      if (req.library_id && String(req.library_id) === String(selectedLibraryId)) return true;
      const bId = String(req.book_id || req.book?.book_id || '');
      if (bId && scopedBookIds.has(bId)) return true;
      const sId = String(req.user_id || req.student_id || req.student?.user_id || '');
      if (sId && scopedStudentIds.has(sId)) return true;
      if (Array.isArray(req.items)) {
        if (req.items.some(i => scopedBookIds.has(String(i.book_id || i.book?.book_id)))) return true;
      }
      return false;
    });
  }, [borrowRequests, selectedLibraryId, scopedBookIds, scopedStudentIds]);

  const scopedFines = useMemo(() => {
    if (!selectedLibraryId || selectedLibraryId === 'all') return finesList;
    return finesList.filter(fine => {
      if (fine.library_id && String(fine.library_id) === String(selectedLibraryId)) return true;
      const sId = String(fine.user_id || fine.student_id || fine.student?.user_id || '');
      if (sId && scopedStudentIds.has(sId)) return true;
      const bId = String(fine.book_id || fine.loan?.book_id || '');
      if (bId && scopedBookIds.has(bId)) return true;
      return false;
    });
  }, [finesList, selectedLibraryId, scopedBookIds, scopedStudentIds]);

  // ─── COMPUTED METRICS & KPI ENGINE ─────────────────────────────────
  const metrics = useMemo(() => {
    const { totalCopies: consolidatedCopies, availableCopies: consolidatedAvail, totalTitles: consolidatedTitles } = consolidateBookInventory(scopedBooks);
    const totalTitles = consolidatedTitles || scopedBooks.length;
    const totalCopies = consolidatedCopies || scopedBooks.length;
    const availableCopies = consolidatedAvail !== undefined ? consolidatedAvail : scopedBooks.length;
    const activeLoansCount = scopedActiveLoans.length;
    const overdueCount = scopedOverdueLoans.length;
    const totalStudents = scopedStudents.length;
    const totalStaff = scopedLibrarians.length;
    const totalUsers = totalStudents + totalStaff;

    // Circulation Velocity (Returned vs Active)
    const returnedItemsCount = scopedBorrowRequests.filter(r => r.status === 'returned' || r.items?.some(i => i.item_status === 'returned')).length;
    const totalCirculations = activeLoansCount + returnedItemsCount;
    const returnRate = totalCirculations > 0 
      ? ((returnedItemsCount / totalCirculations) * 100).toFixed(1) 
      : (overdueCount === 0 ? '100.0' : '0.0');

    // Fines Outstanding (Sum of pending or unpaid fines)
    const totalFinesPending = scopedFines
      .filter(f => f.status === 'pending' || f.status === 'unpaid')
      .reduce((sum, f) => sum + (parseFloat(f.amount || f.fine_amount) || 0), 0);

    const shelfAvailabilityPercent = totalCopies > 0 ? Math.min(100, Math.round((availableCopies / totalCopies) * 100)) : 0;

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      shelfAvailabilityPercent,
      activeLoansCount,
      overdueCount,
      totalStudents,
      totalStaff,
      totalUsers,
      returnRate,
      returnedItemsCount,
      totalFinesPending
    };
  }, [scopedBooks, scopedStudents, scopedLibrarians, scopedActiveLoans, scopedOverdueLoans, scopedBorrowRequests, scopedFines]);

  // ─── TIME-SERIES CHART DATA GENERATOR (ACCURATE REAL DATA) ────────
  const chartData = useMemo(() => {
    const days = timeRange === '30d' ? 30 : timeRange === '14d' ? 14 : 7;
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isoDate = d.toISOString().split('T')[0];

      // Count actual loans for this day
      const activeBorrowsForDay = scopedActiveLoans.filter(l => {
        const dStr = (l.borrow_date || l.created_at || '').substring(0, 10);
        return dStr === isoDate;
      }).length;

      const requestsForDay = scopedBorrowRequests.filter(r => {
        const dStr = (r.borrow_date || r.approved_at || r.created_at || '').substring(0, 10);
        return dStr === isoDate && (r.status === 'approved' || r.status === 'borrowed' || r.status === 'active' || r.status === 'returned');
      }).length;

      const actualBorrows = Math.max(activeBorrowsForDay, requestsForDay);

      // Actual completed returns for this day
      const actualReturns = scopedBorrowRequests.filter(r => {
        const dStr = (r.returned_at || r.updated_at || '').substring(0, 10);
        return dStr === isoDate && r.status === 'returned';
      }).length;

      // Cross-library / Inter-unit loans
      const interUnitBorrows = scopedActiveLoans.filter(l => {
        const dStr = (l.borrow_date || l.created_at || '').substring(0, 10);
        const isCross = (l.is_cross_school || l.cross_school) || (l.library_id && l.student?.library_id && String(l.library_id) !== String(l.student?.library_id));
        return dStr === isoDate && isCross;
      }).length;

      data.push({
        date: dateStr,
        borrows: actualBorrows,
        returns: actualReturns,
        interSchool: interUnitBorrows,
        total: actualBorrows + actualReturns
      });
    }
    return data;
  }, [timeRange, scopedActiveLoans, scopedBorrowRequests]);

  // Mini Sparkline bars for Active Loans KPI card
  const sparklineBars = useMemo(() => {
    const last7 = chartData.slice(-7);
    const max = Math.max(...last7.map(d => d.borrows), 1);
    return last7.map(d => ({
      date: d.date,
      count: d.borrows,
      percent: Math.max(15, Math.round((d.borrows / max) * 100))
    }));
  }, [chartData]);

  // Circulation Breakdown by Channel
  const circulationBreakdown = useMemo(() => {
    const total = metrics.activeLoansCount + metrics.returnedItemsCount + metrics.overdueCount;
    if (total === 0) {
      const totalC = metrics.totalCopies || 1;
      const shelfPct = Math.round((metrics.availableCopies / totalC) * 100);
      const loanPct = Math.round((metrics.activeLoansCount / totalC) * 100);
      return [
        { label: 'Available on Library Shelf', count: metrics.availableCopies, percent: shelfPct, color: 'bg-blue-600', dot: 'bg-blue-600' },
        { label: 'Currently in Circulation', count: metrics.activeLoansCount, percent: loanPct, color: 'bg-purple-600', dot: 'bg-purple-600' },
        { label: 'Overdue / Follow-up Needed', count: metrics.overdueCount, percent: 0, color: 'bg-rose-500', dot: 'bg-rose-500' }
      ];
    }

    const activePct = Math.round((metrics.activeLoansCount / total) * 100);
    const returnedPct = Math.round((metrics.returnedItemsCount / total) * 100);
    const overduePct = Math.max(0, 100 - activePct - returnedPct);

    return [
      { label: 'Active Checkouts (Borrowers)', count: metrics.activeLoansCount, percent: activePct, color: 'bg-blue-600', dot: 'bg-blue-600' },
      { label: 'Completed Clean Returns', count: metrics.returnedItemsCount, percent: returnedPct, color: 'bg-emerald-500', dot: 'bg-emerald-500' },
      { label: 'Past Due / Overdue Follow-up', count: metrics.overdueCount, percent: overduePct, color: 'bg-rose-500', dot: 'bg-rose-500' }
    ];
  }, [metrics]);

  // ─── TOP CIRCULATING BOOKS LEADERBOARD ─────────────────────────────
  const topBooks = useMemo(() => {
    if (scopedBooks.length === 0) return [];
    return [...scopedBooks]
      .sort((a, b) => (parseInt(b.borrow_count || b.popularity || 0) - parseInt(a.borrow_count || a.popularity || 0)))
      .slice(0, 5);
  }, [scopedBooks]);

  // ─── RECENT ACTIVITY FEED ──────────────────────────────────────────
  const recentActivities = useMemo(() => {
    const list = [];
    
    // Active loans as recent borrows
    scopedActiveLoans.slice(0, 4).forEach((loan) => {
      const book = loan.book_copies?.books || {};
      const student = loan.student || {};
      list.push({
        id: `loan-${loan.borrow_id || loan.id}`,
        type: 'borrow',
        title: 'Book Checked Out',
        description: `"${book.title || 'Library Title'}" checked out by ${student.firstname ? `${student.firstname} ${student.lastname}` : 'Student Borrower'}`,
        timestamp: loan.borrow_date || loan.created_at || new Date().toISOString(),
        badgeColor: 'blue',
        badgeText: 'Active Loan'
      });
    });

    // Overdue items as alert notices
    scopedOverdueLoans.slice(0, 2).forEach((od) => {
      const book = od.book_copies?.books || {};
      const student = od.student || {};
      list.push({
        id: `od-${od.borrow_id || od.id}`,
        type: 'overdue',
        title: 'Overdue Notice',
        description: `"${book.title || 'Library Title'}" is past its due date (${student.firstname ? `${student.firstname} ${student.lastname}` : 'Student Borrower'})`,
        timestamp: od.due_date || od.created_at || new Date().toISOString(),
        badgeColor: 'rose',
        badgeText: 'Overdue'
      });
    });

    // Sort by timestamp descending
    return list.slice(0, 5);
  }, [scopedActiveLoans, scopedOverdueLoans]);

  // ─── CSV REPORT EXPORT ──────────────────────────────────────────────
  const handleExportReport = () => {
    const schoolName = schoolInfo?.school_name || 'LibraLink Campus';
    const rows = [
      ['LibraLink Library Executive Circulation & Operations Report'],
      ['Generated On', formatPhilippineDateTime(new Date())],
      ['Campus', schoolName],
      ['Timeframe', timeRange.toUpperCase()],
      [],
      ['Metric', 'Value', 'Status / Context'],
      ['Total Catalog Titles', metrics.totalTitles, 'Catalogued in Library'],
      ['Total Physical Copies', metrics.totalCopies, `${metrics.availableCopies} available on shelf (${metrics.shelfAvailabilityPercent}%)`],
      ['Active Circulations', metrics.activeLoansCount, 'Currently with student borrowers'],
      ['Overdue Circulations', metrics.overdueCount, 'Requires librarian desk follow-up'],
      ['On-Time Return Rate', `${metrics.returnRate}%`, 'Circulation efficiency metric'],
      ['Total Registered Users', metrics.totalUsers, `${metrics.totalStudents} Students, ${metrics.totalStaff} Librarians/Staff`],
      ['Outstanding Penalties Est.', `₱${metrics.totalFinesPending.toFixed(2)}`, 'Unsettled library fines'],
      [],
      ['Recent Active Loans Summary'],
      ['Loan ID', 'Book Title', 'Student Borrower', 'Borrow Date', 'Due Date']
    ];

    scopedActiveLoans.forEach((l) => {
      const b = l.book_copies?.books || {};
      const s = l.student || {};
      rows.push([
        l.borrow_id || l.id,
        `"${b.title || 'Book'}"`,
        `"${s.firstname ? `${s.firstname} ${s.lastname}` : 'Student'}"`,
        l.borrow_date || '—',
        l.due_date || '—'
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LibraLink_Executive_Report_${schoolInfo?.school_code || 'SRC'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-slide-up space-y-4 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. COMPACT HEADER WITH TIMEFRAME CONTROLS & REPORT EXPORT
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 shadow-lg border border-slate-800">
        {/* Background Subtle Mesh Accents */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-wide">
                <FiShield className="w-3 h-3 text-blue-400" />
                <span>Librarian Admin Control Center</span>
                <span className="w-1 h-1 rounded-full bg-blue-400" />
                <span className="text-white font-medium">{schoolInfo?.school_name || 'Consortium Campus'}</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 font-mono text-[11px] text-slate-300">
                <FiClock className="w-3 h-3 text-emerald-400" />
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} PST
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {getGreeting()}, Admin Librarian! <span className="text-lg">👋</span>
            </h1>
          </div>

          {/* Time-Range Selector & Export Hub */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Period Switcher */}
            <div className="flex items-center p-0.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              {[
                { id: '7d', label: '7 Days' },
                { id: '14d', label: '14 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All-Time' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    timeRange === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition disabled:opacity-50"
              title="Refresh Real-Time Stats"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. COMPACT EXECUTIVE KPI METRIC CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Catalog Volume & Capacity */}
        <div className="relative group bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Books
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FiBook className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : <AnimatedCounter value={metrics.totalCopies || metrics.totalTitles} />}
            </h3>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
              {metrics.shelfAvailabilityPercent}% shelf
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Unique Titles:</span>
            <span className="font-bold text-slate-800">
              <AnimatedCounter value={metrics.totalTitles} />
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${metrics.shelfAvailabilityPercent}%` }} />
          </div>
          <div className="text-[9px] text-slate-400 mt-1 text-right">
            <AnimatedCounter value={metrics.availableCopies} suffix=" avail" /> • <AnimatedCounter value={metrics.shelfAvailabilityPercent} suffix="% shelf" />
          </div>
        </div>

        {/* KPI 2: Active Circulations & Loans */}
        <div className="relative group bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Active Loans
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FiClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : <AnimatedCounter value={metrics.activeLoansCount} />}
            </h3>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
              Live
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Velocity:</span>
            <span className="font-bold text-indigo-700 font-mono">
              {metrics.activeLoansCount === 1 ? '1 active checkout' : `${metrics.activeLoansCount} active checkouts`}
            </span>
          </div>
          <div className="h-3.5 mt-1.5 flex items-end gap-1" title="7-day live borrowing activity">
            {sparklineBars.map((bar, idx) => (
              <div
                key={idx}
                style={{ height: `${bar.percent}%` }}
                title={`${bar.date}: ${bar.count} borrows`}
                className="flex-1 bg-indigo-200 group-hover:bg-indigo-500 rounded-xs transition-colors"
              />
            ))}
          </div>
        </div>

        {/* KPI 3: On-Time Return Rate */}
        <div className="relative group bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Return Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FiCheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : <AnimatedCounter value={metrics.returnRate} decimals={1} suffix="%" />}
            </h3>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
              {metrics.returnedItemsCount} Returned
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Compliance:</span>
            <span className={`font-bold ${
              parseFloat(metrics.returnRate) >= 90 ? 'text-emerald-700' :
              parseFloat(metrics.returnRate) >= 75 ? 'text-blue-700' :
              parseFloat(metrics.returnRate) >= 50 ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {parseFloat(metrics.returnRate) >= 90 ? 'Excellent' :
               parseFloat(metrics.returnRate) >= 75 ? 'Good' :
               parseFloat(metrics.returnRate) >= 50 ? 'Fair' : 'Attention'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${metrics.returnRate}%` }} />
          </div>
          <div className="text-[9px] text-slate-400 mt-1 text-right font-medium">
            Timeline compliance
          </div>
        </div>

        {/* KPI 4: Overdue & Penalty Risk */}
        <div className="relative group bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Overdue & Fines
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <FiAlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : <AnimatedCounter value={metrics.overdueCount} />}
            </h3>
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
              metrics.overdueCount > 0 ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
            }`}>
              {metrics.overdueCount > 0 ? `${metrics.overdueCount} Overdue` : 'All Clear'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Pending:</span>
            <span className="font-bold text-rose-600 flex items-center gap-0.5">
              <PesoSymbol className="font-mono text-xs" />
              <AnimatedCounter value={metrics.totalFinesPending} decimals={2} />
            </span>
          </div>
          <button
            onClick={() => onNavigate('reported-overdue')}
            className="w-full mt-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center justify-end gap-1"
          >
            <span>Review Overdue</span>
            <FiChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* KPI 5: Registered User Community */}
        <div className="relative group bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-purple-300 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              User Community
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FiUsers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : <AnimatedCounter value={metrics.totalUsers} />}
            </h3>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-mono">
              {selectedLibraryId !== 'all' ? 'Unit Users' : 'Campus Total'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Users:</span>
            <span className="font-bold text-slate-800">
              <AnimatedCounter value={metrics.totalStudents} suffix=" St" /> / <AnimatedCounter value={metrics.totalStaff} suffix=" Lib" />
            </span>
          </div>
          <button
            onClick={() => onNavigate('users')}
            className="w-full mt-1.5 text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center justify-end gap-1"
          >
            <span>Manage Users</span>
            <FiChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2.5. CAMPUS LIBRARIES OVERVIEW (COLLAPSIBLE)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiLayers className="w-5 h-5 text-blue-600" />
                Campus Libraries & Multi-Unit Holdings
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {displayLibraries.length} {displayLibraries.length === 1 ? 'Library Unit' : 'Library Units'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated view of all separate educational and branch libraries under {schoolInfo?.school_name || 'this campus'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedLibraryId !== 'all' && (
              <button
                onClick={() => onSelectLibrary('all')}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
              >
                Clear Filter (View Campus All)
              </button>
            )}
            {/* HIDE / SHOW BUTTON */}
            <button
              onClick={toggleLibrariesCollapse}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
                isLibrariesCollapsed
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isLibrariesCollapsed ? "Show Campus Libraries Unit cards" : "Hide Campus Libraries Unit cards to focus directly on analytics"}
            >
              {isLibrariesCollapsed ? (
                <>
                  <FiEye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Show Units</span>
                  <FiChevronDown className="w-3.5 h-3.5 text-blue-600" />
                </>
              ) : (
                <>
                  <FiEyeOff className="w-3.5 h-3.5 text-slate-600" />
                  <span>Hide Units</span>
                  <FiChevronUp className="w-3.5 h-3.5 text-slate-600" />
                </>
              )}
            </button>
            <button
              onClick={() => onNavigate('libraries')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <span>Manage Libraries Directory</span>
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isLibrariesCollapsed ? (
          <div 
            onClick={toggleLibrariesCollapse}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 hover:to-blue-50/70 rounded-2xl border border-dashed border-slate-200 hover:border-blue-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                <FiLayers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    {displayLibraries.length} Library Units Configured (Cards Collapsed)
                  </span>
                  {selectedLibraryId !== 'all' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      Active Scope: {displayLibraries.find(l => String(l.id || l.library_id) === String(selectedLibraryId))?.name || 'Selected Unit'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Holding cards hidden so you can inspect checkout velocity and distribution charts immediately • Click anywhere to expand
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 shrink-0 self-end sm:self-auto">
              <span>Show {displayLibraries.length} Units</span>
              <FiChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
            </span>
          </div>
        ) : (
          /* Libraries Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayLibraries.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No libraries configured yet. Click "Manage Libraries Directory" to create a library unit.
              </div>
            ) : (
              displayLibraries.map((lib, idx) => {
                const libKey = lib.library_id || lib.id || idx;
                const isSelected = String(selectedLibraryId) === String(lib.library_id || lib.id);
                const typeLabel = lib.library_type === 'college' ? 'College Library'
                  : lib.library_type === 'senior_high_school' ? 'SHS Library'
                  : lib.library_type === 'junior_high_school' ? 'JHS Library'
                  : lib.library_type === 'elementary' ? 'Elementary'
                  : 'Specialized';

                return (
                  <div
                    key={libKey}
                    className={`rounded-2xl p-4 border transition-all relative ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-slate-50/50 hover:bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">
                            {lib.library_type === 'college' ? '📚' : lib.library_type === 'senior_high_school' ? '🎓' : lib.library_type === 'junior_high_school' ? '🎒' : '📖'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm truncate" title={lib.name}>
                            {lib.name}
                          </h4>
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                          {typeLabel}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lib.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {lib.status || 'active'}
                      </span>
                    </div>

                    {lib.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                        {lib.description}
                      </p>
                    )}

                    {/* 3 mini stats */}
                    <div className="grid grid-cols-3 gap-2 bg-white rounded-xl p-2.5 border border-slate-100 mb-3 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Books</div>
                        <div className="text-xs font-bold text-slate-800">{lib.total_books || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Students</div>
                        <div className="text-xs font-bold text-slate-800">{lib.total_students || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Staff</div>
                        <div className="text-xs font-bold text-slate-800">{lib.total_librarians || 0}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => onSelectLibrary(isSelected ? 'all' : (lib.library_id || lib.id))}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ Viewing Library' : 'Select Scope'}
                      </button>
                      <button
                        onClick={() => onNavigate('libraries')}
                        className="text-[11px] text-slate-500 hover:text-blue-600 font-medium cursor-pointer"
                      >
                        Edit Unit →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE CIRCULATION & LENDING TRENDS ANALYTICS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Circulation Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5 text-blue-600" />
                Circulation & Checkout Velocity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily borrows, returns, and inter-school consortial lending trends
              </p>
            </div>

            {/* Metric Toggle Chips */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-center">
              <button
                onClick={() => setChartMetric('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChartMetric('borrows')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'borrows' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Borrows
              </button>
              <button
                onClick={() => setChartMetric('returns')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'returns' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Returns
              </button>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="borrowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="partnerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                          <p className="font-bold text-slate-300 border-b border-slate-700 pb-1">{label}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}:
                              </span>
                              <span className="font-bold font-mono">{entry.value} books</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {(chartMetric === 'all' || chartMetric === 'borrows') && (
                  <Area
                    type="monotone"
                    dataKey="borrows"
                    name="Home Borrows"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#borrowGrad)"
                  />
                )}
                {(chartMetric === 'all' || chartMetric === 'returns') && (
                  <Area
                    type="monotone"
                    dataKey="returns"
                    name="Completed Returns"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#returnGrad)"
                  />
                )}
                {chartMetric === 'all' && (
                  <Area
                    type="monotone"
                    dataKey="interSchool"
                    name="Inter-School Access"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#partnerGrad)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consortium Circulation & Lending Channel Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FiLayers className="w-5 h-5 text-indigo-600" />
                  Consortium Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Circulation breakdown by channel</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                Consortium
              </span>
            </div>

            {/* Visual Channel Breakdown Bars */}
            <div className="mt-5 space-y-4">
              {circulationBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.dot} shrink-0`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[11px] text-slate-500 font-mono">({item.count})</span>
                      <span className="font-mono font-bold text-slate-900">{item.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all duration-700`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Summary Callout */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
            <FiShield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-indigo-950">Active Library Policy</h4>
              <p className="text-indigo-800 text-[11px] mt-0.5 leading-relaxed">
                Standard Loan: <strong>7 Days</strong> • Hold Window: <strong>1-3 Days</strong> • Inter-school: <strong>Reading Room Permitted</strong>
              </p>
              <button
                onClick={() => onNavigate('policies')}
                className="mt-2 text-indigo-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>Edit Policy Rules</span>
                <FiArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TOP CIRCULATING BOOKS & LIVE ACTIVITY STREAM
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Circulating Books Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FiAward className="w-5 h-5 text-amber-500" />
                Top Circulating Titles
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Most requested and borrowed books in this campus</p>
            </div>
            <button
              onClick={() => onNavigate('books')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All Catalog</span>
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topBooks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <FiBook className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <span>No circulating books recorded yet.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topBooks.map((book, idx) => {
                const cover = book.cover_image;
                return (
                  <div key={book.book_id || idx} className="py-3.5 flex items-center justify-between gap-4 group hover:bg-slate-50/70 rounded-xl px-2 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Rank Medal / Badge */}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-amber-50 text-amber-900' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>

                      {/* Book Thumbnail */}
                      {cover ? (
                        <img
                          src={getBackendAssetUrl(cover)}
                          alt={book.title || 'Book Cover'}
                          className="w-9 h-13 rounded-md object-cover border border-slate-200 shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-13 rounded-md bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-2xs">
                          <FiBook className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug" title={book.title}>
                          {book.title || 'Library Resource Title'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          by <span className="font-medium text-slate-700">{book.author || 'Author'}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {book.category && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                              {book.category}
                            </span>
                          )}
                          {book.call_number && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-200">
                              {book.call_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-black text-xs font-mono">
                        {book.borrow_count || 0} Borrows
                      </span>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5 font-mono">
                        {book.available_copies !== undefined ? book.available_copies : 0} on shelf
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Circulation & Overdue Stream */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FiActivity className="w-5 h-5 text-emerald-600" />
                Live Desk Stream
              </h3>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <FiCheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <span>All desk circulations up to date!</span>
              </div>
            ) : (
              <div className="mt-3 space-y-3.5">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      act.badgeColor === 'rose' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {act.badgeColor === 'rose' ? <FiAlertTriangle className="w-4 h-4" /> : <FiBookOpen className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatDateTimeWithRelative(act.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5 line-clamp-2">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('activity')}
            className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <span>View Complete Activity Log</span>
            <FiArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. QUICK ADMIN ACTION HUB & WORKFLOW SHORTCUTS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FiZap className="w-5 h-5 text-indigo-600" />
            Administrative Workflow Shortcuts
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quickly navigate to campus management modules and execute administrative actions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Action 1: Books Management */}
          <button
            onClick={() => onNavigate('books')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiBook className="w-5 h-5" />
              </div>
              <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 group-hover:text-blue-700">
                Books Management
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Add titles, edit copies, or import Excel
              </span>
            </div>
          </button>

          {/* Action 2: Staff & Users */}
          <button
            onClick={() => onNavigate('users')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiUsers className="w-5 h-5" />
              </div>
              <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 group-hover:text-purple-700">
                Users & Staff Directory
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Register librarians and student accounts
              </span>
            </div>
          </button>

          {/* Action 3: Borrowing Policies */}
          <button
            onClick={() => onNavigate('policies')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FiSliders className="w-5 h-5" />
              </div>
              <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                Borrowing & Hold Policies
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Configure loan periods and hold windows
              </span>
            </div>
          </button>

          {/* Action 4: Fines & Penalties */}
          <button
            onClick={() => onNavigate('fines')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform font-bold">
                <PesoSymbol className="text-base" />
              </div>
              <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                Fines & Settlements
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Review and clear overdue penalty records
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LibrarianAdminDashboard;
