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

    const injectSocialBar = () => {
      if (!shouldShowAds) return;
      console.log("Adsterra: (Re)Injecting Social Bar...");
      
      // Remove existing if any to avoid duplicates
      document.getElementById("adsterra-social-bar")?.remove();

      const s2 = document.createElement("script");
      s2.src = "https://tallytrivial.com/d7/f6/37/d7f6378a3c9221274e26d1619d92a775.js";
      s2.async = true;
      s2.id = "adsterra-social-bar";
      document.head.appendChild(s2);
    };

    if (shouldShowAds) {
      injectSocialBar();

      // Aggressive: Reinject on a subset of clicks to ensure it keeps popping up
      let clickCount = 0;
      const handleGlobalClick = () => {
        clickCount++;
        // Reinject every 5 clicks to simulate "appearing on every button"
        if (clickCount % 5 === 0) {
          injectSocialBar();
        }
      };

      document.addEventListener("click", handleGlobalClick);

      return () => {
        document.removeEventListener("click", handleGlobalClick);
        document.getElementById("adsterra-social-bar")?.remove();
      };
    }
  }, [isPremium, loading, user, isGuest, location.pathname]);

  return null; // This component doesn't render anything UI-wise
}
