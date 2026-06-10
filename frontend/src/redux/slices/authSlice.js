// ============================================
// Auth Redux Slice
// Thunks for signups, logins, and session restoration
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import { LOCAL_STORAGE_USER_KEY, LOCAL_STORAGE_TOKEN_KEY } from '../../utils/constants';

// Initial state checks localStorage
const cachedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
const cachedToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);

const initialState = {
  user: cachedUser ? JSON.parse(cachedUser) : null,
  token: cachedToken || null,
  isAuthenticated: !!cachedToken,
  isLoading: false,
  error: null
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials); // Returns { user, accessToken }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getMe();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    await authService.logout();
    dispatch(clearAuth());
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    updateUserProfile: (state, action) => {
      state.user = action.payload;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(action.payload));
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(action.payload));
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Auto logout if auth fetch fails
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  }
});

export const { clearAuth, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
