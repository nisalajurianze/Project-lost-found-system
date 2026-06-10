// ============================================
// Category Redux Slice
// State management for item categories
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import categoryService from '../../services/categoryService';

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await categoryService.getCategories();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createNewCategory = createAsyncThunk(
  'categories/create',
  async (categoryData, { rejectWithValue }) => {
    try {
      return await categoryService.createCategory(categoryData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCategoryDetails = createAsyncThunk(
  'categories/update',
  async ({ id, categoryData }, { rejectWithValue }) => {
    try {
      return await categoryService.updateCategory(id, categoryData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCategoryById = createAsyncThunk(
  'categories/delete',
  async (id, { rejectWithValue }) => {
    try {
      await categoryService.deleteCategory(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const categorySlice = createSlice({
  name: 'categories',
  initialState: {
    categories: [],
    isLoading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createNewCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNewCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories.push(action.payload);
      })
      .addCase(createNewCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateCategoryDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCategoryDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = state.categories.map(c => c._id === action.payload._id ? action.payload : c);
      })
      .addCase(updateCategoryDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteCategoryById.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => c._id !== action.payload);
      });
  }
});

export default categorySlice.reducer;
