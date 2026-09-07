import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../../context/NotificationContext";
import { API_ORIGIN } from "../../../utils/api";
import {
  Bell,
  CheckCircle,
  ChevronDown,
  Clock,
  X,
} from "lucide-react";

export function StudentHeaderActions({ userInfo, onLogout, className = "" }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");

  const { unreadCount, notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const displayName = userInfo?.first_name || userInfo?.name || "Student";
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const profileImage =
    userInfo?.profile_picture ||
    userInfo?.profile_image ||
    currentUser?.profile_picture ||
    currentUser?.profile_image ||
    "";

  const getProfileImageUrl = (picture) => {
    if (!picture) return "";

    if (
      picture.startsWith("http://") ||
      picture.startsWith("https://") ||
      picture.startsWith("data:") ||
      picture.startsWith("blob:")
    ) {
      return picture;
    }

    if (picture.startsWith("/")) return `${API_ORIGIN}${picture}`;

    return `${API_ORIGIN}/${picture}`;
  };

  const profileImageUrl = getProfileImageUrl(profileImage);

  const handleProfileClick = () => {
    navigate("/studentpage/profile");
    setProfileDropdownOpen(false);
  };

  const handleSettingsClick = () => {
    navigate("/studentpage/settings");
    setProfileDropdownOpen(false);
  };

  const handleNotificationClick = () => {
    setNotificationDropdownOpen((isOpen) => !isOpen);
    setProfileDropdownOpen(false);
  };

  const handleViewAllNotifications = () => {
    navigate("/studentpage/inbox");
    setNotificationDropdownOpen(false);
  };

  const handleNotificationItemClick = (notification) => {
    markAsRead(notification.id);
    setNotificationDropdownOpen(false);
    navigate("/studentpage/inbox");
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (notificationFilter === "all") return true;
    if (notificationFilter === "unread") return !notification.read;
    return notification.type === notificationFilter;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "BORROW_REQUEST_APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "BORROW_REQUEST_REJECTED":
        return <X className="h-4 w-4 text-red-600" />;
      case "BORROW_REQUEST_SUBMITTED":
        return <Bell className="h-4 w-4 text-blue-600" />;
      case "BOOK_READY_FOR_PICKUP":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const getNotificationBgColor = (type) => {
    switch (type) {
      case "BORROW_REQUEST_APPROVED":
        return "bg-green-100";
      case "BORROW_REQUEST_REJECTED":
        return "bg-red-100";
      case "BORROW_REQUEST_SUBMITTED":
        return "bg-blue-100";
      case "BOOK_READY_FOR_PICKUP":
        return "bg-amber-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className={`flex items-center gap-2 md:gap-4 ${className}`}>
      <div className="relative">
        <button
          type="button"
          onClick={handleNotificationClick}
          aria-label="Notifications"
          aria-expanded={notificationDropdownOpen}
          aria-controls="student-notifications-menu"
          className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-1.5 transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 md:p-2"
        >
          <Bell className="h-5 w-5 text-[#0F172A] md:h-6 md:w-6" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>

        {notificationDropdownOpen && (
          <div
            id="student-notifications-menu"
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-full z-[80] mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-[#E5E7EB] bg-white py-2 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.35)]"
          >
            <div className="border-b border-[#E5E7EB] px-4 py-2">
              <p className="text-sm font-semibold text-[#0F172A]">Notifications</p>
              <p className="text-xs text-[#64748B]">{unreadCount} unread</p>
            </div>

            <div className="flex gap-2 border-b border-[#E5E7EB] px-4 py-2">
              {["all", "unread"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setNotificationFilter(filter)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    notificationFilter === filter
                      ? "bg-[#2563EB] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[#64748B]">
                  No notifications
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationItemClick(notification)}
                    className={`block w-full border-b border-[#E5E7EB] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#F8FAFC] ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getNotificationBgColor(notification.type)}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="mb-1 flex items-center justify-between">
                          <span className="truncate text-xs font-semibold text-[#0F172A]">
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                          )}
                        </span>
                        <span className="line-clamp-2 text-xs text-[#64748B]">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-xs text-[#94A3B8]">
                          {new Date(notification.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleViewAllNotifications}
              className="w-full border-t border-[#E5E7EB] px-4 py-2 text-left text-sm font-medium text-[#2563EB] transition-colors hover:bg-[#F8FAFC]"
            >
              View All
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setProfileDropdownOpen((isOpen) => !isOpen);
            setNotificationDropdownOpen(false);
          }}
          aria-label="Open profile menu"
          aria-expanded={profileDropdownOpen}
          className="flex items-center gap-1 md:gap-2"
        >
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#E5E7EB] md:h-10 md:w-10">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#2563EB] text-sm font-semibold text-white md:text-base">
                {(displayName || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[#64748B] transition-transform md:h-4 md:w-4 ${profileDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {profileDropdownOpen && (
          <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg md:w-48">
            <button
              type="button"
              onClick={handleProfileClick}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={handleSettingsClick}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
            >
              Settings
            </button>
            <div className="my-1 border-t border-[#E5E7EB]" />
            <button
              type="button"
              onClick={onLogout}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
