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
    <div className={isDrawer ? "w-full pb-6" : "mx-auto w-full max-w-4xl px-3 sm:px-6 py-4 sm:py-6"}>
      {/* ─── Minimalist Header ──────────────────────────────────────────────── */}
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Inbox
          </h1>
          {unreadAlertsCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
              {unreadAlertsCount} unread
            </span>
          )}
        </div>

        {/* Quick Utility Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeSection === "alerts" && unreadAlertsCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchStudentActiveBorrows();
              fetchBorrowRequests();
              fetchAnnouncements();
            }}
            className="flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeSection === "alerts" && notifications.length > 0 && (
            <button
              type="button"
              onClick={clearNotifications}
              className="flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear all alerts"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Compact Pinned Due Date & Overdue Alert Bar ────────────────────── */}
      {dueSoonOrOverdueCount > 0 && (
        <div className="mb-4 space-y-2">
          {activeLoansWithDueStatus
            .filter((loan) => loan.isDueSoon || loan.isOverdue)
            .map((loan) => {
              const book = loan.book_copies?.books || {};
              const isOverdue = loan.isOverdue;
              const bookTitle = book.title || "Borrowed Book";

              return (
                <div
                  key={`due-banner-${loan.borrow_id}`}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-colors ${
                    isOverdue
                      ? "bg-rose-50/70 border-rose-200/70 text-rose-950"
                      : "bg-amber-50/70 border-amber-200/70 text-amber-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isOverdue ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isOverdue
                              ? "bg-rose-200 text-rose-900"
                              : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {isOverdue
                            ? `Overdue (${loan.daysOverdue}d)`
                            : loan.isDueToday
                            ? "Due Today"
                            : `Due in ${loan.diffDays}d`}
                        </span>
                        <p className="text-xs font-semibold truncate text-slate-900">
                          {bookTitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isDrawer) {
                        navigate('/studentpage/history');
                      }
                    }}
                    className={`self-end sm:self-center px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                      isOverdue
                        ? "bg-rose-600 text-white hover:bg-rose-700"
                        : "bg-amber-600 text-white hover:bg-amber-700"
                    }`}
                  >
                    <span>View Record</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* ─── Segmented Switcher & Filters ────────────────────────────────────── */}
      <div className="mb-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* iOS-Style Pill Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveSection("alerts");
                setShowNotificationModal(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeSection === "alerts"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bell className="h-3.5 w-3.5 text-blue-600" />
              <span>Alerts</span>
              {unreadAlertsCount > 0 && (
                <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.2 text-[9px] font-bold text-white leading-none">
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeSection === "news"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5 text-purple-600" />
              <span>Campus Bulletins</span>
              {announcements.length > 0 && (
                <span className="ml-0.5 rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 leading-none">
                  {announcements.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Chips under Alerts */}
        {activeSection === "alerts" && notifications.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            {[
              { id: "all", label: `All (${notifications.length})` },
              { id: "unread", label: `Unread (${unreadAlertsCount})` },
              { id: "due", label: `Due Reminders (${notifications.filter(n => String(n.type || '').toLowerCase().includes('due')).length})` },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Declined" },
            ].map((f) => (
              <button
                key={`n-filter-${f.id}`}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedFilter === f.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Flat Borderless Alerts Feed (iOS Style) ─────────────────────────── */}
      {activeSection === "alerts" && (
        <div className="overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white shadow-2xs overflow-hidden">
              {filteredNotifications.map((n) => {
                const iconCfg = getNotificationIcon(n.type);
                const IconComponent = iconCfg.icon;
                const isUnread = !n.read;
                const isDueType = String(n.type || '').toLowerCase().includes('due') || String(n.type || '').toLowerCase().includes('overdue');

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group relative flex items-start gap-3 p-3.5 sm:p-4 cursor-pointer transition-colors ${
                      isUnread
                        ? "bg-blue-50/30 hover:bg-blue-50/60"
                        : "bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Status Icon / Sender Avatar */}
                    {n.sender_profile_picture || n.profile_picture ? (
                      <div className="relative h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center mt-0.5">
                        <img
                          src={getBackendAssetUrl(n.sender_profile_picture || n.profile_picture)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement.querySelector('.notif-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <span className="notif-fallback hidden text-xs font-bold text-slate-700">
                          {(n.sender_name || 'L').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border ${iconCfg.border} ${iconCfg.bg} mt-0.5`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <h4
                            className={`truncate text-xs sm:text-sm font-semibold ${
                              isUnread ? "text-slate-900" : "text-slate-700"
                            }`}
                          >
                            {n.title}
                          </h4>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-400 font-normal">
                          {formatTimeAgo(n.createdAt || n.created_at)}
                        </span>
                      </div>

                      {n.sender_name && n.sender_name !== 'Library Patron' && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                          <span>From: <strong className="text-slate-700 font-medium">{n.sender_name}</strong></span>
                          {n.sender_role && (
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-semibold text-slate-600">
                              {n.sender_role}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {n.related_request_id && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
                            <QrCode className="h-3 w-3" />
                            Pickup QR Pass
                          </span>
                        )}

                        {isDueType && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200/60">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Due Reminder
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Delete on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 shrink-0 self-center"
                      title="Delete alert"
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

      {/* ─── Floating Detail Modal / Mobile Bottom Sheet ────────────────────── */}
      {showNotificationModal && selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowNotificationModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200/80 p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationModal
              notification={selectedNotification}
              requestDetails={requestDetails}
              loading={loadingRequest}
              onClose={() => setShowNotificationModal(false)}
            />
          </div>
        </div>
      )}

      {/* ─── Campus News Feed (Announcements) ────────────────────────────────── */}
      {activeSection === "news" && (
        <div>
          {loadingAnnouncements ? (
            <div className="space-y-2.5">
              {[1, 2].map((n) => (
                <div
                  key={`news-skel-${n}`}
                  className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-2xs animate-pulse space-y-2"
                >
                  <div className="h-4 w-1/3 bg-slate-200 rounded" />
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Megaphone className="h-9 w-9 text-slate-300 mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">No Campus Bulletins</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                There are no current broadcast news or library bulletins.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white shadow-2xs overflow-hidden">
              {announcements.map((a) => {
                const authorPic = a.author?.profile_picture || a.creator_profile_picture || a.profile_image || a.profile_picture;
                const authorName = a.author?.name || a.creator_name || 'Library Administration';
                const authorRole = a.author?.role || a.creator_role || (a.is_global || !a.school_id ? 'Super Admin' : 'Librarian Admin');
                const schoolTag = a.school_code || (a.is_global || !a.school_id ? 'GLOBAL' : null);
                const initials = authorName
                  .split(' ')
                  .filter(Boolean)
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'LA';

                return (
                  <article
                    key={a.announcement_id || a.id}
                    className="p-4 sm:p-5 transition-colors hover:bg-slate-50/60"
                  >
                    {/* Author & Tag Row */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden border border-blue-100">
                          {authorPic ? (
                            <img
                              src={getBackendAssetUrl(authorPic)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fb = e.currentTarget.parentElement.querySelector('.ann-author-initials');
                                if (fb) fb.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <span className={`ann-author-initials ${authorPic ? 'hidden' : 'flex items-center justify-center'}`}>
                            {initials}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                              {authorName}
                            </h4>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                              {authorRole}
                            </span>
                            {schoolTag && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {schoolTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0 font-normal">
                        {formatTimeAgo(a.created_at)}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {a.title}
                    </h3>

                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {a.content}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── QR Pass Modal ─────────────────────────────────────────────────── */}
      {showQRCode && selectedRequestForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
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

