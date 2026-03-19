import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, nombre?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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

  const AVAILABLE_THEMES = ['theme-neon-gold', 'theme-cyan', 'theme-green', 'theme-red'];

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
    if (!user) return;

    // Optimistic UI update
    setProfile(prev => ({
      ...(prev || { active_theme: null, active_badge: null, sidebar_config: null }),
      sidebar_config: config,
    }));

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
          setIsGuest(false);
        } else {
          setIsGuest(true);
          setProfile(null);
          applyTheme(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        setIsGuest(false);
      } else {
        // AUTO-GUEST MODE: If no session, treat as guest for SEO and indexability
        setIsGuest(true);
        const savedTheme = localStorage.getItem("active-theme-color");
        setProfile({ active_theme: savedTheme, active_badge: null, sidebar_config: null });
        applyTheme(savedTheme);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Auth session error:", err);
      // Even on error, allow guest mode to keep the app "open"
      setIsGuest(true);
      setLoading(false);
    });

    // SAFETY TIMEOUT: Ensure loading is cleared even if Supabase hangs (common on mobile/slow networks)
    const timeout = setTimeout(() => {
      setLoading(current => {
        if (current) {
          console.warn("Auth initialization timed out, forcing loading to false");
          return false;
        }
        return current;
      });
    }, 5000);

    return () => {
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
          emailRedirectTo: 'https://tabe.software/email-verificado',
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

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, profile, updateTheme, updateSidebarConfig, isGuest, loginAsGuest }}>
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
