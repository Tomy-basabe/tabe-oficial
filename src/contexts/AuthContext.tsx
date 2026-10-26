/* REGLA ARQUITECTÓNICA: NINGÚN COMPONENTE VISUAL, HOOK O FUNCIONALIDAD PÚBLICA DEBE CONDICIONARSE AL ROL ADMIN. TODOS LOS USUARIOS USAN LA MISMA UI Y LÓGICA DE NEGOCIO SALVO LA RUTA PRIVADA /admin */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, authStorage } from "@/integrations/supabase/client";
import { setStoredGoogleToken, disconnectGoogleCalendar, GCAL_LINKED_KEY, GCAL_EMAIL_KEY } from "@/lib/googleCalendarSync";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, nombre?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  connectGoogleCalendar: () => Promise<{ error: Error | null }>;
  linkGoogleAccount: () => Promise<{ error: Error | null; data?: any }>;
  unlinkGoogleAccount: () => Promise<{ error: Error | null }>;
  isGoogleLinked: boolean;
  googleIdentity: any | null;
  signOut: () => Promise<void>;
  profile: { active_theme: string | null; active_badge: string | null; sidebar_config: any | null } | null;
  updateTheme: (theme: string) => Promise<void>;
  updateSidebarConfig: (config: any) => Promise<void>;
  isGuest: boolean;
  loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para leer sesión almacenada de inmediato y evitar flash de no autenticado en Ctrl + Shift + R
