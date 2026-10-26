import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  ExternalLink, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Edit2, 
  Check, 
  ShieldCheck, 
  AppWindow,
  Trash2,
  X,
  Image as ImageIcon,
  Bookmark,
  LayoutGrid,
  Monitor,
  AlertCircle,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CampusSite {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
}

const STORAGE_SITES_KEY = "tabe_mi_campus_sites_v1";
const STORAGE_ACTIVE_ID_KEY = "tabe_mi_campus_active_id";
const STORAGE_VIEW_MODE_KEY = "tabe_mi_campus_view_mode";
const LEGACY_URL_KEY = "tabe_mi_campus_url";
const LEGACY_NAME_KEY = "tabe_mi_campus_name";

const getAutoFavicon = (rawUrl: string): string => {
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    const domain = new URL(clean).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return "";
  }
};

export default function MiCampus() {
  // Lista de sitios guardados
  const [sites, setSites] = useState<CampusSite[]>(() => {
    try {
      const savedSites = localStorage.getItem(STORAGE_SITES_KEY);
      if (savedSites) {
        const parsed = JSON.parse(savedSites);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Migración suave desde los valores anteriores
      const legacyUrl = localStorage.getItem(LEGACY_URL_KEY);
      const legacyName = localStorage.getItem(LEGACY_NAME_KEY);
      const initialUrl = legacyUrl && legacyUrl !== "undefined" && legacyUrl !== "null" && legacyUrl.startsWith("http")
        ? legacyUrl
        : "https://campusvirtual.frm.utn.edu.ar";
      const initialName = legacyName && legacyName !== "undefined" && legacyName !== "null" && legacyName.trim()
        ? legacyName
        : "Campus UTN FRM";

      return [
        {
          id: "default-utn",
          name: initialName,
          url: initialUrl,
          logoUrl: getAutoFavicon(initialUrl),
        },
      ];
    } catch {
      return [
        {
          id: "default-utn",
          name: "Campus UTN FRM",
          url: "https://campusvirtual.frm.utn.edu.ar",
          logoUrl: getAutoFavicon("https://campusvirtual.frm.utn.edu.ar"),
        },
      ];
    }
  });

  // ID del sitio activo
  const [activeSiteId, setActiveSiteId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (savedId) return savedId;
    } catch {}
    return "default-utn";
  });

  // Modo de visualización: 'launcher' (tarjetas de acceso rápido recomendadas) o 'visor' (iframe embebido)
  const [viewMode, setViewMode] = useState<"visor" | "launcher">(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VIEW_MODE_KEY);
      if (saved === "launcher" || saved === "visor") return saved;
    } catch {}
    return "launcher";
  });

  // Determinar sitio activo
  const activeSite = useMemo(() => {
    const found = sites.find((s) => s.id === activeSiteId);
    return found || sites[0] || {
      id: "fallback",
      name: "Campus UTN FRM",
      url: "https://campusvirtual.frm.utn.edu.ar",
      logoUrl: "",
    };
  }, [sites, activeSiteId]);

  // Estados para modal/panel de agregar o editar
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formUrl, setFormUrl] = useState<string>("");
  const [formLogoUrl, setFormLogoUrl] = useState<string>("");

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoadingIframe, setIsLoadingIframe] = useState<boolean>(true);
  const [hasIframeError, setHasIframeError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar persistencia de sitios y activo en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SITES_KEY, JSON.stringify(sites));
      if (activeSite) {
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeSite.id);
        localStorage.setItem(LEGACY_URL_KEY, activeSite.url);
        localStorage.setItem(LEGACY_NAME_KEY, activeSite.name);
      }
      localStorage.setItem(STORAGE_VIEW_MODE_KEY, viewMode);
    } catch {}
  }, [sites, activeSite, viewMode]);

  // Fuente del iframe con origen canónico y cache-buster para evitar 404 cacheado
  const iframeSrc = useMemo(() => {
    const validUrl = activeSite?.url && activeSite.url.startsWith("http")
      ? activeSite.url
      : "https://campusvirtual.frm.utn.edu.ar";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api/campus-proxy?url=${encodeURIComponent(validUrl)}&_k=${iframeKey}`;
  }, [activeSite?.url, iframeKey]);

  useEffect(() => {
    if (activeSite?.url) {
      setIsLoadingIframe(true);
      setHasIframeError(false);
      const timer = setTimeout(() => {
        setIsLoadingIframe(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeSite?.url, iframeKey]);

  // Abrir formulario para crear nuevo sitio
  const handleOpenCreate = () => {
    setEditingSiteId(null);
    setFormName("");
    setFormUrl("");
    setFormLogoUrl("");
    setIsFormOpen(true);
  };

  // Abrir formulario para editar sitio existente
  const handleOpenEdit = (site: CampusSite) => {
    setEditingSiteId(site.id);
    setFormName(site.name);
    setFormUrl(site.url);
    setFormLogoUrl(site.logoUrl || "");
    setIsFormOpen(true);
  };

  // Guardar (crear o editar)
  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let cleanUrl = formUrl.trim();
    const cleanName = formName.trim() || "Portal de Estudio";
    let cleanLogo = formLogoUrl.trim();

    if (!cleanUrl) {
      toast.error("Por favor ingresa una dirección URL válida.");
      return;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch {
      toast.error("El formato del enlace no es válido. Ej: campusvirtual.frm.utn.edu.ar");
      return;
    }

    // Si no puso logo, autogenerar con el favicon del dominio
    if (!cleanLogo) {
      cleanLogo = getAutoFavicon(cleanUrl);
    }

    if (editingSiteId) {
      // Modo edición
      setSites((prev) =>
        prev.map((s) =>
          s.id === editingSiteId
            ? { ...s, name: cleanName, url: cleanUrl, logoUrl: cleanLogo }
            : s
        )
      );
      toast.success("¡Sitio actualizado correctamente!");
    } else {
      // Modo nuevo
      const newSite: CampusSite = {
        id: `site-${Date.now()}`,
        name: cleanName,
        url: cleanUrl,
        logoUrl: cleanLogo,
      };
      setSites((prev) => [...prev, newSite]);
      setActiveSiteId(newSite.id);
      toast.success("¡Nuevo sitio agregado a Mi Campus!");
    }

    setIsFormOpen(false);
    setIsLoadingIframe(true);
    setIframeKey((prev) => prev + 1);
  };

  // Eliminar sitio
  const handleDeleteSite = (id: string) => {
    if (sites.length <= 1) {
      toast.error("Debes tener al menos un enlace en tu Campus.");
      return;
    }

    const filtered = sites.filter((s) => s.id !== id);
    setSites(filtered);
    if (activeSiteId === id) {
      setActiveSiteId(filtered[0].id);
    }
    setIsFormOpen(false);
    toast.success("Sitio eliminado.");
  };

  const handleReload = () => {
    setIsLoadingIframe(true);
    setHasIframeError(false);
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Abre el sitio en ventana independiente tipo app (centrada y limpia)
  const openAsAppWindow = (targetUrl?: string) => {
    const url = targetUrl || activeSite?.url;
    if (!url) return;

    const width = Math.min(1360, window.screen.availWidth - 60);
    const height = Math.min(880, window.screen.availHeight - 60);
    const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));
    
    try {
      const popup = window.open(
        url,
        `TABECampusWindow_${Date.now()}`,
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes`
      );
      if (popup) {
        popup.focus();
        toast.success("Abierto en ventana independiente tipo app", { duration: 2500 });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "tabe-page flex flex-col transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-[1200] bg-white dark:bg-[#161618] p-2 sm:p-4"
          : "p-3 sm:p-5 lg:p-6 max-w-[1550px] mx-auto min-h-[calc(100vh-6rem)]"
      )}
    >
      {/* Barra de sitios guardados (Tabs / Pills horizontales) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0 mb-2">
        {sites.map((site) => {
          const isActive = site.id === activeSite.id;
          const displayLogo = site.logoUrl || getAutoFavicon(site.url);

          return (
            <button
              key={site.id}
              type="button"
              onClick={() => {
                setActiveSiteId(site.id);
                setHasIframeError(false);
              }}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border cursor-pointer",
                isActive
                  ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs"
                  : "bg-white/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
              )}
            >
              <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                {displayLogo ? (
                  <img
                    src={displayLogo}
                    alt={site.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Globe className="w-3 h-3 text-zinc-500" />
                )}
              </div>
              <span className="truncate max-w-[140px]">{site.name}</span>
            </button>
          );
        })}

        {/* Botón para agregar un nuevo link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCreate}
          className="h-8 px-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar link</span>
        </Button>
      </div>

      {/* Barra de control superior */}
      <div className="neo-bento-card p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 overflow-hidden">
            {activeSite.logoUrl ? (
              <img
                src={activeSite.logoUrl}
                alt={activeSite.name}
                className="w-6 h-6 object-contain rounded-md"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <Globe className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                {activeSite.name}
              </h1>
              <button
                type="button"
                onClick={() => handleOpenEdit(activeSite)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Editar este sitio"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {activeSite.url.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </div>

        {/* Acciones de control y Selector de Vista */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-auto shrink-0 flex-wrap">
          {/* Switcher Visor / Lanzador */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 mr-1">
            <button
              type="button"
              onClick={() => setViewMode("visor")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "visor"
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
              title="Ver embebido en la aplicación"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Visor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("launcher")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "launcher"
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
              title="Ver panel de acceso rápido y accesos directos"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Lanzador</span>
            </button>
          </div>

          {/* Botón Principal: Abrir como Ventana App */}
          <Button
            size="sm"
            onClick={() => openAsAppWindow()}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Abrir como ventana independiente tipo app (sesión completa y sin bloqueos)"
          >
            <AppWindow className="w-3.5 h-3.5" />
            <span>Ventana app</span>
          </Button>

          {/* Abrir en Pestaña Directa */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title="Abrir en pestaña nueva del navegador"
          >
            <a href={activeSite.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pestaña</span>
            </a>
          </Button>

          {/* Recargar iframe */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title="Recargar página"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>

          {/* Pantalla completa */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Editor / Modal Desplegable para Agregar o Editar Sitio */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-3 sm:mb-4 shrink-0"
          >
            <form
              onSubmit={handleSaveForm}
              className="neo-bento-card p-4 sm:p-5 border-blue-500/30 dark:border-blue-500/30 bg-blue-500/[0.02]"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {editingSiteId ? "Editar Portal o Enlace" : "Cargar Nuevo Portal o Enlace"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Nombre */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Nombre o Título
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej. SIU Guaraní / Autogestión"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Dirección URL */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Dirección URL
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="https://autogestion.frm.utn.edu.ar"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-lg"
                      required
                    />
                  </div>
                </div>

                {/* URL del Logo (Opcional) */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 flex items-center justify-between">
                    <span>URL del Logo (Opcional)</span>
                    {formLogoUrl || formUrl ? (
                      <span className="text-[10px] text-zinc-400">Favicon automático disponible</span>
                    ) : null}
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="url"
                      placeholder="https://ejemplo.com/logo.png"
                      value={formLogoUrl}
                      onChange={(e) => setFormLogoUrl(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    {editingSiteId ? "Guardar cambios" : "Agregar enlace"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFormOpen(false)}
                    className="h-9 px-3 rounded-lg text-xs cursor-pointer"
                  >
                    Cancelar
                  </Button>
                </div>

                {editingSiteId && sites.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSite(editingSiteId)}
                    className="h-9 px-3 rounded-lg text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Eliminar portal
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENIDO PRINCIPAL SEGÚN EL MODO SELECCIONADO */}
      {viewMode === "launcher" ? (
        /* MODO LANZADOR / ACCESO RÁPIDO (TARJETAS GLASSMORPHIC) */
        <div className="flex-1 flex flex-col gap-4">
          {/* Tarjeta Destacada del Campus Activo */}
          <div className="neo-bento-card p-5 sm:p-7 relative overflow-hidden bg-gradient-to-br from-blue-500/[0.04] via-transparent to-indigo-500/[0.03]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 p-2 shadow-xs">
                  {activeSite.logoUrl ? (
                    <img
                      src={activeSite.logoUrl}
                      alt={activeSite.name}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Globe className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                      Portal Principal
                    </span>
                    <span className="text-xs text-emerald-500 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Disponible
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
                    {activeSite.name}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                    <span>{activeSite.url}</span>
                  </p>
                </div>
              </div>

              {/* Botones de Entrada Rápida */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => openAsAppWindow()}
                  className="flex-1 sm:flex-none h-10 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <AppWindow className="w-4 h-4" />
                  <span>Entrar en Ventana App</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewMode("visor")}
                  className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Ver en Visor</span>
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 flex-wrap gap-3">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                La ventana independiente guarda tus credenciales universitarias y permite descargas directas de PDFs.
              </span>
              <a
                href={activeSite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                Abrir en pestaña nueva <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Grid de Todos los Portales Guardados */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 px-1">
              Todos tus Portales y Enlaces ({sites.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sites.map((site) => {
                const isActive = site.id === activeSite.id;
                const displayLogo = site.logoUrl || getAutoFavicon(site.url);

                return (
                  <div
                    key={site.id}
                    className={cn(
                      "neo-bento-card p-4 flex flex-col justify-between transition-all",
                      isActive
                        ? "border-blue-500/40 bg-blue-500/[0.02] shadow-xs"
                        : "hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700/60 overflow-hidden">
                          {displayLogo ? (
                            <img
                              src={displayLogo}
                              alt={site.name}
                              className="w-6 h-6 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Globe className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {site.name}
                          </h4>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {site.url.replace(/^https?:\/\//, "")}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(site)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        title="Editar enlace"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSiteId(site.id);
                          openAsAppWindow(site.url);
                        }}
                        className="flex-1 h-8 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
                      >
                        <AppWindow className="w-3 h-3 mr-1" />
                        Ventana App
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveSiteId(site.id);
                          setViewMode("visor");
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
                        title="Ver en el visor"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
                        title="Abrir en pestaña"
                      >
                        <a href={site.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* MODO VISOR EMBEBIDO (IFRAME PROXY SEGURO) */
        <div className="flex-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden relative min-h-[550px] flex flex-col shadow-xs">
          {activeSite?.url ? (
            <>
              {/* Aviso superior de estado */}
              <div className="bg-zinc-100/90 dark:bg-zinc-900/90 border-b border-zinc-200/70 dark:border-zinc-800/70 px-3.5 py-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 shrink-0 gap-3">
                <span className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    Portal: <strong className="text-zinc-900 dark:text-zinc-100">{activeSite.name}</strong> ({activeSite.url})
                  </span>
                </span>

                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => openAsAppWindow()}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <AppWindow className="w-3 h-3" />
                    Abrir en Ventana App
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <a
                    href={activeSite.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-medium"
                  >
                    Enlace directo <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="relative flex-1 w-full h-full min-h-[500px]">
                {/* Spinner de carga limpio */}
                {isLoadingIframe && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 dark:bg-[#161618]/85 backdrop-blur-xs">
                    <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-2" />
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Conectando con {activeSite.name}...
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAsAppWindow()}
                        className="h-7 text-xs rounded-lg px-2.5 cursor-pointer"
                      >
                        <AppWindow className="w-3 h-3 mr-1" />
                        Abrir ventana app
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsLoadingIframe(false)}
                        className="h-7 text-xs rounded-lg px-2 text-zinc-500"
                      >
                        Omitir espera
                      </Button>
                    </div>
                  </div>
                )}

                {/* Si hubo un error explícito de carga */}
                {hasIframeError ? (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-[#161618]">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      El campus requiere navegación directa
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-1 mb-4 leading-relaxed">
                      Muchos portales educativos impiden ser mostrados dentro de marcos por políticas de seguridad de cookies y exámenes. Podés abrirlo en su ventana nativa con 1 solo clic.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openAsAppWindow()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <AppWindow className="w-3.5 h-3.5" />
                        Abrir en Ventana App
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReload}
                        className="h-9 px-3 text-xs rounded-xl cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5 mr-1" /> Reintentar
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Iframe que renderiza el sitio */}
                <iframe
                  key={`${activeSite.id}-${iframeKey}`}
                  src={iframeSrc}
                  title={activeSite.name}
                  className="w-full h-full min-h-[550px] border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  onLoad={() => setIsLoadingIframe(false)}
                  onError={() => {
                    setIsLoadingIframe(false);
                    setHasIframeError(true);
                  }}
                />

                {/* Asistente Flotante inferior sutil */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-200/90 dark:border-zinc-800/90 shadow-lg flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="hidden sm:inline text-[11px] text-zinc-500">¿Problemas al iniciar sesión o descargar archivos?</span>
                  <button
                    type="button"
                    onClick={() => openAsAppWindow()}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <AppWindow className="w-3.5 h-3.5" />
                    Abrir en Ventana App
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={() => setViewMode("launcher")}
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer text-[11px]"
                  >
                    Ver Lanzador
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                <Globe className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                No tienes portales configurados
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-1 mb-5">
                Agrega los enlaces de tu facultad o plataformas de estudio para acceder en un solo lugar.
              </p>
              <Button
                onClick={handleOpenCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-9 px-4 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                Agregar enlace <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
