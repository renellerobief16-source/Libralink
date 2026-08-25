import { useState, useEffect } from 'react';
import { FiX, FiClock, FiCheckCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { getStudentNotifications, markNotificationAsRead } from '../../../utils/api';
import { PageHeader, Button, Card, Modal, EmptyState, IconButton } from '../../ui';

function SuperAdminInbox({ darkMode, notifications = [] }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !n.read;
    if (selectedFilter === 'read') return n.read;
    return true;
  });

  const handleNotificationClick = async (notification) => {
    await markNotificationAsRead(notification.notification_id || notification.id);
    setSelectedNotification(notification);
    setShowNotificationModal(true);
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Inbox"
        description="View and manage your notifications"
      />

      <div className="flex gap-2 mb-6">
        {['all', 'unread', 'read'].map((filter) => (
          <Button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            variant={selectedFilter === filter ? 'primary' : 'secondary'}
            size="sm"
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<FiInfo className="w-10 h-10" />}
          title="No notifications yet"
          description="You don't have any notifications at the moment"
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.notification_id || notification.id}
              padding="md"
              onClick={() => handleNotificationClick(notification)}
              className={`cursor-pointer transition-all ${notification.read ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">{notification.title}</p>
                    {!notification.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title={selectedNotification?.title}
        size="sm"
      >
        <p className="text-sm text-slate-700 mb-4">{selectedNotification?.message}</p>
        <p className="text-xs text-slate-500">
          {selectedNotification?.created_at && new Date(selectedNotification.created_at).toLocaleString()}
        </p>
      </Modal>
    </div>
  );
}

export default SuperAdminInbox;
