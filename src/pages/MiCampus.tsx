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
  Bookmark
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

  // Determinar sitio activo
  const activeSite = useMemo(() => {
    const found = sites.find((s) => s.id === activeSiteId);
    return found || sites[0] || {
      id: "fallback",
      name: "Mi Campus Virtual",
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
    } catch {}
  }, [sites, activeSite]);

  // Fuente del iframe a través del conector proxy transparente
  const iframeSrc = useMemo(() => {
    const validUrl = activeSite?.url && activeSite.url.startsWith("http")
      ? activeSite.url
      : "https://campusvirtual.frm.utn.edu.ar";
    return `/api/campus-proxy?url=${encodeURIComponent(validUrl)}`;
  }, [activeSite?.url]);

  useEffect(() => {
    if (activeSite?.url) {
      setIsLoadingIframe(true);
      const timer = setTimeout(() => {
        setIsLoadingIframe(false);
      }, 3500);
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
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Abre el sitio en ventana independiente tipo app
  const openAsAppWindow = () => {
    if (!activeSite?.url) return;
    const width = 1240;
    const height = 820;
    const left = Math.max(0, Math.floor(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.floor(window.screenY + (window.outerHeight - height) / 2));
    
    window.open(
      activeSite.url,
      `TABECampusWindow_${activeSite.id}`,
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`
    );
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
              onClick={() => setActiveSiteId(site.id)}
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
                      // Fallback silencioso si la imagen falla
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

        {/* Acciones de control */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-auto shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={openAsAppWindow}
            className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title="Abrir como ventana independiente tipo app"
          >
            <AppWindow className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ventana app</span>
          </Button>

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

          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title="Recargar página"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>

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

      {/* Contenedor del Visor */}
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
                <a
                  href="/privacidad#visores-externos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors hidden sm:inline"
                >
                  Aviso legal
                </a>
                <a
                  href={activeSite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Abrir enlace directo <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="relative flex-1 w-full h-full min-h-[500px]">
              {/* Spinner de carga limpio */}
              {isLoadingIframe && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-[#161618]/80 backdrop-blur-xs">
                  <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-2" />
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Cargando {activeSite.name}...
                  </p>
                </div>
              )}

              {/* Iframe que renderiza el sitio */}
              <iframe
                key={`${activeSite.id}-${iframeKey}`}
                src={iframeSrc}
                title={activeSite.name}
                className="w-full h-full min-h-[550px] border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                onLoad={() => setIsLoadingIframe(false)}
              />
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
    </div>
  );
}
