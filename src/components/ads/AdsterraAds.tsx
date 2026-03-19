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
      
      // Remove ALL previous instances to force a clean slate
      const existing = document.getElementById("adsterra-social-bar");
      if (existing) {
        existing.remove();
        // Some scripts leave artifacts in global scope, but we can't easily clear them
      }

      const s2 = document.createElement("script");
      // Use cache-busting parameter to try to trick the script into re-running
      s2.src = `https://tallytrivial.com/d7/f6/37/d7f6378a3c9221274e26d1619d92a775.js?v=${Date.now()}`;
      s2.async = true;
      s2.id = "adsterra-social-bar";
      document.head.appendChild(s2);
    };

    if (shouldShowAds) {
      injectSocialBar();

      // Ultra-Aggressive: Reinject on EVERY click
      const handleGlobalClick = () => {
        console.log("TABE Ads: Global click detected, refreshing Social Bar...");
        injectSocialBar();
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
