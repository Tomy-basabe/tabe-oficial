import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ZoomIn,
  ZoomOut,
  Compass,
  Search,
  MapPin,
  Building2,
  GraduationCap,
  Sparkles,
  Layers,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { FACULTIES_GEO_DATA, PROVINCE_GEO_CENTERS, ProvinceGeoCenter } from "@/data/facultyGeoData";
import { getUniversityLogoUrl, createSquareFallbackLogo } from "@/data/universityLogos";
import { cn } from "@/lib/utils";

export interface MapUniversity {
  id: string;
  name: string;
  shortName: string;
  facultyInfo: string;
  location: string;
  provinciaId: string;
  provinciaName: string;
  careersCount: number;
  hasMatches?: boolean;
}

interface ArgentinaInteractiveMapProps {
  universities: MapUniversity[];
  selectedProvince: string;
  onSelectProvince: (provId: string) => void;
  selectedUniversityId: string | null;
  onSelectUniversity: (uni: MapUniversity) => void;
  searchQuery?: string;
}

const CARTO_API_KEY = "cb1_4wig_1_e77d8f3354c45d5cd1d6fd99";

const TILE_LAYERS = {
  voyager: {
    name: "Callejero (Google / Carto)",
    url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    name: "Modo Oscuro",
    url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  osm: {
    name: "OpenStreetMap Estándar",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// Lista de provincias destacadas para chips rápidos
const POPULAR_PROVINCES = [
  { id: "ALL", name: "Toda Argentina" },
  { id: "MENDOZA", name: "Mendoza" },
  { id: "CORDOBA", name: "Córdoba" },
  { id: "CABA", name: "CABA" },
  { id: "BUENOS_AIRES", name: "Bs. As." },
  { id: "SANTA_FE", name: "Santa Fe" },
  { id: "SAN_JUAN", name: "San Juan" },
  { id: "SAN_LUIS", name: "San Luis" },
  { id: "TUCUMAN", name: "Tucumán" },
  { id: "SALTA", name: "Salta" },
  { id: "ENTRE_RIOS", name: "Entre Ríos" },
  { id: "MISIONES", name: "Misiones" },
  { id: "NEUQUEN", name: "Neuquén" },
];

export function ArgentinaInteractiveMap({
  universities,
  selectedProvince,
  onSelectProvince,
  selectedUniversityId,
  onSelectUniversity,
  searchQuery = "",
}: ArgentinaInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapTheme, setMapTheme] = useState<"voyager" | "dark">("voyager");
  const [internalSearch, setInternalSearch] = useState<string>("");
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(4);

  // Detectar si el documento está en dark mode al montar
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      setMapTheme("dark");
    }
  }, []);

  // Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = PROVINCE_GEO_CENTERS[selectedProvince] || PROVINCE_GEO_CENTERS.ALL;

    const map = L.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialCenter.zoom,
      zoomControl: false, // Usamos controles custom con estilo Apple/Notion
      minZoom: 3.5,
      maxZoom: 18,
      maxBounds: [
        [-58.0, -80.0],
        [-20.0, -50.0],
      ],
      attributionControl: false,
    });

    const activeTileConfig = TILE_LAYERS[mapTheme];
    const tileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Capa de marcadores
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    map.on("zoomend", () => {
      setCurrentZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Forzar render de tiles al cabo de un instante
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cambiar capa de tiles al alternar mapa claro/oscuro
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const activeTileConfig = TILE_LAYERS[mapTheme];
    tileLayerRef.current.setUrl(activeTileConfig.url);
  }, [mapTheme]);

  // Sincronizar zoom/vuelo al cambiar de provincia
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetCenter = PROVINCE_GEO_CENTERS[selectedProvince] || PROVINCE_GEO_CENTERS.ALL;
    map.flyTo([targetCenter.lat, targetCenter.lng], targetCenter.zoom, {
      duration: 1.4,
      easeLinearity: 0.25,
    });
  }, [selectedProvince]);

  // Renderizar los marcadores de universidades
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Map para lookup rápido de universidades pasadas por props
    const uniPropsMap = new Map<string, MapUniversity>();
    for (const u of universities) {
      uniPropsMap.set(u.id, u);
    }

    // Filtrar universidades según provincia seleccionada (si no es ALL)
    const displayedGeoItems = Object.values(FACULTIES_GEO_DATA).filter((geo) => {
      if (selectedProvince !== "ALL" && geo.provinciaId !== selectedProvince) return false;
      const propUni = uniPropsMap.get(geo.id);
      return propUni && propUni.careersCount > 0;
    });

    displayedGeoItems.forEach((geo) => {
      const propUni = uniPropsMap.get(geo.id)!;
      const isSelected = selectedUniversityId === geo.id;
      const hasSearchMatch = propUni.hasMatches;
      const logoUrl = getUniversityLogoUrl(geo.id);
      const fallbackDataUri = createSquareFallbackLogo(geo.label, geo.id);

      // Crear Icono DivIcon de Leaflet con caja cuadrada fija y overflow hidden estricto
      const markerHtml = `
        <div class="custom-fac-pin group relative cursor-pointer ${isSelected ? "is-selected" : ""}" data-uni-id="${geo.id}">
          <div class="fac-pin-box ${
            isSelected
              ? "border-blue-600 ring-4 ring-blue-500/30 scale-110 shadow-xl"
              : hasSearchMatch
              ? "border-blue-500 ring-2 ring-blue-400/40 shadow-lg"
              : "border-zinc-200 dark:border-zinc-700 shadow-md hover:border-blue-500 hover:scale-110 hover:shadow-xl"
          }">
            <span class="fac-pin-fallback-label">${geo.label.slice(0, 4)}</span>
            <img
              src="${logoUrl}"
              alt=""
              referrerpolicy="no-referrer"
              loading="lazy"
              class="fac-pin-img"
              onerror="this.style.display='none';"
            />
          </div>
          <div class="absolute -bottom-1 -right-1.5 px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[9px] shadow-xs leading-none">
            ${propUni.careersCount}
          </div>
          <div class="pin-triangle absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-5 border-t-zinc-300 dark:border-t-zinc-700"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "leaflet-plain-marker",
        html: markerHtml,
        iconSize: [42, 42],
        iconAnchor: [21, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([geo.lat, geo.lng], {
        icon: customIcon,
        title: `${geo.fullLabel} (${geo.city})`,
      });

      // Contenido del Popup al hacer click
      const popupContent = document.createElement("div");
      popupContent.className = "faculty-map-popup p-4 space-y-3 min-w-[260px] max-w-[320px] text-zinc-900 dark:text-zinc-100";
      popupContent.innerHTML = `
        <div class="flex items-start gap-3 pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800">
          <div class="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 p-1.5 border border-zinc-200/80 dark:border-zinc-700 shadow-xs shrink-0 flex items-center justify-center overflow-hidden relative">
            <span class="text-xs font-black text-blue-600 dark:text-blue-400 uppercase select-none">${geo.label.slice(0, 4)}</span>
            <img
              src="${logoUrl}"
              alt=""
              referrerpolicy="no-referrer"
              class="absolute inset-0 w-full h-full object-contain p-1.5 bg-white dark:bg-zinc-800"
              onerror="this.style.display='none';"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 truncate" title="${geo.fullLabel}">
              ${geo.fullLabel}
            </h4>
            <p class="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
              ${geo.label}
            </p>
          </div>
        </div>

        <div class="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span class="truncate">${geo.address ? `${geo.address}, ` : ""}${geo.city}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            <span class="font-medium text-emerald-600 dark:text-emerald-400">${propUni.careersCount} ${propUni.careersCount === 1 ? "carrera oficial" : "carreras oficiales"}</span>
          </div>
        </div>

        <button id="btn-explore-${geo.id}" class="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer">
          <span>Ver Carreras y Plan de Estudio</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      `;

      // Evento al abrir el popup para enlazar el click del botón a React
      marker.bindPopup(popupContent, {
        closeButton: false,
        className: "modern-leaflet-popup",
        maxWidth: 320,
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-explore-${geo.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            onSelectUniversity(propUni);
          };
        }
      });

      marker.on("click", () => {
        // Zoom suave hacia la facultad estilo Google Maps
        map.flyTo([geo.lat, geo.lng], Math.max(map.getZoom(), 14), {
          duration: 1.0,
          easeLinearity: 0.2,
        });
      });

      markersGroup.addLayer(marker);
    });
  }, [universities, selectedProvince, selectedUniversityId, onSelectUniversity]);

  // Controles de zoom manual
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetCountry = () => {
    onSelectProvince("ALL");
  };

  // Filtrado para el buscador rápido dentro del mapa
  const searchResults = useMemo(() => {
    if (!internalSearch.trim()) return [];
    const q = internalSearch.toLowerCase().trim();
    return universities
      .filter((u) => {
        const geo = FACULTIES_GEO_DATA[u.id];
        return (
          u.name.toLowerCase().includes(q) ||
          u.shortName.toLowerCase().includes(q) ||
          u.facultyInfo.toLowerCase().includes(q) ||
          u.provinciaName.toLowerCase().includes(q) ||
          (geo && geo.city.toLowerCase().includes(q))
        );
      })
      .slice(0, 6);
  }, [internalSearch, universities]);

  const handleSelectSearchResult = (uni: MapUniversity) => {
    const geo = FACULTIES_GEO_DATA[uni.id];
    if (geo && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([geo.lat, geo.lng], 15, {
        duration: 1.2,
      });
    }
    setInternalSearch("");
    setShowSearchDropdown(false);
    onSelectUniversity(uni);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-950 shadow-2xl">
      {/* Contenedor del Mapa Leaflet */}
      <div
        ref={mapContainerRef}
        className="w-full h-[580px] sm:h-[640px] md:h-[720px] z-0 focus:outline-none"
        style={{ background: mapTheme === "dark" ? "#090d16" : "#eef2f6" }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BARRA SUPERIOR: Chips Rápidos de Provincias (Estilo Notion/Apple) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pointer-events-none">
        {/* Buscador Integrado con Autocompletado */}
        <div className="relative pointer-events-auto w-full sm:w-80 shadow-lg">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Ir a facultad o ciudad..."
              value={internalSearch}
              onChange={(e) => {
                setInternalSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="bg-transparent border-none outline-none text-xs flex-1 placeholder:text-zinc-400"
            />
            {internalSearch && (
              <button
                onClick={() => setInternalSearch("")}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800"
              >
                ✕
              </button>
            )}
          </div>

          {/* Menú flotante de resultados del buscador */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden py-1 z-50">
              {searchResults.map((item) => {
                const geo = FACULTIES_GEO_DATA[item.id];
                const itemLogo = getUniversityLogoUrl(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full px-3.5 py-2 text-left flex items-center justify-between gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 overflow-hidden relative flex items-center justify-center">
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 select-none">
                          {item.shortName.slice(0, 3)}
                        </span>
                        <img
                          src={itemLogo}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-contain p-0.5 bg-zinc-50 dark:bg-zinc-800"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {geo?.city || item.location} · {item.provinciaName}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shrink-0">
                      {item.careersCount} carr.
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chips de Provincias Populares */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1 max-w-full">
          {POPULAR_PROVINCES.map((prov) => {
            const isActive = selectedProvince === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => onSelectProvince(prov.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-md cursor-pointer",
                  isActive
                    ? "bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400/50"
                    : "bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80"
                )}
              >
                {prov.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONTROLES FLOTANTES LATERALES (Estilo Apple / Google Maps) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2">
        {/* Alternar Tema de Mapa (Voyager / Oscuro) */}
        <button
          onClick={() => setMapTheme(mapTheme === "voyager" ? "dark" : "voyager")}
          title={mapTheme === "voyager" ? "Cambiar a modo mapa oscuro" : "Cambiar a modo mapa claro"}
          className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          {mapTheme === "voyager" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Centrar Argentina */}
        <button
          onClick={handleResetCountry}
          title="Ver Toda Argentina"
          className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Acercar mapa"
          className="w-10 h-10 rounded-t-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Alejar mapa"
          className="w-10 h-10 rounded-b-2xl -mt-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BADGE INFERIOR: Total de Instituciones y Zoom Actual */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 left-4 z-[400] flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 shadow-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {selectedProvince === "ALL"
              ? "140 sedes universitarias geolocalizadas"
              : `${universities.filter((u) => u.provinciaId === selectedProvince).length} facultades en ${
                  PROVINCE_GEO_CENTERS[selectedProvince]?.name || selectedProvince
                }`}
          </span>
        </div>
      </div>

      {/* Inyección de estilos CSS para los pines y popups de Leaflet */}
      <style>{`
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-plain-marker {
          background: transparent;
          border: none;
        }
        .custom-fac-pin {
          width: 42px !important;
          height: 42px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
        }
        .custom-fac-pin .fac-pin-box {
          width: 40px !important;
          height: 40px !important;
          max-width: 40px !important;
          max-height: 40px !important;
          border-radius: 14px !important;
          overflow: hidden !important;
          background: #ffffff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 3px !important;
          box-sizing: border-box !important;
          border-width: 2px !important;
          border-style: solid !important;
          position: relative !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .dark .custom-fac-pin .fac-pin-box {
          background: #18181b !important;
        }
        .custom-fac-pin .fac-pin-box .fac-pin-fallback-label {
          position: absolute !important;
          inset: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: -0.5px !important;
          color: #2563eb !important;
          text-transform: uppercase !important;
          pointer-events: none !important;
          user-select: none !important;
        }
        .dark .custom-fac-pin .fac-pin-box .fac-pin-fallback-label {
          color: #60a5fa !important;
        }
        .custom-fac-pin .fac-pin-box img.fac-pin-img {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          object-fit: contain !important;
          object-position: center !important;
          display: block !important;
          pointer-events: none !important;
          background: #ffffff !important;
          padding: 3px !important;
          box-sizing: border-box !important;
          border-radius: 12px !important;
        }
        .dark .custom-fac-pin .fac-pin-box img.fac-pin-img {
          background: #18181b !important;
        }
        .modern-leaflet-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 1.25rem;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(228, 228, 231, 0.8);
          overflow: hidden;
        }
        .dark .modern-leaflet-popup .leaflet-popup-content-wrapper {
          background: rgba(24, 24, 27, 0.98);
          border-color: rgba(63, 63, 70, 0.8);
        }
        .modern-leaflet-popup .leaflet-popup-content {
          margin: 0;
          line-height: normal;
        }
        .modern-leaflet-popup .leaflet-popup-tip-container {
          display: none;
        }
        .custom-fac-pin:hover .pin-triangle {
          border-top-color: #2563eb;
        }
        .custom-fac-pin.is-selected .pin-triangle {
          border-top-color: #2563eb;
        }
      `}</style>
    </div>
  );
}
