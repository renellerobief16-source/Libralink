import { useState, useEffect } from 'react';
import { getStudentNotifications, markNotificationAsRead } from '../../../utils/api';
import Card from "../../ui/Card";
import EmptyState from "../../ui/EmptyState";
import { FiMail } from "react-icons/fi";

function LibrarianAdminInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const getProfileImage = (notification) => {
    return notification.student_profile_picture ||
      notification.borrower_profile_picture ||
      notification.requester_profile_picture ||
      notification.sender_profile_picture ||
      notification.senderProfilePicture ||
      notification.profile_picture ||
      notification.profile_image ||
      notification.actor_profile_picture ||
      '';
  };

  const getSenderName = (notification) => {
    return notification.student_name ||
      notification.borrower_name ||
      notification.requester_name ||
      notification.sender_name ||
      notification.senderName ||
      notification.actor_name ||
      notification.staff_name ||
      'Library Staff';
  };

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
              sender_name: getSenderName(notif),
              sender_profile_picture: getProfileImage(notif),
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
                sender_name: 'Library Staff',
                sender_profile_picture: '',
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
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    {notification.sender_profile_picture ? (
                      <img
                        src={notification.sender_profile_picture.startsWith('http') ? notification.sender_profile_picture : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000'}${notification.sender_profile_picture.startsWith('/') ? '' : '/'}${notification.sender_profile_picture}`}
                        alt={notification.sender_name || 'Staff'}
                        className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0077B6] items-center justify-center text-xs font-semibold ${notification.sender_profile_picture ? 'hidden' : 'flex'}`}
                    >
                      {(notification.sender_name || 'LS').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0F172A] text-sm">{notification.sender_name || 'Library Staff'}</p>
                        <p className="font-medium text-[#0F172A] mt-0.5">{notification.title}</p>
                        <p className="text-sm text-[#64748B] mt-1">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-[#2563EB] rounded-full mt-1.5 flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default LibrarianAdminInbox;
