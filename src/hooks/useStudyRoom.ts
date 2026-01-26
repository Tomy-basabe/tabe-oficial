import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StudyRoom {
  id: string;
  host_id: string;
  name: string;
  subject_id: string | null;
  is_active: boolean;
  max_participants: number;
  created_at: string;
  host_profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  subject_id: string | null;
  joined_at: string;
  left_at: string | null;
  is_muted: boolean;
  is_camera_off: boolean;
  is_sharing_screen: boolean;
  study_duration_seconds: number;
  profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface Subject {
  id: string;
  nombre: string;
  codigo: string;
}

export function useStudyRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeRooms, setActiveRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Fetch available subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, nombre, codigo")
        .order("año", { ascending: true });
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  // Fetch active rooms from friends
  const fetchActiveRooms = useCallback(async () => {
    if (!user) return;

    const { data: rooms, error } = await supabase
      .from("study_rooms")
      .select("*")
      .eq("is_active", true)
      .neq("host_id", user.id);

    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }

    // Fetch host profiles
    if (rooms && rooms.length > 0) {
      const hostIds = [...new Set(rooms.map(r => r.host_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nombre, username, avatar_url")
        .in("user_id", hostIds);

      const roomsWithProfiles = rooms.map(room => ({
        ...room,
        host_profile: profiles?.find(p => p.user_id === room.host_id) || undefined
      }));

      setActiveRooms(roomsWithProfiles);
    } else {
      setActiveRooms([]);
    }
  }, [user]);

  // Subscribe to room changes
  useEffect(() => {
    if (!user) return;

    fetchActiveRooms();

    const channel = supabase
      .channel("study-rooms-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_rooms",
        },
        () => {
          fetchActiveRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActiveRooms]);

  // Subscribe to participants changes when in a room
  useEffect(() => {
    if (!currentRoom || !user) return;

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", currentRoom.id)
        .is("left_at", null);

      if (data) {
        // Fetch profiles for participants
        const userIds = data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nombre, username, avatar_url")
          .in("user_id", userIds);

        const participantsWithProfiles = data.map(p => ({
          ...p,
          profile: profiles?.find(pr => pr.user_id === p.user_id) || undefined
        }));

        setParticipants(participantsWithProfiles);
        setMyParticipant(participantsWithProfiles.find(p => p.user_id === user.id) || null);
      }
    };

    fetchParticipants();

    const channel = supabase
      .channel(`room-participants-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom, user]);

  // Create a new room
  const createRoom = async (name: string, subjectId?: string) => {
    if (!user) return null;
    setLoading(true);

    try {
      const { data: room, error } = await supabase
        .from("study_rooms")
        .insert({
          host_id: user.id,
          name,
          subject_id: subjectId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room as host
      const { data: participant, error: joinError } = await supabase
        .from("room_participants")
        .insert({
          room_id: room.id,
          user_id: user.id,
          subject_id: subjectId || null,
        })
        .select()
        .single();

      if (joinError) throw joinError;

      setCurrentRoom(room);
      setMyParticipant(participant);
      setSessionStartTime(new Date());

      toast({
        title: "Sala creada",
        description: `La sala "${name}" está lista para tus amigos`,
      });

      return room;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Join an existing room
  const joinRoom = async (roomId: string, subjectId?: string) => {
    if (!user) return false;
    setLoading(true);

    try {
      // Check if room exists and is active
      const { data: room, error: roomError } = await supabase
        .from("study_rooms")
        .select("*")
        .eq("id", roomId)
        .eq("is_active", true)
        .single();

      if (roomError || !room) {
        toast({
          title: "Error",
          description: "La sala no existe o ya no está activa",
          variant: "destructive",
        });
        return false;
      }

      // Check participant count
      const { count } = await supabase
        .from("room_participants")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .is("left_at", null);

      if (count && count >= room.max_participants) {
        toast({
          title: "Sala llena",
          description: "Esta sala ya tiene el máximo de participantes",
          variant: "destructive",
        });
        return false;
      }

      // Join the room
      const { data: participant, error } = await supabase
        .from("room_participants")
        .insert({
          room_id: roomId,
          user_id: user.id,
          subject_id: subjectId || room.subject_id,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentRoom(room);
      setMyParticipant(participant);
      setSessionStartTime(new Date());

      toast({
        title: "Te uniste a la sala",
        description: `Ahora estás en "${room.name}"`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Leave the current room
  const leaveRoom = async () => {
    if (!user || !currentRoom || !myParticipant) return;

    try {
      // Calculate study duration
      const duration = sessionStartTime
        ? Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
        : 0;

      // Update participant record
      await supabase
        .from("room_participants")
        .update({
          left_at: new Date().toISOString(),
          study_duration_seconds: duration,
        })
        .eq("id", myParticipant.id);

      // Save study session to metrics
      if (duration > 60) { // Only save if more than 1 minute
        await supabase.from("study_sessions").insert({
          user_id: user.id,
          subject_id: myParticipant.subject_id,
          tipo: "videocall",
          duracion_segundos: duration,
          completada: true,
        });

        // Update user stats
        const { data: stats } = await supabase
          .from("user_stats")
          .select("horas_estudio_total, xp_total")
          .eq("user_id", user.id)
          .single();

        if (stats) {
          const xpGained = Math.floor(duration / 60); // 1 XP per minute
          await supabase
            .from("user_stats")
            .update({
              horas_estudio_total: stats.horas_estudio_total + Math.floor(duration / 3600),
              xp_total: stats.xp_total + xpGained,
            })
            .eq("user_id", user.id);
        }
      }

      // If host, close the room
      if (currentRoom.host_id === user.id) {
        await supabase
          .from("study_rooms")
          .update({ is_active: false })
          .eq("id", currentRoom.id);
      }

      setCurrentRoom(null);
      setMyParticipant(null);
      setParticipants([]);
      setSessionStartTime(null);

      toast({
        title: "Saliste de la sala",
        description: duration > 60
          ? `Estudiaste ${Math.floor(duration / 60)} minutos`
          : "Sesión muy corta para registrar",
      });
    } catch (error: any) {
      console.error("Error leaving room:", error);
    }
  };

  // Update my participant state
  const updateMyState = async (updates: Partial<Pick<RoomParticipant, "is_muted" | "is_camera_off" | "is_sharing_screen" | "subject_id">>) => {
    if (!myParticipant) return;

    await supabase
      .from("room_participants")
      .update(updates)
      .eq("id", myParticipant.id);
  };

  return {
    activeRooms,
    currentRoom,
    participants,
    myParticipant,
    subjects,
    loading,
    sessionStartTime,
    createRoom,
    joinRoom,
    leaveRoom,
    updateMyState,
    fetchActiveRooms,
  };
}
