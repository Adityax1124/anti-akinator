import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import ReferralModal from './ReferralModal';
import FriendModal from './FriendModal';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const searchRef = useRef(null);

  // Dropdown refs
  const leaderboardRef = useRef(null);
  const communityRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
      // Close dropdowns on outside click
      if (leaderboardRef.current && !leaderboardRef.current.contains(event.target)) {
        if (openDropdown === 'leaderboard') setOpenDropdown(null);
      }
      if (communityRef.current && !communityRef.current.contains(event.target)) {
        if (openDropdown === 'community') setOpenDropdown(null);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        if (openDropdown === 'profile') setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) setOpenDropdown(null);
  };

  const openReferralModal = () => {
    closeMobileMenu();
    setIsReferralModalOpen(true);
  };

  const closeReferralModal = () => {
    setIsReferralModalOpen(false);
  };

  const openFriendModal = () => {
    closeMobileMenu();
    setIsFriendModalOpen(true);
  };

  const closeFriendModal = () => {
    setIsFriendModalOpen(false);
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
  const userGems = user?.gems || 0;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
            <span>Anti-Akinator</span>
          </Link>

          {/* Search */}
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

          {/* Nav Links */}
          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            {isAuthenticated ? (
              <>
                {/* Game Group */}
                <Link to="/collection" className="nav-link" onClick={closeMobileMenu}>
                  📁 Collection
                </Link>
                <Link to="/match" className="nav-link battle-btn" onClick={closeMobileMenu}>
                  ⚔️ Battle
                </Link>

                {/* Shop Group */}
                <Link to="/shop" className="nav-link" onClick={closeMobileMenu}>
                  🛒 Shop
                </Link>
                <Link to="/buy-shards" className="nav-link" onClick={closeMobileMenu}>
                  🎴 Buy Shards
                </Link>

                {/* Leaderboard Dropdown */}
                <div className="dropdown-wrapper" ref={leaderboardRef}>
                  <button 
                    className={`nav-link dropdown-btn ${openDropdown === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => toggleDropdown('leaderboard')}
                  >
                    🏆 Leaderboard <span className="dropdown-arrow">▾</span>
                  </button>
                  {openDropdown === 'leaderboard' && (
                    <div className="dropdown-menu">
                      <Link to="/leaderboard" className="dropdown-item" onClick={closeMobileMenu}>
                        📊 Global Leaderboard
                      </Link>
                      <Link to="/season-winners" className="dropdown-item" onClick={closeMobileMenu}>
                        🏅 Season Winners
                      </Link>
                    </div>
                  )}
                </div>

                {/* Community Dropdown */}
                <div className="dropdown-wrapper" ref={communityRef}>
                  <button 
                    className={`nav-link dropdown-btn ${openDropdown === 'community' ? 'active' : ''}`}
                    onClick={() => toggleDropdown('community')}
                  >
                    👥 Community <span className="dropdown-arrow">▾</span>
                  </button>
                  {openDropdown === 'community' && (
                    <div className="dropdown-menu">
                      <button className="dropdown-item" onClick={() => { closeMobileMenu(); openFriendModal(); }}>
                        👥 Friends
                      </button>
                      <button className="dropdown-item" onClick={() => { closeMobileMenu(); openReferralModal(); }}>
                        🤝 Refer & Earn
                      </button>
                    </div>
                  )}
                </div>

                {/* Admin Link */}
                {user?.role === 'admin' && (
                  <Link to="/admin" className="nav-link admin-link" onClick={closeMobileMenu}>
                    ⚙️ Admin
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="dropdown-wrapper" ref={profileRef}>
                  <button 
                    className={`nav-link dropdown-btn profile-btn ${openDropdown === 'profile' ? 'active' : ''}`}
                    onClick={() => toggleDropdown('profile')}
                  >
                    <span className="user-avatar">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt={user.username} className="navbar-avatar-img" />
                      ) : (
                        user?.username?.charAt(0).toUpperCase() || 'U'
                      )}
                    </span>
                    <span className="username">{user?.username}</span>
                    <span className="gems-badge">💎{userGems}</span>
                    <span className="dropdown-arrow">▾</span>
                  </button>
                  {openDropdown === 'profile' && (
                    <div className="dropdown-menu profile-dropdown">
                      <Link to="/profile" className="dropdown-item" onClick={closeMobileMenu}>
                        👤 My Profile
                      </Link>
                      <hr className="dropdown-divider" />
                      <button className="dropdown-item logout-item" onClick={() => { closeMobileMenu(); handleLogout(); }}>
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link" onClick={closeMobileMenu}>Login</Link>
                <Link to="/register" className="nav-link register-btn" onClick={closeMobileMenu}>Register</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-btn" 
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <ReferralModal 
        isOpen={isReferralModalOpen} 
        onClose={closeReferralModal} 
      />

      <FriendModal 
        isOpen={isFriendModalOpen} 
        onClose={closeFriendModal} 
      />
    </>
  );
};

export default Navbar;