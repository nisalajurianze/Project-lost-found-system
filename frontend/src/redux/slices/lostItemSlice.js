// ============================================
// Lost Item Redux Slice
// State management for lost item listings
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import lostItemService from '../../services/lostItemService';

export const fetchLostItems = createAsyncThunk(
  'lostItems/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await lostItemService.getLostItems(params); // returns { items, pagination }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLostItemById = createAsyncThunk(
  'lostItems/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await lostItemService.getLostItemById(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createNewLostReport = createAsyncThunk(
  'lostItems/create',
  async (formData, { rejectWithValue }) => {
    try {
      return await lostItemService.createLostItem(formData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateLostReport = createAsyncThunk(
  'lostItems/update',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      return await lostItemService.updateLostItem(id, formData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteLostReport = createAsyncThunk(
  'lostItems/delete',
  async (id, { rejectWithValue }) => {
    try {
      await lostItemService.deleteLostItem(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const lostItemSlice = createSlice({
  name: 'lostItems',
  initialState: {
    items: [],
    currentItem: null,
    pagination: { page: 1, limit: 10, totalPages: 1, totalDocs: 0 },
    isLoading: false,
    error: null
  },
  reducers: {
    clearCurrentLostItem: (state) => {
      state.currentItem = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchLostItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLostItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchLostItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchLostItemById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLostItemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentItem = action.payload;
      })
      .addCase(fetchLostItemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createNewLostReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNewLostReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createNewLostReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateLostReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateLostReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentItem = action.payload;
        const idx = state.items.findIndex(item => item._id === action.payload._id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(updateLostReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteLostReport.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
        if (state.currentItem?._id === action.payload) {
          state.currentItem = null;
        }
      });
  }
});

export const { clearCurrentLostItem } = lostItemSlice.actions;
export default lostItemSlice.reducer;
