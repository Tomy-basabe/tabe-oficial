import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Compass, ArrowRight, Building2, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { cn } from "@/lib/utils";

interface UniversityItem {
  id: string;
  name: string;
  fullName: string;
  prov: string;
  region: "caba_ba" | "utn" | "cordoba" | "santafe" | "cuyo" | "norte" | "patagonia" | "privadas";
  type: "Pública Nacional" | "Pública Provincial" | "Privada";
}

const UNIVERSITIES_DIRECTORY: UniversityItem[] = [
  { id: "UBA", name: "UBA", fullName: "Universidad de Buenos Aires", prov: "CABA / Buenos Aires", region: "caba_ba", type: "Pública Nacional" },
  { id: "UTN", name: "UTN", fullName: "Universidad Tecnológica Nacional", prov: "30 Facultades Regionales en todo el país", region: "utn", type: "Pública Nacional" },
  { id: "UNC", name: "UNC", fullName: "Universidad Nacional de Córdoba", prov: "Córdoba", region: "cordoba", type: "Pública Nacional" },
  { id: "UNLP", name: "UNLP", fullName: "Universidad Nacional de La Plata", prov: "La Plata, Buenos Aires", region: "caba_ba", type: "Pública Nacional" },
  { id: "UNR", name: "UNR", fullName: "Universidad Nacional de Rosario", prov: "Rosario, Santa Fe", region: "santafe", type: "Pública Nacional" },
  { id: "UNCUYO", name: "UNCUYO", fullName: "Universidad Nacional de Cuyo", prov: "Mendoza / San Juan", region: "cuyo", type: "Pública Nacional" },
  { id: "UNT", name: "UNT", fullName: "Universidad Nacional de Tucumán", prov: "San Miguel de Tucumán", region: "norte", type: "Pública Nacional" },
  { id: "UNL", name: "UNL", fullName: "Universidad Nacional del Litoral", prov: "Santa Fe / Entre Ríos", region: "santafe", type: "Pública Nacional" },
  { id: "UNMDP", name: "UNMDP", fullName: "Universidad Nacional de Mar del Plata", prov: "Mar del Plata, Buenos Aires", region: "caba_ba", type: "Pública Nacional" },
  { id: "UNNE", name: "UNNE", fullName: "Universidad Nacional del Nordeste", prov: "Chaco / Corrientes", region: "norte", type: "Pública Nacional" },
  { id: "UNS", name: "UNS", fullName: "Universidad Nacional del Sur", prov: "Bahía Blanca, Buenos Aires", region: "caba_ba", type: "Pública Nacional" },
  { id: "UNER", name: "UNER", fullName: "Universidad Nacional de Entre Ríos", prov: "Paraná / Entre Ríos", region: "santafe", type: "Pública Nacional" },
  { id: "UNSa", name: "UNSa", fullName: "Universidad Nacional de Salta", prov: "Salta", region: "norte", type: "Pública Nacional" },
  { id: "UNJu", name: "UNJu", fullName: "Universidad Nacional de Jujuy", prov: "San Salvador de Jujuy", region: "norte", type: "Pública Nacional" },
  { id: "UNComa", name: "UNComa", fullName: "Universidad Nacional del Comahue", prov: "Neuquén / Río Negro", region: "patagonia", type: "Pública Nacional" },
  { id: "UNPSJB", name: "UNPSJB", fullName: "Universidad Nacional de la Patagonia", prov: "Chubut / Santa Cruz", region: "patagonia", type: "Pública Nacional" },
  { id: "UNLaM", name: "UNLaM", fullName: "Universidad Nacional de La Matanza", prov: "San Justo, Buenos Aires", region: "caba_ba", type: "Pública Nacional" },
  { id: "UNSAM", name: "UNSAM", fullName: "Universidad Nacional de San Martín", prov: "San Martín, Buenos Aires", region: "caba_ba", type: "Pública Nacional" },
  { id: "ITBA", name: "ITBA", fullName: "Instituto Tecnológico de Buenos Aires", prov: "CABA", region: "privadas", type: "Privada" },
  { id: "UCA", name: "UCA", fullName: "Pontificia Universidad Católica Argentina", prov: "CABA / Rosario / Mendoza / Paraná", region: "privadas", type: "Privada" },
  { id: "UADE", name: "UADE", fullName: "Universidad Argentina de la Empresa", prov: "CABA / Costa Atlántica", region: "privadas", type: "Privada" },
  { id: "AUSTRAL", name: "AUSTRAL", fullName: "Universidad Austral", prov: "Pilar / CABA / Rosario", region: "privadas", type: "Privada" },
];

const REGION_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "utn", label: "UTN (30 Regionales)" },
  { id: "caba_ba", label: "CABA y Bs. As." },
  { id: "cordoba", label: "Córdoba" },
  { id: "santafe", label: "Santa Fe / Litoral" },
  { id: "cuyo", label: "Cuyo" },
  { id: "norte", label: "Norte" },
  { id: "patagonia", label: "Patagonia" },
  { id: "privadas", label: "Privadas" },
] as const;

export function ArgentinaCoverageSection() {
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const clean = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filteredUniversities = useMemo(() => {
    return UNIVERSITIES_DIRECTORY.filter((u) => {
      if (selectedRegion !== "all" && u.region !== selectedRegion) {
        return false;
      }
      if (search.trim()) {
        const q = clean(search);
        const nameMatch = clean(u.name).includes(q);
        const fullMatch = clean(u.fullName).includes(q);
        const provMatch = clean(u.prov).includes(q);
        return nameMatch || fullMatch || provMatch;
      }
      return true;
    });
  }, [search, selectedRegion]);

  return (
    <section id="cobertura-federal" className="py-20 md:py-28 relative overflow-hidden bg-zinc-50/60 dark:bg-zinc-950/40 border-y border-zinc-200/80 dark:border-zinc-800/80">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-6xl">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-200 text-xs font-medium shadow-2xs backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Red Universitaria Federal</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500 dark:text-zinc-400">24 Provincias</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.12]"
          >
            Más de 1.100 facultades y carreras <br className="hidden sm:inline" />
            en toda la Argentina.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed"
          >
            Estudies donde estudies, TABE ya cuenta con tu universidad cargada: planes de estudio,
            árbol de correlatividades, apuntes comunitarios y cálculo de egreso para todo el país.
          </motion.p>
        </div>

        {/* Bento Metrics Bar (Clean, High-Craft Linear Style) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-xs mb-10 overflow-hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200/70 dark:divide-zinc-800/80">
            <div className="p-5 sm:p-6 text-left">
              <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                +1.100
              </span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                Sedes y Facultades
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                UBA, UTN, UNC y privadas
              </p>
            </div>

            <div className="p-5 sm:p-6 text-left">
              <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                24 / 24
              </span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                Provincias Cubiertas
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                De Jujuy a Tierra del Fuego
              </p>
            </div>

            <div className="p-5 sm:p-6 text-left">
              <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                +500
              </span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                Carreras y Planes
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Con árbol de correlativas
              </p>
            </div>

            <div className="p-5 sm:p-6 text-left">
              <span className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
                100% Libre
              </span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                Acceso Gratuito
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Para la comunidad universitaria
              </p>
            </div>
          </div>
        </motion.div>

        {/* Interactive Faculty Directory & Live Search */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md p-5 sm:p-8 shadow-sm space-y-6">
          
          {/* Search Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Directorio Federal de Instituciones
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Explorá sedes, programas académicos y correlatividades cargadas por la comunidad.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscá facultad, sigla o provincia..."
                className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/70 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Region Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {REGION_FILTERS.map((r) => {
              const active = selectedRegion === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRegion(r.id)}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0",
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                      : "bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60"
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* University Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredUniversities.map((uni) => (
                <motion.div
                  key={uni.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to={`/carreras?q=${encodeURIComponent(uni.name)}`}
                    className="h-full p-4 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <UniversityLogo universityId={uni.id} className="w-5 h-5 rounded-xs" />
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-800/60">
                          {uni.type}
                        </span>
                      </div>

                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                        {uni.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                        {uni.fullName}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1 truncate max-w-[170px]">
                        <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
                        <span className="truncate">{uni.prov}</span>
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-zinc-800 dark:text-zinc-200 font-medium group-hover:translate-x-0.5 transition-transform">
                        <span>Ver plan</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredUniversities.length === 0 && (
            <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p className="font-medium">No se encontraron instituciones para &ldquo;{search}&rdquo;</p>
              <p className="text-[11px] text-zinc-400 mt-1">Podés explorar el mapa interactivo general o dar de alta tu facultad.</p>
            </div>
          )}

          {/* Bottom Callout & Directory Link */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 hidden sm:inline" />
              <span>¿No encontrás tu carrera o sede? Podés sumarla en 1 clic y cargar tu plan con correlativas.</span>
            </div>

            <Link
              to="/carreras"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white text-xs font-semibold transition-all shadow-2xs shrink-0 group w-full sm:w-auto"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explorar Mapa Interactivo (+1.100)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
