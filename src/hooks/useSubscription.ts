import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionData {
    plan: "free" | "premium";
    planExpiresAt: string | null;
    planActivatedAt: string | null;
    planType: "mensual" | "semestral" | "anual" | null;
    isPremium: boolean;
    daysLeft: number | null;
    isExpired: boolean;
}

export function useSubscription(): SubscriptionData & { loading: boolean } {
    const { user } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ["subscription", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from("profiles")
                .select("plan, plan_expires_at, plan_activated_at, plan_type")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 min cache
    });

    const now = new Date();
    const expiresAt = data?.plan_expires_at ? new Date(data.plan_expires_at) : null;
    const isExpired = expiresAt ? now > expiresAt : false;
    const isPremium = data?.plan === "premium" && !isExpired;

    const daysLeft = expiresAt && !isExpired
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        plan: isPremium ? "premium" : "free",
        planExpiresAt: data?.plan_expires_at ?? null,
        planActivatedAt: data?.plan_activated_at ?? null,
        planType: data?.plan_type ?? null,
        isPremium,
        daysLeft,
        isExpired,
        loading: isLoading,
    };
}
