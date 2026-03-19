import { useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export function AdsterraAds() {
  const { isPremium, loading } = useSubscription();
  const { user, isGuest } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Show ads to everyone (guests or logged-in users) EXCEPT premium users and admins
    // CRITICAL: Wait for loading to be false to avoid flashing ads for Premium users
    const shouldShowAds = !loading && !isPremium;

    console.log("TABE Ads Debug:", { isPremium, loading, user: !!user, isGuest, shouldShowAds, path: location.pathname });

    if (shouldShowAds) {
      console.log("Adsterra: Refreshing ads for path:", location.pathname);
      
      // Script 1: Anti-adblock / Support
      const s1 = document.createElement("script");
      s1.src = "https://tallytrivial.com/d2/68/18/d26818e336689f294015d0823362ade9.js";
      s1.async = true;
      s1.id = "adsterra-support";
      document.head.appendChild(s1);

      // Script 2: Social Bar (Main Ad)
      const s2 = document.createElement("script");
      s2.src = "https://tallytrivial.com/d7/f6/37/d7f6378a3c9221274e26d1619d92a775.js";
      s2.async = true;
      s2.id = "adsterra-social-bar";
      document.head.appendChild(s2);

      return () => {
        document.getElementById("adsterra-support")?.remove();
        document.getElementById("adsterra-social-bar")?.remove();
      };
    }
  }, [isPremium, loading, user, isGuest, location.pathname]);

  return null; // This component doesn't render anything UI-wise
}
