import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import TreasureChestModal from '../components/TreasureChestModal';
import './Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [selectedChest, setSelectedChest] = useState(null);
  const [showChestModal, setShowChestModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.counts?.unread || 0);
        setUnclaimedCount(response.data.counts?.unclaimed || 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count for badge
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

  // Fetch unclaimed count for badge
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

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    fetchUnclaimedCount();
  }, [fetchNotifications, fetchUnreadCount, fetchUnclaimedCount]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
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
      setError('Failed to mark as read');
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
        setSuccess('All notifications marked as read');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
      setError('Failed to mark all as read');
    }
  };

  // Delete notification
  const handleDelete = async (notificationId) => {
    if (!window.confirm('Delete this notification?')) return;
    
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.filter(n => n._id !== notificationId)
        );
        if (!response.data.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Delete notification error:', err);
      setError('Failed to delete notification');
    }
  };

  // Clear all read notifications
  const handleClearRead = async () => {
    if (!window.confirm('Clear all read notifications?')) return;
    
    try {
      const response = await api.delete('/notifications/clear-read');
      if (response.data.success) {
        setNotifications(prev =>
          prev.filter(n => !n.isRead)
        );
        setSuccess('Read notifications cleared');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Clear read error:', err);
      setError('Failed to clear read notifications');
    }
  };

  // Open chest
  const handleOpenChest = (notification) => {
    if (notification.data?.chestId) {
      setSelectedChest({
        chestId: notification.data.chestId,
        notificationId: notification._id
      });
      setShowChestModal(true);
    }
  };

  // Handle chest opened
  const handleChestOpened = (reward) => {
    setShowChestModal(false);
    setSelectedChest(null);
    
    // Refresh notifications
    fetchNotifications();
    fetchUnclaimedCount();
    
    // Show success message
    if (reward.type === 'card') {
      setSuccess(`🎉 You got ${reward.card.name} (${reward.card.rarity})!`);
    } else {
      setSuccess(`💎 You earned ${reward.gemsAmount} gems!`);
    }
    setTimeout(() => setSuccess(''), 4000);
  };

  // Navigate to war
  const handleGoToWar = (notification) => {
    if (notification.data?.warId) {
      navigate(`/clan/war?warId=${notification.data.warId}`);
    } else {
      navigate('/clan/war');
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

  // Filter notifications
  const getFilteredNotifications = () => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.isRead);
    if (filter === 'unclaimed') return notifications.filter(n => 
      (n.type === 'chest_available' || n.type === 'war_victory') && !n.isClaimed
    );
    return notifications.filter(n => n.type === filter);
  };

  const filteredNotifications = getFilteredNotifications();

  // Get filter counts
  const getFilterCounts = () => {
    const counts = {
      all: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      unclaimed: notifications.filter(n => 
        (n.type === 'chest_available' || n.type === 'war_victory') && !n.isClaimed
      ).length
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

  return (
    <div className="notifications-page">
      {/* Background Effects */}
      <div className="notif-bg-noise"></div>
      <div className="notif-bg-grid"></div>
      <div className="notif-aurora notif-aurora-1"></div>
      <div className="notif-aurora notif-aurora-2"></div>

      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-left">
          <h1>🔔 Notifications</h1>
          {unreadCount > 0 && (
            <span className="notif-unread-badge">{unreadCount} unread</span>
          )}
          {unclaimedCount > 0 && (
            <span className="notif-unclaimed-badge">🎁 {unclaimedCount} chests</span>
          )}
        </div>
        <div className="notif-header-right">
          {notifications.some(n => !n.isRead) && (
            <button className="notif-btn mark-read" onClick={handleMarkAllAsRead}>
              ✓ Mark All Read
            </button>
          )}
          {notifications.some(n => n.isRead) && (
            <button className="notif-btn clear-read" onClick={handleClearRead}>
              🗑️ Clear Read
            </button>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && <div className="notif-alert error">{error}</div>}
      {success && <div className="notif-alert success">{success}</div>}

      {/* Filters */}
      <div className="notif-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({filterCounts.all})
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({filterCounts.unread})
        </button>
        <button
          className={`filter-btn ${filter === 'unclaimed' ? 'active' : ''}`}
          onClick={() => setFilter('unclaimed')}
        >
          🎁 Chests ({filterCounts.unclaimed})
        </button>
        <button
          className={`filter-btn ${filter === 'war_victory' ? 'active' : ''}`}
          onClick={() => setFilter('war_victory')}
        >
          🏆 Victory
        </button>
        <button
          className={`filter-btn ${filter === 'chest_available' ? 'active' : ''}`}
          onClick={() => setFilter('chest_available')}
        >
          🎁 Chests
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="notif-loading">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notif-empty">
          <span className="empty-icon">📭</span>
          <h3>No notifications</h3>
          <p>You're all caught up! Check back later for updates.</p>
        </div>
      ) : (
        <div className="notif-list">
          {filteredNotifications.map((notification) => {
            const isUnread = !notification.isRead;
            const color = getNotificationColor(notification.type);
            const icon = getNotificationIcon(notification.type);
            const isChestAvailable = notification.type === 'chest_available' || 
                                     (notification.type === 'war_victory' && !notification.isClaimed);
            const canOpenChest = isChestAvailable && notification.data?.chestId;
            const canGoToWar = notification.type === 'war_started' || 
                               notification.type === 'war_reminder' ||
                               notification.type === 'war_found' ||
                               notification.type === 'war_ending_soon';

            return (
              <div 
                key={notification._id}
                className={`notif-item ${isUnread ? 'unread' : ''} ${color}`}
                onClick={() => {
                  if (isUnread) {
                    handleMarkAsRead(notification._id);
                  }
                }}
              >
                <div className="notif-item-icon">
                  <span className="icon-emoji">{icon}</span>
                  {isUnread && <span className="unread-dot"></span>}
                </div>
                
                <div className="notif-item-content">
                  <div className="notif-item-header">
                    <span className="notif-item-title">{notification.title}</span>
                    <span className="notif-item-time">{getTimeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="notif-item-message">{notification.message}</p>
                  {notification.data?.score && (
                    <div className="notif-item-score">
                      Score: {notification.data.score}
                    </div>
                  )}
                  {notification.data?.opponentName && (
                    <div className="notif-item-opponent">
                      vs {notification.data.opponentName}
                    </div>
                  )}
                </div>

                <div className="notif-item-actions">
                  {canOpenChest && (
                    <button 
                      className="notif-action-btn chest"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChest(notification);
                      }}
                    >
                      🎁 Open
                    </button>
                  )}
                  {canGoToWar && (
                    <button 
                      className="notif-action-btn war"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoToWar(notification);
                      }}
                    >
                      ⚔️ View
                    </button>
                  )}
                  <button 
                    className="notif-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                  >
                    ✖
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Treasure Chest Modal */}
      {showChestModal && selectedChest && (
        <TreasureChestModal
          chestId={selectedChest.chestId}
          onClose={() => {
            setShowChestModal(false);
            setSelectedChest(null);
          }}
          onOpened={handleChestOpened}
        />
      )}
    </div>
  );
};

export default Notifications;