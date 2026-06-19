// ============================================
// Admin Redux Slice
// State management for admin control panels
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from '../../services/adminService';

export const fetchAdminStats = createAsyncThunk(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await adminService.getStats();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUsersList = createAsyncThunk(
  'admin/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      return await adminService.getUsers(params); // returns { users, pagination }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleUserActivation = createAsyncThunk(
  'admin/toggleUserStatus',
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      return await adminService.updateUserStatus(id, isActive);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'admin/updateUserRole',
  async ({ id, role }, { rejectWithValue }) => {
    try {
      return await adminService.updateUserRole(id, role);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchAdminAuditLogs = createAsyncThunk(
  'admin/fetchLogs',
  async (params, { rejectWithValue }) => {
    try {
      return await adminService.getAdminLogs(params); // returns { logs, pagination }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    stats: null,
    users: [],
    logs: [],
    usersPagination: { page: 1, limit: 10, totalPages: 1, totalDocs: 0 },
    logsPagination: { page: 1, limit: 10, totalPages: 1, totalDocs: 0 },
    isLoading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Stats
      .addCase(fetchAdminStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Users
      .addCase(fetchUsersList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsersList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.users;
        state.usersPagination = action.payload.pagination;
      })
      .addCase(fetchUsersList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Toggle Activation
      .addCase(toggleUserActivation.fulfilled, (state, action) => {
        state.users = state.users.map(u => u._id === action.payload._id ? action.payload : u);
      })
      // Update Role
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.users = state.users.map(u => u._id === action.payload._id ? action.payload : u);
      })
      // Fetch Logs
      .addCase(fetchAdminAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload.logs;
        state.logsPagination = action.payload.pagination;
      })
      .addCase(fetchAdminAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export default adminSlice.reducer;
// 
