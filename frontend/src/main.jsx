import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import store from './redux/store';
import { LanguageProvider } from './i18n/LanguageContext';
import { applyAccessibilityPreferences, loadAccessibilityPreferences } from './utils/accessibilityPreferences';
import './index.css';
import './styles/dashboard.css';
import './styles/motion.css';
import './styles/accessibility.css';

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

// Apply browser-local display preferences before React paints to avoid a size/effect flash.
applyAccessibilityPreferences(loadAccessibilityPreferences());

const application = (
  <Provider store={store}>
    <LanguageProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1e293b', color: '#f1f5f9', borderRadius: '10px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } }
        }}
      />
    </BrowserRouter>
    </LanguageProvider>
  </Provider>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{application}</GoogleOAuthProvider>
    ) : application}
  </React.StrictMode>
);
