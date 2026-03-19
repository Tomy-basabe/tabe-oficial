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
      console.log("Adsterra: Attempting to load scripts...");
      
      const script1 = document.createElement("script");
      script1.src = "https://pl28945805.profitablecpmratenetwork.com/d2/68/18/d26818e336689f294015d0823362ade9.js";
      script1.async = true;
      script1.id = "adsterra-ads-script-1";
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src = "https://tallytrivial.com/d2/68/18/d26818e336689f294015d0823362ade9.js";
      script2.async = true;
      script2.id = "adsterra-ads-script-2";
      document.head.appendChild(script2);

      script1.onload = () => console.log("Adsterra: Script 1 loaded OK");
      script2.onload = () => console.log("Adsterra: Script 2 loaded OK");
      script1.onerror = (e) => console.error("Adsterra: Script 1 failed", e);
      script2.onerror = (e) => console.error("Adsterra: Script 2 failed", e);

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
