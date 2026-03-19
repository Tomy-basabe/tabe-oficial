import { useEffect, useRef } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function AdsterraBanner() {
  const { isPremium, loading } = useSubscription();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show ads for non-premium users
    const shouldShowAds = !isPremium;

    if (shouldShowAds && containerRef.current) {
      // Clear container
      containerRef.current.innerHTML = "";

      // Determine which ad to show based on screen width
      const isMobile = window.innerWidth < 768;
      const adKey = isMobile ? "379aa66cc2d5efa8c990af50a7a0bef1" : "2f52a44774e2ae88803ffefbf5340641";
      const adWidth = isMobile ? 320 : 728;
      const adHeight = isMobile ? 50 : 90;

      // Create configuration script
      const configScript = document.createElement("script");
      configScript.text = `
        atOptions = {
          'key' : '${adKey}',
          'format' : 'iframe',
          'height' : ${adHeight},
          'width' : ${adWidth},
          'params' : {}
        };
      `;
      containerRef.current.appendChild(configScript);

      // Create invoke script
      const invokeScript = document.createElement("script");
      invokeScript.src = `https://tallytrivial.com/${adKey}/invoke.js`;
      invokeScript.async = true;
      containerRef.current.appendChild(invokeScript);
    }
  }, [isPremium]);

  if (isPremium) return null;

  return (
    <div className="w-full flex justify-center py-4 overflow-hidden min-h-[60px] md:min-h-[100px]">
      <div 
        ref={containerRef} 
        className="adsterra-banner-container bg-muted/5 rounded-lg border border-border/10 flex items-center justify-center"
        style={{ minWidth: "320px" }}
      />
    </div>
  );
}
