// ============================================
// Theme Redux Slice
// Handles light/dark mode transitions and state caching
// ============================================

import { createSlice } from '@reduxjs/toolkit';
import { LOCAL_STORAGE_THEME_KEY } from '../../utils/constants';

// Detect default theme preference
const getInitialTheme = () => {
  const cachedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
  if (cachedTheme) return cachedTheme;

  const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return userPrefersDark ? 'dark' : 'light';
};

const initialTheme = getInitialTheme();

// Set DOM class at initial boot
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: initialTheme
  },
  reducers: {
    toggleTheme: (state) => {
      const nextMode = state.mode === 'light' ? 'dark' : 'light';
      state.mode = nextMode;
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, nextMode);

      if (nextMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setTheme: (state, action) => {
      const mode = action.payload; // 'light' or 'dark'
      state.mode = mode;
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, mode);

      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
