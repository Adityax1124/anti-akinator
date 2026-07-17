// /frontend/src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReferralModal from './ReferralModal';
import FriendModal from './FriendModal';
import ClanModal from './clan/ClanModal';
import NotificationBell from './NotificationBell';
import axios from '../api/axios';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isClanModalOpen, setIsClanModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [hoveredDropdown, setHoveredDropdown] = useState(null);
  
  // ✅ Clan state
  const [isInClan, setIsInClan] = useState(false);
  const [clanData, setClanData] = useState(null);
  const [checkingClan, setCheckingClan] = useState(true);

  const cardsRef = useRef(null);
  const shopRef = useRef(null);
  const communityRef = useRef(null);
  const clanRef = useRef(null);
  const leaderboardRef = useRef(null);
  const profileRef = useRef(null);

  // ✅ Check if user is in a clan
  useEffect(() => {
    checkClanStatus();
  }, [isAuthenticated]);

  const checkClanStatus = async () => {
    if (!isAuthenticated) {
      setIsInClan(false);
      setCheckingClan(false);
      return;
    }

    try {
      setCheckingClan(true);
      const response = await axios.get('/clan/my-clan');
      setIsInClan(true);
      setClanData(response.data.clan);
    } catch (error) {
      if (error.response?.status === 404) {
        setIsInClan(false);
        setClanData(null);
      } else {
        setIsInClan(false);
      }
    } finally {
      setCheckingClan(false);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setHoveredDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutsideDropdown = (event) => {
      if (openDropdown) {
        const dropdownRefs = {
          cards: cardsRef,
          shop: shopRef,
          community: communityRef,
          clan: clanRef,
          leaderboard: leaderboardRef,
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

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const closeAllDropdowns = () => {
    setOpenDropdown(null);
    setHoveredDropdown(null);
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

  const closeReferralModal = () => setIsReferralModalOpen(false);

  const openFriendModal = () => {
    closeAllDropdowns();
    setIsFriendModalOpen(true);
  };

  const closeFriendModal = () => setIsFriendModalOpen(false);

  // ✅ Clan button handler - Check if in clan
  const handleClanClick = () => {
    closeAllDropdowns();
    
    if (checkingClan) {
      return;
    }

    if (isInClan) {
      navigate('/clan');
    } else {
      setIsClanModalOpen(true);
    }
  };

  const closeClanModal = () => setIsClanModalOpen(false);

  // ✅ After clan action, refresh status and navigate
  const handleClanAction = (clan) => {
    closeClanModal();
    checkClanStatus();
    navigate('/clan');
  };

  const handleLogout = () => {
    closeAllDropdowns();
    logout();
    navigate('/login');
  };

  const profilePhotoUrl = user?.equipped?.profilePhoto?.imageUrl;

  const isActive = (path) => location.pathname === path;

  const dimActive = hoveredDropdown !== null || openDropdown !== null || mobileMenuOpen;

  return (
    <>
      <nav className={`navbar ${dimActive ? 'dim-active' : ''}`}>
        <div className="navbar-container">
          <Link to="/" className="navbar-brand" onClick={closeAllDropdowns}>
            <img src="/anime-logo.jpg" alt="Anti-Akinator" className="brand-logo" />
            <span className="brand-text">Anti-Akinator</span>
          </Link>

          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            {isAuthenticated ? (
              <>
                <div
                  className="dropdown-wrapper"
                  ref={cardsRef}
                  onMouseEnter={() => setHoveredDropdown('cards')}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <button className={`nav-link dropdown-btn ${openDropdown === 'cards' ? 'active' : ''}`} onClick={() => toggleDropdown('cards')}>
                    <span className="nav-icon">🃏</span>
                    <span className="nav-label">Cards</span>
                    <svg className={`dropdown-arrow-svg ${openDropdown === 'cards' ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu ${openDropdown === 'cards' ? 'open' : ''}`}>
                    <Link to="/collection" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">📁</span>
                      Collection
                    </Link>
                    <Link to="/match" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">⚔️</span>
                      Battle
                    </Link>
                  </div>
                </div>

                <div
                  className="dropdown-wrapper"
                  ref={shopRef}
                  onMouseEnter={() => setHoveredDropdown('shop')}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <button className={`nav-link dropdown-btn ${openDropdown === 'shop' ? 'active' : ''}`} onClick={() => toggleDropdown('shop')}>
                    <span className="nav-icon">🛒</span>
                    <span className="nav-label">Shop</span>
                    <svg className={`dropdown-arrow-svg ${openDropdown === 'shop' ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu ${openDropdown === 'shop' ? 'open' : ''}`}>
                    <Link to="/shop" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">🛍️</span>
                      Shop
                    </Link>
                    <Link to="/buy-shards" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">🎴</span>
                      Buy Shards
                    </Link>
                  </div>
                </div>

                <div
                  className="dropdown-wrapper"
                  ref={communityRef}
                  onMouseEnter={() => setHoveredDropdown('community')}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <button className={`nav-link dropdown-btn ${openDropdown === 'community' ? 'active' : ''}`} onClick={() => toggleDropdown('community')}>
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

                {/* ✅ Clan Button with check */}
                <div
                  className="dropdown-wrapper"
                  ref={clanRef}
                  onMouseEnter={() => setHoveredDropdown('clan')}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <button 
                    className={`nav-link ${isInClan ? 'clan-active' : ''}`} 
                    onClick={handleClanClick}
                    disabled={checkingClan}
                  >
                    <span className="nav-icon">🛡️</span>
                    <span className="nav-label">
                      {checkingClan ? 'Loading...' : isInClan ? clanData?.name || 'Clan' : 'Clan'}
                    </span>
                    {isInClan && <span className="clan-status-dot"></span>}
                  </button>
                </div>

                {/* ✅ Season Pass - Standalone Nav Item */}
                <Link 
                  to="/season-pass" 
                  className={`nav-link ${isActive('/season-pass') ? 'active' : ''}`}
                  onClick={closeAllDropdowns}
                >
                  <span className="nav-icon">🎫</span>
                  <span className="nav-label">Season Pass</span>
                </Link>

                {/* ✅ NEW: Blur Game - Standalone Nav Item */}
                <Link 
                  to="/blur-game" 
                  className={`nav-link ${isActive('/blur-game') ? 'active' : ''}`}
                  onClick={closeAllDropdowns}
                >
                  <span className="nav-icon">🔮</span>
                  <span className="nav-label">Mystery</span>
                </Link>

                <div
                  className="dropdown-wrapper"
                  ref={leaderboardRef}
                  onMouseEnter={() => setHoveredDropdown('leaderboard')}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <button className={`nav-link dropdown-btn ${openDropdown === 'leaderboard' ? 'active' : ''}`} onClick={() => toggleDropdown('leaderboard')}>
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
                    <Link to="/clan/war/leaderboard" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">⚔️</span>
                      Clan War Leaderboard
                    </Link>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <Link to="/admin" className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`} onClick={closeAllDropdowns}>
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">Admin</span>
                  </Link>
                )}

                {/* ✅ Notification Bell */}
                <div className="nav-notification-wrapper">
                  <NotificationBell />
                </div>

                <div
                  className="dropdown-wrapper profile-wrapper"
                  ref={profileRef}
                  onMouseEnter={() => setHoveredDropdown('profile')}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <button className={`nav-link dropdown-btn profile-btn ${openDropdown === 'profile' ? 'active' : ''}`} onClick={() => toggleDropdown('profile')}>
                    <span className="user-avatar">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt={user.username} className="navbar-avatar-img" />
                      ) : (
                        user?.username?.charAt(0).toUpperCase() || 'U'
                      )}
                    </span>
                    <span className="username">{user?.username}</span>
                    <svg className={`dropdown-arrow-svg ${openDropdown === 'profile' ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`dropdown-menu profile-dropdown ${openDropdown === 'profile' ? 'open' : ''}`}>
                    <Link to="/profile" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">👤</span>
                      Profile
                    </Link>
                    <Link to="/settings" className="dropdown-item" onClick={closeAllDropdowns}>
                      <span className="dropdown-icon">⚙️</span>
                      Settings
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
                <Link to="/login" className="nav-link login-btn" onClick={closeAllDropdowns}>Login</Link>
                <Link to="/register" className="nav-link register-btn" onClick={closeAllDropdowns}>Register</Link>
              </>
            )}
          </div>

          <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu">
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

      <div className={`page-dim-overlay ${dimActive ? 'active' : ''}`}></div>

      <ReferralModal isOpen={isReferralModalOpen} onClose={closeReferralModal} />
      <FriendModal isOpen={isFriendModalOpen} onClose={closeFriendModal} />
      
      <ClanModal 
        isOpen={isClanModalOpen} 
        onClose={closeClanModal}
        onClanAction={handleClanAction}
      />
    </>
  );
};

export default Navbar;