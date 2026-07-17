import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import './Promotions.css';

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPromotions();
    fetchStats();
  }, [filter, page]);

  const fetchPromotions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      
      const response = await api.get('/admin/promotions', { params });
      if (response.data.success) {
        setPromotions(response.data.data || []);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (err) {
      setError('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/promotions/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Change status to ${status}?`)) return;
    
    try {
      const response = await api.put(`/admin/promotions/${id}/status`, { status });
      if (response.data.success) {
        setSuccess(`Status updated to ${status}`);
        fetchPromotions();
        fetchStats();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleGiveReward = async (id, milestone) => {
    if (!window.confirm(`Give reward for ${milestone} views milestone?`)) return;
    
    try {
      const response = await api.post(`/admin/promotions/${id}/reward`, { milestone });
      if (response.data.success) {
        setSuccess(response.data.message || 'Reward given successfully!');
        fetchPromotions();
        fetchStats();
        if (selectedPromotion) {
          const updated = await api.get(`/admin/promotions/${id}`);
          if (updated.data.success) {
            setSelectedPromotion(updated.data.data);
          }
        }
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to give reward');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promotion submission?')) return;
    
    try {
      const response = await api.delete(`/admin/promotions/${id}`);
      if (response.data.success) {
        setSuccess('Promotion deleted successfully');
        fetchPromotions();
        fetchStats();
        if (selectedPromotion) setSelectedPromotion(null);
        setShowDetailModal(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete promotion');
      setTimeout(() => setError(''), 3000);
    }
  };

  const viewDetails = async (id) => {
    try {
      const response = await api.get(`/admin/promotions/${id}`);
      if (response.data.success) {
        setSelectedPromotion(response.data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      setError('Failed to load promotion details');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="promo-badge promo-badge-pending">⏳ Pending</span>;
      case 'approved': return <span className="promo-badge promo-badge-approved">✅ Approved</span>;
      case 'rejected': return <span className="promo-badge promo-badge-rejected">❌ Rejected</span>;
      case 'completed': return <span className="promo-badge promo-badge-completed">🎉 Completed</span>;
      default: return <span className="promo-badge promo-badge-pending">⏳ Pending</span>;
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube': return '▶️';
      case 'instagram': return '📸';
      case 'tiktok': return '🎵';
      case 'facebook': return '👍';
      default: return '🌐';
    }
  };

  const getMilestoneStatus = (milestone) => {
    if (milestone.achieved && milestone.rewardGiven) {
      return <span className="milestone-status completed">✅ Rewarded</span>;
    }
    if (milestone.achieved) {
      return <span className="milestone-status achieved">📊 Achieved</span>;
    }
    return <span className="milestone-status pending">⏳ Not yet</span>;
  };

  const canGiveReward = (milestone) => {
    return milestone.achieved && !milestone.rewardGiven;
  };

  if (loading && promotions.length === 0) {
    return (
      <div className="admin-promotions-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-promotions-container">
      <div className="admin-promotions-header">
        <h2>📢 Promotion Submissions</h2>
        <div className="admin-promotions-stats">
          {stats && (
            <div className="stats-row">
              <span className="stat-item">Total: <strong>{stats.total || 0}</strong></span>
              <span className="stat-item pending">Pending: <strong>{stats.pending || 0}</strong></span>
              <span className="stat-item approved">Approved: <strong>{stats.approved || 0}</strong></span>
              <span className="stat-item completed">Completed: <strong>{stats.completed || 0}</strong></span>
              <span className="stat-item rejected">Rejected: <strong>{stats.rejected || 0}</strong></span>
              <span className="stat-item milestones">
                🏆 Milestones: {stats.milestones?.views10k || 0}/10k | {stats.milestones?.views50k || 0}/50k | {stats.milestones?.views100k || 0}/100k
              </span>
            </div>
          )}
        </div>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success">{success}</div>}

      <div className="admin-promotions-filters">
        <label>Filter by Status:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
          <option value="all">All</option>
          <option value="pending">⏳ Pending</option>
          <option value="approved">✅ Approved</option>
          <option value="rejected">❌ Rejected</option>
          <option value="completed">🎉 Completed</option>
        </select>
        <button className="btn-refresh" onClick={() => { fetchPromotions(); fetchStats(); }}>
          🔄 Refresh
        </button>
      </div>

      {promotions.length === 0 ? (
        <div className="admin-promotions-empty">
          <p>No promotion submissions found.</p>
        </div>
      ) : (
        <>
          <div className="admin-promotions-table-wrapper">
            <table className="admin-promotions-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Platform</th>
                  <th>Video Title</th>
                  <th>Status</th>
                  <th>Milestones</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo._id}>
                    <td>
                      <div className="user-cell">
                        <strong>{promo.username}</strong>
                        <span className="user-email">{promo.email}</span>
                      </div>
                    </td>
                    <td>{getPlatformIcon(promo.platform)} {promo.platform}</td>
                    <td>
                      <div className="video-cell">
                        <span className="video-title">{promo.videoTitle}</span>
                        <a href={promo.videoLink} target="_blank" rel="noopener noreferrer" className="video-link">
                          🔗
                        </a>
                      </div>
                    </td>
                    <td>{getStatusBadge(promo.status)}</td>
                    <td>
                      <div className="milestones-cell">
                        <span className="milestone-dot" title="10k views">
                          {getMilestoneStatus(promo.milestones.views10k)}
                        </span>
                        <span className="milestone-dot" title="50k views">
                          {getMilestoneStatus(promo.milestones.views50k)}
                        </span>
                        <span className="milestone-dot" title="100k views">
                          {getMilestoneStatus(promo.milestones.views100k)}
                        </span>
                      </div>
                    </td>
                    <td>{new Date(promo.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-view" onClick={() => viewDetails(promo._id)}>👁️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="page-btn"
              >
                ← Prev
              </button>
              <span className="page-info">{page} / {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="page-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPromotion && (
        <div className="promo-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="promo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="promo-modal-header">
              <h3>📋 Promotion Details</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="promo-modal-body">
              <div className="detail-row">
                <span className="detail-label">User:</span>
                <span className="detail-value"><strong>{selectedPromotion.username}</strong> ({selectedPromotion.email})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Platform:</span>
                <span className="detail-value">{getPlatformIcon(selectedPromotion.platform)} {selectedPromotion.platform}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{getStatusBadge(selectedPromotion.status)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Video Title:</span>
                <span className="detail-value">{selectedPromotion.videoTitle}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Video Link:</span>
                <span className="detail-value">
                  <a href={selectedPromotion.videoLink} target="_blank" rel="noopener noreferrer" className="detail-link">
                    {selectedPromotion.videoLink}
                  </a>
                </span>
              </div>
              {selectedPromotion.videoDescription && (
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{selectedPromotion.videoDescription}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Submitted:</span>
                <span className="detail-value">{new Date(selectedPromotion.submittedAt).toLocaleString()}</span>
              </div>

              <div className="detail-divider"></div>

              <h4>🎯 Desired Rewards</h4>
              <div className="detail-row">
                <span className="detail-label">📸 Profile Photo:</span>
                <span className="detail-value">{selectedPromotion.desiredProfilePhoto}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🎨 Banner:</span>
                <span className="detail-value">{selectedPromotion.desiredBanner}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">👑 Title:</span>
                <span className="detail-value">{selectedPromotion.desiredTitle}</span>
              </div>

              <div className="detail-divider"></div>

              <h4>📊 Milestones</h4>
              <div className="milestones-grid">
                <div className="milestone-card">
                  <span className="milestone-label">10k Views</span>
                  <span className="milestone-value">{getMilestoneStatus(selectedPromotion.milestones.views10k)}</span>
                  {canGiveReward(selectedPromotion.milestones.views10k) && (
                    <button className="btn-reward" onClick={() => handleGiveReward(selectedPromotion._id, '10k')}>
                      Give Reward
                    </button>
                  )}
                </div>
                <div className="milestone-card">
                  <span className="milestone-label">50k Views</span>
                  <span className="milestone-value">{getMilestoneStatus(selectedPromotion.milestones.views50k)}</span>
                  {canGiveReward(selectedPromotion.milestones.views50k) && (
                    <button className="btn-reward" onClick={() => handleGiveReward(selectedPromotion._id, '50k')}>
                      Give Reward
                    </button>
                  )}
                </div>
                <div className="milestone-card">
                  <span className="milestone-label">100k Views</span>
                  <span className="milestone-value">{getMilestoneStatus(selectedPromotion.milestones.views100k)}</span>
                  {canGiveReward(selectedPromotion.milestones.views100k) && (
                    <button className="btn-reward" onClick={() => handleGiveReward(selectedPromotion._id, '100k')}>
                      Give Reward
                    </button>
                  )}
                </div>
              </div>

              {selectedPromotion.adminNotes && (
                <>
                  <div className="detail-divider"></div>
                  <div className="detail-row">
                    <span className="detail-label">Admin Notes:</span>
                    <span className="detail-value">{selectedPromotion.adminNotes}</span>
                  </div>
                </>
              )}

              <div className="detail-divider"></div>

              <div className="detail-actions">
                <div className="status-actions">
                  <button 
                    className="btn-status btn-approve" 
                    onClick={() => handleStatusUpdate(selectedPromotion._id, 'approved')}
                    disabled={selectedPromotion.status === 'approved' || selectedPromotion.status === 'completed'}
                  >
                    ✅ Approve
                  </button>
                  <button 
                    className="btn-status btn-complete" 
                    onClick={() => handleStatusUpdate(selectedPromotion._id, 'completed')}
                    disabled={selectedPromotion.status === 'completed' || selectedPromotion.status === 'rejected'}
                  >
                    🎉 Complete
                  </button>
                  <button 
                    className="btn-status btn-reject" 
                    onClick={() => handleStatusUpdate(selectedPromotion._id, 'rejected')}
                    disabled={selectedPromotion.status === 'rejected' || selectedPromotion.status === 'completed'}
                  >
                    ❌ Reject
                  </button>
                </div>
                <button className="btn-delete" onClick={() => handleDelete(selectedPromotion._id)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotions;