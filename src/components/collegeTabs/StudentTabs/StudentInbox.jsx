import { useState, useEffect } from "react";
import { useNotifications } from "../../../context/NotificationContext";
import api, { getAnnouncements } from "../../../utils/api";
import NotificationItem from "./inbox/NotificationItem";
import NotificationModal from "./inbox/NotificationModal";
import NotificationFilters from "./inbox/NotificationFilters";
import NotificationEmptyState from "./inbox/NotificationEmptyState";

function StudentInbox() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications,
    deleteNotification,
  } = useNotifications();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("inbox");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  const getRequestBooks = (request) => {
    const titles = (request.items || [])
      .map((item) => item.book?.title || item.book_title || item.title)
      .filter(Boolean);
    return titles.length > 0 ? [...new Set(titles)] : ['Book'];
  };

  const getRequestSchools = (request) => {
    const schools = (request.items || [])
      .map((item) => item.owner_school?.school_name || item.owner_school_name || item.partner_school?.school_name || item.partner_school_name)
      .filter(Boolean);
    return [...new Set(schools)];
  };

  const formatList = (items) => {
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  };

  const getApprovalMessage = (request, status) => {
    const books = getRequestBooks(request);
    const schools = getRequestSchools(request);
    const schoolText = schools.length > 0 ? formatList(schools) : 'the library';
    const bookText = formatList(books);

    if (status === 'rejected') {
      return `Request ${request.request_id} for ${bookText} was rejected by ${schoolText}. Please contact the library for more information.`;
    }

    return `Request ${request.request_id} for ${bookText} was approved by ${schoolText}. Please check the borrowing instructions and bring your QR code and required ID.`;
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unread") return !notification.read;
    return notification.type === selectedFilter;
  });


  // Fetch student's borrow requests to check for status changes
  useEffect(() => {
    const fetchBorrowRequests = async () => {
      setLoadingRequests(true);
      try {
        console.log("Fetching borrow requests using /my-requests endpoint");
        const response = await api.get("/borrow-requests/my-requests");
        console.log("Borrow requests response:", response.data);
        setBorrowRequests(response.data || []);
      } catch (error) {
        console.error("Error fetching borrow requests:", error);
        setBorrowRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchBorrowRequests();

    // Poll every 30 seconds to check for status changes
    const interval = setInterval(fetchBorrowRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
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
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Generate notifications based on borrow request status
  useEffect(() => {
    if (borrowRequests.length === 0) {
      console.log("No borrow requests to check");
      return;
    }

    console.log("Checking borrow requests for notifications:", borrowRequests);

    const acknowledgedStatuses = JSON.parse(localStorage.getItem("acknowledged_statuses") || "{}");

    borrowRequests.forEach((request) => {
      const statusKey = `${request.request_id}_${request.status}`;
      console.log(
        "Checking request:",
        request.request_id,
        "Status:",
        request.status,
        "Acknowledged:",
        acknowledgedStatuses[statusKey],
      );

      // Only add notification if this status hasn't been acknowledged yet
      if (!acknowledgedStatuses[statusKey]) {
        if (request.status === "approved") {
          const hasOtherSchoolItems = request.items?.some(
            (item) => item.owner_school_id !== request.home_school_id,
          );

          if (hasOtherSchoolItems) {
            const partnerSchools = [
              ...new Set(
                request.items
                  ?.filter((item) => item.owner_school_id !== request.home_school_id)
                  .map((item) => item.partner_school_name),
              ),
            ];

            console.log("Adding partner school approval notification");
            addNotification({
              type: "BORROW_REQUEST_APPROVED",
              title: "Borrow Request Approved - Partner School",
              message: getApprovalMessage(request, 'approved'),
              related_request_id: request.request_id,
            });
          } else {
            console.log("Adding home school approval notification");
            addNotification({
              type: "BORROW_REQUEST_APPROVED",
              title: "Borrow Request Approved",
              message: getApprovalMessage(request, 'approved'),
              related_request_id: request.request_id,
            });
          }
        } else if (request.status === "rejected") {
          console.log("Adding rejection notification");
          addNotification({
            type: "BORROW_REQUEST_REJECTED",
            title: "Borrow Request Rejected",
            message: getApprovalMessage(request, 'rejected'),
            related_request_id: request.request_id,
          });
        }

        // Mark this status as acknowledged
        acknowledgedStatuses[statusKey] = true;
        localStorage.setItem("acknowledged_statuses", JSON.stringify(acknowledgedStatuses));
      }
    });
  }, [borrowRequests]);

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    markAsRead(notification.id);

    // Fetch request details if it has a related_request_id
    if (notification.related_request_id) {
      setLoadingRequest(true);
      try {
        const response = await api.get(`/borrow-requests/${notification.related_request_id}`);
        setRequestDetails(response.data?.data || response.data);
      } catch (error) {
        console.error("Error fetching request details:", error);
        setRequestDetails(null);
      } finally {
        setLoadingRequest(false);
      }
    } else {
      setRequestDetails(null);
    }
  };


  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 overflow-x-hidden text-sm">
      <header className="mb-3">
        <h1 className="mb-3 px-1 text-xl font-bold tracking-tight text-slate-900 md:hidden">Inbox</h1>
        <div className="flex items-center justify-center gap-5 border-b border-slate-200">
          {[
            ["updates", "Updates"],
            ["inbox", "Inbox"],
          ].map(([section, label]) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`border-b-2 px-1 pb-1.5 text-xs font-semibold transition-colors ${
                activeSection === section
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              aria-pressed={activeSection === section}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {activeSection === "updates" && <div className="mb-3 px-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Campus updates</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">Announcements</h2>
          </div>
        </div>

        {loadingAnnouncements ? (
          <p className="text-sm text-slate-500">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements right now.</p>
        ) : (
          <div className="space-y-1.5">
            {announcements.slice(0, 4).map((announcement) => (
              <div key={announcement.announcement_id || announcement.id} className="border-b border-slate-200 py-2 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                  {(announcement.school_id == null || announcement.is_global) && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Global
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{announcement.content}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {new Date(announcement.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>}

      {activeSection === "inbox" && !showNotificationModal && <>
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <p className="text-xs text-slate-500">
            {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}
          </p>
          <div className="flex gap-2">
            {unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="text-[11px] font-semibold text-blue-600">Mark all read</button>}
            {notifications.length > 0 && <button type="button" onClick={clearNotifications} className="text-[11px] font-semibold text-rose-600">Delete all</button>}
          </div>
        </div>
        <div className="px-1">
          <NotificationFilters selectedFilter={selectedFilter} onFilterChange={setSelectedFilter} />
        </div>

        <div className="mt-2 space-y-1.5">
          {filteredNotifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
              />
            ))
          )}
        </div>

      </>}

      {activeSection === "inbox" && showNotificationModal && selectedNotification && (
        <section className="mt-2 w-full" aria-label="Request details page">
          <button
            type="button"
            onClick={() => setShowNotificationModal(false)}
            className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            Back to Inbox
          </button>
          <NotificationModal
            notification={selectedNotification}
            requestDetails={requestDetails}
            loading={loadingRequest}
            onClose={() => setShowNotificationModal(false)}
          />
        </section>
      )}

    </div>
  );
}

export default StudentInbox;
