import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './FriendModal.css';

const FriendModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const response = await api.get('/friend/list');
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/friend/pending');
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Fetch pending requests error:', error);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 2) {
      try {
        const response = await api.get(`/profile/search?q=${encodeURIComponent(query)}`);
        console.log('📊 Search results:', response.data.users);
        setSearchResults(response.data.users || []);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  // ✅ FIXED: Better error handling with fallback IDs
  const handleSendRequest = async (userId) => {
    // Try to get userId from multiple possible sources
    let targetId = userId;
    
    // If userId is undefined or null, try to find it from the search results
    if (!targetId) {
      console.log('🔍 Looking for user ID in search results...');
      // Find the user in search results by matching the object reference
      // This is a fallback - ideally the search result should have _id
      const searchResult = searchResults.find(u => u.username === userId || u._id === userId);
      if (searchResult) {
        targetId = searchResult._id || searchResult.id;
        console.log('🔍 Found user ID from search results:', targetId);
      }
    }

    console.log('📝 [handleSendRequest] Called with userId:', targetId);
    console.log('📝 [handleSendRequest] Type of userId:', typeof targetId);
    
    if (!targetId) {
      console.error('❌ [handleSendRequest] No userId provided');
      setError('Invalid user - no ID provided');
      return;
    }

    // Check if userId is a valid MongoDB ObjectId (24 hex chars)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);
    console.log('📝 [handleSendRequest] Is valid ObjectId?', isValidObjectId);
    
    if (!isValidObjectId) {
      console.error('❌ [handleSendRequest] Invalid ObjectId format:', targetId);
      setError('Invalid user ID format');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      console.log('📝 Sending friend request to userId:', targetId);
      const response = await api.post('/friend/request', { userId: targetId });
      console.log('✅ Friend request response:', response.data);
      setSuccess('Friend request sent!');
      setSearchResults(searchResults.filter(u => (u._id || u.id) !== targetId));
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('❌ Send request error:', error);
      console.error('❌ Response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to send request');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await api.post('/friend/accept', { userId });
      setPendingRequests(pendingRequests.filter(r => r.requester._id !== userId));
      fetchFriends();
    } catch (error) {
      console.error('Accept request error:', error);
    }
  };

  const handleRejectRequest = async (userId) => {
    try {
      await api.post('/friend/reject', { userId });
      setPendingRequests(pendingRequests.filter(r => r.requester._id !== userId));
    } catch (error) {
      console.error('Reject request error:', error);
    }
  };

  const handleUnfriend = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.post('/friend/unfriend', { userId });
      setFriends(friends.filter(f => f.userId !== userId));
    } catch (error) {
      console.error('Unfriend error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="friend-modal-overlay" onClick={onClose}>
      <div className="friend-modal" onClick={(e) => e.stopPropagation()}>
        <button className="friend-modal-close" onClick={onClose}>✕</button>
        
        <div className="friend-modal-header">
          <h2>👥 Friends</h2>
        </div>

        <div className="friend-tabs">
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Requests ({pendingRequests.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Add Friend
          </button>
        </div>

        {error && <div className="friend-error">{error}</div>}
        {success && <div className="friend-success">{success}</div>}

        {activeTab === 'friends' && (
          <div className="friend-list">
            {friends.length === 0 ? (
              <div className="friend-empty">
                <p>You don't have any friends yet.</p>
                <p>Search for players to add!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id || friend.userId} className="friend-item">
                  <div className="friend-avatar">
                    {friend.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <span className="friend-name">{friend.username}</span>
                    <span className={`friend-status ${friend.status}`}>
                      {friend.status === 'online' ? '🟢 Online' : '⚪ Offline'}
                    </span>
                  </div>
                  <button 
                    className="friend-action-btn unfriend"
                    onClick={() => handleUnfriend(friend.userId)}
                  >
                    Unfriend
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="friend-list">
            {pendingRequests.length === 0 ? (
              <div className="friend-empty">
                <p>No pending friend requests.</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div key={request._id} className="friend-item">
                  <div className="friend-avatar">
                    {request.requester?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="friend-info">
                    <span className="friend-name">{request.requester?.username || 'Unknown'}</span>
                    <span className="friend-status pending">⏳ Pending</span>
                  </div>
                  <div className="friend-actions">
                    <button 
                      className="friend-action-btn accept"
                      onClick={() => handleAcceptRequest(request.requester._id)}
                    >
                      Accept
                    </button>
                    <button 
                      className="friend-action-btn reject"
                      onClick={() => handleRejectRequest(request.requester._id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="friend-search">
            <input
              type="text"
              placeholder="Search players by username..."
              value={searchQuery}
              onChange={handleSearch}
              className="friend-search-input"
            />
            {searchResults.length > 0 && (
              <div className="search-results-list">
                {searchResults.map((result) => {
                  // ✅ Get the ID from multiple possible sources
                  const userId = result._id || result.id || result.userId;
                  console.log('🔍 Search result:', { username: result.username, userId });
                  
                  return (
                    <div key={result._id || result.id || result.username} className="search-result-item">
                      <div className="friend-avatar">
                        {result.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{result.username}</span>
                        <span className="friend-stats">🎴 {result.shards || 0} Shards</span>
                      </div>
                      <button 
                        className="friend-action-btn add"
                        onClick={() => {
                          console.log('🖱️ Add Friend clicked for:', result);
                          handleSendRequest(userId);
                        }}
                        disabled={loading || !userId}
                      >
                        {loading ? 'Sending...' : 'Add Friend'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="friend-empty">
                <p>No players found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendModal;