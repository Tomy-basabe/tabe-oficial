import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppWindow, ExternalLink, Globe, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CampusProxyRedirect() {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get("url") || "https://campusvirtual.frm.utn.edu.ar";
  const [isFetchingRealHtml, setIsFetchingRealHtml] = useState<boolean>(true);

  // Intentar cargar por red el HTML real del campus y reemplazar el documento del iframe
  useEffect(() => {
    let isCancelled = false;

    async function loadCampusDirectly() {
      try {
        const canonicalBase =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
            ? window.location.origin
            : "https://www.tabe.com.ar";

        const endpoint = `${canonicalBase}/api/campus-proxy?url=${encodeURIComponent(rawUrl)}&_sw_bypass=1`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (isCancelled) return;

        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            const html = await res.text();
            if (html && !html.includes("No pudimos encontrar la coordenada") && !html.includes("INACCESIBLE")) {
              document.open();
              document.write(html);
              document.close();
              return;
            }
          }
        }
      } catch {
        // Fallback suave a la tarjeta de acceso
      } finally {
        if (!isCancelled) {
          setIsFetchingRealHtml(false);
        }
      }
    }

    loadCampusDirectly();

    return () => {
      isCancelled = true;
    };
  }, [rawUrl]);

  const handleOpenAppWindow = () => {
    const width = Math.min(1360, window.screen.availWidth - 60);
    const height = Math.min(880, window.screen.availHeight - 60);
    const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));

    try {
      const popup = window.open(
        rawUrl,
        `TABECampusWindow_${Date.now()}`,
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes`
      );
      if (popup) {
        popup.focus();
      } else {
        window.open(rawUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    }
  };

  const domain = (() => {
    try {
      return new URL(rawUrl).hostname;
    } catch {
      return "campusvirtual.frm.utn.edu.ar";
    }
  })();

  if (isFetchingRealHtml) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#161618] p-4 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Cargando {domain}...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#121214] p-4 text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#1a1a1e] rounded-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-4 border border-blue-500/20">
          <Globe className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Conexión Segura Universitaria
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-2">
          Acceso a tu Campus Virtual
        </h2>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Para garantizar la persistencia de tu sesión, descargas de archivos PDF y seguridad en exámenes, abrí el portal en su ventana oficial.
        </p>

        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate mb-6">
          {domain}
        </div>

        <div className="space-y-2.5">
          <Button
            onClick={handleOpenAppWindow}
            className="w-full h-10 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <AppWindow className="w-4 h-4" />
            Abrir en Ventana App (Recomendado)
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full h-10 rounded-xl text-xs font-medium cursor-pointer"
          >
            <a href={rawUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir en Pestaña Directa
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
