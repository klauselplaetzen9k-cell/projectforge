// ============================================================================
// Notification Dropdown Component
// ============================================================================

import { Link } from 'react-router-dom';

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

// ============================================================================
// Notification Dropdown Component
// ============================================================================

export default function NotificationDropdown({ 
  notifications, 
  onClose, 
  onMarkAsRead,
  onMarkAllAsRead 
}: NotificationDropdownProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (title: string) => {
    if (title.includes('task')) return '📋';
    if (title.includes('comment')) return '💬';
    if (title.includes('assigned')) return '👤';
    if (title.includes('mention')) return '@';
    if (title.includes('milestone')) return '🎯';
    if (title.includes('completed')) return '✅';
    return '🔔';
  };

  return (
    <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="notification-header">
        <h3>Notifications</h3>
        {notifications.length > 0 && (
          <button className="mark-all-read" onClick={onMarkAllAsRead}>
            Mark all as read
          </button>
        )}
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <span className="no-notifications-icon">🔔</span>
            <p>No new notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => {
                if (!notification.isRead) {
                  onMarkAsRead(notification.id);
                }
                if (notification.link) {
                  onClose();
                }
              }}
            >
              <span className="notification-icon">
                {getNotificationIcon(notification.title)}
              </span>
              <div className="notification-content">
                <span className="notification-title">{notification.title}</span>
                <span className="notification-message">{notification.message}</span>
                <span className="notification-time">{formatTime(notification.createdAt)}</span>
              </div>
              {!notification.isRead && (
                <span className="unread-dot" />
              )}
            </div>
          ))
        )}
      </div>

      <div className="notification-footer">
        <Link to="/notifications" onClick={onClose} className="view-all-link">
          View all notifications
        </Link>
      </div>
    </div>
  );
}
