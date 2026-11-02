import React from "react";
import { motion } from "framer-motion";
import { Building2, Compass, ArrowRight, MapPin, CheckCircle2, GraduationCap, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { UniversityLogo } from "@/components/icons/UniversityLogos";

const HIGHLIGHTED_UNIVERSITIES = [
  { id: "UBA", name: "UBA", fullName: "Universidad de Buenos Aires", prov: "Buenos Aires / CABA" },
  { id: "UTN", name: "UTN", fullName: "Universidad Tecnológica Nacional", prov: "30 Facultades Regionales" },
  { id: "UNC", name: "UNC", fullName: "Universidad Nacional de Córdoba", prov: "Córdoba" },
  { id: "UNLP", name: "UNLP", fullName: "Universidad Nacional de La Plata", prov: "Buenos Aires" },
  { id: "UNR", name: "UNR", fullName: "Universidad Nacional de Rosario", prov: "Santa Fe" },
  { id: "UNCUYO", name: "UNCUYO", fullName: "Universidad Nacional de Cuyo", prov: "Mendoza" },
  { id: "UNT", name: "UNT", fullName: "Universidad Nacional de Tucumán", prov: "Tucumán" },
  { id: "UNMDP", name: "UNMDP", fullName: "Universidad Nacional de Mar del Plata", prov: "Buenos Aires" },
  { id: "UNL", name: "UNL", fullName: "Universidad Nacional del Litoral", prov: "Santa Fe / E. Ríos" },
  { id: "UNNE", name: "UNNE", fullName: "Universidad Nacional del Nordeste", prov: "Chaco / Corrientes" },
  { id: "UNS", name: "UNS", fullName: "Universidad Nacional del Sur", prov: "Bahía Blanca" },
  { id: "ITBA", name: "ITBA", fullName: "Instituto Tecnológico de Buenos Aires", prov: "CABA" },
];

export function ArgentinaCoverageSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40 border-y border-zinc-200/60 dark:border-zinc-800/60">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        {/* Header con Badge de Novedad Federal */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-300/60 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold shadow-2xs backdrop-blur-sm"
          >
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500 text-white shadow-2xs">
              Novedad
            </span>
            <span className="flex items-center gap-1.5">
              <span>🇦🇷</span>
              <span>Cobertura Federal Universitaria</span>
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            Contamos con más de{" "}
            <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-400 dark:to-sky-300 bg-clip-text text-transparent">
              1.100 facultades
            </span>{" "}
            de toda la Argentina
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal"
          >
            Estudies donde estudies, TABE ya tiene tu espacio listo. Universidades públicas, nacionales y privadas
            registradas en las 24 provincias del país con correlatividades, apuntes y planes de estudio verificados.
          </motion.p>
        </div>

        {/* 4 Bento Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-5xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                +1.100
              </p>
              <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
                Facultades y Sedes
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Registradas en todo el país
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                24 / 24
              </p>
              <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
                Provincias y CABA
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Alcance 100% federal
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Públicas & Priv.
              </p>
              <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
                Todas las Instituciones
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Planes y carreras cargadas
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                100% Gratis
              </p>
              <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
                Acceso Abierto
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Para cualquier estudiante
              </p>
            </div>
          </motion.div>
        </div>

        {/* Muestra de Facultades destacadas en Argentina */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Instituciones destacadas en TABE</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Explorá las universidades más populares o buscá la tuya entre las más de 1.100 sedes
              </p>
            </div>

            <Link
              to="/carreras"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white text-xs font-semibold transition-all shadow-2xs shrink-0 group"
            >
              <Compass className="w-3.5 h-3.5" />
              Ver Mapa Interactivo
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Grid de universidades */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-6">
            {HIGHLIGHTED_UNIVERSITIES.map((uni) => (
              <Link
                key={uni.id}
                to={`/carreras?q=${encodeURIComponent(uni.name)}`}
                className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <UniversityLogo universityId={uni.id} className="w-5 h-5 rounded-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors truncate">
                    {uni.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {uni.fullName}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                    {uni.prov}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom badge callout */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>¿No encontrás tu facultad? Podés darla de alta en 1 clic y cargar tu propio plan de estudios.</span>
            </span>
            <Link
              to="/carreras"
              className="text-primary hover:underline font-medium text-xs flex items-center gap-1"
            >
              Explorar el directorio completo (+1.100) &rarr;
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
