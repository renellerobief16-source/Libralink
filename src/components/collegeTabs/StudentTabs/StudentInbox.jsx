import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  CheckCheck,
  Megaphone,
  ArrowUpRight,
  QrCode,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../../context/NotificationContext";
import api, { getAnnouncements } from "../../../utils/api";
import NotificationModal from "./inbox/NotificationModal";
import NotificationEmptyState from "./inbox/NotificationEmptyState";
import QRCodeDisplay from "./QRCodeDisplay";

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
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'unread' | 'approved' | 'rejected'
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedRequestForQR, setSelectedRequestForQR] = useState(null);

  // Format relative time
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

  // Fetch borrow requests to generate live alerts
  useEffect(() => {
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

    fetchBorrowRequests();
    const interval = setInterval(fetchBorrowRequests, 45000);
    return () => clearInterval(interval);
  }, []);

  // Fetch campus announcements
  useEffect(() => {
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

    fetchAnnouncements();
  }, []);

  // Generate notifications based on borrow requests
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

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === "unread") return !n.read;
    if (selectedFilter === "approved") return n.type === "BORROW_REQUEST_APPROVED";
    if (selectedFilter === "rejected") return n.type === "BORROW_REQUEST_REJECTED";
    return true;
  });

  const unreadAlertsCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "BORROW_REQUEST_APPROVED":
        return {
          icon: CheckCircle2,
          bg: "bg-emerald-100 text-emerald-600",
          border: "border-emerald-200",
        };
      case "BORROW_REQUEST_REJECTED":
        return {
          icon: XCircle,
          bg: "bg-rose-100 text-rose-600",
          border: "border-rose-200",
        };
      case "BOOK_READY_FOR_PICKUP":
        return {
          icon: Sparkles,
          bg: "bg-blue-100 text-blue-600",
          border: "border-blue-200",
        };
      default:
        return {
          icon: Bell,
          bg: "bg-slate-100 text-slate-600",
          border: "border-slate-200",
        };
    }
  };

  return (
    <div className={isDrawer ? "w-full pb-6" : "mx-auto w-full max-w-[1280px] px-3 sm:px-5 lg:px-8 py-4 sm:py-6"}>
      {/* Standalone Page Header */}
      {!isDrawer && (
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
                Inbox & Activity
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Stay updated with your borrow approvals, deadlines, and campus library news.
            </p>
          </div>
        </header>
      )}

      {/* Sticky Top Bar: Segmented Switch + Quick Action Links */}
      <div className={`z-10 ${
        isDrawer
          ? "sticky -top-2 bg-[#F7FAFC]/95 backdrop-blur-md -mx-3 px-3 py-2 border-b border-slate-200/60 mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
          : "mb-4 border-b border-slate-200 pb-3"
      }`}>
        {/* Segmented Pill Switcher */}
        <div className="flex items-center justify-between gap-2">
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
              Alerts & Requests
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
              <Megaphone className="h-3.5 w-3.5 text-indigo-600" />
              Campus News
              {announcements.length > 0 && (
                <span className="ml-0.5 text-[10px] text-slate-400 font-medium">
                  ({announcements.length})
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
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200/60 transition"
                >
                  <CheckCheck className="h-3 w-3" />
                  Read All
                </button>
              )}
              <button
                type="button"
                onClick={clearNotifications}
                title="Clear all notifications"
                className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills under Alerts */}
        {activeSection === "alerts" && !showNotificationModal && notifications.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-1">
            {[
              { id: "all", label: `All (${notifications.length})` },
              { id: "unread", label: `Unread (${unreadAlertsCount})` },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Declined" },
            ].map((f) => (
              <button
                key={`n-filter-${f.id}`}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition ${
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
            <div className="divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              {filteredNotifications.map((n) => {
                const iconCfg = getNotificationIcon(n.type);
                const IconComponent = iconCfg.icon;
                const isUnread = !n.read;

                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-3 p-3 transition-colors ${
                      isUnread
                        ? "bg-blue-50/40 hover:bg-blue-50/70"
                        : "bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Status Icon */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${iconCfg.border} ${iconCfg.bg} shadow-sm mt-0.5`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div
                      onClick={() => handleNotificationClick(n)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <h4
                            className={`truncate text-xs font-bold ${
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

                      {n.related_request_id && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-blue-700 border border-blue-200/60 group-hover:bg-blue-100 transition">
                            <QrCode className="h-3 w-3" />
                            View Pickup Pass →
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 shrink-0"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowNotificationModal(false)}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            ← Back to Alerts
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
            <div className="space-y-2">
              {[1, 2].map((n) => (
                <div
                  key={`news-skel-${n}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse space-y-2"
                >
                  <div className="h-4 w-1/3 bg-slate-200 rounded" />
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <Megaphone className="h-8 w-8 text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-900">No announcements</h4>
              <p className="text-xs text-slate-500 mt-1">
                There are no current campus announcements or library bulletins.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <article
                  key={a.announcement_id || a.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-200/60">
                      <Megaphone className="h-3 w-3" />
                      {a.is_global || a.school_id == null
                        ? "Global Bulletin"
                        : "Campus News"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatTimeAgo(a.created_at)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {a.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {a.content}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Libralink Administration</span>
                    <span>
                      {new Date(a.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
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
