import { Bell, X, CheckCircle, Clock } from "lucide-react";

/**
 * NotificationItem component
 * Displays a single notification with icon, title, message, and actions
 */
function NotificationItem({ notification, onRead, onDelete, onClick }) {
  const getIcon = (type) => {
    switch (type) {
      case "BORROW_REQUEST_APPROVED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "BORROW_REQUEST_REJECTED":
        return <X className="w-4 h-4 text-red-600" />;
      case "BORROW_REQUEST_SUBMITTED":
        return <Bell className="w-4 h-4 text-blue-600" />;
      case "BOOK_READY_FOR_PICKUP":
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
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
      className={`border-b p-2 transition-colors last:border-b-0 ${
        !notification.read
          ? "border-l-2 border-l-blue-500 bg-blue-50/40"
          : "border-slate-200 bg-transparent hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${getBackgroundColor(
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
          <div className="mb-1 flex items-start justify-between">
            <h3 className="truncate text-xs font-semibold text-[#0f172a]">
              {notification.title}
            </h3>
            {!notification.read && (
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full ml-1.5 sm:ml-2 flex-shrink-0 animate-pulse" />
            )}
          </div>
          <p className="mb-1 line-clamp-2 text-[11px] leading-snug text-slate-600">
            {notification.message}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Delete notification"
          aria-label="Delete notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default NotificationItem;
