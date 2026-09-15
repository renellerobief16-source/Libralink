import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  CheckCheck,
  Megaphone,
  QrCode,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../../context/NotificationContext";
import api, { getAnnouncements, getUserNotifications, getBackendAssetUrl } from "../../../utils/api";
import NotificationModal from "./inbox/NotificationModal";
import NotificationEmptyState from "./inbox/NotificationEmptyState";
import QRCodeDisplay from "./QRCodeDisplay";
import { formatPhilippineDate, formatDateTimeWithRelative } from "../../../utils/timeUtils";

function StudentInbox({ isDrawer = false, onClose }) {
  const navigate = useNavigate();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications,
    deleteNotification,
  } = useNotifications();

  const [activeSection, setActiveSection] = useState("alerts"); // 'alerts' | 'news'
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'unread' | 'due' | 'approved' | 'rejected'
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [loadingActiveBorrows, setLoadingActiveBorrows] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedRequestForQR, setSelectedRequestForQR] = useState(null);

  // Current logged in student ID
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch {
      return {};
    }
  }, []);
  const studentId = currentUser?.user_id || currentUser?.id || localStorage.getItem('currentUserId');

  // Format relative time helper
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Helper to format book names in request
  const getRequestBooks = (request) => {
    const titles = (request.items || [])
      .map((item) => item.book?.title || item.book_title || item.title)
      .filter(Boolean);
    return titles.length > 0 ? [...new Set(titles)] : ["Book"];
  };

  const getRequestSchools = (request) => {
    const schools = (request.items || [])
      .map(
        (item) =>
          item.owner_school?.school_name ||
          item.owner_school_name ||
          item.partner_school?.school_name ||
          item.partner_school_name
      )
      .filter(Boolean);
    return [...new Set(schools)];
  };

  const formatList = (items) => {
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  };

  const getApprovalMessage = (request, status) => {
    const books = getRequestBooks(request);
    const schools = getRequestSchools(request);
    const schoolText = schools.length > 0 ? formatList(schools) : "the library";
    const bookText = formatList(books);

    if (status === "rejected") {
      return `Request #${request.request_id} for "${bookText}" was declined by ${schoolText}.`;
    }
    return `Request #${request.request_id} for "${bookText}" is approved by ${schoolText}. Present your QR code at the desk for pickup.`;
  };

  // 1. Fetch Active Borrows for Live Due Date Reminders
  const fetchStudentActiveBorrows = async () => {
    if (!studentId) return;
    setLoadingActiveBorrows(true);
    try {
      const res = await api.get(`/borrow/student/${studentId}/active`);
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : (Array.isArray(res?.data) ? res.data : []);
      setActiveBorrows(list);
    } catch (err) {
      console.warn('Could not fetch active borrows for student:', err);
      setActiveBorrows([]);
    } finally {
      setLoadingActiveBorrows(false);
    }
  };

  // 2. Fetch Borrow Requests
  const fetchBorrowRequests = async () => {
    try {
      const response = await api.get("/borrow-requests/my-requests");
      const items = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response)
        ? response
        : [];
      setBorrowRequests(items);
    } catch (error) {
      setBorrowRequests([]);
    }
  };

  // 3. Fetch Campus Announcements
  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const { data, error } = await getAnnouncements();
      if (!error && Array.isArray(data)) {
        setAnnouncements(data);
      } else if (Array.isArray(data?.data)) {
        setAnnouncements(data.data);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchStudentActiveBorrows();
    fetchBorrowRequests();
    fetchAnnouncements();

    const interval = setInterval(() => {
      fetchStudentActiveBorrows();
      fetchBorrowRequests();
    }, 45000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Compute Active Loans with Due Status
  const activeLoansWithDueStatus = useMemo(() => {
    const today = new Date();
    return activeBorrows.map((borrow) => {
      const dueDate = new Date(borrow.due_date);
      const isOverdue = dueDate < today;
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isDueSoon = !isOverdue && diffDays <= 2;
      const isDueToday = !isOverdue && diffDays === 0;

      return {
        ...borrow,
        isOverdue,
        isDueSoon,
        isDueToday,
        diffDays,
        daysOverdue: Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)),
      };
    });
  }, [activeBorrows]);

  // Generate notifications for approved/rejected requests
  useEffect(() => {
    if (borrowRequests.length === 0) return;

    const acknowledged = JSON.parse(
      localStorage.getItem("acknowledged_statuses") || "{}"
    );

    borrowRequests.forEach((request) => {
      const statusKey = `${request.request_id}_${request.status}`;

      if (!acknowledged[statusKey]) {
        if (request.status === "approved") {
          addNotification({
            type: "BORROW_REQUEST_APPROVED",
            title: "Borrow Request Approved",
            message: getApprovalMessage(request, "approved"),
            related_request_id: request.request_id,
            createdAt: request.updated_at || new Date().toISOString(),
          });
        } else if (request.status === "rejected") {
          addNotification({
            type: "BORROW_REQUEST_REJECTED",
            title: "Borrow Request Declined",
            message: getApprovalMessage(request, "rejected"),
            related_request_id: request.request_id,
            createdAt: request.updated_at || new Date().toISOString(),
          });
        }

        acknowledged[statusKey] = true;
        localStorage.setItem("acknowledged_statuses", JSON.stringify(acknowledged));
      }
    });
  }, [borrowRequests]);

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    markAsRead(notification.id);

    if (notification.related_request_id) {
      setLoadingRequest(true);
      try {
        const response = await api.get(
          `/borrow-requests/${notification.related_request_id}`
        );
        const req = response.data?.data || response.data;
        setRequestDetails(req);
        setSelectedRequestForQR(req);
      } catch (error) {
        setRequestDetails(null);
        setSelectedRequestForQR(null);
      } finally {
        setLoadingRequest(false);
      }
    } else {
      setRequestDetails(null);
      setSelectedRequestForQR(null);
    }
  };

  // Filtered Notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (selectedFilter === "unread") return !n.read;
      if (selectedFilter === "due") {
        return (
          n.type === "due_reminder" ||
          n.type === "overdue_reminder" ||
          n.type === "DUE_REMINDER" ||
          n.type === "OVERDUE_ALERT" ||
          String(n.title || '').toLowerCase().includes('due') ||
          String(n.title || '').toLowerCase().includes('overdue')
        );
      }
      if (selectedFilter === "approved") return n.type === "BORROW_REQUEST_APPROVED" || n.type === "approved";
      if (selectedFilter === "rejected") return n.type === "BORROW_REQUEST_REJECTED" || n.type === "rejected";
      return true;
    });
  }, [notifications, selectedFilter]);

  const unreadAlertsCount = notifications.filter((n) => !n.read).length;
  const dueSoonOrOverdueCount = activeLoansWithDueStatus.filter(l => l.isDueSoon || l.isOverdue).length;

  const getNotificationIcon = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('approved')) {
      return {
        icon: CheckCircle2,
        bg: "bg-emerald-100 text-emerald-600",
        border: "border-emerald-200",
      };
    }
    if (t.includes('rejected') || t.includes('declined')) {
      return {
        icon: XCircle,
        bg: "bg-rose-100 text-rose-600",
        border: "border-rose-200",
      };
    }
    if (t.includes('overdue')) {
      return {
        icon: AlertTriangle,
        bg: "bg-rose-100 text-rose-600",
        border: "border-rose-300",
      };
    }
    if (t.includes('due') || t.includes('reminder') || t.includes('pickup')) {
      return {
        icon: Clock,
        bg: "bg-amber-100 text-amber-600",
        border: "border-amber-200",
      };
    }
    return {
      icon: Bell,
      bg: "bg-blue-100 text-blue-600",
      border: "border-blue-200",
    };
  };

  return (
    <div className={isDrawer ? "w-full pb-6" : "mx-auto w-full max-w-[1280px] px-3 sm:px-5 lg:px-8 py-4 sm:py-6"}>
      {/* Standalone Page Header */}
      {!isDrawer && (
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-2xs">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
                Student Notification Hub
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Notifications & Deadlines
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time updates on book requests, loan countdowns, return reminders, and campus bulletins.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => {
                fetchStudentActiveBorrows();
                fetchBorrowRequests();
                fetchAnnouncements();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Refresh</span>
            </button>
          </div>
        </header>
      )}

      {/* 🌟 STAT SUMMARY PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Total Alerts</span>
            <p className="text-base font-black text-slate-900 leading-tight">{notifications.length}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Due / Overdue</span>
            <p className="text-base font-black text-amber-900 leading-tight">{dueSoonOrOverdueCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Active Loans</span>
            <p className="text-base font-black text-emerald-900 leading-tight">{activeBorrows.length}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/40 border border-purple-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Campus News</span>
            <p className="text-base font-black text-purple-900 leading-tight">{announcements.length}</p>
          </div>
        </div>
      </div>

      {/* 🚨 DYNAMIC DUE DATE & OVERDUE LIVE ALERT BANNER */}
      {dueSoonOrOverdueCount > 0 && (
        <div className="mb-5 space-y-2.5">
          {activeLoansWithDueStatus
            .filter((loan) => loan.isDueSoon || loan.isOverdue)
            .map((loan) => {
              const book = loan.book_copies?.books || {};
              const isOverdue = loan.isOverdue;
              const bookTitle = book.title || "Borrowed Book";

              return (
                <div
                  key={`due-banner-${loan.borrow_id}`}
                  className={`p-4 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                    isOverdue
                      ? "bg-rose-50/90 border-rose-200 text-rose-950"
                      : "bg-amber-50/90 border-amber-200 text-amber-950"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isOverdue ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                      }`}
                    >
                      {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-pulse" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isOverdue
                              ? "bg-rose-200/80 text-rose-900 border border-rose-300"
                              : "bg-amber-200/80 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {isOverdue ? `⚠️ Overdue (${loan.daysOverdue} Days)` : (loan.isDueToday ? "⏰ Due Today" : `⏰ Due in ${loan.diffDays} Days`)}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          Due Date: {formatPhilippineDate(loan.due_date)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-1">
                        {bookTitle}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {isOverdue
                          ? "Please return this book to the circulation desk immediately to avoid fine accumulation."
                          : "Please return or renew this book on or before the due date at the library counter."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isDrawer) {
                        navigate('/studentpage/history');
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-2xs flex items-center justify-center gap-1.5 ${
                      isOverdue
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                  >
                    <span>View Loan Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* Sticky Top Bar: Segmented Switch + Quick Action Links */}
      <div
        className={`z-10 ${
          isDrawer
            ? "sticky -top-2 bg-[#F7FAFC]/95 backdrop-blur-md -mx-3 px-3 py-2 border-b border-slate-200/60 mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
            : "mb-4 border-b border-slate-200 pb-3"
        }`}
      >
        {/* Segmented Pill Switcher */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex rounded-xl bg-slate-200/60 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveSection("alerts");
                setShowNotificationModal(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeSection === "alerts"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bell className="h-3.5 w-3.5 text-blue-600" />
              Alerts & Deadlines
              {unreadAlertsCount > 0 && (
                <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection("news");
                setShowNotificationModal(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeSection === "news"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5 text-purple-600" />
              Campus Bulletins
              {announcements.length > 0 && (
                <span className="ml-0.5 text-[10px] text-slate-500 font-bold bg-purple-100 px-1.5 py-0.2 rounded-full">
                  {announcements.length}
                </span>
              )}
            </button>
          </div>

          {activeSection === "alerts" && notifications.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {unreadAlertsCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark All Read
                </button>
              )}
              <button
                type="button"
                onClick={clearNotifications}
                title="Clear all notifications"
                className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills under Alerts */}
        {activeSection === "alerts" && !showNotificationModal && notifications.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-1">
            {[
              { id: "all", label: `All Alerts (${notifications.length})` },
              { id: "unread", label: `Unread (${unreadAlertsCount})` },
              { id: "due", label: `Due Reminders (${notifications.filter(n => String(n.type || '').toLowerCase().includes('due')).length})` },
              { id: "approved", label: "Approved Passes" },
              { id: "rejected", label: "Declined Requests" },
            ].map((f) => (
              <button
                key={`n-filter-${f.id}`}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`shrink-0 rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  selectedFilter === f.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1: Alerts & Requests */}
      {activeSection === "alerts" && !showNotificationModal && (
        <div className="overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              {filteredNotifications.map((n) => {
                const iconCfg = getNotificationIcon(n.type);
                const IconComponent = iconCfg.icon;
                const isUnread = !n.read;
                const isDueType = String(n.type || '').toLowerCase().includes('due') || String(n.type || '').toLowerCase().includes('overdue');

                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-3.5 p-4 transition-colors ${
                      isUnread
                        ? "bg-blue-50/40 hover:bg-blue-50/70"
                        : "bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Status Icon */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconCfg.border} ${iconCfg.bg} shadow-2xs mt-0.5`}
                    >
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>

                    {/* Content */}
                    <div
                      onClick={() => handleNotificationClick(n)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 animate-pulse" />
                          )}
                          <h4
                            className={`truncate text-xs sm:text-sm font-bold ${
                              isUnread ? "text-slate-900" : "text-slate-700"
                            }`}
                          >
                            {n.title}
                          </h4>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {n.related_request_id && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 border border-blue-200/70 group-hover:bg-blue-100 transition">
                            <QrCode className="h-3 w-3" />
                            View Pickup QR Pass →
                          </span>
                        )}

                        {isDueType && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-200/70">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Check Loan Timeline
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 shrink-0"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal View */}
      {activeSection === "alerts" && showNotificationModal && selectedNotification && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in">
          <button
            type="button"
            onClick={() => setShowNotificationModal(false)}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            ← Back to All Notifications
          </button>
          <NotificationModal
            notification={selectedNotification}
            requestDetails={requestDetails}
            loading={loadingRequest}
            onClose={() => setShowNotificationModal(false)}
          />
        </div>
      )}

      {/* SECTION 2: Campus News (Announcements) */}
      {activeSection === "news" && (
        <div>
          {loadingAnnouncements ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div
                  key={`news-skel-${n}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse space-y-2.5"
                >
                  <div className="h-4 w-1/3 bg-slate-200 rounded-md" />
                  <div className="h-3 w-3/4 bg-slate-200 rounded-md" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-xs">
              <Megaphone className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">No Campus Announcements</h4>
              <p className="text-xs text-slate-500 mt-1">
                There are no current broadcast news or library announcements.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {announcements.map((a) => (
                <article
                  key={a.announcement_id || a.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/60">
                      <Megaphone className="h-3 w-3" />
                      {a.is_global || a.school_id == null
                        ? "Global Institutional Bulletin"
                        : "Campus Library News"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatTimeAgo(a.created_at)}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {a.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {a.content}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-500">Libralink Administration</span>
                    <span className="font-mono">
                      {formatPhilippineDate(a.created_at)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Pass Display Modal */}
      {showQRCode && selectedRequestForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md">
            <QRCodeDisplay
              request={selectedRequestForQR}
              token={selectedRequestForQR.qr_token}
              requestId={selectedRequestForQR.request_id}
              onClose={() => setShowQRCode(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentInbox;

