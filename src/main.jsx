import '@/lib/i18n';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { supabase } from '@/integrations/supabase/client'

// --- Resilience: recover from sleep / idle / preview rebuilds ----------------
// When the tab becomes visible again, re-check the Supabase session so any
// stale auth state is refreshed before React Query refetches kick in.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().catch(() => {});
    }
  });
}

// Swallow transient unhandled rejections from background network blips
// (e.g. supabase token refresh "Failed to fetch" right after sleep). These
// previously bubbled to the Lovable error overlay and made the preview look
// like it had failed to build.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event?.reason?.message || event?.reason || '');
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed') ||
      msg.includes('Request failed with status code 404')
    ) {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.warn('[resilience] swallowed transient rejection:', msg);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
