// ============================================
// Notification Redux Slice
// State management for notifications (including socket push updates)
// ============================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from '../../services/notificationService';
import toast from 'react-hot-toast';

export const fetchUserNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await notificationService.getNotifications(params);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      return await notificationService.markAsRead(id);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead();
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteUserNotification = createAsyncThunk(
  'notifications/delete',
  async (id, { rejectWithValue }) => {
    try {
      await notificationService.deleteNotification(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    pagination: { page: 1, limit: 10, totalPages: 1, totalDocs: 0 },
    unreadCount: 0,
    isLoading: false,
    error: null
  },
  reducers: {
    addSocketNotification: (state, action) => {
      // Append real-time notifications to the top of the array
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
      
      // Trigger user-facing hot-toast popup
      toast.success(action.payload.title, {
        description: action.payload.message,
        duration: 5000,
        position: 'top-right'
      });
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchUserNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.pagination = action.payload.pagination;
        
        // Calculate unread count
        state.unreadCount = action.payload.notifications.filter(n => !n.isRead).length;
      })
      .addCase(fetchUserNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Mark Read
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map(n => n._id === action.payload._id ? action.payload : n);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      // Mark All Read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      })
      // Delete
      .addCase(deleteUserNotification.fulfilled, (state, action) => {
        const deleted = state.notifications.find(n => n._id === action.payload);
        if (deleted && !deleted.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n._id !== action.payload);
      });
  }
});

export const { addSocketNotification, resetUnreadCount } = notificationSlice.actions;
export default notificationSlice.reducer;
