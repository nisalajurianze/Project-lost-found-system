// ============================================
// Match Service
// API calls for AI-generated matches
// ============================================

import api from './api';

const matchService = {
  /**
   * Get potential matches.
   * @param {string} status - suggested, confirmed, rejected
   */
  getMatches: async (status) => {
    const res = await api.get('/matches', { params: { status } });
    return res.data.data;
  },

  /**
   * Get match details.
   */
  getMatchById: async (id) => {
    const res = await api.get(`/matches/${id}`);
    return res.data.data;
  },

  /**
   * Update match status (confirm / reject).
   * @param {string} id
   * @param {string} status - confirmed, rejected
   */
  updateMatchStatus: async (id, status) => {
    const res = await api.put(`/matches/${id}`, { status });
    return res.data.data;
  }
};

export default matchService;
