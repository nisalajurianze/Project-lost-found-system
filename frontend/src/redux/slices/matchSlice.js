// ============================================
// Match Redux Slice
// State management for AI matching suggestions
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import matchService from '../../services/matchService';

export const fetchMatches = createAsyncThunk(
  'matches/fetchAll',
  async (status, { rejectWithValue }) => {
    try {
      return await matchService.getMatches(status);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMatchById = createAsyncThunk(
  'matches/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await matchService.getMatchById(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const confirmOrRejectMatch = createAsyncThunk(
  'matches/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await matchService.updateMatchStatus(id, status);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const matchSlice = createSlice({
  name: 'matches',
  initialState: {
    matches: [],
    pagination: null,
    currentMatch: null,
    isLoading: false,
    error: null
  },
  reducers: {
    clearCurrentMatch: (state) => {
      state.currentMatch = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchMatches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.matches = action.payload.matches;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchMatchById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMatchById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMatch = action.payload;
      })
      .addCase(fetchMatchById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update Status
      .addCase(confirmOrRejectMatch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmOrRejectMatch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMatch = action.payload;
        // Update list
        state.matches = state.matches.map(m => m._id === action.payload._id ? action.payload : m);
      })
      .addCase(confirmOrRejectMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCurrentMatch } = matchSlice.actions;
export default matchSlice.reducer;
