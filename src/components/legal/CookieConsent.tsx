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
    // Escuchar cambios de preferencia (por ejemplo si se resetea desde Configuración)
    const handleConsentChange = (e: any) => {
      const newPref = e.detail?.preference || getCookieConsent();
      setPreference(newPref);
      if (!newPref) {
        setVisible(true);
      }
    };

    window.addEventListener(COOKIE_EVENT_NAME, handleConsentChange);

    // Si aún no decidió, mostrar con ligero delay para suavizar la entrada
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
      <div className="bg-card text-card-foreground border-4 border-foreground rounded-2xl p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] flex flex-col gap-4">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFE600] text-black border-2 border-foreground flex items-center justify-center shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-foreground flex items-center gap-1.5">
                Privacidad y Cookies
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Cumplimiento Ley 25.326 & RGPD
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOnlyNecessary}
            title="Cerrar y usar solo necesarias"
            className="w-7 h-7 rounded-lg border-2 border-foreground bg-muted hover:bg-destructive hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje */}
        <p className="text-xs font-bold leading-relaxed text-muted-foreground">
          Utilizamos cookies esenciales para la sesión y preferencias del estudiante.
          Opcionalmente usamos analíticas para optimizar el rendimiento y prevenir errores. No vendemos ni cedemos datos a terceros.
        </p>

        {/* Enlace a Privacidad */}
        <div className="flex items-center gap-1 text-[11px] font-black text-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0066FF]" />
          <span>Conocé todos los detalles en nuestra</span>
          <Link
            to="/privacidad"
            className="text-[#0066FF] hover:underline underline-offset-2 ml-1"
          >
            Política de Privacidad
          </Link>
        </div>

        {/* Botones de Acción Neobrutalistas */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleOnlyNecessary}
            className="py-2.5 px-3 rounded-xl border-2 border-foreground bg-secondary text-secondary-foreground font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1"
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="py-2.5 px-3 rounded-xl border-2 border-foreground bg-[#BFFF00] text-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Aceptar todas
          </button>
        </div>
      </div>
    </aside>
  );
}
