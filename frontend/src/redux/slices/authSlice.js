// ============================================
// Auth Redux Slice
// Thunks for signups, logins, and session restoration
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import { LOCAL_STORAGE_USER_KEY, LOCAL_STORAGE_TOKEN_KEY } from '../../utils/constants';

// BUG-014 & SEC-013: Safe initialization
let cachedUser = null;
try {
  const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (stored) cachedUser = JSON.parse(stored);
} catch (e) {}

const initialState = {
  user: cachedUser,
  isAuthenticated: !!cachedUser,
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
      return await authService.login(credentials); // Returns { user }
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
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY); // Legacy fallback
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    updateUserProfile: (state, action) => {
      state.user = action.payload;
      const safeUser = {
        _id: action.payload._id,
        fullName: action.payload.fullName,
        role: action.payload.role,
        profileImage: action.payload.profileImage
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(safeUser));
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
        state.isAuthenticated = true;
        
        const safeUser = {
          _id: action.payload.user._id,
          fullName: action.payload.user.fullName,
          role: action.payload.user.role,
          profileImage: action.payload.user.profileImage
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(safeUser));
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
        const safeUser = {
          _id: action.payload._id,
          fullName: action.payload.fullName,
          role: action.payload.role,
          profileImage: action.payload.profileImage
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(safeUser));
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Auto logout if auth fetch fails
        state.user = null;
        state.isAuthenticated = false;
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      });
  }
});

export const { clearAuth, clearAuthError, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
