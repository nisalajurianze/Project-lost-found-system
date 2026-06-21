// ============================================
// Theme Redux Slice
// Handles light/dark mode transitions and state caching
// ============================================

import { createSlice } from '@reduxjs/toolkit';
import { LOCAL_STORAGE_THEME_KEY } from '../../utils/constants';

// Detect default theme preference
const getInitialTheme = () => {
  // If there's a cached theme, return it ('light', 'dark', or 'system')
  const cachedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
  if (cachedTheme) return cachedTheme;

  // Otherwise default to 'system'
  return 'system';
};

const applyThemeToDOM = (mode) => {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (mode === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (mode === 'system') {
    const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (userPrefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

const initialTheme = getInitialTheme();

applyThemeToDOM(initialTheme);

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: initialTheme
  },
  reducers: {
    toggleTheme: (state) => {
      let nextMode = 'light';
      if (state.mode === 'light') nextMode = 'dark';
      else if (state.mode === 'dark') nextMode = 'system';
      else if (state.mode === 'system') nextMode = 'light';
      
      state.mode = nextMode;
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, nextMode);
      applyThemeToDOM(nextMode);
    },
    setTheme: (state, action) => {
      const mode = action.payload; // 'light', 'dark', or 'system'
      state.mode = mode;
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, mode);
      applyThemeToDOM(mode);
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
