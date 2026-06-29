import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 2) {
      try {
        const response = await api.get(`/profile/search?q=${query}`);
        setSearchResults(response.data.users);
        setShowSearch(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const handleViewProfile = (username) => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    navigate(`/profile/${username}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const profilePhotoUrl = user?.equipped?.profilePhoto?.imageUrl;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🎯</span>
          Anti-Akinator
        </Link>

        {/* ===== SEARCH BAR ===== */}
        <div className="search-wrapper" ref={searchRef}>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search players..."
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
            />
            <span className="search-icon">🔍</span>
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div 
                  key={result._id} 
                  className="search-result-item"
                  onClick={() => handleViewProfile(result.username)}
                >
                  {result.equipped?.profilePhoto?.imageUrl ? (
                    <img 
                      src={result.equipped.profilePhoto.imageUrl} 
                      alt={result.username} 
                      className="search-avatar"
                    />
                  ) : (
                    <div className="search-avatar-placeholder">
                      {result.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="search-user-info">
                    <span className="search-username">{result.username}</span>
                    <span className="search-stats">🎮 {result.stats?.gamesWon || 0} wins</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="search-results">
              <div className="search-no-results">No players found</div>
            </div>
          )}
        </div>

        {/* ===== NAV LINKS ===== */}
        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <Link to="/game" className="nav-link">Play</Link>
              <Link to="/leaderboard" className="nav-link">Leaderboard</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="nav-link admin-link">Admin</Link>
              )}
              <Link to="/profile" className="nav-link">
                <span className="user-avatar">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt={user.username} className="navbar-avatar-img" />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </span>
                <span className="username">{user?.username}</span>
              </Link>
              <button onClick={handleLogout} className="nav-link logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link register-btn">Register</Link>
            </>
          )}
        </div>

        <button className="mobile-menu-btn" onClick={() => {
          document.querySelector('.navbar-menu').classList.toggle('active');
        }}>
          ☰
        </button>
      </div>
    </nav>
  );
};

export default Navbar;  // 👈 ONLY ONE export default