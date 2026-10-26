import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BACKUP_STORAGE_KEY = 'tabe_session_backup';

// Helper para extraer un payload mínimo esencial para cookie si la sesión excede el límite de 3.8KB
function getCompactSessionPayload(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    const u = parsed.user || parsed.currentSession?.user;
    if (!parsed.access_token || !u) return null;
    const compact = {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: parsed.expires_at,
      expires_in: parsed.expires_in,
      token_type: parsed.token_type || 'bearer',
      user: {
        id: u.id,
        email: u.email,
        app_metadata: u.app_metadata,
        user_metadata: {
          name: u.user_metadata?.name,
          full_name: u.user_metadata?.full_name,
          avatar_url: u.user_metadata?.avatar_url,
          gcal_linked: u.user_metadata?.gcal_linked,
        },
      },
    };
    return JSON.stringify(compact);
  } catch {
    return null;
  }
}

// Custom Multi-Tier Storage Adapter (localStorage + sessionStorage + cookie + session backup)
// Garantiza la persistencia ininterrumpida de sesión en recarga (F5), Ctrl+Shift+R y limpieza de caché.
export const authStorage = {
  getItem: (key: string): string | null => {
    // 1. Probar en localStorage primero
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item && item.trim().startsWith('{')) {
          try {
            JSON.parse(item);
            return item;
          } catch {}
        }
      } catch {}

      // 2. Probar en sessionStorage
      try {
        const sessItem = window.sessionStorage.getItem(key);
        if (sessItem && sessItem.trim().startsWith('{')) {
          try {
            JSON.parse(sessItem);
            try { window.localStorage.setItem(key, sessItem); } catch {}
            return sessItem;
          } catch {}
        }
      } catch {}
    }

    // 3. Fallback a cookies
    if (typeof document !== 'undefined') {
      try {
        const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(key) + '=([^;]*)'));
        if (match) {
          const val = decodeURIComponent(match[1]);
          if (val && val.trim().startsWith('{')) {
            try {
              JSON.parse(val);
              // Rehidratar inmediatamente en localStorage y sessionStorage
              if (typeof window !== 'undefined') {
                try { window.localStorage.setItem(key, val); } catch {}
                try { window.sessionStorage.setItem(key, val); } catch {}
              }
              return val;
            } catch {}
          }
        }
      } catch {}
    }

    // 4. Fallback de emergencia al backup de sesión
    if (typeof window !== 'undefined') {
      try {
        const backup = window.localStorage.getItem(BACKUP_STORAGE_KEY) || window.sessionStorage.getItem(BACKUP_STORAGE_KEY);
        if (backup && backup.trim().startsWith('{')) {
          try {
            JSON.parse(backup);
            try { window.localStorage.setItem(key, backup); } catch {}
            return backup;
          } catch {}
        }
      } catch {}
    }

    return null;
  },

  setItem: (key: string, value: string): void => {
    // 1. Guardar siempre en localStorage y sessionStorage
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(key, value); } catch {}
      try { window.sessionStorage.setItem(key, value); } catch {}
      try { window.localStorage.setItem(BACKUP_STORAGE_KEY, value); } catch {}
      try { window.sessionStorage.setItem(BACKUP_STORAGE_KEY, value); } catch {}
    }

    // 2. Persistir en Cookie con domain=.tabe.com.ar (o host local)
    if (typeof document !== 'undefined') {
      try {
        let cookieValue = value;
        let encodedVal = encodeURIComponent(cookieValue);

        // Si excede el límite seguro de cookie (~3800 bytes), usar payload compacto
        if (encodedVal.length >= 3800) {
          const compact = getCompactSessionPayload(value);
          if (compact) {
            cookieValue = compact;
            encodedVal = encodeURIComponent(cookieValue);
          }
        }

        if (encodedVal.length < 3800) {
          const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
          const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
          const isTabeDomain = hostname === 'tabe.com.ar' || hostname.endsWith('.tabe.com.ar');
          const domainStr = isTabeDomain ? '; domain=.tabe.com.ar' : '';
          const secureStr = isHttps ? '; Secure' : '';
          const maxAge = 400 * 24 * 60 * 60; // 400 días
          document.cookie = `${encodeURIComponent(key)}=${encodedVal}; path=/; max-age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`;
        }
      } catch {}
    }
  },

  removeItem: (key: string): void => {
    // 1. Eliminar de localStorage y sessionStorage
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(key); } catch {}
      try { window.sessionStorage.removeItem(key); } catch {}
      try { window.localStorage.removeItem(BACKUP_STORAGE_KEY); } catch {}
      try { window.sessionStorage.removeItem(BACKUP_STORAGE_KEY); } catch {}
    }

    // 2. Eliminar de cookies (tanto de dominio como locales)
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
      eventsPerSecond: 40,
    },
  },
});
