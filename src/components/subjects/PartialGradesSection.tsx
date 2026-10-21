import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus, Trash2, Award, Calendar, BookOpen, GraduationCap, Check } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { PartialGrades } from "@/hooks/useSubjects";

interface PartialGradesSectionProps {
  grades: PartialGrades;
  onUpdate: (grades: PartialGrades) => Promise<void> | void;
  disabled?: boolean;
}

interface GradeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  numericValue: number | null;
  placeholder?: string;
}

function GradeInput({ label, value, onChange, onBlur, disabled, numericValue, placeholder = "--" }: GradeInputProps) {
  // Support both 1-10 scale (passing >= 4) and 0-100 scale (passing >= 60)
  const isPassing = numericValue !== null && (numericValue > 10 ? numericValue >= 60 : numericValue >= 4);
  const isFailing = numericValue !== null && (numericValue > 10 ? numericValue < 60 : numericValue < 4);

  return (
    <label className={cn(
      "flex items-center justify-between py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer",
      isPassing && "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 text-zinc-900 dark:text-zinc-100",
      isFailing && "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30 text-zinc-900 dark:text-zinc-100",
      !isPassing && !isFailing && "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200"
    )}>
      <span className="text-xs font-medium truncate mr-1.5 select-none text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          min="0"
          max="100"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-14 px-1.5 py-1 text-center text-xs font-medium rounded-md border bg-white dark:bg-zinc-900 shadow-2xs cursor-text transition-colors",
            "focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600",
            isPassing && "text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-500/40",
            isFailing && "text-rose-600 dark:text-rose-400 border-rose-400 dark:border-rose-500/40",
            !isPassing && !isFailing && "text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800"
          )}
        />
        {isPassing && (
          <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] select-none font-bold">
            ✓
          </span>
        )}
        {isFailing && (
          <span className="w-4 h-4 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] select-none font-bold">
            ✗
          </span>
        )}
      </div>
    </label>
  );
}

// Helper to parse input string to float or null
function parseGradeInput(val: string): number | null {
  const trimmed = val.trim().replace(",", ".");
  if (trimmed === "") return null;
  const num = parseFloat(trimmed);
  if (!Number.isFinite(num) || num < 0 || num > 100) return null;
  return num;
}

function buildGradesPayload(
  inputsObj: {
    nota_parcial_1: string;
    nota_rec_parcial_1: string;
    nota_parcial_2: string;
    nota_rec_parcial_2: string;
    nota_global: string;
    nota_rec_global: string;
    nota_final_examen: string;
  },
  extraP: { id: string; nota: string; rec: string }[],
  extraG: { id: string; nota: string; rec: string }[],
  extraF: { id: string; nota: string; fecha?: string }[]
): PartialGrades {
  return {
    nota_parcial_1: parseGradeInput(inputsObj.nota_parcial_1),
    nota_rec_parcial_1: parseGradeInput(inputsObj.nota_rec_parcial_1),
    nota_parcial_2: parseGradeInput(inputsObj.nota_parcial_2),
    nota_rec_parcial_2: parseGradeInput(inputsObj.nota_rec_parcial_2),
    nota_global: parseGradeInput(inputsObj.nota_global),
    nota_rec_global: parseGradeInput(inputsObj.nota_rec_global),
    nota_final_examen: parseGradeInput(inputsObj.nota_final_examen),
    extra_partials: extraP.map((p) => ({
      id: p.id,
      nota: parseGradeInput(p.nota),
      rec: parseGradeInput(p.rec),
    })),
    extra_globals: extraG.map((g) => ({
      id: g.id,
      nota: parseGradeInput(g.nota),
      rec: parseGradeInput(g.rec),
    })),
    extra_finals: extraF.map((f) => ({
      id: f.id,
      nota: parseGradeInput(f.nota),
      fecha: f.fecha,
    })),
  };
}

