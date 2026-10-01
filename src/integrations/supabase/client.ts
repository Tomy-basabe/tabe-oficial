import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Custom Cookie & localStorage sync storage adapter for seamless authentication
// and session persistence across tabe.com.ar and all subdomains.
const authStorage = {
  getItem: (key: string): string | null => {
    // 1. Try reading from cookie first
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(key) + '=([^;]*)'));
      if (match) {
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return match[1];
        }
      }
    }
    // 2. Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    // 1. Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    // 2. Persist to Cookie with domain=.tabe.com.ar, SameSite=Lax, Secure, path=/
    if (typeof document !== 'undefined') {
      try {
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
        const isTabeDomain = hostname === 'tabe.com.ar' || hostname.endsWith('.tabe.com.ar');
        const domainStr = isTabeDomain ? '; domain=.tabe.com.ar' : '';
        const secureStr = isHttps ? '; Secure' : '';
        // 400 days max age
        const maxAge = 400 * 24 * 60 * 60;
        document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;
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