import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import './ClanChat.css';

const ClanChat = ({ clanId, clanName, userRole }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const chatContainerRef = useRef(null);
  const intervalRef = useRef(null);

  // ✅ Scroll to bottom only on initial load
  const scrollToBottom = () => {
    if (chatContainerRef.current && isInitialLoad) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setIsInitialLoad(false);
    }
  };

  // ✅ Fetch messages on mount
  useEffect(() => {
    fetchMessages();
    setupPolling();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [clanId]);

  // ✅ Scroll to bottom when messages load for the first time
  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      scrollToBottom();
    }
  }, [messages]);

  // ✅ Setup polling every 5 seconds
  const setupPolling = () => {
    intervalRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  };

  // ✅ Fetch messages from API
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/clan/chat/${clanId}?limit=50`);
      setMessages(response.data.messages || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError('');

    try {
      const response = await axios.post(`/clan/chat/${clanId}`, {
        message: newMessage.trim()
      });

      if (response.data && response.data.data) {
        setMessages(prev => [...prev, response.data.data]);
        setNewMessage('');
        // ✅ DO NOT auto-scroll after sending - user stays where they are
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ✅ Format time
  const formatTime = (date) => {
    try {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // ✅ Get message icon based on type
  const getMessageIcon = (type) => {
    switch (type) {
      case 'donation':
        return '🎁';
      case 'request':
        return '📢';
      case 'system':
        return '⚡';
      default:
        return '💬';
    }
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="clan-chat-loading">
        <div className="loader"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="clan-chat">
      {/* Chat Header */}
      <div className="chat-header">
        <h3>💬 Clan Chat</h3>
        <span className="member-badge">{clanName || 'Clan'}</span>
      </div>

      {/* Chat Messages Container */}
      <div className="chat-messages" ref={chatContainerRef}>
        {error && (
          <div className="chat-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message-item ${msg.type || 'chat'}`}>
              <div className="message-header">
                <span className="message-icon">{getMessageIcon(msg.type)}</span>
                <span className="message-username">{msg.username || 'Unknown'}</span>
                <span className="message-time">{formatTime(msg.createdAt)}</span>
              </div>
              <div className="message-content">{msg.message || ''}</div>
              {msg.diamondAmount > 0 && (
                <div className="message-diamond">💎 {msg.diamondAmount}</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Chat Input Form */}
      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          maxLength="500"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !newMessage.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ClanChat;