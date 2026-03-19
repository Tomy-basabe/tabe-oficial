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
      console.log("Adsterra: Loading Social Bar (Friendly Overlay)...");
      
      const script = document.createElement("script");
      script.src = "https://tallytrivial.com/d7/f6/37/d7f6378a3c9221274e26d1619d92a775.js";
      script.async = true;
      script.id = "adsterra-social-bar";
      document.head.appendChild(script);

      return () => {
        const s = document.getElementById("adsterra-social-bar");
        if (s) document.head.removeChild(s);
      };
    }
  }, [isPremium, loading, user, isGuest]);

  return null; // This component doesn't render anything UI-wise
}
