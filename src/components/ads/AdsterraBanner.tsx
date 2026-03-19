import { useEffect, useRef } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function AdsterraBanner() {
  const { isPremium, loading } = useSubscription();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show ads for non-premium users. Wait for loading to avoid flashing for Premium.
    const shouldShowAds = !loading && !isPremium;

    if (shouldShowAds && containerRef.current) {
      const isMobile = window.innerWidth < 768;
      const adKey = isMobile ? "379aa66cc2d5efa8c990af50a7a0bef1" : "2f52a44774e2ae88803ffefbf5340641";
      const adWidth = isMobile ? 320 : 728;
      const adHeight = isMobile ? 50 : 90;

      console.log(`Adsterra Banner Debug: Loading ${adWidth}x${adHeight} for ${isMobile ? 'mobile' : 'desktop'}`);

      // Set global variable that invoke.js expects
      (window as any).atOptions = {
        'key' : adKey,
        'format' : 'iframe',
        'height' : adHeight,
        'width' : adWidth,
        'params' : {}
      };

      // Clear previous content
      containerRef.current.innerHTML = "";

      // Create and append the invoke script
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `//tallytrivial.com/${adKey}/invoke.js`;
      script.async = true;
      
      containerRef.current.appendChild(script);

      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      };
    }
  }, [isPremium, loading]);

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
