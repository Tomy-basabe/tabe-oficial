import { useState, useMemo, useEffect } from "react";
import {
  Select, SelectContent, SelectGroup,
  SelectItem, SelectLabel, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useSubjects } from "@/hooks/useSubjects";
import { cn } from "@/lib/utils";
import { BookOpen, CheckCircle2, Filter } from "lucide-react";

export interface SubjectSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneValue?: string;
  noneLabel?: string;
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
  noneLabel = "⚪ Sin materia específica",
  showYearFilter = true,
  subjects: propSubjects,
  className,
  triggerClassName,
  label,
  required = false,
}: SubjectSelectProps) {
  const { subjects: hookSubjects } = useSubjects();
  const [yearFilter, setYearFilter] = useState<string>("all");

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

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      )}

      {/* Botones de Filtro por Año */}
      {showYearFilter && availableYears.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pb-0.5">
          <button
            type="button"
            onClick={() => setYearFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border-2 transition-all",
              yearFilter === "all"
                ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                : "bg-muted text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            )}
          >
            Todos
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setYearFilter(String(yr))}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                yearFilter === String(yr)
                  ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  : "bg-muted text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {yr}° Año
            </button>
          ))}
        </div>
      )}

      {/* Select Estilizado */}
      <Select value={selectedValue} onValueChange={handleSelectChange}>
        <SelectTrigger
          className={cn(
            "w-full bg-background border-[3px] border-foreground p-3 h-auto rounded-xl text-sm font-bold shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-y-[1px] transition-all focus:ring-0 focus:outline-none text-left truncate text-foreground",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-[3px] border-foreground shadow-[6px_6px_0_0_#000] rounded-xl max-h-72 z-[9999]">
          {allowNone && (
            <SelectItem value="none" className="font-bold cursor-pointer rounded-lg">
              {noneLabel}
            </SelectItem>
          )}

          {filteredActive.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[11px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-wider bg-muted/40 rounded flex items-center gap-1.5 my-1">
                <BookOpen className="w-3 h-3 text-cyan-500" />
                Materias en Cursada / Pendientes ({filteredActive.length})
              </SelectLabel>
              {filteredActive.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="font-bold cursor-pointer rounded-lg my-0.5 focus:bg-cyan-500/20"
                >
                  {s.nombre} {s.codigo ? `(${s.codigo})` : `[Año ${s.año}]`}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filteredApproved.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 px-2 py-1.5 tracking-wider bg-emerald-500/10 rounded flex items-center gap-1.5 my-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Materias Aprobadas ({filteredApproved.length})
              </SelectLabel>
              {filteredApproved.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  className="font-bold cursor-pointer rounded-lg my-0.5 focus:bg-emerald-500/20"
                >
                  {s.nombre} {s.codigo ? `(${s.codigo})` : `[Año ${s.año}]`}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filteredActive.length === 0 && filteredApproved.length === 0 && (
            <div className="py-4 text-center text-xs font-bold text-muted-foreground">
              No hay materias para este año seleccionado.
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
