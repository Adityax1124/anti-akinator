import React, { useState, useEffect, useRef } from 'react';
import './MatchChat.css';

const MatchChat = ({ matchCode, user, onSendMessage, messages }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className={`match-chat ${isOpen ? 'open' : ''}`}>
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Chat"
      >
        💬 {messages.length > 0 && <span className="chat-badge">{messages.length}</span>}
      </button>

      <div className="chat-window premium-card">
        <div className="chat-header">
          <span className="chat-title">💬 Battle Chat</span>
          <button className="chat-close" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className="chat-messages" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>No messages yet. Be the first to chat!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-message ${msg.userId === user?._id ? 'own' : 'other'}`}
              >
                <div className="chat-msg-avatar">
                  {msg.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="chat-msg-content">
                  <div className="chat-msg-name">{msg.username}</div>
                  <div className="chat-msg-text">{msg.message}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-form">
          <input
            type="text"
            className="chat-input premium-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            maxLength={200}
          />
          <button type="submit" className="btn-chat-send">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default MatchChat;