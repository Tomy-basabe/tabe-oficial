import React, { useState, useMemo, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, Check, AlertCircle, Sparkles, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubjectItem {
  id: string;
  nombre: string;
  year?: number;
  año?: number;
  user_id?: string | null;
  codigo?: string;
}

export interface SubjectAssignmentPickerProps {
  value: string | null | undefined;
  onChange: (subjectId: string) => void;
  subjects: SubjectItem[];
  label?: string;
  required?: boolean;
  assignToSelf?: boolean;
  onAssignToSelfChange?: (assign: boolean) => void;
  assignToSelfLabel?: string;
  className?: string;
  allowClear?: boolean;
}

export function SubjectAssignmentPicker({
  value,
  onChange,
  subjects,
  label = "Materia vinculada",
  required = true,
  assignToSelf,
  onAssignToSelfChange,
  assignToSelfLabel = "Asignar también esta materia a mi recurso personal",
  className,
  allowClear = false,
}: SubjectAssignmentPickerProps) {
  const pickerId = useId();
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Normalizar materias
  const normalizedSubjects = useMemo(() => {
    return (subjects || []).map((s) => ({
      id: s.id,
      nombre: s.nombre,
      year: Number(s.year || s.año || 1),
      codigo: s.codigo,
      user_id: s.user_id,
    }));
  }, [subjects]);

  // Lista de años disponibles ordenados
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(normalizedSubjects.map((s) => s.year).filter((y) => !isNaN(y) && y > 0))).sort(
      (a, b) => a - b
    );
    return years.length > 0 ? years : [1, 2, 3, 4, 5];
  }, [normalizedSubjects]);

  // Materia actualmente seleccionada
  const selectedSubject = useMemo(() => {
    if (!value || value === "none") return null;
    return normalizedSubjects.find((s) => s.id === value) || null;
  }, [value, normalizedSubjects]);

  // Si hay una materia seleccionada al montar, inicializar el año si aún no se cambió
  React.useEffect(() => {
    if (selectedSubject && selectedYear === "all") {
      // opcional: podemos mantener 'all' o enfocarnos en su año
    }
  }, [selectedSubject]);

  // Filtrar materias por año y texto de búsqueda
  const filteredSubjects = useMemo(() => {
    let list = normalizedSubjects;
    if (selectedYear !== "all") {
      list = list.filter((s) => s.year === selectedYear);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => s.nombre.toLowerCase().includes(q) || (s.codigo && s.codigo.toLowerCase().includes(q)));
    }
    return list;
  }, [normalizedSubjects, selectedYear, searchQuery]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3.5 space-y-3 transition-all",
        className
      )}
    >
      {/* Header con badge Apple/Notion */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {selectedSubject ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3 stroke-[2.5]" />
            {selectedSubject.year}° Año
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3 h-3" />
            Requerida
          </span>
        )}
      </div>

      {/* Segmented Control de Años estilo iOS/Apple */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100/90 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setSelectedYear("all"); }}
          className={cn(
            "relative px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap select-none",
            selectedYear === "all"
              ? "text-zinc-900 dark:text-zinc-100 font-semibold"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          )}
        >
          {selectedYear === "all" && (
            <motion.div
              layoutId={`activeYearPill-${pickerId}`}
              className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-xs border border-zinc-200/50 dark:border-zinc-700/50 -z-0"
              transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            />
          )}
          <span className="relative z-10">Todos</span>
        </button>

        {availableYears.map((yr) => {
          const isActive = selectedYear === yr;
          return (
            <button
              key={yr}
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedYear(yr); }}
              className={cn(
                "relative px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap select-none",
                isActive
                  ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`activeYearPill-${pickerId}`}
                  className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-xs border border-zinc-200/50 dark:border-zinc-700/50 -z-0"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                />
              )}
              <span className="relative z-10">{yr}° Año</span>
            </button>
          );
        })}
      </div>

      {/* Buscador minimalista integrado */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar materia por nombre..."
          className="w-full h-8 pl-8 pr-3 text-xs bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-1 py-0.5 rounded cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Chips de Selección Rápida con animaciones FLIP */}
      <div className="space-y-1.5">
        <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          <AnimatePresence mode="popLayout">
            {filteredSubjects.map((sub) => {
              const isSelected = selectedSubject?.id === sub.id;
              return (
                <motion.button
                  key={sub.id}
                  layout
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected && allowClear) {
                      onChange("");
                    } else {
                      onChange(sub.id);
                    }
                  }}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 select-none text-left",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-white font-medium shadow-xs scale-[1.01]"
                      : "bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <span className="truncate max-w-[220px]">{sub.nombre}</span>
                  {selectedYear === "all" && (
                    <span
                      className={cn(
                        "text-[9px] px-1 py-0.2 rounded font-mono",
                        isSelected
                          ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      )}
                    >
                      {sub.year}°
                    </span>
                  )}
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5] shrink-0" />}
                </motion.button>
              );
            })}
          </AnimatePresence>

          {filteredSubjects.length === 0 && (
            <div className="w-full py-4 text-center text-xs text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No se encontraron materias para este filtro.
            </div>
          )}
        </div>
      </div>

      {/* Resumen de selección actual */}
      {selectedSubject && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {selectedSubject.nombre}
              </p>
              <p className="text-[10px] text-zinc-400">
                {selectedSubject.year}° Año • Plan de estudios
              </p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
            Seleccionada
          </span>
        </div>
      )}

      {/* Sincronización con recurso personal */}
      {onAssignToSelfChange && (
        <label onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!assignToSelf}
            onChange={(e) => onAssignToSelfChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/30"
          />
          <span className="text-[11px] leading-tight">{assignToSelfLabel}</span>
        </label>
      )}
    </div>
  );
}
