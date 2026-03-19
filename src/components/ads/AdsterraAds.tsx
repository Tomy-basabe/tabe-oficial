import { useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function AdsterraAds() {
  const { isPremium, loading } = useSubscription();
  const { user, isGuest } = useAuth();

  useEffect(() => {
    // Only load ads for logged in users who ARE NOT premium, guests or admins
    // (PremiumGate logic: loading || isPremium || isGuest || isAdmin doesn't see paywall)
    // We follow similar logic: if they are not premium and not guest, they see ads.
    
    const shouldShowAds = !loading && user && !isPremium && !isGuest;

    if (shouldShowAds) {
      console.log("Adsterra: Loading ads for freemium user...");
      const script = document.createElement("script");
      script.src = "https://pl28945805.profitablecpmratenetwork.com/d2/68/18/d26818e336689f294015d0823362ade9.js";
      script.async = true;
      script.id = "adsterra-ads-script";
      document.body.appendChild(script);

      return () => {
        const existingScript = document.getElementById("adsterra-ads-script");
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, [isPremium, loading, user, isGuest]);

  return null; // This component doesn't render anything UI-wise
}