function getInitialStoredAuth(): { user: User | null; session: Session | null; isGuest: boolean } {
  if (typeof window === "undefined") {
    return { user: null, session: null, isGuest: false };
  }
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const projectRef = url ? new URL(url).hostname.split(".")[0] : "ndmjrcinfugswtlknebl";
    const primaryKey = `sb-${projectRef}-auth-token`;

    // 1. Intentar leer desde authStorage (localStorage + sessionStorage + cookie + backup)
    let raw = authStorage.getItem(primaryKey);

    // 2. Si no se encontró por primaryKey, buscar por cualquier key sb-*-auth-token
    if (!raw) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
            raw = localStorage.getItem(k);
            if (raw) break;
          }
        }
      } catch {}
    }

    if (!raw) {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
            raw = sessionStorage.getItem(k);
            if (raw) break;
          }
        }
      } catch {}
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      const resolvedUser = parsed?.user || parsed?.currentSession?.user || null;
      const resolvedSession = parsed?.session || (parsed?.access_token ? parsed : null);
      if (resolvedUser) {
        // Sincronizar inmediatamente
        try { localStorage.setItem(primaryKey, raw); } catch {}
        try { sessionStorage.setItem(primaryKey, raw); } catch {}
        return { user: resolvedUser, session: resolvedSession, isGuest: false };
      }
    }
  } catch {}
  const guestActive = localStorage.getItem("tabe_guest_mode") === "true";
  return { user: null, session: null, isGuest: guestActive };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialAuth = getInitialStoredAuth();
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [session, setSession] = useState<Session | null>(initialAuth.session);
  const [loading, setLoading] = useState<boolean>(initialAuth.user ? false : true);
  const [profile, setProfile] = useState<{ active_theme: string | null; active_badge: string | null; sidebar_config: any | null } | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(initialAuth.isGuest);

  const AVAILABLE_THEMES = ['theme-neon-gold', 'theme-cyan', 'theme-blue', 'theme-purple', 'theme-green', 'theme-red', 'theme-pink', 'theme-black', 'theme-white'];

  const applyTheme = (_themeClass?: string | null) => {
    const body = document.body;
    body.classList.remove(...AVAILABLE_THEMES);
    try { localStorage.removeItem("active-theme-color"); } catch (e) {}
  };

  const fetchProfile = async (userId: string) => {
    // 1. Immediately hydrate from localStorage cache for 0ms instant display
    try {
      const cached = localStorage.getItem(`tabe_profile_${userId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setProfile(parsed);
        if (parsed.active_theme) {
          applyTheme(parsed.active_theme);
        }
      }
    } catch (e) {}

    const { data } = await supabase
      .from("profiles")
      .select("active_theme, active_badge, sidebar_config")
      .eq("user_id", userId)
      .single();

    if (data) {
      const typedData = data as unknown as { active_theme: string | null; active_badge: string | null; sidebar_config: any | null };
      setProfile(typedData);
      applyTheme(typedData.active_theme);
      try {
        localStorage.setItem(`tabe_profile_${userId}`, JSON.stringify(typedData));
      } catch (e) {}
    }
  };

  const updateTheme = async (theme: string) => {
    if (!user) return;

    // Optimistic UI update
    setProfile(prev => ({
      ...(prev || { active_theme: null, active_badge: null, sidebar_config: null }),
      active_theme: theme,
    }));
    applyTheme(theme);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, active_theme: theme }, { onConflict: "user_id" });

      if (error) {
        console.error("Error updating theme:", error);
      }
    } catch (e) {
      console.error("Error updating theme:", e);
    }
  };

  const updateSidebarConfig = async (config: any) => {
    // Optimistic UI update
    setProfile(prev => ({
      ...(prev || { active_theme: null, active_badge: null, sidebar_config: null }),
      sidebar_config: config,
    }));

    try {
      localStorage.setItem("tabe-custom-sidebar-config", JSON.stringify(config));
    } catch (e) {}

    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, sidebar_config: config }, { onConflict: "user_id" });

      if (error) {
        console.error("Error updating sidebar config:", error);
      }
    } catch (e) {
      console.error("Error updating sidebar config:", e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let currentUserId: string | null = initialAuth.user?.id ?? null;

    const handleSessionChange = (incomingSession: Session | null, eventType?: string) => {
      if (!isMounted) return;
      const newUser = incomingSession?.user ?? null;
      const newUserId = newUser?.id ?? null;

      // Si Supabase reporta sesión nula
      if (!newUser) {
        // Verificar si todavía existen credenciales en storage
        const stored = getInitialStoredAuth();
        if (stored.user && eventType !== 'SIGNED_OUT') {
          // Evento transitorio de red o inicio de sesión en background; no desloguear
          setLoading(false);
          return;
        }

        currentUserId = null;
        setSession(null);
        setUser(null);
        setIsGuest(true);
        setProfile({ active_theme: null, active_badge: null, sidebar_config: null });
        applyTheme();
        setLoading(false);
        return;
      }

      setSession(incomingSession);
      setUser(prev => {
        if (!newUser) return null;
        if (prev && prev.id === newUser.id && prev.email === newUser.email) {
          return prev;
        }
        return newUser;
      });

      if (incomingSession?.provider_token) {
        setStoredGoogleToken(
          incomingSession.provider_token,
          incomingSession.user?.email,
          incomingSession.provider_refresh_token ?? undefined
        );
      } else if (newUser) {
        const isGoogle =
          newUser.app_metadata?.provider === "google" ||
          newUser.app_metadata?.providers?.includes("google") ||
          newUser.identities?.some((id: any) => id.provider === "google") ||
          newUser.user_metadata?.gcal_linked === true;
        if (isGoogle && localStorage.getItem("tabe_gcal_explicitly_disconnected") !== "true") {
          localStorage.setItem(GCAL_LINKED_KEY, "true");
          if (newUser.email) {
            localStorage.setItem(GCAL_EMAIL_KEY, newUser.email);
          }
        }
      }

      setIsGuest(false);
      try { localStorage.removeItem("tabe_guest_mode"); } catch {}
      applyTheme();

      if (newUserId !== currentUserId) {
        currentUserId = newUserId;
        fetchProfile(newUser.id);

        // Sincronizar inmediatamente al iniciar sesión si es con Google o tiene Calendar vinculado
        const isGoogleUser =
          newUser.app_metadata?.provider === "google" ||
          newUser.app_metadata?.providers?.includes("google") ||
          newUser.identities?.some((id: any) => id.provider === "google") ||
          newUser.user_metadata?.gcal_linked === true;

        if (isGoogleUser && localStorage.getItem("tabe_gcal_explicitly_disconnected") !== "true") {
          localStorage.setItem(GCAL_LINKED_KEY, "true");
          if (!newUser.user_metadata?.gcal_linked) {
            supabase.auth.updateUser({
              data: { gcal_linked: true, gcal_email: newUser.email }
            }).catch(() => {});
          }
          import("@/lib/globalCalendarSync").then(({ performGlobalCalendarSync }) => {
            performGlobalCalendarSync(newUser, { force: true, silent: true }).catch((e) => {
              console.warn("Auto-sync on login failed:", e);
            });
          });
        }
      }
      setLoading(false);
    };

    let initialCheckCompleted = false;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, incomingSession) => {
        // Si el evento inicial reporta null antes de que getSession() termine de leer storage, no desloguear
        if (event === 'INITIAL_SESSION' && !incomingSession && !initialCheckCompleted) {
          return;
        }
        handleSessionChange(incomingSession, event);
      }
    );

    // Initial check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      initialCheckCompleted = true;
      if (existingSession) {
        handleSessionChange(existingSession, 'INITIAL_GET_SESSION');
      } else if (!initialAuth.user) {
        handleSessionChange(null, 'INITIAL_GET_SESSION');
      } else {
        // Si teníamos usuario inicial pero getSession devolvió null (ej. token por refrescar), intentamos refresh
        supabase.auth.refreshSession().then(({ data: { session: refreshedSession } }) => {
          if (refreshedSession) {
            handleSessionChange(refreshedSession, 'TOKEN_REFRESHED');
          } else {
            handleSessionChange(null, 'SIGNED_OUT');
          }
        }).catch(() => {
          if (isMounted) setLoading(false);
        });
      }
    }).catch(err => {
      initialCheckCompleted = true;
      console.error("Auth session error:", err);
      if (isMounted) {
        setLoading(false);
      }
    });

    // SAFETY TIMEOUT: Ensure loading is cleared even if Supabase hangs
    const timeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Helper to ensure auth redirects land strictly on the canonical domain in production
  const getCanonicalAuthUrl = (path: string = "/dashboard"): string => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("vercel.app")) {
        return `${origin}${path}`;
      }
      if (origin.includes("tabe.com.ar")) {
        return `${origin}${path}`;
      }
    }
    return `https://www.tabe.com.ar${path}`;
  };

  const signUp = async (email: string, password: string, nombre?: string) => {
    try {
      const emailRedirectTo = getCanonicalAuthUrl("/email-verificado");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { nombre }
        }
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectTo = getCanonicalAuthUrl("/dashboard");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const redirectTo = getCanonicalAuthUrl("/calendario");
      if (user) {
        const { error } = await supabase.auth.linkIdentity({
          provider: "google",
          options: {
            redirectTo,
            scopes: "https://www.googleapis.com/auth/calendar.events",
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        });
        if (!error) return { error: null };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "https://www.googleapis.com/auth/calendar.events",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const linkGoogleAccount = async () => {
    try {
      const redirectTo = getCanonicalAuthUrl("/configuracion");
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
      return { error: null, data };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const unlinkGoogleAccount = async () => {
    try {
      const gIdentity = user?.identities?.find((id) => id.provider === "google");
      if (!gIdentity) throw new Error("No hay cuenta de Google vinculada.");

      if (user?.identities && user.identities.length <= 1) {
        throw new Error("No puedes desvincular Google porque es tu único método de inicio de sesión.");
      }

      const { error } = await supabase.auth.unlinkIdentity(gIdentity);
      if (error) throw error;

      disconnectGoogleCalendar();

      // Refresh session
      const { data: { session: refreshedSession } } = await supabase.auth.getSession();
      setSession(refreshedSession);
      setUser(refreshedSession?.user ?? null);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // Clear react states immediately
      setIsGuest(false);
      setProfile(null);
      setSession(null);
      setUser(null);
      applyTheme(null);

      // Clear all storage for a completely clean state
      localStorage.clear();
      sessionStorage.clear();

      // Attempt to clear caches but don't block
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).catch(() => { });
      }

      // Try server-side logout, but force redirect anyway
      await supabase.auth.signOut().catch(e => console.warn("Supabase signout failed, ignoring:", e));

      // Final clean sweep and redirect
      window.location.href = "/registro";
    } catch (err) {
      console.error("Critical logout error:", err);
      window.location.href = "/registro";
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    try {
      localStorage.setItem("tabe_guest_mode", "true");
      localStorage.setItem("tabe_career_onboarding_v2_guest", "true");
    } catch {}
    // Guest dummy profile - check localStorage first
    setProfile({ active_theme: null, active_badge: null, sidebar_config: null });
    applyTheme();
  };

  const googleIdentity = user?.identities?.find((id) => id.provider === "google") || null;
  const isGoogleLinked =
    !!googleIdentity ||
    user?.app_metadata?.provider === "google" ||
    user?.app_metadata?.providers?.includes("google") ||
    user?.user_metadata?.gcal_linked === true ||
    false;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      connectGoogleCalendar,
      linkGoogleAccount,
      unlinkGoogleAccount,
      isGoogleLinked,
      googleIdentity,
      signOut,
      profile,
      updateTheme,
      updateSidebarConfig,
      isGuest,
      loginAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
