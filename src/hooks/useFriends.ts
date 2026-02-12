import { useState, useEffect, useCallback } from "react";
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

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMyProfile = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, display_id, nombre, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setMyProfile(data as Profile);
    }
  }, [user]);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Fetch all friendships where user is involved
    const { data: friendshipsRaw, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching friendships:", error);
      setLoading(false);
      return;
    }

    const friendships: Friendship[] = (friendshipsRaw || []).map((f: FriendshipRaw) => ({
      ...f,
      status: f.status as 'pending' | 'accepted' | 'rejected'
    }));

    // Get all unique user IDs we need profiles for
    const userIds = new Set<string>();
    friendships.forEach((f) => {
      if (f.requester_id !== user.id) userIds.add(f.requester_id);
      if (f.addressee_id !== user.id) userIds.add(f.addressee_id);
    });

    // Fetch profiles for these users using secure RPC function (bypasses RLS)
    let profiles: Profile[] = [];
    if (userIds.size > 0) {
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_friend_profiles', { friend_user_ids: Array.from(userIds) });

      if (profileError) {
        console.error("Error fetching friend profiles:", profileError);
      }

      profiles = (profileData as Profile[]) || [];
    }

    const profileMap = new Map(profiles.map(p => [
      p.user_id,
      {
        ...p,
        nombre: p.nombre || (p.username ? null : "Usuario"),
        username: p.username || "Usuario"
      }
    ]));

    // Categorize friendships
    const accepted: FriendWithProfile[] = [];
    const pending: FriendWithProfile[] = [];
    const sent: FriendWithProfile[] = [];

    friendships.forEach((f) => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const friendProfile = profileMap.get(friendId);

      // If profile is missing (RLS or other error), use fallback
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
        if (f.addressee_id === user.id) {
          pending.push(friendWithProfile);
        } else {
          sent.push(friendWithProfile);
        }
      }
    });

    setFriends(accepted);
    setPendingRequests(pending);
    setSentRequests(sent);
    setLoading(false);
  }, [user]);

  const fetchFriendStats = useCallback(async () => {
    if (!user || friends.length === 0) {
      setFriendStats([]);
      return;
    }

    const friendIds = friends.map(f => f.friend.user_id);
    const allUserIds = [user.id, ...friendIds];

    // Get user stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("user_id, xp_total, racha_actual, nivel")
      .in("user_id", allUserIds);

    // Get weekly study sessions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("user_id, duracion_segundos, tipo")
      .in("user_id", allUserIds)
      .gte("fecha", weekAgo.toISOString().split('T')[0]);

    // Reuse profiles from state instead of fetching again (avoids RLS issues)
    const profileMap = new Map<string, Profile>();
    if (myProfile) profileMap.set(myProfile.user_id, myProfile);
    friends.forEach(f => profileMap.set(f.friend.user_id, f.friend));
    const statsMap = new Map((stats || []).map(s => [s.user_id, s]));

    // Calculate weekly stats per user
    const weeklyStats = new Map<string, { pomodoro: number; study: number }>();
    sessions?.forEach(s => {
      const current = weeklyStats.get(s.user_id) || { pomodoro: 0, study: 0 };
      current.study += s.duracion_segundos;
      if (s.tipo === 'pomodoro') {
        current.pomodoro += s.duracion_segundos;
      }
      weeklyStats.set(s.user_id, current);
    });

    const friendStatsData: FriendStats[] = allUserIds.map(userId => {
      const profile = profileMap.get(userId);
      const userStats = statsMap.get(userId);
      const weekly = weeklyStats.get(userId) || { pomodoro: 0, study: 0 };

      return {
        user_id: userId,
        profile: profile || {
          user_id: userId,
          username: null,
          display_id: 0,
          nombre: "Usuario Desconocido",
          avatar_url: null
        },
        weekly_xp: userStats?.xp_total || 0, // TODO: Calculate weekly XP specifically
        weekly_pomodoro_hours: weekly.pomodoro / 3600,
        weekly_study_hours: weekly.study / 3600,
        current_streak: userStats?.racha_actual || 0,
        level: userStats?.nivel || 1
      };
    });

    setFriendStats(friendStatsData);
  }, [user, friends]);

  const sendFriendRequest = async (identifier: string) => {
    if (!user) return { error: "No autenticado" };

    // Normalize input: users often paste "#123" or "@username"
    // Our RPC expects either a pure number (display_id) or the raw username.
    const normalizedIdentifier = identifier
      .trim()
      .replace(/^\s+|\s+$/g, "")
      .replace(/^[@#]+/, "")
      .toLowerCase();

    if (!normalizedIdentifier) return { error: "Usuario no encontrado" };

    // Use secure RPC function to find user by display_id or username
    const { data: users, error: findError } = await supabase
      .rpc('find_user_for_friend_request', { identifier: normalizedIdentifier });

    if (findError || !users || users.length === 0) {
      return { error: "Usuario no encontrado" };
    }

    const targetUser = users[0];

    if (targetUser.user_id === user.id) {
      return { error: "No puedes agregarte a ti mismo" };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUser.user_id}),and(requester_id.eq.${targetUser.user_id},addressee_id.eq.${user.id})`)
      .single();

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
        requester_id: user.id,
        addressee_id: targetUser.user_id
      });

    if (insertError) {
      return { error: "Error al enviar solicitud" };
    }

    await fetchFriendships();
    return { error: null };
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq("id", friendshipId);

    if (error) {
      toast.error("Error al responder solicitud");
      return;
    }

    toast.success(accept ? "¡Solicitud aceptada!" : "Solicitud rechazada");
    await fetchFriendships();
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Error al eliminar amigo");
      return;
    }

    toast.success("Amigo eliminado");
    await fetchFriendships();
  };

  const updateUsername = async (newUsername: string) => {
    if (!user) return { error: "No autenticado" };

    if (newUsername.length < 3 || newUsername.length > 20) {
      return { error: "El username debe tener entre 3 y 20 caracteres" };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return { error: "Solo letras, números y guiones bajos" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.toLowerCase() })
      .eq("user_id", user.id);

    if (error) {
      if (error.code === '23505') {
        return { error: "Este username ya está en uso" };
      }
      return { error: "Error al actualizar username" };
    }

    await fetchMyProfile();
    return { error: null };
  };

  useEffect(() => {
    fetchMyProfile();
    fetchFriendships();
  }, [fetchMyProfile, fetchFriendships]);

  useEffect(() => {
    fetchFriendStats();
  }, [fetchFriendStats]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `requester_id=eq.${user.id}`
        },
        () => fetchFriendships()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${user.id}`
        },
        () => fetchFriendships()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFriendships]);

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
