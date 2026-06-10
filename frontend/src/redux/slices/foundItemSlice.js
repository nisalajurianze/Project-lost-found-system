// ============================================
// Found Item Redux Slice
// State management for found item listings
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import foundItemService from '../../services/foundItemService';

export const fetchFoundItems = createAsyncThunk(
  'foundItems/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await foundItemService.getFoundItems(params);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchFoundItemById = createAsyncThunk(
  'foundItems/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await foundItemService.getFoundItemById(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createNewFoundReport = createAsyncThunk(
  'foundItems/create',
  async (formData, { rejectWithValue }) => {
    try {
      return await foundItemService.createFoundItem(formData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFoundReport = createAsyncThunk(
  'foundItems/update',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      return await foundItemService.updateFoundItem(id, formData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteFoundReport = createAsyncThunk(
  'foundItems/delete',
  async (id, { rejectWithValue }) => {
    try {
      await foundItemService.deleteFoundItem(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const foundItemSlice = createSlice({
  name: 'foundItems',
  initialState: {
    items: [],
    currentItem: null,
    pagination: { page: 1, limit: 10, totalPages: 1, totalDocs: 0 },
    isLoading: false,
    error: null
  },
  reducers: {
    clearCurrentFoundItem: (state) => {
      state.currentItem = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchFoundItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFoundItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchFoundItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchFoundItemById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFoundItemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentItem = action.payload;
      })
      .addCase(fetchFoundItemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createNewFoundReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNewFoundReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createNewFoundReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateFoundReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateFoundReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentItem = action.payload;
        const idx = state.items.findIndex(item => item._id === action.payload._id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(updateFoundReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteFoundReport.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
        if (state.currentItem?._id === action.payload) {
          state.currentItem = null;
        }
      });
  }
});

export const { clearCurrentFoundItem } = foundItemSlice.actions;
export default foundItemSlice.reducer;
