import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectGroup,
  SelectItem, SelectLabel, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useSubjects } from "@/hooks/useSubjects";
import { cn } from "@/lib/utils";
import { BookOpen, CheckCircle2, Filter } from "lucide-react";
import { TabeLogo } from "@/components/ui/TabeLogo";

export interface SubjectSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneValue?: string;
  noneLabel?: React.ReactNode;
  showYearFilter?: boolean;
  subjects?: Array<{
    id: string;
    nombre: string;
    codigo?: string;
    año?: number;
    year?: number;
    status?: string;
  }>;
  className?: string;
  triggerClassName?: string;
  label?: string;
  required?: boolean;
}

export function SubjectSelect({
  value,
  onChange,
  placeholder = "Seleccionar materia...",
  allowNone = true,
  noneValue = "none",
  noneLabel,
  showYearFilter = true,
  subjects: propSubjects,
  className,
  triggerClassName,
  label,
  required = false,
}: SubjectSelectProps) {
  const { subjects: hookSubjects } = useSubjects();
  const [yearFilter, setYearFilter] = useState<string>("all");

  const defaultNoneLabel = (
    <span className="flex items-center gap-2">
      <TabeLogo size={14} className="shrink-0 object-contain" />
      <span>Sin materia específica</span>
    </span>
  );
  const resolvedNoneLabel = noneLabel !== undefined ? noneLabel : defaultNoneLabel;

  // Si nos pasan subjects por prop, los usamos; si no, usamos los de useSubjects()
  const allSubjects = useMemo(() => {
    const raw = propSubjects && propSubjects.length > 0 ? propSubjects : hookSubjects;
    return (raw || []).map((s: any) => {
      // Normalizar estructura
      const hookMatch = hookSubjects.find(h => h.id === s.id);
      return {
        id: s.id,
        nombre: s.nombre || s.name || "Sin nombre",
        codigo: s.codigo || hookMatch?.codigo || "",
        año: s.año || s.year || hookMatch?.año || 1,
        status: s.status || hookMatch?.status || "cursable",
      };
    });
  }, [propSubjects, hookSubjects]);

  // Separar en activas (cursables/regulares/pendientes) y aprobadas
  const activeSubjects = useMemo(() => {
    return allSubjects.filter(s => s.status !== "aprobada");
  }, [allSubjects]);

  const approvedSubjects = useMemo(() => {
    return allSubjects.filter(s => s.status === "aprobada");
  }, [allSubjects]);

  // Lista de años activos
  const availableYears = useMemo(() => {
    const unique = [...new Set(allSubjects.map(s => Number(s.año)).filter(y => !isNaN(y) && y > 0))].sort((a, b) => a - b);
    return unique;
  }, [allSubjects]);

  // Filtrar según el año seleccionado
  const filteredActive = useMemo(() => {
    if (yearFilter === "all") return activeSubjects;
    return activeSubjects.filter(s => String(s.año) === yearFilter);
  }, [activeSubjects, yearFilter]);

  const filteredApproved = useMemo(() => {
    if (yearFilter === "all") return approvedSubjects;
    return approvedSubjects.filter(s => String(s.año) === yearFilter);
  }, [approvedSubjects, yearFilter]);

  // Manejar el cambio interno de Radix Select
  const handleSelectChange = (val: string) => {
    if (val === "none") {
      onChange(noneValue === "none" ? "" : noneValue);
    } else {
      onChange(val);
    }
  };

  const selectedValue = !value || value === "" || value === "none" ? "none" : value;

  const currentSubject = useMemo(() => {
    if (!value || value === "none") return null;
    return allSubjects.find(s => s.id === value);
  }, [value, allSubjects]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      )}

      {/* Botones de Filtro por Año */}
      {showYearFilter && availableYears.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80 w-fit">
          <button
            type="button"
            onClick={() => setYearFilter("all")}
            className={cn(
              "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
              yearFilter === "all"
                ? "text-white dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            {yearFilter === "all" && (
              <motion.span
                layoutId="subject-select-year-pill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-white shadow-2xs"
              />
            )}
            <span className="relative z-10">Todos</span>
          </button>
          {availableYears.map((yr) => {
            const isSelected = yearFilter === String(yr);
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setYearFilter(String(yr))}
                className={cn(
                  "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                  isSelected
                    ? "text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="subject-select-year-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-white shadow-2xs"
                  />
                )}
                <span className="relative z-10">{yr}° Año</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Píldoras rápidas de materias filtradas por año con animación de salida/reacomodo */}
      {showYearFilter && allSubjects.length > 0 && (
        <motion.div layout className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto py-0.5 pr-1">
          <AnimatePresence mode="popLayout">
            {[...filteredActive, ...filteredApproved].map((s) => {
              const isSelected = selectedValue === s.id;
              return (
                <motion.button
                  layout
                  key={s.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.82, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.78, y: -6, filter: "blur(4px)", transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] } }}
                  transition={{
                    layout: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 },
                    duration: 0.2,
                  }}
                  onClick={() => handleSelectChange(isSelected && allowNone ? "none" : s.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border truncate max-w-[200px]",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  {s.codigo ? `${s.codigo} · ${s.nombre}` : s.nombre}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Select Estilizado */}
      <Select value={selectedValue} onValueChange={handleSelectChange}>
        <SelectTrigger
          className={cn(
            "w-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2.5 h-auto rounded-xl text-xs font-normal shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-left truncate text-zinc-900 dark:text-zinc-100",
            triggerClassName
          )}
        >
          {currentSubject ? (
            <span className="truncate">
              {currentSubject.nombre} {currentSubject.codigo ? `(${currentSubject.codigo})` : `[Año ${currentSubject.año}]`}
            </span>
          ) : selectedValue === "none" && allowNone ? (
            <span className="truncate flex items-center">
              {resolvedNoneLabel}
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800 shadow-lg rounded-xl max-h-72 z-[9999]">
          {allowNone && (
            <SelectItem value="none" textValue="Sin materia específica" className="font-normal text-xs cursor-pointer rounded-lg">
              {resolvedNoneLabel}
            </SelectItem>
          )}

          {filteredActive.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1.5 flex items-center gap-1.5 my-1">
                <BookOpen className="w-3 h-3 text-zinc-400" />
                Materias en Cursada / Pendientes ({filteredActive.length})
              </SelectLabel>
              {filteredActive.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="font-normal text-xs cursor-pointer rounded-lg my-0.5"
                >
                  {s.nombre} {s.codigo ? `(${s.codigo})` : `[Año ${s.año}]`}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filteredApproved.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1.5 bg-emerald-500/10 rounded flex items-center gap-1.5 my-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Materias Aprobadas ({filteredApproved.length})
              </SelectLabel>
              {filteredApproved.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="font-normal text-xs cursor-pointer rounded-lg my-0.5"
                >
                  {s.nombre} {s.codigo ? `(${s.codigo})` : `[Año ${s.año}]`}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filteredActive.length === 0 && filteredApproved.length === 0 && (
            <div className="py-4 text-center text-xs font-normal text-zinc-500 dark:text-zinc-400">
              No hay materias para este año seleccionado.
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
