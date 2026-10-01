import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Custom Cookie & localStorage sync storage adapter for seamless authentication
// and session persistence across tabe.com.ar and all subdomains.
// LocalStorage is prioritized first to prevent 4KB cookie truncation and logout on hard refresh (Ctrl + Shift + R).
const authStorage = {
  getItem: (key: string): string | null => {
    // 1. Try reading from localStorage FIRST (synchronous, reliable, no 4KB limit)
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          // If it looks like JSON, ensure it is not corrupt before returning
          if (item.trim().startsWith('{')) {
            try { JSON.parse(item); } catch { /* Corrupt in localStorage */ return null; }
          }
          return item;
        }
      } catch {}
    }
    // 2. Fallback to cookie
    if (typeof document !== 'undefined') {
      try {
        const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(key) + '=([^;]*)'));
        if (match) {
          const val = decodeURIComponent(match[1]);
          if (val.trim().startsWith('{')) {
            try { JSON.parse(val); } catch { return null; }
          }
          return val;
        }
      } catch {}
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    // 1. Always persist to localStorage first
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    // 2. Persist to Cookie with domain=.tabe.com.ar (safely within RFC cookie size limits)
    if (typeof document !== 'undefined') {
      try {
        const encodedVal = encodeURIComponent(value);
        // Only write to cookie if it does not exceed the safe browser limit (~3800 bytes)
        if (encodedVal.length < 3800) {
          const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
          const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
          const isTabeDomain = hostname === 'tabe.com.ar' || hostname.endsWith('.tabe.com.ar');
          const domainStr = isTabeDomain ? '; domain=.tabe.com.ar' : '';
          const secureStr = isHttps ? '; Secure' : '';
          const maxAge = 400 * 24 * 60 * 60;
          document.cookie = `${encodeURIComponent(key)}=${encodedVal}; path=/; max-age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;
        }
      } catch {}
    }
  },
  removeItem: (key: string): void => {
    // 1. Remove from localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    // 2. Remove from cookies (both domain and host-specific)
    if (typeof document !== 'undefined') {
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
        const isTabeDomain = hostname === 'tabe.com.ar' || hostname.endsWith('.tabe.com.ar');
        if (isTabeDomain) {
          document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; SameSite=Lax; domain=.tabe.com.ar`;
        }
        document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; SameSite=Lax`;
      } catch {}
    }
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});