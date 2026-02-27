import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Monthly limits for free users
export const FREE_LIMITS = {
    apuntes: 6,            // documentos por mes
    flashcard_mazos: 3,    // mazos por mes
    flashcard_tarjetas: 10, // tarjetas por mazo
    cuestionarios: 5,      // cuestionarios por mes
    cuestionario_preguntas: 5, // preguntas por cuestionario
    discord_canales: 3,    // canales por mes
} as const;

type FeatureKey = keyof typeof FREE_LIMITS;

interface UsageData {
    [key: string]: number;
}

export function useUsageLimits() {
    const { user, isGuest } = useAuth();
    const { isPremium } = useSubscription();
    const queryClient = useQueryClient();

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split("T")[0];

    const { data: usageData = {} } = useQuery<UsageData>({
        queryKey: ["user_usage", user?.id, monthStart],
        queryFn: async () => {
            if (!user?.id) return {};
            const { data, error } = await supabase
                .from("user_usage")
                .select("feature, count")
                .eq("user_id", user.id)
                .eq("period_start", monthStart);

            if (error) return {};
            const result: UsageData = {};
            data?.forEach((row: any) => {
                result[row.feature] = row.count;
            });
            return result;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 30,
    });

    const getUsage = (feature: FeatureKey): number => {
        return usageData[feature] || 0;
    };

    const getLimit = (feature: FeatureKey): number => {
        return FREE_LIMITS[feature];
    };

    const getRemaining = (feature: FeatureKey): number => {
        if (isPremium || isGuest) return Infinity;
        return Math.max(0, getLimit(feature) - getUsage(feature));
    };

    const canUse = (feature: FeatureKey): boolean => {
        if (isPremium || isGuest) return true;
        return getUsage(feature) < getLimit(feature);
    };

    const incrementUsage = async (feature: FeatureKey): Promise<boolean> => {
        if (isPremium || isGuest) return true;
        if (!user?.id) return false;

        if (!canUse(feature)) {
            showLimitReached(feature);
            return false;
        }

        const { data, error } = await supabase.rpc("increment_usage", {
            p_user_id: user.id,
            p_feature: feature,
        });

        if (error) {
            console.error("Error incrementing usage:", error);
            return true; // Don't block on error
        }

        // Invalidate cache so UI updates
        queryClient.invalidateQueries({ queryKey: ["user_usage", user.id] });

        return true;
    };

    const showLimitReached = (feature: FeatureKey) => {
        const names: Record<FeatureKey, string> = {
            apuntes: "apuntes",
            flashcard_mazos: "mazos de flashcards",
            flashcard_tarjetas: "tarjetas por mazo",
            cuestionarios: "cuestionarios",
            cuestionario_preguntas: "preguntas por cuestionario",
            discord_canales: "canales",
        };
        toast.error(
            `Alcanzaste tu límite mensual de ${getLimit(feature)} ${names[feature]}. Hacete Premium para acceso ilimitado ✨`,
            { duration: 5000 }
        );
    };

    return {
        isPremium,
        canUse,
        getUsage,
        getLimit,
        getRemaining,
        incrementUsage,
        showLimitReached,
    };
}
