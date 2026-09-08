import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ active_theme: string | null; active_badge: string | null; sidebar_config: any | null } | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  const AVAILABLE_THEMES = ['theme-neon-gold', 'theme-cyan', 'theme-green', 'theme-red', 'theme-pink', 'theme-black', 'theme-white'];

  const applyTheme = (themeClass: string | null) => {
    const body = document.body;
    body.classList.remove(...AVAILABLE_THEMES);
    if (themeClass && AVAILABLE_THEMES.includes(themeClass)) {
      body.classList.add(themeClass);
      localStorage.setItem("active-theme-color", themeClass);
    } else {
      localStorage.removeItem("active-theme-color");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("active_theme, active_badge, sidebar_config")
      .eq("user_id", userId)
      .single();

    if (data) {
      const typedData = data as unknown as { active_theme: string | null; active_badge: string | null; sidebar_config: any | null };
      setProfile(typedData);
      applyTheme(typedData.active_theme);
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
    let currentUserId: string | null = null;

    const handleSessionChange = (session: Session | null) => {
      if (!isMounted) return;
      const newUser = session?.user ?? null;
      const newUserId = newUser?.id ?? null;

      // Only re-apply if user identity actually changed or on initial resolve
      setSession(session);
      setUser(newUser);

      if (session?.provider_token) {
        setStoredGoogleToken(
          session.provider_token,
          session.user?.email,
          session.provider_refresh_token ?? undefined
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

      if (newUser) {
        setIsGuest(false);
        if (newUserId !== currentUserId) {
          currentUserId = newUserId;
          fetchProfile(newUser.id);
        }
      } else {
        currentUserId = null;
        setIsGuest(true);
        const savedTheme = localStorage.getItem("active-theme-color");
        setProfile({ active_theme: savedTheme, active_badge: null, sidebar_config: null });
        applyTheme(savedTheme);
      }
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSessionChange(session);
      }
    );

    // Initial check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
    }).catch(err => {
      console.error("Auth session error:", err);
      if (isMounted) {
        setIsGuest(true);
        setLoading(false);
      }
    });

    // SAFETY TIMEOUT: Ensure loading is cleared even if Supabase hangs
    const timeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signUp = async (email: string, password: string, nombre?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://www.tabe.software/email-verificado',
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
      const redirectTo = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "https://www.googleapis.com/auth/calendar",
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

  const connectGoogleCalendar = async () => {
    try {
      const redirectTo = `${window.location.origin}/calendario`;
      if (user) {
        const { error } = await supabase.auth.linkIdentity({
          provider: "google",
          options: {
            redirectTo,
            scopes: "https://www.googleapis.com/auth/calendar",
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
          scopes: "https://www.googleapis.com/auth/calendar",
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
      const redirectTo = `${window.location.origin}/configuracion`;
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo,
          scopes: "https://www.googleapis.com/auth/calendar",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
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
    // Guest dummy profile - check localStorage first
    const savedTheme = localStorage.getItem("active-theme-color");
    setProfile({ active_theme: savedTheme, active_badge: null, sidebar_config: null });
    applyTheme(savedTheme);
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
