// ============================================
// Claim Service
// API calls for ownership claim requests
// ============================================

import api from './api';

const claimService = {
  /**
   * Submit an ownership claim request (supports proof images).
   * @param {FormData} formData
   */
  submitClaim: async (formData) => {
    const res = await api.post('/claims', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  /**
   * Get claim requests list.
   */
  getClaims: async (params = {}) => {
    const res = await api.get('/claims', { params });
    return res.data.data; // { claims, pagination }
  },

  /**
   * Get claim request details.
   */
  getClaimById: async (id) => {
    const res = await api.get(`/claims/${id}`);
    return res.data.data;
  },

  /**
   * Admin review of a claim request (Approve/Reject).
   * @param {string} id
   * @param {string} status - approved, rejected
   * @param {string} adminRemark - collection instructions / rejection reasons
   */
  reviewClaim: async (id, status, adminRemark) => {
    const res = await api.put(`/claims/${id}/review`, { status, adminRemark });
    return res.data.data;
  },

  /**
   * Share contact info without approving the claim.
   */
  shareContact: async (id) => {
    const res = await api.patch(`/claims/${id}/share-contact`);
    return res.data.data;
  }
};

export default claimService;
