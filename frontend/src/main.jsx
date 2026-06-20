import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import App from './App';
import store from './redux/store';
import './index.css';

// Force unregister any existing service workers to bust aggressive PWA caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    let unregisterPromises = [];
    for(let registration of registrations) {
      unregisterPromises.push(registration.unregister());
    }
    Promise.all(unregisterPromises).then((results) => {
      if (results.some(r => r)) {
        console.log('Old ServiceWorkers unregistered successfully.');
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
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
    </Provider>
  </React.StrictMode>
);

