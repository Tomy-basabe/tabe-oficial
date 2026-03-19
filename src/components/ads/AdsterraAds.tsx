import { useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export function AdsterraAds() {
  const { isPremium, loading } = useSubscription();
  const { user, isGuest } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Exclude critical routes from ads to avoid interference and performance issues
    const excludedRoutes = ["/auth", "/login", "/registro", "/perfil", "/verify"];
    const isExcluded = excludedRoutes.some(route => location.pathname.startsWith(route));

    // Show ads to everyone (guests or logged-in users) EXCEPT premium users and admins
    // CRITICAL: Wait for loading to be false to avoid flashing ads for Premium users
    const shouldShowAds = !loading && !isPremium && !isExcluded;

    console.log("TABE Ads Debug:", { isPremium, loading, isExcluded, shouldShowAds, path: location.pathname });

    if (!shouldShowAds) {
      document.getElementById("adsterra-social-bar")?.remove();
      return;
    }

    // 1. Clear common browser storage keys ONLY ONCE on mount or route change (if needed)
    const clearAdStorage = () => {
      try {
        const keysToClear = ["adsterra", "was_shown", "frequency", "as_pop"];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && keysToClear.some(k => key.toLowerCase().includes(k))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) { /* Ignore */ }
    };

    let lastInjectionTime = 0;
    const injectionCooldown = 60000; // 60 seconds cooldown to protect performance

    const injectSocialBar = (force = false) => {
      const now = Date.now();
      if (!force && now - lastInjectionTime < injectionCooldown) {
         return; // Skip if cooldown active
      }
      
      clearAdStorage();
      
      const existing = document.getElementById("adsterra-social-bar");
      if (existing) existing.remove();

      const s2 = document.createElement("script");
      s2.src = `https://tallytrivial.com/d7/f6/37/d7f6378a3c9221274e26d1619d92a775.js?v=${now}`;
      s2.async = true;
      s2.id = "adsterra-social-bar";
      
      setTimeout(() => {
        if (location.pathname === window.location.pathname) { // Ensure still on same path
          document.head.appendChild(s2);
          lastInjectionTime = now;
        }
      }, 100);
    };

    injectSocialBar(true); // Initial injection

    // Throttled: Reinject only every 10 clicks to balance monetization and performance
    let clickCount = 0;
    const handleGlobalClick = () => {
      clickCount++;
      if (clickCount % 10 === 0) {
        injectSocialBar();
      }
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.getElementById("adsterra-social-bar")?.remove();
    };
  }, [isPremium, loading, location.pathname]);

  return null; // This component doesn't render anything UI-wise
}
