import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unclaimedCount, setUnclaimedCount] = useState(0);

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

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
    fetchUnclaimedCount();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchUnclaimedCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchUnclaimedCount]);

  // Navigate to notifications page
  const handleClick = () => {
    navigate('/notifications');
  };

  const totalBadgeCount = unreadCount + unclaimedCount;

  return (
    <button
      className={`notification-nav-btn ${totalBadgeCount > 0 ? 'has-new' : ''}`}
      onClick={handleClick}
      aria-label="Notifications"
    >
      <span className="nav-icon">🔔</span>
      <span className="nav-label">
        Notifications
        {totalBadgeCount > 0 && (
          <span className="nav-badge">{totalBadgeCount > 99 ? '99+' : totalBadgeCount}</span>
        )}
        {unclaimedCount > 0 && (
          <span className="nav-badge chest-badge">🎁</span>
        )}
      </span>
    </button>
  );
};

export default NotificationBell;