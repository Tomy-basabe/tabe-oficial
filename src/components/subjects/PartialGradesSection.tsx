import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Plus, Trash2, Award, Calendar, BookOpen, GraduationCap, Check, X, Loader2 } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { PartialGrades, ExtraPartial, ExtraGlobal, ExtraFinal } from "@/hooks/useSubjects";

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
    <div className={cn(
      "flex items-center justify-between py-1.5 px-2.5 rounded-xl border-2 border-black transition-all shadow-[2px_2px_0_0_#000]",
      isPassing && "bg-[#48BD22]/15 text-foreground",
      isFailing && "bg-[#FF2E93]/15 text-foreground",
      !isPassing && !isFailing && "bg-card text-foreground"
    )}>
      <span className="text-xs font-black uppercase tracking-tight truncate mr-1.5">{label}</span>
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
            "w-16 px-1.5 py-1 text-center text-xs font-black rounded-lg border-2 border-black bg-card shadow-[1.5px_1.5px_0_0_#000]",
            "focus:outline-none focus:ring-2 focus:ring-[#FFE600]",
            isPassing && "text-[#48BD22] border-[#48BD22]",
            isFailing && "text-[#FF2E93] border-[#FF2E93]",
            !isPassing && !isFailing && "text-foreground"
          )}
        />
        {isPassing && (
          <span className="w-5 h-5 rounded-md bg-[#48BD22] text-white flex items-center justify-center font-black text-[10px] border border-black shadow-[1px_1px_0_0_#000]">
            ✓
          </span>
        )}
        {isFailing && (
          <span className="w-5 h-5 rounded-md bg-[#FF2E93] text-white flex items-center justify-center font-black text-[10px] border border-black shadow-[1px_1px_0_0_#000]">
            ✗
          </span>
        )}
      </div>
    </div>
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

