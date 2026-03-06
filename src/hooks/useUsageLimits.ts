import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Limits for free users
export const FREE_LIMITS = {
    apuntes: 15,            // documentos TOTAL (no mensual)
    flashcard_mazos: 10,    // mazos por mes
    flashcard_tarjetas: 500, // por mazo (sin limite practico)
    cuestionarios: 14,      // cuestionarios por mes
    cuestionario_preguntas: 20, // preguntas por cuestionario
    storage_mb: 500,        // total (500MB)
    ia_daily: 5,            // diario
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
    const todayStart = new Date().toISOString().split("T")[0];

    // Query for total storage used in bytes
    const { data: storageUsed = 0 } = useQuery({
        queryKey: ["user_storage", user?.id],
        queryFn: async () => {
            if (!user?.id) return 0;
            const { data, error } = await supabase
                .from("library_files")
                .select("tamaño_bytes")
                .eq("user_id", user.id);

            if (error) return 0;
            return data.reduce((sum, file) => sum + (file["tamaño_bytes"] || 0), 0);
        },
        enabled: !!user?.id,
    });

    // Query for total file count (apuntes limit is TOTAL, not monthly)
    const { data: totalFileCount = 0 } = useQuery({
        queryKey: ["user_file_count", user?.id],
        queryFn: async () => {
            if (!user?.id) return 0;
            const { count, error } = await supabase
                .from("library_files")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id);

            if (error) return 0;
            return count || 0;
        },
        enabled: !!user?.id,
    });

    const { data: usageData = {} } = useQuery<UsageData>({
        queryKey: ["user_usage", user?.id, monthStart, todayStart],
        queryFn: async () => {
            if (!user?.id) return {};
            const { data, error } = await supabase
                .from("user_usage")
                .select("feature, count, period_start")
                .eq("user_id", user.id)
                .or(`period_start.eq.${monthStart},period_start.eq.${todayStart}`);

            if (error) return {};
            const result: UsageData = {};
            data?.forEach((row: any) => {
                // If it's a daily feature, only use today's count
                if (row.feature === "ia_daily") {
                    if (row.period_start === todayStart) {
                        result[row.feature] = row.count;
                    }
                } else {
                    // For monthly features, use monthStart count
                    if (row.period_start === monthStart) {
                        result[row.feature] = row.count;
                    }
                }
            });
            return result;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 30,
    });

    const getUsage = (feature: FeatureKey): number => {
        if (feature === "storage_mb") {
            return Math.round(storageUsed / (1024 * 1024));
        }
        if (feature === "apuntes") {
            return totalFileCount;
        }
        return usageData[feature] || 0;
    };

    const getLimit = (feature: FeatureKey): number => {
        return FREE_LIMITS[feature];
    };

    const getRemaining = (feature: FeatureKey): number => {
        if (isPremium || isGuest) return Infinity;
        return Math.max(0, getLimit(feature) - getUsage(feature));
    };

    const canUse = (feature: FeatureKey, currentValue: number = 0): boolean => {
        if (isPremium || isGuest) return true;

        if (feature === "storage_mb") {
            const currentMB = Math.round(storageUsed / (1024 * 1024));
            const additionalMB = Math.round(currentValue / (1024 * 1024));
            return (currentMB + additionalMB) < getLimit(feature);
        }

        if (feature === "apuntes") {
            return totalFileCount < getLimit(feature);
        }

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
        queryClient.invalidateQueries({ queryKey: ["user_file_count", user.id] });

        return true;
    };

    const showLimitReached = (feature: FeatureKey) => {
        const names: Record<FeatureKey, string> = {
            apuntes: "archivos en la biblioteca (15 máximo)",
            flashcard_mazos: "mazos de flashcards",
            flashcard_tarjetas: "tarjetas por mazo",
            cuestionarios: "cuestionarios",
            cuestionario_preguntas: "preguntas por cuestionario",
            storage_mb: "almacenamiento (500MB)",
            ia_daily: "uso de IA diario (5 créditos)",
        };
        const unit = feature === "storage_mb" ? "MB" : "";
        const periodLabel = feature === "ia_daily" ? "diario" : feature === "storage_mb" || feature === "apuntes" ? "total" : "mensual";
        toast.error(
            `Alcanzaste tu límite ${periodLabel} de ${getLimit(feature)}${unit} ${names[feature]}. Hacete Premium para acceso ilimitado ✨`,
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
