import { useState, useEffect } from 'react';
import { FiX, FiClock, FiCheckCircle, FiInfo, FiAlertTriangle, FiBell, FiCheck, FiTrash2, FiFilter, FiUser } from 'react-icons/fi';
import { getStudentNotifications, markNotificationAsRead, deleteNotification, deleteAllNotifications } from '../../../utils/api';
import { PageHeader, Button, Card, Modal, EmptyState, IconButton, StatusBadge } from '../../ui';
import { ConfirmationOverlay } from '../../common';

function SuperAdminInbox({ darkMode, notifications = [], onNotificationsChange }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);

  const getRoleDisplay = (role, schoolCode) => {
    if (!role) return '';
    const roleLower = role.toLowerCase();
    let roleDisplay = '';
    
    if (roleLower === 'super_admin' || roleLower === 'super admin') {
      roleDisplay = 'SUPER ADMIN';
    } else if (roleLower === 'admin_librarian' || roleLower === 'admin-librarian' || roleLower === 'librarian admin') {
      roleDisplay = 'ADMIN-LIBRARIAN';
    } else if (roleLower === 'librarian') {
      roleDisplay = 'LIBRARIAN';
    } else if (roleLower === 'student') {
      roleDisplay = 'STUDENT';
    } else if (roleLower === 'admin') {
      roleDisplay = 'ADMIN';
    } else {
      roleDisplay = role.toUpperCase();
    }
    
    // Add school code prefix if available and not Super Admin
    if (schoolCode && roleLower !== 'super_admin' && roleLower !== 'super admin') {
      return `${schoolCode} ${roleDisplay}`;
    }
    
    return roleDisplay;
  };

  const getNotificationIcon = (type = 'info') => {
    const icons = {
      info: <FiInfo className="w-5 h-5 text-blue-500" />,
      success: <FiCheckCircle className="w-5 h-5 text-green-500" />,
      warning: <FiAlertTriangle className="w-5 h-5 text-yellow-500" />,
      error: <FiAlertTriangle className="w-5 h-5 text-red-500" />,
      default: <FiBell className="w-5 h-5 text-slate-500" />
    };
    return icons[type] || icons.default;
  };

  const getNotificationColor = (type = 'info') => {
    const colors = {
      info: 'bg-blue-50 border-blue-200',
      success: 'bg-green-50 border-green-200',
      warning: 'bg-yellow-50 border-yellow-200',
      error: 'bg-red-50 border-red-200',
      default: 'bg-slate-50 border-slate-200'
    };
    return colors[type] || colors.default;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !n.read;
    if (selectedFilter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification) => {
    await markNotificationAsRead(notification.notification_id || notification.id);
    setSelectedNotification(notification);
    setShowNotificationModal(true);
  };

  const handleMarkAsRead = async (notification, e) => {
    e.stopPropagation();
    await markNotificationAsRead(notification.notification_id || notification.id);
    if (onNotificationsChange) onNotificationsChange();
  };

  const handleDeleteNotification = async (notification, e) => {
    e.stopPropagation();
    await deleteNotification(notification.notification_id || notification.id);
    if (onNotificationsChange) onNotificationsChange();
  };

  const handleDeleteAllNotifications = async () => {
    await deleteAllNotifications();
    setShowDeleteAllConfirmation(false);
    if (onNotificationsChange) onNotificationsChange();
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Inbox"
        description={`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      />

      {/* Filter Bar */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filter:</span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'read', label: 'Read', count: notifications.length - unreadCount }
            ].map((filter) => (
              <Button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                variant={selectedFilter === filter.key ? 'primary' : 'ghost'}
                size="sm"
                className="relative"
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    selectedFilter === filter.key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </Button>
            ))}
            {notifications.length > 0 && (
              <Button
                onClick={() => setShowDeleteAllConfirmation(true)}
                variant="danger"
                size="sm"
                className="ml-2"
              >
                <FiTrash2 className="w-4 h-4 mr-1" />
                Delete All
              </Button>
            )}
          </div>
        </div>
      </Card>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<FiBell className="w-16 h-16 text-slate-300" />}
          title="No notifications"
          description={
            selectedFilter === 'unread' 
              ? "You're all caught up! No unread notifications." 
              : selectedFilter === 'read'
              ? "No read notifications yet."
              : "Your inbox is empty. Check back later for updates."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification, index) => (
            <Card
              key={notification.notification_id || notification.id}
              padding="md"
              onClick={() => handleNotificationClick(notification)}
              className={`
                cursor-pointer transition-all duration-200 hover:shadow-md
                ${!notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : 'opacity-75'}
                ${getNotificationColor(notification.type)}
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                  !notification.read ? 'bg-white shadow-sm' : 'bg-white/50'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={`font-semibold text-slate-900 ${!notification.read ? 'text-base' : 'text-sm'}`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      {formatTimeAgo(notification.created_at)}
                    </span>
                    {notification.sender_role && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        notification.sender_role === 'Super Admin' || notification.sender_role === 'SUPER ADMIN' ? 'bg-purple-100 text-purple-700' :
                        notification.sender_role?.includes('Admin') || notification.sender_role?.includes('ADMIN') ? 'bg-blue-100 text-blue-700' :
                        notification.sender_role === 'Student' || notification.sender_role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                        notification.sender_role === 'Librarian' || notification.sender_role === 'LIBRARIAN' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getRoleDisplay(notification.sender_role, notification.school_code)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {!notification.read && (
                    <IconButton
                      icon={<FiCheck className="w-4 h-4" />}
                      onClick={(e) => handleMarkAsRead(notification, e)}
                      variant="ghost"
                      size="sm"
                      title="Mark as read"
                    />
                  )}
                  <IconButton
                    icon={<FiTrash2 className="w-4 h-4" />}
                    onClick={(e) => handleDeleteNotification(notification, e)}
                    variant="ghost"
                    size="sm"
                    title="Delete notification"
                    className="text-red-500 hover:text-red-600"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Notification Detail Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title={
          <div className="flex items-center gap-3">
            {selectedNotification && getNotificationIcon(selectedNotification.type)}
            <span>{selectedNotification?.title}</span>
          </div>
        }
        size="md"
        footer={
          <div className="flex gap-2">
            {selectedNotification && (
              <Button
                variant="danger"
                onClick={async () => {
                  if (confirm('Delete this notification?')) {
                    await handleDeleteNotification(selectedNotification);
                    setShowNotificationModal(false);
                  }
                }}
              >
                <FiTrash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button onClick={() => setShowNotificationModal(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedNotification?.sender_name && (
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FiUser className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedNotification.sender_name}</p>
                {selectedNotification.sender_role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedNotification.sender_role === 'Super Admin' || selectedNotification.sender_role === 'SUPER ADMIN' ? 'bg-purple-100 text-purple-700' :
                    selectedNotification.sender_role?.includes('Admin') || selectedNotification.sender_role?.includes('ADMIN') ? 'bg-blue-100 text-blue-700' :
                    selectedNotification.sender_role === 'Student' || selectedNotification.sender_role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                    selectedNotification.sender_role === 'Librarian' || selectedNotification.sender_role === 'LIBRARIAN' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getRoleDisplay(selectedNotification.sender_role, selectedNotification.school_code)}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className={`p-4 rounded-lg ${getNotificationColor(selectedNotification?.type)}`}>
            <p className="text-slate-700 leading-relaxed">{selectedNotification?.message}</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 pt-2 border-t">
            <FiClock className="w-4 h-4" />
            <span>
              {selectedNotification?.created_at && new Date(selectedNotification.created_at).toLocaleString()}
            </span>
          </div>

          {selectedNotification?.type && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Type:</span>
              <StatusBadge status={selectedNotification.type} variant="neutral" />
            </div>
          )}
        </div>
      </Modal>

      {/* Delete All Confirmation */}
      <ConfirmationOverlay
        isOpen={showDeleteAllConfirmation}
        onClose={() => setShowDeleteAllConfirmation(false)}
        onConfirm={handleDeleteAllNotifications}
        title="Delete All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default SuperAdminInbox;
