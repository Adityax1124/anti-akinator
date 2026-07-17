import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitPromotion, getMySubmissions } from '../api/promotion';
import './PromoteEarn.css';

const PromoteEarn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [formData, setFormData] = useState({
    platform: 'youtube',
    videoLink: '',
    videoTitle: '',
    videoDescription: '',
    desiredProfilePhoto: '',
    desiredBanner: '',
    desiredTitle: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchSubmissions();
  }, [user, navigate]);

  const fetchSubmissions = async () => {
    try {
      const data = await getMySubmissions();
      if (data.success) {
        setSubmissions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    if (!formData.videoLink || !formData.videoTitle || !formData.desiredProfilePhoto || !formData.desiredBanner || !formData.desiredTitle) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate video link
    try {
      new URL(formData.videoLink);
    } catch {
      setError('Please enter a valid video URL');
      return;
    }

    setLoading(true);

    try {
      const response = await submitPromotion(formData);
      if (response.success) {
        setSuccess('✅ Your promotion video has been submitted successfully! Our team will review it shortly.');
        setFormData({
          platform: 'youtube',
          videoLink: '',
          videoTitle: '',
          videoDescription: '',
          desiredProfilePhoto: '',
          desiredBanner: '',
          desiredTitle: ''
        });
        setTermsAccepted(false);
        await fetchSubmissions();
        setShowForm(false);
        setTimeout(() => setShowForm(true), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="badge badge-pending">⏳ Pending</span>;
      case 'approved': return <span className="badge badge-approved">✅ Approved</span>;
      case 'rejected': return <span className="badge badge-rejected">❌ Rejected</span>;
      case 'completed': return <span className="badge badge-completed">🎉 Completed</span>;
      default: return <span className="badge badge-pending">⏳ Pending</span>;
    }
  };

  const getMilestoneStatus = (milestone) => {
    if (milestone.achieved && milestone.rewardGiven) {
      return <span className="milestone-completed">✅ Achieved & Rewarded</span>;
    }
    if (milestone.achieved) {
      return <span className="milestone-achieved">📊 Achieved - Awaiting Reward</span>;
    }
    return <span className="milestone-pending">⏳ Not Yet Achieved</span>;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="promote-earn-container">
      <div className="promote-earn-bg-noise"></div>
      <div className="promote-earn-bg-grid"></div>

      <div className="promote-earn-header">
        <h1>📢 Promote & Earn</h1>
        <p>Create videos about Anti-Akinator and earn amazing rewards!</p>
      </div>

      {/* Rewards Section */}
      <div className="rewards-section">
        <h2>🎁 Rewards</h2>
        <div className="rewards-grid">
          <div className="reward-card">
            <div className="reward-icon">📸</div>
            <div className="reward-view">10,000 Views</div>
            <div className="reward-name">Animated Profile Photo</div>
            <div className="reward-desc">Get a custom animated profile photo of any character you want!</div>
            <div className="reward-tier">🔥 Tier 1</div>
          </div>
          <div className="reward-card">
            <div className="reward-icon">🎨</div>
            <div className="reward-view">50,000 Views</div>
            <div className="reward-name">Animated Banner</div>
            <div className="reward-desc">Get a custom animated banner of any character you want!</div>
            <div className="reward-tier">⭐ Tier 2</div>
          </div>
          <div className="reward-card gold">
            <div className="reward-icon">👑</div>
            <div className="reward-view">100,000 Views</div>
            <div className="reward-name">Partner Title (Legendary)</div>
            <div className="reward-desc">Get an exclusive legendary title that no one else has!</div>
            <div className="reward-tier">🏆 Tier 3</div>
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <div className="rules-section">
        <h2>📋 Rules & Terms</h2>
        <div className="rules-grid">
          <div className="rule-card">
            <span className="rule-number">01</span>
            <h3>Create a Video</h3>
            <p>Create a video about Anti-Akinator - gameplay, tutorial, or review. Must be at least 30 seconds long.</p>
          </div>
          <div className="rule-card">
            <span className="rule-number">02</span>
            <h3>Post on Platform</h3>
            <p>Upload your video on YouTube, Instagram, TikTok, or Facebook. Must be public.</p>
          </div>
          <div className="rule-card">
            <span className="rule-number">03</span>
            <h3>Submit Your Entry</h3>
            <p>Fill out the form with your video link and desired rewards. Each user can submit up to 3 videos per month.</p>
          </div>
          <div className="rule-card">
            <span className="rule-number">04</span>
            <h3>Get Rewards</h3>
            <p>When your video hits the milestones, you'll receive your rewards automatically after admin verification.</p>
          </div>
        </div>
      </div>

      {/* Submission Form */}
      <div className={`form-section ${showForm ? 'visible' : 'hidden'}`}>
        <h2>📝 Submit Your Video</h2>
        <form onSubmit={handleSubmit} className="promote-form">
          {error && <div className="form-alert error">{error}</div>}
          {success && <div className="form-alert success">{success}</div>}

          <div className="form-group">
            <label>Platform *</label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              className="form-control"
              required
            >
              <option value="youtube">▶️ YouTube</option>
              <option value="instagram">📸 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="facebook">👍 Facebook</option>
              <option value="other">🌐 Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Video Link *</label>
            <input
              type="url"
              name="videoLink"
              value={formData.videoLink}
              onChange={handleChange}
              className="form-control"
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
            <small className="form-hint">Make sure your video is public so we can verify it</small>
          </div>

          <div className="form-group">
            <label>Video Title *</label>
            <input
              type="text"
              name="videoTitle"
              value={formData.videoTitle}
              onChange={handleChange}
              className="form-control"
              placeholder="My Anti-Akinator gameplay"
              required
            />
          </div>

          <div className="form-group">
            <label>Video Description</label>
            <textarea
              name="videoDescription"
              value={formData.videoDescription}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="Brief description of your video..."
            />
          </div>

          <h3 style={{ color: '#fff', marginTop: 20, marginBottom: 16 }}>🎯 Select Your Desired Rewards</h3>

          <div className="form-group">
            <label>Desired Profile Photo Character *</label>
            <input
              type="text"
              name="desiredProfilePhoto"
              value={formData.desiredProfilePhoto}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Luffy, Naruto, Goku"
              required
            />
            <small className="form-hint">You'll get an animated profile photo of this character at 10k views</small>
          </div>

          <div className="form-group">
            <label>Desired Banner Character *</label>
            <input
              type="text"
              name="desiredBanner"
              value={formData.desiredBanner}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Zoro, Sasuke, Vegeta"
              required
            />
            <small className="form-hint">You'll get an animated banner of this character at 50k views</small>
          </div>

          <div className="form-group">
            <label>Desired Title *</label>
            <input
              type="text"
              name="desiredTitle"
              value={formData.desiredTitle}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Anime Legend, The Chosen One"
              required
            />
            <small className="form-hint">You'll get a legendary title at 100k views</small>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              I agree to the <a href="/terms" target="_blank">Terms & Conditions</a> and confirm that my video is original content
            </label>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Submitting...' : '🚀 Submit Video'}
          </button>
        </form>
      </div>

      {/* My Submissions */}
      <div className="submissions-section">
        <h2>📊 My Submissions</h2>
        {submissions.length === 0 ? (
          <div className="submissions-empty">
            <p>No submissions yet. Create your first video and earn rewards! 🎥</p>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((submission) => (
              <div key={submission._id} className="submission-card">
                <div className="submission-header">
                  <div className="submission-platform">
                    {getPlatformIcon(submission.platform)} {submission.platform}
                  </div>
                  {getStatusBadge(submission.status)}
                </div>
                <div className="submission-details">
                  <h4>{submission.videoTitle}</h4>
                  <p className="submission-link">
                    <a href={submission.videoLink} target="_blank" rel="noopener noreferrer">
                      🔗 View Video
                    </a>
                  </p>
                  <p className="submission-date">
                    Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="submission-milestones">
                  <div className="milestone-item">
                    <span className="milestone-label">📸 10k Views:</span>
                    {getMilestoneStatus(submission.milestones.views10k)}
                  </div>
                  <div className="milestone-item">
                    <span className="milestone-label">🎨 50k Views:</span>
                    {getMilestoneStatus(submission.milestones.views50k)}
                  </div>
                  <div className="milestone-item">
                    <span className="milestone-label">👑 100k Views:</span>
                    {getMilestoneStatus(submission.milestones.views100k)}
                  </div>
                </div>
                {submission.adminNotes && (
                  <div className="submission-notes">
                    <strong>Admin Note:</strong> {submission.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoteEarn;