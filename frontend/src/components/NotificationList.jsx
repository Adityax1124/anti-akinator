import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './NotificationList.css';

const NotificationList = ({
  limit = 20,
  showViewAll = true,
  onNotificationClick,
  className = ''
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/notifications?limit=${limit}`);
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.counts?.unread || 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all');
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.filter(n => n._id !== notificationId)
        );
        // Update unread count if deleted notification was unread
        const deleted = notifications.find(n => n._id === notificationId);
        if (deleted && !deleted.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification._id, { stopPropagation: () => {} });
    }

    // Call external handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
      return;
    }

    // Default navigation
    if (notification.type === 'chest_available' || notification.type === 'war_victory') {
      navigate('/notifications');
    } else if (['war_started', 'war_reminder', 'war_found', 'war_ending_soon'].includes(notification.type)) {
      navigate('/clan/war');
    } else {
      navigate('/notifications');
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      'war_victory': '🏆',
      'war_defeat': '💀',
      'war_draw': '🤝',
      'war_started': '⚔️',
      'war_reminder': '⏰',
      'war_searching': '🔍',
      'war_found': '🎯',
      'war_ending_soon': '⏳',
      'war_card_ready': '🃏',
      'chest_available': '🎁',
      'chest_opened': '📦',
      'system': '🔔',
      'announcement': '📢'
    };
    return icons[type] || '🔔';
  };

  // Get notification color
  const getNotificationColor = (type) => {
    const colors = {
      'war_victory': 'green',
      'war_defeat': 'red',
      'war_draw': 'yellow',
      'war_started': 'blue',
      'war_reminder': 'yellow',
      'war_searching': 'blue',
      'war_found': 'green',
      'war_ending_soon': 'red',
      'war_card_ready': 'purple',
      'chest_available': 'gold',
      'chest_opened': 'purple',
      'system': 'gray',
      'announcement': 'blue'
    };
    return colors[type] || 'gray';
  };

  // Get time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Get action button text
  const getActionText = (type) => {
    const actions = {
      'war_victory': '🎁 Claim',
      'chest_available': '🎁 Open',
      'war_started': '⚔️ View',
      'war_reminder': '⚔️ View',
      'war_found': '⚔️ View',
      'war_ending_soon': '⚔️ View'
    };
    return actions[type] || '📖 View';
  };

  // Check if notification has action
  const hasAction = (type) => {
    const actionTypes = ['war_victory', 'chest_available', 'war_started', 'war_reminder', 'war_found', 'war_ending_soon'];
    return actionTypes.includes(type);
  };

  return (
    <div className={`notification-list ${className}`}>
      {/* Header */}
      <div className="notification-list-header">
        <span className="list-title">Notifications</span>
        {unreadCount > 0 && (
          <button 
            className="list-mark-all"
            onClick={handleMarkAllAsRead}
          >
            ✓ Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="list-error">
          <span>❌</span>
          <span>{error}</span>
          <button onClick={fetchNotifications}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="list-loading">
          <div className="list-loading-spinner"></div>
          <span>Loading notifications...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && notifications.length === 0 && (
        <div className="list-empty">
          <span className="empty-icon">📭</span>
          <p>No notifications</p>
          <span className="empty-hint">You're all caught up!</span>
        </div>
      )}

      {/* List */}
      {!loading && !error && notifications.length > 0 && (
        <div className="list-items">
          {notifications.map((notification) => {
            const isUnread = !notification.isRead;
            const color = getNotificationColor(notification.type);
            const icon = getNotificationIcon(notification.type);
            const showAction = hasAction(notification.type);

            return (
              <div
                key={notification._id}
                className={`list-item ${isUnread ? 'unread' : ''} ${color}`}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Icon */}
                <div className="list-item-icon">
                  <span className="icon-emoji">{icon}</span>
                  {isUnread && <span className="unread-dot"></span>}
                </div>

                {/* Content */}
                <div className="list-item-content">
                  <div className="list-item-header">
                    <span className="item-title">{notification.title}</span>
                    <span className="item-time">{getTimeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="item-message">{notification.message}</p>
                  
                  {/* Additional data */}
                  {notification.data?.score && (
                    <div className="item-score">
                      Score: {notification.data.score}
                    </div>
                  )}
                  {notification.data?.opponentName && (
                    <div className="item-opponent">
                      vs {notification.data.opponentName}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="list-item-actions">
                  {showAction && (
                    <button 
                      className="item-action primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notification);
                      }}
                    >
                      {getActionText(notification.type)}
                    </button>
                  )}
                  {!isUnread && (
                    <button 
                      className="item-action delete"
                      onClick={(e) => handleDelete(notification._id, e)}
                      title="Delete"
                    >
                      ✖
                    </button>
                  )}
                  {isUnread && (
                    <button 
                      className="item-action mark-read"
                      onClick={(e) => handleMarkAsRead(notification._id, e)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All */}
      {showViewAll && notifications.length > 0 && (
        <div className="list-footer">
          <button 
            className="list-view-all"
            onClick={() => navigate('/notifications')}
          >
            View all notifications →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationList;