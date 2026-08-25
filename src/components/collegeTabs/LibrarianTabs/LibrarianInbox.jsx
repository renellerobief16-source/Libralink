import { useState, useEffect } from 'react';
import { getStudentNotifications, markNotificationAsRead } from '../../../utils/api';
import Card from "../../ui/Card";
import EmptyState from "../../ui/EmptyState";
import { FiMail } from "react-icons/fi";

function AdminInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const userStr = localStorage.getItem('currentUser') || localStorage.getItem('currentUserId');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const userId = currentUser?.id || currentUser?.sub || userStr;

        if (userId) {
          const { data, error } = await getStudentNotifications(userId);
          if (!error && data) {
            const formattedNotifications = data.map(notif => ({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              created_at: notif.created_at,
              read: notif.read,
            }));
            setNotifications(formattedNotifications);
          } else {
            // Add sample notification if no data exists
            const sampleNotifications = [
              {
                id: 'sample-1',
                title: 'Welcome to Admin Dashboard',
                message: 'Welcome to the admin dashboard! You can manage books, students, and borrow requests from here.',
                created_at: new Date().toISOString(),
                read: false,
              }
            ];
            setNotifications(sampleNotifications);
          }
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    await markNotificationAsRead(notification.id);
    setNotifications((prev) => prev.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n
    ));
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Inbox</h2>
        <p className="text-[#64748B] text-sm">View your notifications and messages</p>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-[#64748B]">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<FiMail />}
            title="No Notifications"
            description="You have no notifications at the moment."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-lg cursor-pointer ${notification.read ? 'opacity-60' : ''} bg-[#F8FAFC] hover:bg-slate-100 transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-[#0F172A]">{notification.title}</p>
                    <p className="text-sm text-[#64748B]">{notification.message}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-[#2563EB] rounded-full"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminInbox;
