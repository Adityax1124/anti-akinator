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

  const leaderboardRef = useRef(null);
  const communityRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutsideDropdown = (event) => {
      if (openDropdown) {
        const dropdownRefs = {
          leaderboard: leaderboardRef,
          community: communityRef,
          profile: profileRef
        };
        const currentRef = dropdownRefs[openDropdown];
        if (currentRef && currentRef.current && !currentRef.current.contains(event.target)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutsideDropdown);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, [openDropdown]);

  // Toggle dropdown on click
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) {
      setOpenDropdown(null);
    }
  };

  const openReferralModal = () => {
    closeAllDropdowns();
    setIsReferralModalOpen(true);
  };

  const closeReferralModal = () => {
    setIsReferralModalOpen(false);
  };

  const openFriendModal = () => {
    closeAllDropdowns();
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
    closeAllDropdowns();
    navigate(`/profile/${username}`);
  };

  const handleLogout = () => {
    closeAllDropdowns();
    logout();
    navigate('/login');
  };

  const profilePhotoUrl = user?.equipped?.profilePhoto?.imageUrl;
  const userGems = user?.gems || 0;

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <nav className={`navbar ${openDropdown ? 'dropdown-open' : ''}`}>
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-brand" onClick={closeAllDropdowns}>
            <img src="/anime-logo.jpg" alt="Anti-Akinator" className="brand-logo" />
            <span className="brand-text">Anti-Akinator</span>
          </Link>

          {/* Search */}
          <div className="search-wrapper" ref={searchRef}>
            <div className="search-container">
              <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search players..."
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
              />
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
                <Link 
                  to="/collection" 
                  className={`nav-link ${isActive('/collection') ? 'active' : ''}`} 
                  onClick={closeAllDropdowns}
                >
                  <span className="nav-icon">📁</span>
                  <span className="nav-label">Collection</span>
                </Link>

                <Link 
                  to="/match" 
                  className={`nav-link battle-btn ${isActive('/match') ? 'active' : ''}`} 
                  onClick={closeAllDropdowns}
                >
                  <span className="nav-icon">⚔️</span>
                  <span className="nav-label">Battle</span>
                </Link>

                <Link 
                  to="/shop" 
                  className={`nav-link ${isActive('/shop') ? 'active' : ''}`} 
                  onClick={closeAllDropdowns}
                >
                  <span className="nav-icon">🛒</span>
                  <span className="nav-label">Shop</span>
                </Link>

                <Link 
                  to="/buy-shards" 
                  className={`nav-link ${isActive('/buy-shards') ? 'active' : ''}`} 
                  onClick={closeAllDropdowns}
                >
                  <span className="nav-icon">🎴</span>
                  <span className="nav-label">Buy Shards</span>
                </Link>

                {/* ===== LEADERBOARD DROPDOWN ===== */}
                <div 
                  className="dropdown-wrapper" 
                  ref={leaderboardRef}
                >
                  <button 
                    className={`nav-link dropdown-btn ${openDropdown === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => toggleDropdown('leaderboard')}
                  >
                    <span className="nav-icon">🏆</span>
                    <span className="nav-label">Leaderboard</span>
                    <svg className={`dropdown-arrow-svg ${openDropdown === 'leaderboard' ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu ${openDropdown === 'leaderboard' ? 'open' : ''}`}>
                    <Link to="/leaderboard" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">📊</span>
                      Global Leaderboard
                    </Link>
                    <Link to="/season-winners" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">🏅</span>
                      Season Winners
                    </Link>
                  </div>
                </div>

                {/* ===== COMMUNITY DROPDOWN ===== */}
                <div 
                  className="dropdown-wrapper" 
                  ref={communityRef}
                >
                  <button 
                    className={`nav-link dropdown-btn ${openDropdown === 'community' ? 'active' : ''}`}
                    onClick={() => toggleDropdown('community')}
                  >
                    <span className="nav-icon">👥</span>
                    <span className="nav-label">Community</span>
                    <svg className={`dropdown-arrow-svg ${openDropdown === 'community' ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu ${openDropdown === 'community' ? 'open' : ''}`}>
                    <button className="dropdown-item" onClick={() => { closeAllDropdowns(); openFriendModal(); }}>
                      <span className="dropdown-icon">👥</span>
                      Friends
                    </button>
                    <button className="dropdown-item" onClick={() => { closeAllDropdowns(); openReferralModal(); }}>
                      <span className="dropdown-icon">🤝</span>
                      Refer & Earn
                    </button>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`} 
                    onClick={closeAllDropdowns}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">Admin</span>
                  </Link>
                )}

                {/* ===== PROFILE DROPDOWN ===== */}
                <div 
                  className="dropdown-wrapper profile-wrapper" 
                  ref={profileRef}
                >
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
                    <svg className={`dropdown-arrow-svg ${openDropdown === 'profile' ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu profile-dropdown ${openDropdown === 'profile' ? 'open' : ''}`}>
                    <Link to="/profile" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">👤</span>
                      My Profile
                    </Link>
                    <hr className="dropdown-divider" />
                    <button className="dropdown-item logout-item" onClick={() => { closeAllDropdowns(); handleLogout(); }}>
                      <span className="dropdown-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link" onClick={closeAllDropdowns}>Login</Link>
                <Link to="/register" className="nav-link register-btn" onClick={closeAllDropdowns}>Register</Link>
              </>
            )}
          </div>

          <button 
            className="mobile-menu-btn" 
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
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