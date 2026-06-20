// ============================================
// Claim Redux Slice
// State management for ownership claims
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import claimService from '../../services/claimService';

export const fetchClaims = createAsyncThunk(
  'claims/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await claimService.getClaims(params); // returns { claims, pagination }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchClaimById = createAsyncThunk(
  'claims/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await claimService.getClaimById(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitNewClaim = createAsyncThunk(
  'claims/create',
  async (formData, { rejectWithValue }) => {
    try {
      return await claimService.submitClaim(formData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const reviewClaimRequest = createAsyncThunk(
  'claims/review',
  async ({ id, status, adminRemark }, { rejectWithValue }) => {
    try {
      return await claimService.reviewClaim(id, status, adminRemark);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const shareClaimContact = createAsyncThunk(
  'claims/shareContact',
  async (id, { rejectWithValue }) => {
    try {
      return await claimService.shareContact(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const claimSlice = createSlice({
  name: 'claims',
  initialState: {
    claims: [],
    currentClaim: null,
    pagination: { page: 1, limit: 10, totalPages: 1, totalDocs: 0 },
    isLoading: false,
    error: null
  },
  reducers: {
    clearCurrentClaim: (state) => {
      state.currentClaim = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchClaims.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClaims.fulfilled, (state, action) => {
        state.isLoading = false;
        state.claims = action.payload.claims;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchClaims.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchClaimById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClaimById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentClaim = action.payload;
      })
      .addCase(fetchClaimById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Submit
      .addCase(submitNewClaim.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitNewClaim.fulfilled, (state, action) => {
        state.isLoading = false;
        state.claims.unshift(action.payload);
      })
      .addCase(submitNewClaim.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Review
      .addCase(reviewClaimRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reviewClaimRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentClaim = action.payload;
        state.claims = state.claims.map(c => c._id === action.payload._id ? action.payload : c);
      })
      .addCase(reviewClaimRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Share Contact
      .addCase(shareClaimContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(shareClaimContact.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentClaim = action.payload;
        state.claims = state.claims.map(c => c._id === action.payload._id ? action.payload : c);
      })
      .addCase(shareClaimContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCurrentClaim } = claimSlice.actions;
export default claimSlice.reducer;
