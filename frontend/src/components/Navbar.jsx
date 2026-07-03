import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import ReferralModal from './ReferralModal'; // ✅ ADDED
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false); // ✅ ADDED
  const searchRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // ===== REFERRAL MODAL HANDLERS =====
  const openReferralModal = () => {
    closeMobileMenu();
    setIsReferralModalOpen(true);
  };

  const closeReferralModal = () => {
    setIsReferralModalOpen(false);
  };

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
    closeMobileMenu();
    navigate(`/profile/${username}`);
  };

  const handleLogout = () => {
    closeMobileMenu();
    logout();
    navigate('/login');
  };

  const profilePhotoUrl = user?.equipped?.profilePhoto?.imageUrl;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
            <span>Anti-Akinator</span>
          </Link>

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

          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            {isAuthenticated ? (
              <>
                <Link to="/game" className="nav-link" onClick={closeMobileMenu}>Play</Link>
                <Link to="/leaderboard" className="nav-link" onClick={closeMobileMenu}>Leaderboard</Link>
                <Link to="/season-winners" className="nav-link" onClick={closeMobileMenu}>🏆 Winners</Link>
                <Link to="/shop" className="nav-link" onClick={closeMobileMenu}>🛒 Shop</Link>
                
                {/* ===== ✅ NEW: REFER & EARN BUTTON ===== */}
                <button className="nav-link referral-btn" onClick={openReferralModal}>
                  🤝 Refer & Earn
                </button>
                
                {user?.role === 'admin' && (
                  <Link to="/admin" className="nav-link admin-link" onClick={closeMobileMenu}>Admin</Link>
                )}
                <Link to="/buy-shards" className="nav-link" onClick={closeMobileMenu}>🎴 Buy Shards</Link>
                <Link to="/profile" className="nav-link" onClick={closeMobileMenu}>
                  <span className="user-avatar">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={user.username} className="navbar-avatar-img" />
                    ) : (
                      user?.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </span>
                  <span className="username">{user?.username}</span>
                  <span className="shards-display">
                    <span className="shard-icon">🎴</span>
                    <span className="shard-number">{user?.shards || 0}</span>
                  </span>
                </Link>
                <button onClick={() => { closeMobileMenu(); handleLogout(); }} className="nav-link logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link" onClick={closeMobileMenu}>Login</Link>
                <Link to="/register" className="nav-link register-btn" onClick={closeMobileMenu}>Register</Link>
              </>
            )}
          </div>

          <button 
            className="mobile-menu-btn" 
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ===== ✅ REFERRAL MODAL ===== */}
      <ReferralModal 
        isOpen={isReferralModalOpen} 
        onClose={closeReferralModal} 
      />
    </>
  );
};

export default Navbar;