export function PartialGradesSection({ grades, onUpdate, disabled }: PartialGradesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Inputs state initialized once per subject
  const [inputs, setInputs] = useState({
    nota_parcial_1: grades.nota_parcial_1?.toString() ?? "",
    nota_rec_parcial_1: grades.nota_rec_parcial_1?.toString() ?? "",
    nota_parcial_2: grades.nota_parcial_2?.toString() ?? "",
    nota_rec_parcial_2: grades.nota_rec_parcial_2?.toString() ?? "",
    nota_global: grades.nota_global?.toString() ?? "",
    nota_rec_global: grades.nota_rec_global?.toString() ?? "",
    nota_final_examen: grades.nota_final_examen?.toString() ?? "",
  });

  const [extraPartials, setExtraPartials] = useState<{ id: string; nota: string; rec: string }[]>(
    () => (grades.extra_partials || []).map((p) => ({
      id: p.id,
      nota: p.nota?.toString() ?? "",
      rec: p.rec?.toString() ?? "",
    }))
  );

  const [extraGlobals, setExtraGlobals] = useState<{ id: string; nota: string; rec: string }[]>(
    () => (grades.extra_globals || []).map((g) => ({
      id: g.id,
      nota: g.nota?.toString() ?? "",
      rec: g.rec?.toString() ?? "",
    }))
  );

  const [extraFinals, setExtraFinals] = useState<{ id: string; nota: string; fecha?: string }[]>(
    () => (grades.extra_finals || []).map((f) => ({
      id: f.id,
      nota: f.nota?.toString() ?? "",
      fecha: f.fecha ?? "",
    }))
  );

  // Parse numeric values for UI display & indicators
  const numericValues = useMemo(() => ({
    nota_parcial_1: parseGradeInput(inputs.nota_parcial_1),
    nota_rec_parcial_1: parseGradeInput(inputs.nota_rec_parcial_1),
    nota_parcial_2: parseGradeInput(inputs.nota_parcial_2),
    nota_rec_parcial_2: parseGradeInput(inputs.nota_rec_parcial_2),
    nota_global: parseGradeInput(inputs.nota_global),
    nota_rec_global: parseGradeInput(inputs.nota_rec_global),
    nota_final_examen: parseGradeInput(inputs.nota_final_examen),
  }), [inputs]);

  const parsedExtraPartials = useMemo(() => {
    return extraPartials.map((p) => ({
      id: p.id,
      nota: parseGradeInput(p.nota),
      rec: parseGradeInput(p.rec),
    }));
  }, [extraPartials]);

  const parsedExtraGlobals = useMemo(() => {
    return extraGlobals.map((g) => ({
      id: g.id,
      nota: parseGradeInput(g.nota),
      rec: parseGradeInput(g.rec),
    }));
  }, [extraGlobals]);

  const parsedExtraFinals = useMemo(() => {
    return extraFinals.map((f) => ({
      id: f.id,
      nota: parseGradeInput(f.nota),
      fecha: f.fecha,
    }));
  }, [extraFinals]);

  // Keep callback and latest saved JSON in refs to prevent unnecessary re-saves
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const lastSavedJsonRef = useRef<string>(
    JSON.stringify(buildGradesPayload(inputs, extraPartials, extraGlobals, extraFinals))
  );
  const saveTimeoutRef = useRef<any>(null);

  // Quiet non-blocking save
  const performSaveQuietly = useCallback((
    targetInputs: typeof inputs,
    targetPartials: typeof extraPartials,
    targetGlobals: typeof extraGlobals,
    targetFinals: typeof extraFinals
  ) => {
    if (disabled) return;
    const payload = buildGradesPayload(targetInputs, targetPartials, targetGlobals, targetFinals);
    const jsonStr = JSON.stringify(payload);
    if (jsonStr === lastSavedJsonRef.current) return;
    lastSavedJsonRef.current = jsonStr;
    try {
      onUpdateRef.current(payload);
    } catch (err) {
      console.error("Error saving partial grades:", err);
    }
  }, [disabled]);

  // Debounced auto-save
  const scheduleSave = useCallback((
    targetInputs: typeof inputs,
    targetPartials: typeof extraPartials,
    targetGlobals: typeof extraGlobals,
    targetFinals: typeof extraFinals
  ) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performSaveQuietly(targetInputs, targetPartials, targetGlobals, targetFinals);
    }, 800);
  }, [performSaveQuietly]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const triggerImmediateSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    performSaveQuietly(inputs, extraPartials, extraGlobals, extraFinals);
  }, [inputs, extraPartials, extraGlobals, extraFinals, performSaveQuietly]);

  // Input change handlers
  const updateInput = (key: keyof typeof inputs, value: string) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSave(next, extraPartials, extraGlobals, extraFinals);
      return next;
    });
  };

  const updateExtraInput = (index: number, field: "nota" | "rec", value: string) => {
    setExtraPartials((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      scheduleSave(inputs, copy, extraGlobals, extraFinals);
      return copy;
    });
  };

  const updateExtraGlobalInput = (index: number, field: "nota" | "rec", value: string) => {
    setExtraGlobals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      scheduleSave(inputs, extraPartials, copy, extraFinals);
      return copy;
    });
  };

  const updateExtraFinalInput = (index: number, field: "nota" | "fecha", value: string) => {
    setExtraFinals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      scheduleSave(inputs, extraPartials, extraGlobals, copy);
      return copy;
    });
  };

  // Adding and removing items
  const addPartial = () => {
    ComicAudio.playPop();
    const nextNumber = 3 + extraPartials.length;
    const next = [...extraPartials, { id: `P${nextNumber}`, nota: "", rec: "" }];
    setExtraPartials(next);
    performSaveQuietly(inputs, next, extraGlobals, extraFinals);
  };

  const removePartial = (index: number) => {
    ComicAudio.playPop();
    const copy = [...extraPartials];
    copy.splice(index, 1);
    const next = copy.map((p, i) => ({ ...p, id: `P${i + 3}` }));
    setExtraPartials(next);
    performSaveQuietly(inputs, next, extraGlobals, extraFinals);
  };

  const addGlobal = () => {
    ComicAudio.playPop();
    const nextNumber = 2 + extraGlobals.length;
    const next = [...extraGlobals, { id: `Global ${nextNumber}`, nota: "", rec: "" }];
    setExtraGlobals(next);
    performSaveQuietly(inputs, extraPartials, next, extraFinals);
  };

  const removeGlobal = (index: number) => {
    ComicAudio.playPop();
    const copy = [...extraGlobals];
    copy.splice(index, 1);
    const next = copy.map((g, i) => ({ ...g, id: `Global ${i + 2}` }));
    setExtraGlobals(next);
    performSaveQuietly(inputs, extraPartials, next, extraFinals);
  };

  const addFinal = () => {
    ComicAudio.playPop();
    const nextNumber = 2 + extraFinals.length;
    const next = [...extraFinals, { id: `Llamado ${nextNumber}`, nota: "", fecha: "" }];
    setExtraFinals(next);
    performSaveQuietly(inputs, extraPartials, extraGlobals, next);
  };

  const removeFinal = (index: number) => {
    ComicAudio.playPop();
    const copy = [...extraFinals];
    copy.splice(index, 1);
    const next = copy.map((f, i) => ({ ...f, id: `Llamado ${i + 2}` }));
    setExtraFinals(next);
    performSaveQuietly(inputs, extraPartials, extraGlobals, next);
  };

  // Count filled grades
  const filledCount = useMemo(() => {
    let count = Object.values(numericValues).filter((g) => g !== null).length;
    count += parsedExtraPartials.reduce((acc, p) => acc + (p.nota !== null ? 1 : 0) + (p.rec !== null ? 1 : 0), 0);
    count += parsedExtraGlobals.reduce((acc, g) => acc + (g.nota !== null ? 1 : 0) + (g.rec !== null ? 1 : 0), 0);
    count += parsedExtraFinals.reduce((acc, f) => acc + (f.nota !== null ? 1 : 0), 0);
    return count;
  }, [numericValues, parsedExtraPartials, parsedExtraGlobals, parsedExtraFinals]);

  // Partial average calculation
  const promedioParciales = useMemo(() => {
    const effectiveP1 = numericValues.nota_rec_parcial_1 ?? numericValues.nota_parcial_1;
    const effectiveP2 = numericValues.nota_rec_parcial_2 ?? numericValues.nota_parcial_2;

    const list: number[] = [];
    if (effectiveP1 !== null) list.push(effectiveP1);
    if (effectiveP2 !== null) list.push(effectiveP2);

    for (const ep of parsedExtraPartials) {
      const eff = ep.rec ?? ep.nota;
      if (eff !== null) list.push(eff);
    }

    if (list.length === 0) return null;
    return list.reduce((a, b) => a + b, 0) / list.length;
  }, [numericValues, parsedExtraPartials]);

  return (
    <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f]">
      <button
        type="button"
        onClick={() => {
          ComicAudio.playPop();
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center justify-between p-3 bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors text-left border-b border-zinc-200/60 dark:border-zinc-800/60"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xs">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
              Parciales, globales y finales
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
              Carga parciales, recuperatorios y llamados de examen
            </span>
          </div>
          {filledCount > 0 && (
            <span className="ml-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
              {filledCount} notas
            </span>
          )}
        </div>
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-zinc-400">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3.5 space-y-4 animate-in fade-in duration-150">
          {/* Promedio indicator banner */}
          {promedioParciales !== null && (
            <div className="text-center py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>
                Promedio parciales: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{promedioParciales.toFixed(2)} pts</strong>
                {promedioParciales >= (promedioParciales > 10 ? 60 : 4) ? " (En carrera / Regular)" : " (A reforzar)"}
              </span>
            </div>
          )}

          {/* PARCIALES SECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                Parciales y recuperatorios
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Aprobación: 4 o 60
              </span>
            </div>

            {/* Parcial 1 */}
            <div className="grid grid-cols-2 gap-2">
              <GradeInput
                label="Parcial 1"
                value={inputs.nota_parcial_1}
                numericValue={numericValues.nota_parcial_1}
                onChange={(v) => updateInput("nota_parcial_1", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
              />
              <GradeInput
                label="Recup. 1"
                value={inputs.nota_rec_parcial_1}
                numericValue={numericValues.nota_rec_parcial_1}
                onChange={(v) => updateInput("nota_rec_parcial_1", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
              />
            </div>

            {/* Parcial 2 */}
            <div className="grid grid-cols-2 gap-2">
              <GradeInput
                label="Parcial 2"
                value={inputs.nota_parcial_2}
                numericValue={numericValues.nota_parcial_2}
                onChange={(v) => updateInput("nota_parcial_2", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
              />
              <GradeInput
                label="Recup. 2"
                value={inputs.nota_rec_parcial_2}
                numericValue={numericValues.nota_rec_parcial_2}
                onChange={(v) => updateInput("nota_rec_parcial_2", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
              />
            </div>

            {/* Extra Partials (P3, P4...) */}
            {extraPartials.map((p, idx) => (
              <div key={idx} className="relative pt-1">
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removePartial(idx)}
                    className="absolute -right-1 -top-1 p-1 bg-white dark:bg-zinc-800 text-zinc-400 hover:text-rose-500 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-colors z-10"
                    title="Eliminar parcial"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <GradeInput
                    label={p.id}
                    value={p.nota}
                    numericValue={parsedExtraPartials[idx]?.nota ?? null}
                    onChange={(v) => updateExtraInput(idx, "nota", v)}
                    onBlur={triggerImmediateSave}
                    disabled={disabled}
                  />
                  <GradeInput
                    label={`Recup. ${p.id}`}
                    value={p.rec}
                    numericValue={parsedExtraPartials[idx]?.rec ?? null}
                    onChange={(v) => updateExtraInput(idx, "rec", v)}
                    onBlur={triggerImmediateSave}
                    disabled={disabled}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-center py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"
              onClick={addPartial}
              disabled={disabled}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar parcial extra (P{3 + extraPartials.length})
            </button>
          </div>

          {/* GLOBALES SECTION */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                Exámenes globales / integradores
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <GradeInput
                label="Global 1"
                value={inputs.nota_global}
                numericValue={numericValues.nota_global}
                onChange={(v) => updateInput("nota_global", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
              />
              <GradeInput
                label="Recup. global"
                value={inputs.nota_rec_global}
                numericValue={numericValues.nota_rec_global}
                onChange={(v) => updateInput("nota_rec_global", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
              />
            </div>

            {/* Extra Globals */}
            {extraGlobals.map((g, idx) => (
              <div key={idx} className="relative pt-1">
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeGlobal(idx)}
                    className="absolute -right-1 -top-1 p-1 bg-white dark:bg-zinc-800 text-zinc-400 hover:text-rose-500 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-colors z-10"
                    title="Eliminar examen global"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <GradeInput
                    label={g.id}
                    value={g.nota}
                    numericValue={parsedExtraGlobals[idx]?.nota ?? null}
                    onChange={(v) => updateExtraGlobalInput(idx, "nota", v)}
                    onBlur={triggerImmediateSave}
                    disabled={disabled}
                  />
                  <GradeInput
                    label={`Recup. ${g.id}`}
                    value={g.rec}
                    numericValue={parsedExtraGlobals[idx]?.rec ?? null}
                    onChange={(v) => updateExtraGlobalInput(idx, "rec", v)}
                    onBlur={triggerImmediateSave}
                    disabled={disabled}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-center py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"
              onClick={addGlobal}
              disabled={disabled}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar instancia global (Global {2 + extraGlobals.length})
            </button>
          </div>

          {/* FINALES SECTION */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Llamados a examen final
              </span>
            </div>

            <div>
              <GradeInput
                label="Final (Llamado 1)"
                value={inputs.nota_final_examen}
                numericValue={numericValues.nota_final_examen}
                onChange={(v) => updateInput("nota_final_examen", v)}
                onBlur={triggerImmediateSave}
                disabled={disabled}
                placeholder="Nota final"
              />
            </div>

            {/* Extra Finals */}
            {extraFinals.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <GradeInput
                    label={f.id}
                    value={f.nota}
                    numericValue={parsedExtraFinals[idx]?.nota ?? null}
                    onChange={(v) => updateExtraFinalInput(idx, "nota", v)}
                    onBlur={triggerImmediateSave}
                    disabled={disabled}
                    placeholder="Nota final"
                  />
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeFinal(idx)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Eliminar llamado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-center py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"
              onClick={addFinal}
              disabled={disabled}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar otro llamado de final
            </button>
          </div>

          {/* Auto-save Status Indicator */}
          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 select-none">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Autoguardado</span>
            </div>

            <button
              type="button"
              onClick={triggerImmediateSave}
              disabled={disabled}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
