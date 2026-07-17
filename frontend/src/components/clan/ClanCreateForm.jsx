import React, { useState } from 'react';
import axios from '../../api/axios';
import './ClanCreateForm.css';

const ClanCreateForm = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'description') {
      const words = value.trim().split(/\s+/);
      if (words.length > 30) return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/clan/create', {
        name: formData.name.trim(),
        description: formData.description.trim()
      });

      onSuccess(response.data.clan);
    } catch (err) {

      const errorMessage = err.response?.data?.message || 'Failed to create clan. Please try again.';
      setError(errorMessage);

      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        const errorList = Object.values(validationErrors).join(', ');
        setError(`Validation error: ${errorList}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const wordCount = formData.description.trim().split(/\s+/).filter(w => w).length;

  return (
    <div className="clan-create-form">
      <button className="back-btn" onClick={onBack} type="button">← Back</button>
      <h2>Create Your Clan</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Clan Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter clan name"
            maxLength="30"
            required
            autoFocus
            disabled={loading}
          />
          <span className="char-count">{formData.name.length}/30</span>
        </div>

        <div className="form-group">
          <label>Clan Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your clan (max 30 words)"
            rows="4"
            required
            disabled={loading}
          />
          <span className="word-count">{wordCount}/30 words</span>
        </div>

        <div className="clan-cost-info">
          <span>💰 Cost: 200 Shards</span>
          <span className="info-text">One-time payment to establish your clan</span>
        </div>

        <button type="submit" className="create-clan-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Clan 🏰'}
        </button>
      </form>
    </div>
  );
};

export default ClanCreateForm;