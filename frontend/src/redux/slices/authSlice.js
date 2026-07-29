import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

const initialState = { user: null, isAuthenticated: false, isLoading: true, error: null };

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try { return await authService.register(data); } catch (error) { return rejectWithValue(error.message); }
});
export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try { return await authService.login(data); } catch (error) { return rejectWithValue(error.code || error.message); }
});
export const googleLoginUser = createAsyncThunk('auth/googleLogin', async (idToken, { rejectWithValue }) => {
  try { return await authService.googleLogin(idToken); } catch (error) { return rejectWithValue(error.message); }
});
export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try { return await authService.getMe(); } catch (error) { return rejectWithValue(error.message); }
});
export const logoutUser = createAsyncThunk('auth/logout', async () => { await authService.logout(); });

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuth: (state) => { state.user = null; state.isAuthenticated = false; state.isLoading = false; state.error = null; },
    clearAuthError: (state) => { state.error = null; },
    updateUserProfile: (state, action) => { state.user = action.payload; },
  },
  extraReducers: (builder) => builder
    .addCase(registerUser.pending, (state) => { state.isLoading = true; state.error = null; })
    .addCase(registerUser.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload?.user?.isVerified) { state.user = action.payload.user; state.isAuthenticated = true; }
    })
    .addCase(registerUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
    .addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null; })
    .addCase(loginUser.fulfilled, (state, action) => { state.isLoading = false; state.user = action.payload.user; state.isAuthenticated = true; })
    .addCase(loginUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
    .addCase(googleLoginUser.pending, (state) => { state.isLoading = true; state.error = null; })
    .addCase(googleLoginUser.fulfilled, (state, action) => { state.isLoading = false; state.user = action.payload.user; state.isAuthenticated = true; })
    .addCase(googleLoginUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
    .addCase(fetchCurrentUser.pending, (state) => { state.isLoading = true; })
    .addCase(fetchCurrentUser.fulfilled, (state, action) => { state.isLoading = false; state.user = action.payload; state.isAuthenticated = true; state.error = null; })
    .addCase(fetchCurrentUser.rejected, (state) => { state.isLoading = false; state.user = null; state.isAuthenticated = false; })
    .addCase(logoutUser.fulfilled, (state) => { state.user = null; state.isAuthenticated = false; state.isLoading = false; state.error = null; }),
});

export const { clearAuth, clearAuthError, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
