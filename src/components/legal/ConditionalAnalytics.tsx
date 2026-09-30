import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { hasAnalyticsConsent, COOKIE_EVENT_NAME } from "./CookieConsent";

export function ConditionalAnalytics() {
  const [enabled, setEnabled] = useState(() => hasAnalyticsConsent());

  useEffect(() => {
    const handleUpdate = () => {
      setEnabled(hasAnalyticsConsent());
    };

    window.addEventListener(COOKIE_EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(COOKIE_EVENT_NAME, handleUpdate);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Analytics />;
}
