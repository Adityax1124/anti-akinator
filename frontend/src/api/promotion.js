// /frontend/src/api/promotion.js
import api from './axios';

// ============================================================
// PROMOTION API SERVICE
// ============================================================

/**
 * Submit a new promotion video
 * @param {Object} data - Promotion form data
 * @param {string} data.platform - Platform name (youtube, instagram, tiktok, facebook, other)
 * @param {string} data.videoLink - URL of the video
 * @param {string} data.videoTitle - Title of the video
 * @param {string} data.videoDescription - Description of the video (optional)
 * @param {string} data.desiredProfilePhoto - Desired character for profile photo reward
 * @param {string} data.desiredBanner - Desired character for banner reward
 * @param {string} data.desiredTitle - Desired title name
 * @returns {Promise} Submission result
 */
export const submitPromotion = async (data) => {
  try {
    const response = await api.post('/promotion/submit', data);
    return response.data;
  } catch (error) {
    console.error('Error submitting promotion:', error);
    throw error;
  }
};

/**
 * Get user's promotion submissions
 * @returns {Promise} List of submissions
 */
export const getMySubmissions = async () => {
  try {
    const response = await api.get('/promotion/my-submissions');
    return response.data;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
};

/**
 * Get single promotion submission by ID
 * @param {string} id - Promotion ID
 * @returns {Promise} Submission details
 */
export const getPromotionById = async (id) => {
  try {
    const response = await api.get(`/promotion/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching promotion:', error);
    throw error;
  }
};

// ============================================================
// ADMIN PROMOTION API SERVICES
// ============================================================

/**
 * Get all promotions (admin only)
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (pending, approved, rejected, completed)
 * @param {number} params.limit - Number of results per page
 * @param {number} params.page - Page number
 * @returns {Promise} List of all promotions
 */
export const getAllPromotions = async (params = {}) => {
  try {
    const response = await api.get('/admin/promotions', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching all promotions:', error);
    throw error;
  }
};

/**
 * Get single promotion detail (admin only)
 * @param {string} id - Promotion ID
 * @returns {Promise} Promotion details
 */
export const getPromotionDetail = async (id) => {
  try {
    const response = await api.get(`/admin/promotions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching promotion detail:', error);
    throw error;
  }
};

/**
 * Update promotion status (admin only)
 * @param {string} id - Promotion ID
 * @param {string} status - New status (pending, approved, rejected, completed)
 * @param {string} adminNotes - Admin notes (optional)
 * @returns {Promise} Update result
 */
export const updatePromotionStatus = async (id, status, adminNotes) => {
  try {
    const response = await api.put(`/admin/promotions/${id}/status`, {
      status,
      adminNotes
    });
    return response.data;
  } catch (error) {
    console.error('Error updating promotion status:', error);
    throw error;
  }
};

/**
 * Give reward for milestone (admin only)
 * @param {string} id - Promotion ID
 * @param {string} milestone - Milestone to reward (10k, 50k, 100k)
 * @returns {Promise} Reward result
 */
export const giveReward = async (id, milestone) => {
  try {
    const response = await api.post(`/admin/promotions/${id}/reward`, {
      milestone
    });
    return response.data;
  } catch (error) {
    console.error('Error giving reward:', error);
    throw error;
  }
};

/**
 * Delete promotion (admin only)
 * @param {string} id - Promotion ID
 * @returns {Promise} Delete result
 */
export const deletePromotion = async (id) => {
  try {
    const response = await api.delete(`/admin/promotions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting promotion:', error);
    throw error;
  }
};

/**
 * Get promotion stats (admin only)
 * @returns {Promise} Stats data
 */
export const getPromotionStats = async () => {
  try {
    const response = await api.get('/admin/promotions/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching promotion stats:', error);
    throw error;
  }
};