export function PartialGradesSection({ grades, onUpdate, disabled }: PartialGradesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Inputs state
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
    (grades.extra_partials || []).map((p) => ({
      id: p.id,
      nota: p.nota?.toString() ?? "",
      rec: p.rec?.toString() ?? "",
    }))
  );

  const [extraGlobals, setExtraGlobals] = useState<{ id: string; nota: string; rec: string }[]>(
    (grades.extra_globals || []).map((g) => ({
      id: g.id,
      nota: g.nota?.toString() ?? "",
      rec: g.rec?.toString() ?? "",
    }))
  );

  const [extraFinals, setExtraFinals] = useState<{ id: string; nota: string; fecha?: string }[]>(
    (grades.extra_finals || []).map((f) => ({
      id: f.id,
      nota: f.nota?.toString() ?? "",
      fecha: f.fecha ?? "",
    }))
  );

  // Sync state if props change externally
  useEffect(() => {
    setInputs({
      nota_parcial_1: grades.nota_parcial_1?.toString() ?? "",
      nota_rec_parcial_1: grades.nota_rec_parcial_1?.toString() ?? "",
      nota_parcial_2: grades.nota_parcial_2?.toString() ?? "",
      nota_rec_parcial_2: grades.nota_rec_parcial_2?.toString() ?? "",
      nota_global: grades.nota_global?.toString() ?? "",
      nota_rec_global: grades.nota_rec_global?.toString() ?? "",
      nota_final_examen: grades.nota_final_examen?.toString() ?? "",
    });
    setExtraPartials(
      (grades.extra_partials || []).map((p) => ({
        id: p.id,
        nota: p.nota?.toString() ?? "",
        rec: p.rec?.toString() ?? "",
      }))
    );
    setExtraGlobals(
      (grades.extra_globals || []).map((g) => ({
        id: g.id,
        nota: g.nota?.toString() ?? "",
        rec: g.rec?.toString() ?? "",
      }))
    );
    setExtraFinals(
      (grades.extra_finals || []).map((f) => ({
        id: f.id,
        nota: f.nota?.toString() ?? "",
        fecha: f.fecha ?? "",
      }))
    );
  }, [grades]);

  // Parse inputs
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

  // ── Auto-save engine ──────────────────────────────────
  const isMountedRef = useRef(false);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<any>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const performSave = useCallback(
    async (
      vals: typeof numericValues,
      partials: typeof parsedExtraPartials,
      globals: typeof parsedExtraGlobals,
      finals: typeof parsedExtraFinals
    ) => {
      if (disabled || isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus("saving");
      try {
        await onUpdate({
          ...vals,
          extra_partials: partials,
          extra_globals: globals,
          extra_finals: finals,
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("idle");
      } finally {
        isSavingRef.current = false;
      }
    },
    [disabled, onUpdate]
  );

  // Debounced auto-save on any change
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(() => {
      performSave(numericValues, parsedExtraPartials, parsedExtraGlobals, parsedExtraFinals);
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [numericValues, parsedExtraPartials, parsedExtraGlobals, parsedExtraFinals, performSave]);

  // Immediate save on blur
  const triggerImmediateSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    performSave(numericValues, parsedExtraPartials, parsedExtraGlobals, parsedExtraFinals);
  }, [numericValues, parsedExtraPartials, parsedExtraGlobals, parsedExtraFinals, performSave]);

  // Input change helpers
  const updateInput = useCallback((key: keyof typeof inputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateExtraInput = useCallback((index: number, field: "nota" | "rec", value: string) => {
    setExtraPartials((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  const updateExtraGlobalInput = useCallback((index: number, field: "nota" | "rec", value: string) => {
    setExtraGlobals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  const updateExtraFinalInput = useCallback((index: number, field: "nota" | "fecha", value: string) => {
    setExtraFinals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  // Adding and removing items
  const addPartial = () => {
    ComicAudio.playPop();
    const nextNumber = 3 + extraPartials.length;
    setExtraPartials((prev) => [
      ...prev,
      { id: `P${nextNumber}`, nota: "", rec: "" },
    ]);
  };

  const removePartial = (index: number) => {
    ComicAudio.playPop();
    setExtraPartials((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((p, i) => ({ ...p, id: `P${i + 3}` }));
    });
  };

  const addGlobal = () => {
    ComicAudio.playPop();
    const nextNumber = 2 + extraGlobals.length;
    setExtraGlobals((prev) => [
      ...prev,
      { id: `Global ${nextNumber}`, nota: "", rec: "" },
    ]);
  };

  const removeGlobal = (index: number) => {
    ComicAudio.playPop();
    setExtraGlobals((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((g, i) => ({ ...g, id: `Global ${i + 2}` }));
    });
  };

  const addFinal = () => {
    ComicAudio.playPop();
    const nextNumber = 2 + extraFinals.length;
    setExtraFinals((prev) => [
      ...prev,
      { id: `Llamado ${nextNumber}`, nota: "", fecha: "" },
    ]);
  };

  const removeFinal = (index: number) => {
    ComicAudio.playPop();
    setExtraFinals((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((f, i) => ({ ...f, id: `Llamado ${i + 2}` }));
    });
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
    <div className="border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_#000] bg-card">
      <button
        type="button"
        onClick={() => {
          ComicAudio.playPop();
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#00E5FF]/20 via-[#FFE600]/15 to-[#00E5FF]/20 hover:bg-[#00E5FF]/30 transition-all border-b-2 border-black text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00E5FF] text-black border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center justify-center font-black text-xs">
            📝
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-tight text-foreground block">
              Parciales, Globales y Finales
            </span>
            <span className="text-[10px] font-bold text-muted-foreground block">
              Carga parciales, recuperatorios y llamados de examen
            </span>
          </div>
          {filledCount > 0 && (
            <span className="ml-1 text-[10px] font-black bg-[#FF2E93] text-white px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0_0_#000]">
              {filledCount} notas
            </span>
          )}
        </div>
        <div className="w-6 h-6 rounded-lg bg-card border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center justify-center shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-foreground stroke-[3]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-foreground stroke-[3]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Promedio indicator comic banner if at least one partial exists */}
          {promedioParciales !== null && (
            <div className="text-center py-2 px-3 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 bg-[#FFE600] text-black">
              <Award className="w-4 h-4" />
              <span>
                Promedio Parciales: {promedioParciales.toFixed(2)} pts
                {promedioParciales >= (promedioParciales > 10 ? 60 : 4) ? " (En carrera / Regular)" : " (A reforzar)"}
              </span>
            </div>
          )}

          {/* PARCIALES SECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00E5FF]" />
                Parciales y Recuperatorios
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">
                Nota mín. de aprobación: 4 o 60
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
                    className="absolute -right-1 -top-1 p-1 bg-[#FF2E93] text-white rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000] hover:scale-110 transition-transform z-10"
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
              className="w-full flex items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-foreground hover:bg-[#00E5FF]/20 bg-secondary rounded-xl transition-all border-2 border-dashed border-black shadow-[2px_2px_0_0_#000] active:translate-y-[1px]"
              onClick={addPartial}
              disabled={disabled}
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
              Agregar Parcial Extra (P{3 + extraPartials.length})
            </button>
          </div>

          {/* GLOBALES SECTION */}
          <div className="space-y-2 pt-2 border-t-2 border-dashed border-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#FFE600]" />
                Exámenes Globales / Integradores
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
                label="Recup. Global"
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
                    className="absolute -right-1 -top-1 p-1 bg-[#FF2E93] text-white rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000] hover:scale-110 transition-transform z-10"
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
              className="w-full flex items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-foreground hover:bg-[#FFE600]/20 bg-secondary rounded-xl transition-all border-2 border-dashed border-black shadow-[2px_2px_0_0_#000] active:translate-y-[1px]"
              onClick={addGlobal}
              disabled={disabled}
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
              Agregar Instancia Global (Global {2 + extraGlobals.length})
            </button>
          </div>

          {/* FINALES SECTION */}
          <div className="space-y-2 pt-2 border-t-2 border-dashed border-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#48BD22]" />
                Llamados a Examen Final
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
                    className="p-2 bg-[#FF2E93] text-white rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] hover:scale-105 transition-transform"
                    title="Eliminar llamado de final"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-foreground hover:bg-[#48BD22]/20 bg-secondary rounded-xl transition-all border-2 border-dashed border-black shadow-[2px_2px_0_0_#000] active:translate-y-[1px]"
              onClick={addFinal}
              disabled={disabled}
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
              Agregar Otro Llamado de Final
            </button>
          </div>

          {/* Auto-save Status Indicator */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-black/20 px-1">
            <div className="flex items-center gap-2">
              {saveStatus === "saving" ? (
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-foreground/80 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00E5FF]" />
                  Guardando cambios...
                </span>
              ) : saveStatus === "saved" ? (
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-[#48BD22]">
                  <Check className="w-4 h-4 stroke-[3]" />
                  Guardado automático
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase">
                  <Check className="w-3.5 h-3.5 text-[#48BD22]" />
                  Autoguardado activado
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={triggerImmediateSave}
              disabled={disabled || isSavingRef.current}
              className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border-2 border-black bg-secondary hover:bg-[#25d06c] hover:text-black transition-colors shadow-[1px_1px_0_0_#000]"
            >
              {saveStatus === "saving" ? "Guardando..." : "Guardado"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}