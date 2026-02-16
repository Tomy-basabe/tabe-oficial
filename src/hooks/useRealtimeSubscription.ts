import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TableName =
  | "user_stats"
  | "user_subject_status"
  | "study_sessions"
  | "calendar_events"
  | "flashcard_decks"
  | "flashcards"
  | "user_achievements"
  | "user_plants"
  | "study_rooms"
  | "room_participants"
  | "subjects"
  | "subject_dependencies";

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

interface UseRealtimeSubscriptionOptions {
  table: TableName;
  filter?: string;
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  onChange?: (payload: RealtimePayload) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Memoize callbacks to prevent unnecessary re-subscriptions
  const onChangeRef = useRef(onChange);
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  useEffect(() => {
    onChangeRef.current = onChange;
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
  }, [onChange, onInsert, onUpdate, onDelete]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter || "all"}-${Date.now()}`;

    // Build the channel with proper typing
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as const,
        {
          event: "*",
          schema: "public",
          table: table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const realtimePayload: RealtimePayload = {
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          };

          // Call the general onChange handler
          onChangeRef.current?.(realtimePayload);

          // Call specific handlers based on event type
          switch (payload.eventType) {
            case "INSERT":
              onInsertRef.current?.(realtimePayload);
              break;
            case "UPDATE":
              onUpdateRef.current?.(realtimePayload);
              break;
            case "DELETE":
              onDeleteRef.current?.(realtimePayload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime subscribed to ${table}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`🔌 Unsubscribing from ${table}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, enabled]);

  return channelRef.current;
}

// Hook for subscribing to multiple tables at once
export function useMultiTableRealtime(
  tables: TableName[],
  userId: string | undefined,
  onAnyChange: () => void
) {
  const handleChange = useCallback(() => {
    onAnyChange();
  }, [onAnyChange]);

  // Subscribe to each table with user filter
  tables.forEach(table => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRealtimeSubscription({
      table,
      filter: userId ? `user_id=eq.${userId}` : undefined,
      onChange: handleChange,
      enabled: !!userId,
    });
  });
}
