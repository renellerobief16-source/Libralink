import { useEffect, useMemo, useState } from 'react';
import {
  FiBell,
  FiBook,
  FiCheckCircle,
  FiClock,
  FiLogOut,
  FiMail,
} from 'react-icons/fi';
import {
  getNotificationsForUser,
  markNotificationAsRead,
} from '../utils/notifications';

const iconMap = {
  bell: FiBell,
  book: FiBook,
  clock: FiClock,
  check: FiCheckCircle,
  mail: FiMail,
};

function NotificationInbox({ darkMode, userId }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const refreshNotifications = () => {
      if (!userId) {
        setNotifications([]);
        return;
      }

      const savedNotifications = getNotificationsForUser(userId);
      setNotifications(savedNotifications);
    };

    refreshNotifications();

    const handleNotificationStoreChange = () => {
      refreshNotifications();
    };

    window.addEventListener('libralink-notifications-updated', handleNotificationStoreChange);
    window.addEventListener('storage', handleNotificationStoreChange);

    return () => {
      window.removeEventListener('libralink-notifications-updated', handleNotificationStoreChange);
      window.removeEventListener('storage', handleNotificationStoreChange);
    };
  }, [userId]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'unread') return !notification.read;
      return notification.type === selectedFilter;
    });
  }, [notifications, selectedFilter]);

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);

    const nextNotifications = markNotificationAsRead(userId, notification.id);
    setNotifications(nextNotifications);
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Inbox</h1>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {notifications.filter((notification) => !notification.read).length} unread
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'unread', 'reminder', 'success', 'approved', 'info'].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              selectedFilter === filter
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredNotifications.map((notification) => {
          const Icon = iconMap[notification.iconType] || FiBell;
          return (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-3 sm:p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} hover:border-blue-300 transition-colors cursor-pointer ${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  notification.color === 'orange' ? 'bg-orange-100' :
                  notification.color === 'green' ? 'bg-green-100' :
                  notification.color === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    notification.color === 'orange' ? 'text-orange-600' :
                    notification.color === 'green' ? 'text-green-600' :
                    notification.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} text-xs sm:text-sm truncate`}>{notification.title}</h3>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                    )}
                  </div>
                  <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2 line-clamp-2`}>{notification.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{notification.date}</span>
                    <span>•</span>
                    <span>{notification.time}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMail className={`w-8 h-8 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          </div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No notifications</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>You’re all caught up!</p>
        </div>
      )}

      {showNotificationModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedNotification.color === 'orange' ? 'bg-orange-100' :
                  selectedNotification.color === 'green' ? 'bg-green-100' :
                  selectedNotification.color === 'blue' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {(() => {
                    const SelectedIcon = iconMap[selectedNotification.iconType] || FiBell;
                    return <SelectedIcon className={`w-5 h-5 ${
                      selectedNotification.color === 'orange' ? 'text-orange-600' :
                      selectedNotification.color === 'green' ? 'text-green-600' :
                      selectedNotification.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                    }`} />;
                  })()}
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedNotification.title}</h3>
              </div>
              <button onClick={() => setShowNotificationModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <FiLogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{selectedNotification.fullMessage}</p>

              {selectedNotification.hasQRCode && selectedNotification.bookDetails && (
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-4`}>
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Book Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}><span className="font-medium">Title:</span> {selectedNotification.bookDetails.title}</p>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}><span className="font-medium">Author:</span> {selectedNotification.bookDetails.author}</p>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}><span className="font-medium">Pickup Location:</span> {selectedNotification.bookDetails.pickupLocation}</p>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}><span className="font-medium">Pickup Deadline:</span> {selectedNotification.bookDetails.pickupDeadline}</p>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}><span className="font-medium">Loan Period:</span> {selectedNotification.bookDetails.loanPeriod}</p>
                  </div>
                  <div className="mt-4 p-4 bg-white rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-mono text-gray-800 mb-2">{selectedNotification.qrCodeData}</div>
                      <p className="text-xs text-gray-500">Show this code at the circulation desk</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{selectedNotification.date}</span>
                <span>{selectedNotification.time}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationInbox;
