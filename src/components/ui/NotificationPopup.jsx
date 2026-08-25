import { useState, useEffect } from 'react';
import { FiBell, FiX, FiCheckCircle, FiXCircle, FiBook, FiClock } from 'react-icons/fi';
import { useNotifications } from '../../context/NotificationContext';

const NotificationPopup = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [visiblePopup, setVisiblePopup] = useState(null);

  // Show popup for new notifications
  useEffect(() => {
    if (unreadCount > 0 && notifications.length > 0) {
      const latest = notifications[0];
      if (!latest.read && !latest.shown) {
        setVisiblePopup(latest);
        // Mark as shown after 5 seconds
        setTimeout(() => {
          setVisiblePopup(null);
          // Update notification to mark as shown
          markAsRead(latest.id);
        }, 5000);
      }
    }
  }, [notifications, unreadCount, markAsRead]);

  const getIcon = (type) => {
    switch (type) {
      case 'BORROW_REQUEST_APPROVED':
        return <FiCheckCircle className="w-6 h-6 text-green-500" />;
      case 'BORROW_REQUEST_REJECTED':
        return <FiXCircle className="w-6 h-6 text-red-500" />;
      case 'BORROW_REQUEST_SUBMITTED':
        return <FiBook className="w-6 h-6 text-blue-500" />;
      case 'BOOK_READY_FOR_PICKUP':
        return <FiClock className="w-6 h-6 text-amber-500" />;
      default:
        return <FiBell className="w-6 h-6 text-slate-500" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'BORROW_REQUEST_APPROVED':
        return 'bg-green-50 border-green-200';
      case 'BORROW_REQUEST_REJECTED':
        return 'bg-red-50 border-red-200';
      case 'BORROW_REQUEST_SUBMITTED':
        return 'bg-blue-50 border-blue-200';
      case 'BOOK_READY_FOR_PICKUP':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <>
      {/* Popup Notification */}
      {visiblePopup && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className={`bg-white rounded-lg shadow-lg border-2 p-4 max-w-sm ${getBackgroundColor(visiblePopup.type)}`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getIcon(visiblePopup.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{visiblePopup.title}</p>
                <p className="text-sm text-slate-700 mt-1">{visiblePopup.message}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(visiblePopup.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setVisiblePopup(null)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Bell Button */}
      <div className="relative z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative"
          aria-label="Notifications"
        >
          <FiBell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-[#2D8AC4]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FiBell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationPopup;
