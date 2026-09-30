import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  username: string | null;
  display_id: number;
  nombre: string | null;
  avatar_url: string | null;
}

interface FriendshipRaw {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface FriendWithProfile extends Friendship {
  friend: Profile;
}

interface FriendStats {
  user_id: string;
  profile: Profile;
  weekly_xp: number;
  weekly_pomodoro_hours: number;
  weekly_study_hours: number;
  current_streak: number;
  level: number;
}

const areFriendshipsEqual = (a: FriendWithProfile[], b: FriendWithProfile[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i]?.id || a[i].status !== b[i]?.status) return false;
  }
  return true;
};

export function useFriends(options: { enableRealtime?: boolean } = {}) {
  const { enableRealtime = false } = options;
  const { user, isGuest } = useAuth();
  const userId = user?.id;

  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const hasLoadedRef = useRef(false);
  const profileRef = useRef<Profile | null>(null);
  const friendsRef = useRef<FriendWithProfile[]>([]);

  // Sincronizar refs
  useEffect(() => {
    profileRef.current = myProfile;
  }, [myProfile]);

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  const fetchMyProfile = useCallback(async (): Promise<Profile | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_id, nombre, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        const prof = data as Profile;
        setMyProfile(prof);
        profileRef.current = prof;
        return prof;
      }
    } catch (err) {
      console.warn("fetchMyProfile error:", err);
    }
    return null;
  }, [userId]);

  const fetchFriendStatsInternal = useCallback(async (
    targetFriends: FriendWithProfile[],
    currentProfile: Profile | null
  ) => {
    if (isGuest) {
      setFriendStats([
        {
          user_id: "guest",
          profile: currentProfile || { user_id: "guest", username: "invitado_pro", display_id: 999, nombre: "Invitado Pro", avatar_url: null },
          weekly_xp: 4150,
          weekly_pomodoro_hours: 42,
          weekly_study_hours: 312,
          current_streak: 14,
          level: 42
        },
        {
          user_id: "f1",
          profile: { user_id: "f1", username: "lucianamed", display_id: 101, nombre: "Luciana M.", avatar_url: null },
          weekly_xp: 18500,
          weekly_pomodoro_hours: 28,
          weekly_study_hours: 180,
          current_streak: 10,
          level: 35
        },
        {
          user_id: "f2",
          profile: { user_id: "f2", username: "matias_eng", display_id: 102, nombre: "Matías", avatar_url: null },
          weekly_xp: 12400,
          weekly_pomodoro_hours: 15,
          weekly_study_hours: 90,
          current_streak: 3,
          level: 28
        }
      ]);
      return;
    }

    if (!userId) {
      setFriendStats([]);
      return;
    }

    const friendIds = targetFriends.map(f => f.friend.user_id);
    const allUserIds = [userId, ...friendIds];

    try {
      const { data: socialStats, error: statsError } = await supabase
        .rpc('get_social_stats_general', { target_user_ids: allUserIds });

      let fallbackStats: any[] = [];
      if (statsError) {
        const { data: oldStats } = await supabase.rpc('get_social_stats', { target_user_ids: allUserIds });
        fallbackStats = oldStats || [];
      }

      const profileMap = new Map<string, Profile>();
      if (currentProfile) profileMap.set(currentProfile.user_id, currentProfile);
      targetFriends.forEach(f => profileMap.set(f.friend.user_id, f.friend));

      const statsMap = new Map(((socialStats || fallbackStats) as any[] || []).map(s => [s.user_id, s]));

      const friendStatsData: FriendStats[] = allUserIds.map(uid => {
        const profile = profileMap.get(uid) || {
          user_id: uid,
          username: "Usuario Desconocido",
          display_id: 0,
          nombre: "Usuario Desconocido",
          avatar_url: null
        };

        const stats = statsMap.get(uid);
        const xp = stats?.xp_total ?? 0;
        const computedLevel = Math.floor(xp / 100) + 1;

        return {
          user_id: uid,
          profile,
          weekly_xp: xp,
          weekly_pomodoro_hours: (stats?.weekly_pomodoro_seconds || 0) / 3600,
          weekly_study_hours: (stats?.weekly_study_seconds || 0) / 3600,
          current_streak: stats?.racha_actual || 0,
          level: computedLevel
        };
      });

      setFriendStats(friendStatsData);
    } catch (err) {
      console.warn("fetchFriendStatsInternal error:", err);
    }
  }, [userId, isGuest]);

  const fetchFriendships = useCallback(async (existingProfile?: Profile | null) => {
    if (!userId && !isGuest) {
      setLoading(false);
      return;
    }

    if (isGuest) {
      const guestProf: Profile = {
        user_id: "guest",
        username: "invitado_pro",
        display_id: 999,
        nombre: "Invitado Pro",
        avatar_url: null
      };
      setMyProfile(guestProf);
      profileRef.current = guestProf;

      const mockFriends: FriendWithProfile[] = [
        {
          id: "mock-friend-1",
          requester_id: "guest",
          addressee_id: "f1",
          status: "accepted",
          created_at: new Date().toISOString(),
          friend: { user_id: "f1", username: "lucianamed", display_id: 101, nombre: "Luciana M.", avatar_url: null }
        },
        {
          id: "mock-friend-2",
          requester_id: "guest",
          addressee_id: "f2",
          status: "accepted",
          created_at: new Date().toISOString(),
          friend: { user_id: "f2", username: "matias_eng", display_id: 102, nombre: "Matías", avatar_url: null }
        }
      ];

      setFriends(mockFriends);
      setPendingRequests([
        {
          id: "mock-pend-1",
          requester_id: "f3",
          addressee_id: "guest",
          status: "pending",
          created_at: new Date().toISOString(),
          friend: { user_id: "f3", username: "sofia_arq", display_id: 103, nombre: "Sofía", avatar_url: null }
        }
      ]);
      setSentRequests([]);
      hasLoadedRef.current = true;
      setLoading(false);
      await fetchFriendStatsInternal(mockFriends, guestProf);
      return;
    }

    // Si aún no cargó la primera vez, mostrar loading inicial.
    // Si ya cargó, actualizar en silencio en background para evitar parpadeos
    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const { data: friendshipsRaw, error } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) {
        console.error("Error fetching friendships:", error);
        hasLoadedRef.current = true;
        setLoading(false);
        return;
      }

      const friendships: Friendship[] = (friendshipsRaw || []).map((f: FriendshipRaw) => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected'
      }));

      const userIds = new Set<string>();
      friendships.forEach((f) => {
        if (f.requester_id !== userId) userIds.add(f.requester_id);
        if (f.addressee_id !== userId) userIds.add(f.addressee_id);
      });

      let profiles: Profile[] = [];
      if (userIds.size > 0) {
        const idList = Array.from(userIds);
        try {
          const { data: profileData, error: profileError } = await supabase
            .rpc('get_friend_profiles', { friend_user_ids: idList });

          if (!profileError && profileData && (profileData as Profile[]).length > 0) {
            profiles = profileData as Profile[];
          } else {
            const { data: directProfiles } = await supabase
              .from("public_profiles" as any)
              .select("user_id, username, display_id, nombre, avatar_url")
              .in("user_id", idList);
            profiles = (directProfiles as Profile[]) || [];
          }
        } catch {
          const { data: directProfiles } = await supabase
            .from("public_profiles" as any)
            .select("user_id, username, display_id, nombre, avatar_url")
            .in("user_id", idList);
          profiles = (directProfiles as Profile[]) || [];
        }
      }

      const profileMap = new Map(profiles.map(p => [
        p.user_id,
        {
          ...p,
          nombre: p.nombre || p.username || `Usuario #${p.display_id}`,
          username: p.username || null
        }
      ]));

      const accepted: FriendWithProfile[] = [];
      const pending: FriendWithProfile[] = [];
      const sent: FriendWithProfile[] = [];

      friendships.forEach((f) => {
        const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const friendProfile = profileMap.get(friendId);

        const finalProfile = friendProfile || {
          user_id: friendId,
          username: "Usuario Desconocido",
          display_id: 0,
          nombre: "Usuario Desconocido",
          avatar_url: null
        };

        const friendWithProfile: FriendWithProfile = {
          ...f,
          friend: finalProfile
        };

        if (f.status === 'accepted') {
          accepted.push(friendWithProfile);
        } else if (f.status === 'pending') {
          if (f.addressee_id === userId) {
            pending.push(friendWithProfile);
          } else {
            sent.push(friendWithProfile);
          }
        }
      });

      // Actualizar estados sólo si cambiaron para no gatillar re-renders espurios
      setFriends(prev => areFriendshipsEqual(prev, accepted) ? prev : accepted);
      setPendingRequests(prev => areFriendshipsEqual(prev, pending) ? prev : pending);
      setSentRequests(prev => areFriendshipsEqual(prev, sent) ? prev : sent);

      hasLoadedRef.current = true;
      setLoading(false);

      // Calcular stats inmediatamente
      const activeProf = existingProfile !== undefined ? existingProfile : profileRef.current;
      await fetchFriendStatsInternal(accepted, activeProf);
    } catch (err) {
      console.error("Error in fetchFriendships:", err);
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [userId, isGuest, fetchFriendStatsInternal]);

  // Carga inicial al montar o cambiar usuario
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!userId && !isGuest) {
        setLoading(false);
        return;
      }

      const prof = await fetchMyProfile();
      if (!isMounted) return;
      await fetchFriendships(prof);
    };

    loadData();

    const failsafe = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(failsafe);
    };
  }, [userId, isGuest, fetchMyProfile, fetchFriendships]);

  // Realtime subscription debounced (solo si enableRealtime está explícitamente activo)
  useEffect(() => {
    if (!userId || isGuest || !enableRealtime) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchFriendships(profileRef.current);
      }, 500);
    };

    const channel = supabase
      .channel(`friendships-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `requester_id=eq.${userId}`
        },
        () => debouncedFetch()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${userId}`
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, isGuest, fetchFriendships]);

  const sendFriendRequest = async (identifier: string) => {
    if (!userId) return { error: "No autenticado" };

    const normalizedIdentifier = identifier
      .trim()
      .replace(/^\s+|\s+$/g, "")
      .replace(/^[@#]+/, "")
      .toLowerCase();

    if (!normalizedIdentifier) return { error: "Ingresa un ID o username válido" };

    let targetUser: any = null;

    try {
      const { data: users, error: findError } = await supabase
        .rpc('find_user_for_friend_request', { identifier: normalizedIdentifier });
      if (!findError && users && users.length > 0) {
        targetUser = users[0];
      }
    } catch (err) {
      console.warn("RPC find_user_for_friend_request error, trying fallback:", err);
    }

    if (!targetUser) {
      const isNum = /^\d+$/.test(normalizedIdentifier);
      if (isNum) {
        const { data: byNum } = await supabase
          .from("public_profiles" as any)
          .select("user_id, username, display_id")
          .eq("display_id", parseInt(normalizedIdentifier, 10))
          .maybeSingle();
        if (byNum) targetUser = byNum;
      }
      if (!targetUser) {
        const { data: byUsername } = await supabase
          .from("public_profiles" as any)
          .select("user_id, username, display_id")
          .ilike("username", normalizedIdentifier)
          .maybeSingle();
        if (byUsername) targetUser = byUsername;
      }
    }

    if (!targetUser) {
      return { error: "Usuario no encontrado. Verifica el ID o username e intenta de nuevo." };
    }

    if (targetUser.user_id === userId) {
      return { error: "No puedes agregarte a ti mismo" };
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUser.user_id}),and(requester_id.eq.${targetUser.user_id},addressee_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: "Ya son amigos" };
      } else if (existing.status === 'pending') {
        return { error: "Ya existe una solicitud pendiente" };
      }
    }

    const { error: insertError } = await supabase
      .from("friendships")
      .insert({
        requester_id: userId,
        addressee_id: targetUser.user_id
      });

    if (insertError) {
      return { error: "Error al enviar solicitud" };
    }

    await fetchFriendships(profileRef.current);
    return { error: null };
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    if (isGuest) {
      const request = pendingRequests.find((item) => item.id === friendshipId);
      if (!request) return;

      setPendingRequests((current) => current.filter((item) => item.id !== friendshipId));
      if (accept) {
        setFriends((current) => [...current, { ...request, status: "accepted" }]);
      }
      toast.success(accept ? "¡Solicitud aceptada!" : "Solicitud rechazada");
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq("id", friendshipId);

    if (error) {
      toast.error("Error al responder solicitud");
      return;
    }

    toast.success(accept ? "¡Solicitud aceptada!" : "Solicitud rechazada");
    await fetchFriendships(profileRef.current);
  };

  const removeFriend = async (friendshipId: string) => {
    if (isGuest) {
      setFriends((current) => current.filter((friendship) => friendship.id !== friendshipId));
      toast.success("Amigo eliminado");
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Error al eliminar amigo");
      return;
    }

    toast.success("Amigo eliminado");
    await fetchFriendships(profileRef.current);
  };

  const updateUsername = async (newUsername: string) => {
    if (!userId) return { error: "No autenticado" };

    if (newUsername.length < 3 || newUsername.length > 20) {
      return { error: "El username debe tener entre 3 y 20 caracteres" };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return { error: "Solo letras, números y guiones bajos" };
    }

    if (isGuest) {
      setMyProfile((current) => current ? { ...current, username: newUsername.toLowerCase() } : current);
      return { error: null };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.toLowerCase() })
      .eq("user_id", userId);

    if (error) {
      if (error.code === '23505') {
        return { error: "Este username ya está en uso" };
      }
      return { error: "Error al actualizar username" };
    }

    const prof = await fetchMyProfile();
    await fetchFriendships(prof);
    return { error: null };
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    friendStats,
    myProfile,
    loading,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    updateUsername,
    refetch: fetchFriendships
  };
}
