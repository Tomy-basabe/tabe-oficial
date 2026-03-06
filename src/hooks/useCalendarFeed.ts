import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateId } from "@/lib/utils/id";

export function useCalendarFeed() {
    const { user } = useAuth();
    const [feedToken, setFeedToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const feedUrl = feedToken
        ? `${supabaseUrl}/functions/v1/calendar-feed?token=${feedToken}`
        : null;

    const fetchToken = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("calendar_feed_token")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            setFeedToken(data?.calendar_feed_token || null);
        } catch (error) {
            console.error("Error fetching feed token:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchToken();
    }, [fetchToken]);

    const generateToken = useCallback(async () => {
        if (!user) return;
        try {
            const newToken = generateId();
            const { error } = await supabase
                .from("profiles")
                .update({ calendar_feed_token: newToken })
                .eq("user_id", user.id);

            if (error) throw error;

            setFeedToken(newToken);
            toast.success("Feed de calendario activado");
            return newToken;
        } catch (error) {
            console.error("Error generating feed token:", error);
            toast.error("Error al generar el feed");
            return null;
        }
    }, [user]);

    const regenerateToken = useCallback(async () => {
        if (!user) return;
        try {
            const newToken = generateId();
            const { error } = await supabase
                .from("profiles")
                .update({ calendar_feed_token: newToken })
                .eq("user_id", user.id);

            if (error) throw error;

            setFeedToken(newToken);
            toast.success("URL del feed regenerada. La URL anterior ya no funciona.");
            return newToken;
        } catch (error) {
            console.error("Error regenerating feed token:", error);
            toast.error("Error al regenerar el feed");
            return null;
        }
    }, [user]);

    const disableFeed = useCallback(async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ calendar_feed_token: null })
                .eq("user_id", user.id);

            if (error) throw error;

            setFeedToken(null);
            toast.success("Feed de calendario desactivado");
        } catch (error) {
            console.error("Error disabling feed:", error);
            toast.error("Error al desactivar el feed");
        }
    }, [user]);

    return {
        feedToken,
        feedUrl,
        loading,
        generateToken,
        regenerateToken,
        disableFeed,
    };
}
