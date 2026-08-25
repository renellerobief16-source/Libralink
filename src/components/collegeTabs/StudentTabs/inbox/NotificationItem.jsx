import { Bell, X, CheckCircle, Clock } from "lucide-react";

/**
 * NotificationItem component
 * Displays a single notification with icon, title, message, and actions
 */
function NotificationItem({ notification, onRead, onDelete, onClick }) {
  const getIcon = (type) => {
    switch (type) {
      case "BORROW_REQUEST_APPROVED":
        return <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />;
      case "BORROW_REQUEST_REJECTED":
        return <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />;
      case "BORROW_REQUEST_SUBMITTED":
        return <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />;
      case "BOOK_READY_FOR_PICKUP":
        return <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />;
    }
  };

  const getBackgroundColor = (type) => {
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
    <div
      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border shadow-sm hover:shadow-md transition-all ${
        !notification.read
          ? "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white"
          : "border border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${getBackgroundColor(
            notification.type
          )}`}
        >
          {getIcon(notification.type)}
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            onClick(notification);
            onRead(notification.id);
          }}
        >
          <div className="flex items-start justify-between mb-1.5 sm:mb-2">
            <h3 className="font-semibold text-xs sm:text-sm md:text-base truncate text-[#0f172a]">
              {notification.title}
            </h3>
            {!notification.read && (
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full ml-1.5 sm:ml-2 flex-shrink-0 animate-pulse" />
            )}
          </div>
          <p className="text-xs sm:text-sm md:text-base mb-2 sm:mb-3 line-clamp-2 text-slate-600 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-slate-500">
            <span>
              {new Date(notification.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span>
              {new Date(notification.createdAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-2 sm:p-2.5 min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg sm:rounded-xl transition-colors flex-shrink-0 active:scale-95"
          title="Delete notification"
          aria-label="Delete notification"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}

export default NotificationItem;
