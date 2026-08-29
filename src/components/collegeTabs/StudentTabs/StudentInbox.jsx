import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../../../context/NotificationContext";
import api from "../../../utils/api";
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
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

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
        setRequestDetails(response.data);
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
    <div className="animate-slide-up mx-auto w-full max-w-4xl min-w-0 overflow-x-hidden text-sm">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Library updates</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="min-h-10 rounded-xl border border-blue-100 bg-blue-50 px-3 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
              aria-label="Mark all notifications as read"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="min-h-10 rounded-xl border border-rose-100 bg-rose-50 px-3 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100"
              aria-label="Delete all notifications"
            >
              Delete All
            </button>
          )}
        </div>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <NotificationFilters selectedFilter={selectedFilter} onFilterChange={setSelectedFilter} />
      </div>

      <div className="mt-3 space-y-2.5">
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

      {showNotificationModal && selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          requestDetails={requestDetails}
          loading={loadingRequest}
          onClose={() => setShowNotificationModal(false)}
        />
      )}
    </div>
  );
}

export default StudentInbox;
