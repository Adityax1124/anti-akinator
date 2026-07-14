import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      if (response.data.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (err) {
      console.error('Fetch unread count error:', err);
    }
  }, []);

  // Fetch unclaimed count
  const fetchUnclaimedCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unclaimed');
      if (response.data.success) {
        setUnclaimedCount(response.data.count || 0);
      }
    } catch (err) {
      console.error('Fetch unclaimed count error:', err);
    }
  }, []);

  // Fetch recent notifications for dropdown
  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications?limit=10');
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
    fetchUnclaimedCount();
    fetchRecentNotifications();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchUnclaimedCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchUnclaimedCount, fetchRecentNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      fetchRecentNotifications();
      // Mark all as read when opening
      // Optionally: mark all as read automatically
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  // Navigate to notification
  const handleNotificationClick = (notification) => {
    setIsOpen(false);
    
    // If it's a chest notification, go to notifications page
    if (notification.type === 'chest_available' || notification.type === 'war_victory') {
      navigate('/notifications');
      return;
    }
    
    // If it's a war notification, go to war page
    if (['war_started', 'war_reminder', 'war_found', 'war_ending_soon'].includes(notification.type)) {
      navigate('/clan/war');
      return;
    }
    
    // Default: go to notifications page
    navigate('/notifications');
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

  // Get time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(date).toLocaleDateString();
  };

  // Get total badge count (unread + unclaimed)
  const totalBadgeCount = unreadCount + unclaimedCount;

  return (
    <div className="notification-bell-wrapper">
      <button
        ref={buttonRef}
        className={`notification-bell ${isOpen ? 'active' : ''} ${totalBadgeCount > 0 ? 'has-notifications' : ''}`}
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {totalBadgeCount > 0 && (
          <span className="bell-badge">
            {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
          </span>
        )}
        {unclaimedCount > 0 && (
          <span className="bell-badge chest-badge">🎁</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-dropdown" ref={dropdownRef}>
          <div className="dropdown-header">
            <span className="dropdown-title">Notifications</span>
            <div className="dropdown-actions">
              {unreadCount > 0 && (
                <button 
                  className="dropdown-action mark-read"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button 
                className="dropdown-action view-all"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
              >
                View all
              </button>
            </div>
          </div>

          <div className="dropdown-body">
            {loading ? (
              <div className="dropdown-loading">
                <span className="loading-spinner-small"></span>
                <span>Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="dropdown-empty">
                <span className="empty-icon">📭</span>
                <p>No notifications</p>
              </div>
            ) : (
              <div className="dropdown-list">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification._id}
                    className={`dropdown-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="item-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="item-content">
                      <div className="item-header">
                        <span className="item-title">{notification.title}</span>
                        <span className="item-time">{getTimeAgo(notification.createdAt)}</span>
                      </div>
                      <p className="item-message">{notification.message}</p>
                      {!notification.isRead && (
                        <button 
                          className="item-mark-read"
                          onClick={(e) => handleMarkAsRead(notification._id, e)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    {!notification.isRead && (
                      <div className="item-unread-dot"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="dropdown-footer">
              <button 
                className="footer-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
              >
                See all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;