// main.jsx
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import './App.css';
import App from './App.jsx';
import AuthProvider from './auth/AuthProvider';

// ✅ Export at least one component from this file
export function ScrollRestorationGuard({ children }) {
  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      //ignore
    }
  }, []);
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScrollRestorationGuard>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ScrollRestorationGuard>
  </StrictMode>
);
