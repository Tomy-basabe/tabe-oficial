import { useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function AdsterraAds() {
  const { isPremium, loading } = useSubscription();
  const { user, isGuest } = useAuth();

  useEffect(() => {
    // Show ads to everyone (guests or logged-in users) EXCEPT premium users and admins
    const shouldShowAds = !isPremium;

    console.log("TABE Ads Debug:", { isPremium, loading, user: !!user, isGuest, shouldShowAds });

    if (shouldShowAds) {
      console.log("Adsterra: Pop-under removed to improve UX. Waiting for Social Bar code.");
      
      // Solo mantenemos el script de seguridad/anti-adblock si es necesario, 
      // pero el principal responsable de las pestañas nuevas es el profitablecpm...
      // Lo eliminamos por completo por ahora.

      return () => {
        const s1 = document.getElementById("adsterra-ads-script-1");
        const s2 = document.getElementById("adsterra-ads-script-2");
        if (s1) document.head.removeChild(s1);
        if (s2) document.head.removeChild(s2);
      };
    }
  }, [isPremium, loading, user, isGuest]);

  return null; // This component doesn't render anything UI-wise
}
