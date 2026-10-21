import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, ShieldCheck, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CookiePreference = "all" | "necessary";

export const COOKIE_STORAGE_KEY = "tabe_cookie_consent";
export const COOKIE_EVENT_NAME = "tabe:cookie-consent-updated";

export function getCookieConsent(): CookiePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (val === "all" || val === "necessary") return val;
  } catch (e) {}
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === "all";
}

export function setCookieConsent(pref: CookiePreference) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, pref);
    window.dispatchEvent(new CustomEvent(COOKIE_EVENT_NAME, { detail: { preference: pref } }));
  } catch (e) {}
}

export function resetCookieConsent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(COOKIE_EVENT_NAME, { detail: { preference: null } }));
  } catch (e) {}
}

export function CookieConsent() {
  const [preference, setPreference] = useState<CookiePreference | null>(() => getCookieConsent());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleConsentChange = (e: any) => {
      const newPref = e.detail?.preference || getCookieConsent();
      setPreference(newPref);
      if (!newPref) {
        setVisible(true);
      }
    };

    window.addEventListener(COOKIE_EVENT_NAME, handleConsentChange);

    if (!getCookieConsent()) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => {
        clearTimeout(timer);
        window.removeEventListener(COOKIE_EVENT_NAME, handleConsentChange);
      };
    }

    return () => {
      window.removeEventListener(COOKIE_EVENT_NAME, handleConsentChange);
    };
  }, []);

  if (!visible || preference) return null;

  const handleAcceptAll = () => {
    setCookieConsent("all");
    setPreference("all");
    setVisible(false);
  };

  const handleOnlyNecessary = () => {
    setCookieConsent("necessary");
    setPreference("necessary");
    setVisible(false);
  };

  return (
    <aside
      aria-label="Consentimiento de cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-card/95 backdrop-blur-xl text-card-foreground border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                Privacidad y Cookies
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                Cumplimiento Ley 25.326 & RGPD
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOnlyNecessary}
            title="Cerrar y usar solo necesarias"
            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje */}
        <p className="text-xs font-normal leading-relaxed text-muted-foreground">
          Utilizamos cookies esenciales para la sesión y preferencias del estudiante.
          Opcionalmente usamos métricas de rendimiento y prevención de errores. No comercializamos datos personales.
        </p>

        {/* Enlace a Privacidad */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Leé todos los detalles en nuestra</span>
          <Link
            to="/privacidad"
            className="text-primary hover:underline underline-offset-4 font-semibold"
          >
            Política de Privacidad
          </Link>
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleOnlyNecessary}
            className="py-2.5 px-3 rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-secondary-foreground font-medium text-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Aceptar todas
          </button>
        </div>
      </div>
    </aside>
  );
}
