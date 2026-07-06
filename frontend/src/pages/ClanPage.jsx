import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import ClanChat from '../components/clan/ClanChat';
import ClanMembers from '../components/clan/ClanMembers';
import ClanDonateModal from '../components/clan/ClanDonateModal';
import './ClanPage.css';

const ClanPage = () => {
  const [clanData, setClanData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [userRole, setUserRole] = useState('member');
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
    fetchClanData();
  }, []);

  const fetchClanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/clan/my-clan');

      setClanData(response.data.clan);
      setMembers(response.data.members || []);
      setUserRole(response.data.userRole || 'member');
      setError('');
    } catch (err) {
      console.error('Failed to fetch clan data:', err);
      if (err.response?.status === 404) {
        setError('You are not in a clan. Please create or join one.');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Failed to load clan data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    navigate('/');
  };

  const handleDonate = () => {
    fetchClanData();
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="clan-page-loading">
        <div className="loader"></div>
        <p>Loading clan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clan-page-error">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  if (!clanData) {
    return (
      <div className="clan-page-error">
        <div className="error-container">
          <span className="error-icon">🏰</span>
          <h2>No Clan</h2>
          <p>You are not in a clan. Create or join one!</p>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`clan-page ${isVisible ? 'visible' : ''}`}>
      <div className="clan-bg-noise"></div>
      <div className="clan-bg-grid"></div>

      <div className="clan-page-header">
        <div className="clan-aurora clan-aurora-1"></div>
        <div className="clan-aurora clan-aurora-2"></div>
        <div className="clan-info">
          <h1
            className="clan-name-clickable"
            onClick={() => setActiveTab('members')}
            title="Click to view members"
          >
            <span className="clan-name-gradient">{clanData.name || 'Clan'}</span> ⚔️
          </h1>
          <p className="clan-description">{clanData.description || 'No description'}</p>
          <div className="clan-stats">
            <span className="clan-stat-pill">
              👥 {clanData.totalMembers || 0}/{clanData.maxMembers || 20}
            </span>
          </div>
        </div>
      </div>

      <div className="clan-page-tabs">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('members')}
        >
          👥 Members
        </button>
        <button
          className="tab-btn donate-btn-header"
          onClick={() => setShowDonateModal(true)}
        >
          💎 Donate
        </button>
      </div>

      <div className="clan-page-content">
        {activeTab === 'chat' && clanData?.id && (
          <ClanChat
            clanId={clanData.id}
            clanName={clanData.name}
            userRole={userRole}
          />
        )}
        {activeTab === 'members' && clanData?.id && (
          <ClanMembers
            clanId={clanData.id}
            members={members}
            userRole={userRole}
            onLeave={handleLeave}
          />
        )}
      </div>

      {showDonateModal && clanData?.id && (
        <ClanDonateModal
          clanId={clanData.id}
          members={members}
          onClose={() => setShowDonateModal(false)}
          onDonate={handleDonate}
        />
      )}
    </div>
  );
};

export default ClanPage;