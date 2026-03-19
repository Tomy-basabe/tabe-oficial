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
      
      console.log("TABE Ads [%s]: Attempting injection...", new Date().toLocaleTimeString());

      // 1. Clear common browser storage keys used by ad networks for frequency capping
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("adsterra") || key.includes("was_shown") || key.includes("frequency"))) {
            localStorage.removeItem(key);
          }
        }
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes("adsterra") || key.includes("was_shown") || key.includes("frequency"))) {
            sessionStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error("TABE Ads: Storage clear error", e);
      }
      
      // 2. Remove ALL previous instances to force a clean slate
      const existing = document.getElementById("adsterra-social-bar");
      if (existing) {
        existing.remove();
      }

      // 3. Create a unique container if needed or just append to head
      const s2 = document.createElement("script");
      const timestamp = Date.now();
      // Use cache-busting and a random callback if needed
      s2.src = `https://tallytrivial.com/d7/f6/37/d7f6378a3c9221274e26d1619d92a775.js?v=${timestamp}&r=${Math.random()}`;
      s2.async = true;
      s2.id = "adsterra-social-bar";
      
      // Add a small delay to ensure cleanup was processed by browser
      setTimeout(() => {
        document.head.appendChild(s2);
        console.log("TABE Ads: Script appended with ID", s2.id);
      }, 50);
    };

    if (shouldShowAds) {
      injectSocialBar();

      // Ultra-Aggressive: Reinject on EVERY click
      const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        console.log("TABE Ads: Click on", target.tagName, "path:", location.pathname);
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
