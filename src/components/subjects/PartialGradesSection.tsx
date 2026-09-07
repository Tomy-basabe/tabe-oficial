import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Check, X, Plus, Trash2, Sparkles, Award } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { toast } from "sonner";

interface ExtraPartial {
  id: string; // e.g. "P3", "P4"
  nota: number | null;
  rec: number | null;
}

interface PartialGrades {
  nota_parcial_1?: number | null;
  nota_rec_parcial_1?: number | null;
  nota_parcial_2?: number | null;
  nota_rec_parcial_2?: number | null;
  nota_global?: number | null;
  nota_rec_global?: number | null;
  nota_final_examen?: number | null;
  extra_partials?: ExtraPartial[];
}

interface PartialGradesSectionProps {
  grades: PartialGrades;
  onUpdate: (grades: PartialGrades) => Promise<void> | void;
  disabled?: boolean;
}

interface GradeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isEnabled: boolean;
  disabledReason?: string;
  numericValue: number | null | undefined;
}

function GradeInput({ label, value, onChange, disabled, isEnabled, disabledReason, numericValue }: GradeInputProps) {
  const isPassing = numericValue !== null && numericValue !== undefined && numericValue >= 60;
  const isFailing = numericValue !== null && numericValue !== undefined && numericValue < 60;

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2 bg-muted/40 border-2 border-dashed border-border rounded-xl opacity-60">
        <span className="text-[11px] font-black uppercase text-muted-foreground">{label}</span>
        <span className="text-[10px] font-bold text-muted-foreground">{disabledReason || "Bloqueado"}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between py-1.5 px-2.5 rounded-xl border-2 border-black transition-all shadow-[2px_2px_0_0_#000]",
      isPassing && "bg-[#48BD22]/15 text-foreground",
      isFailing && "bg-[#FF2E93]/15 text-foreground",
      !isPassing && !isFailing && "bg-card text-foreground"
    )}>
      <span className="text-xs font-black uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="--"
          className={cn(
            "w-14 px-1.5 py-1 text-center text-xs font-black rounded-lg border-2 border-black bg-card shadow-[1.5px_1.5px_0_0_#000]",
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

// Helper to parse input string to number or null
function parseGradeInput(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0 || num > 100) return null;
  return num;
}

export function PartialGradesSection({ grades, onUpdate, disabled }: PartialGradesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Use string state for all inputs to avoid controlled/uncontrolled issues
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
    (grades.extra_partials || []).map(p => ({
      id: p.id,
      nota: p.nota?.toString() ?? "",
      rec: p.rec?.toString() ?? "",
    }))
  );

  // Parse all inputs to get numeric values for logic
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
    return extraPartials.map(p => ({
      id: p.id,
      nota: parseGradeInput(p.nota),
      rec: parseGradeInput(p.rec),
    }));
  }, [extraPartials]);

  // Check if there are changes from persisted grades
  const isDirty = useMemo(() => {
    const keys: (keyof PartialGrades)[] = [
      'nota_parcial_1', 'nota_rec_parcial_1', 'nota_parcial_2', 'nota_rec_parcial_2',
      'nota_global', 'nota_rec_global', 'nota_final_examen'
    ];
    const baseDirty = keys.some(key => {
      const persisted = grades[key] as number | null | undefined;
      const current = numericValues[key];
      if ((persisted === null || persisted === undefined) && current === null) return false;
      return persisted !== current;
    });

    if (baseDirty) return true;

    // Check extra partials
    const oldExtra = grades.extra_partials || [];
    if (oldExtra.length !== parsedExtraPartials.length) return true;

    for (let i = 0; i < oldExtra.length; i++) {
      if (oldExtra[i].id !== parsedExtraPartials[i].id) return true;
      if (oldExtra[i].nota !== parsedExtraPartials[i].nota) return true;
      if (oldExtra[i].rec !== parsedExtraPartials[i].rec) return true;
    }

    return false;
  }, [grades, numericValues, parsedExtraPartials]);

  const updateInput = useCallback((key: keyof typeof inputs, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateExtraInput = useCallback((index: number, field: 'nota' | 'rec', value: string) => {
    setExtraPartials(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  const addPartial = () => {
    ComicAudio.playPop();
    const nextNumber = 3 + extraPartials.length;
    setExtraPartials(prev => [
      ...prev,
      { id: `P${nextNumber}`, nota: "", rec: "" }
    ]);
  };

  const removePartial = (index: number) => {
    ComicAudio.playPop();
    setExtraPartials(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      // Renumber the remaining ones
      return copy.map((p, i) => ({ ...p, id: `P${i + 3}` }));
    });
  };

  const handleSave = async () => {
    if (disabled || isSaving) return;
    setIsSaving(true);
    ComicAudio.playPowerUp();
    try {
      await onUpdate({
        ...numericValues,
        extra_partials: parsedExtraPartials
      });
      toast.success("¡Notas de cursada guardadas con éxito!");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar las notas");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (disabled) return;
    ComicAudio.playPop();
    setInputs({
      nota_parcial_1: grades.nota_parcial_1?.toString() ?? "",
      nota_rec_parcial_1: grades.nota_rec_parcial_1?.toString() ?? "",
      nota_parcial_2: grades.nota_parcial_2?.toString() ?? "",
      nota_rec_parcial_2: grades.nota_rec_parcial_2?.toString() ?? "",
      nota_global: grades.nota_global?.toString() ?? "",
      nota_rec_global: grades.nota_rec_global?.toString() ?? "",
      nota_final_examen: grades.nota_final_examen?.toString() ?? "",
    });
    setExtraPartials((grades.extra_partials || []).map(p => ({
      id: p.id,
      nota: p.nota?.toString() ?? "",
      rec: p.rec?.toString() ?? "",
    })));
  };

  // Calculate effective grades (considering retakes)
  const effectiveP1 = numericValues.nota_rec_parcial_1 ?? numericValues.nota_parcial_1;
  const effectiveP2 = numericValues.nota_rec_parcial_2 ?? numericValues.nota_parcial_2;
  
  // Calculate average of all partials
  let sum = 0;
  let count = 0;
  
  if (effectiveP1 !== null) { sum += effectiveP1; count++; }
  if (effectiveP2 !== null) { sum += effectiveP2; count++; }

  let hasNullMandatory = false; 
  if (effectiveP1 === null || effectiveP2 === null) hasNullMandatory = true;

  for (const ep of parsedExtraPartials) {
    const eff = ep.rec ?? ep.nota;
    if (eff !== null) {
      sum += eff;
      count++;
    } else {
      hasNullMandatory = true;
    }
  }

  const promedioParciales = (count > 0 && !hasNullMandatory && count === (2 + parsedExtraPartials.length)) ? sum / count : null;
  
  // Determine what's enabled
  const isRecP1Enabled = numericValues.nota_parcial_1 !== null && numericValues.nota_parcial_1 < 60;
  const isRecP2Enabled = numericValues.nota_parcial_2 !== null && numericValues.nota_parcial_2 < 60;
  const isGlobalEnabled = promedioParciales !== null && promedioParciales >= 60;
  const isRecGlobalEnabled = numericValues.nota_global !== null && numericValues.nota_global < 60;
  
  // Final is enabled if rec global < 60 (meaning they failed the global path)
  const effectiveGlobal = numericValues.nota_rec_global ?? numericValues.nota_global;
  const isFinalEnabled = effectiveGlobal !== null && effectiveGlobal < 60;

  // Count how many grades are filled
  const filledCount = Object.values(numericValues).filter(g => g !== null).length + 
    parsedExtraPartials.reduce((acc, p) => acc + (p.nota !== null ? 1 : 0) + (p.rec !== null ? 1 : 0), 0);

  return (
    <div className="border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_#000] bg-card">
      <button
        type="button"
        onClick={() => {
          ComicAudio.playPop();
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#00E5FF]/20 via-[#FFE600]/15 to-[#00E5FF]/20 hover:bg-[#00E5FF]/30 transition-all border-b-2 border-black"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00E5FF] text-black border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center justify-center font-black text-xs">
            📝
          </div>
          <span className="text-xs font-black uppercase tracking-tight text-foreground">
            Notas de Cursada & Parciales
          </span>
          {filledCount > 0 && (
            <span className="text-[10px] font-black bg-[#FF2E93] text-white px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0_0_#000]">
              {filledCount} cargadas
            </span>
          )}
        </div>
        <div className="w-6 h-6 rounded-lg bg-card border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center justify-center">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-foreground stroke-[3]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-foreground stroke-[3]" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Promedio indicator comic banner */}
          {promedioParciales !== null && (
            <div className={cn(
              "text-center py-2 px-3 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2",
              promedioParciales >= 60 
                ? "bg-[#48BD22] text-white" 
                : "bg-[#FF6600] text-white"
            )}>
              {promedioParciales >= 60 ? (
                <>
                  <Award className="w-4 h-4 fill-white" />
                  <span>Promedio: {promedioParciales.toFixed(0)} pts → ¡Habilitado a Global!</span>
                </>
              ) : (
                <>
                  <span>Promedio: {promedioParciales.toFixed(0)} pts (Necesitas recuperatorio)</span>
                </>
              )}
            </div>
          )}
          
          {/* Grid layout for compactness */}
          <div className="grid grid-cols-2 gap-2">
            <GradeInput
              label="1° Parcial (P1)"
              value={inputs.nota_parcial_1}
              numericValue={numericValues.nota_parcial_1}
              onChange={(v) => updateInput("nota_parcial_1", v)}
              disabled={disabled}
              isEnabled={true}
            />
            <GradeInput
              label="Recup. P1"
              value={inputs.nota_rec_parcial_1}
              numericValue={numericValues.nota_rec_parcial_1}
              onChange={(v) => updateInput("nota_rec_parcial_1", v)}
              disabled={disabled}
              isEnabled={isRecP1Enabled}
              disabledReason="P1 ≥ 60"
            />
            <GradeInput
              label="2° Parcial (P2)"
              value={inputs.nota_parcial_2}
              numericValue={numericValues.nota_parcial_2}
              onChange={(v) => updateInput("nota_parcial_2", v)}
              disabled={disabled}
              isEnabled={true}
            />
            <GradeInput
              label="Recup. P2"
              value={inputs.nota_rec_parcial_2}
              numericValue={numericValues.nota_rec_parcial_2}
              onChange={(v) => updateInput("nota_rec_parcial_2", v)}
              disabled={disabled}
              isEnabled={isRecP2Enabled}
              disabledReason="P2 ≥ 60"
            />
            
            {/* Dynamic extra partials */}
            {extraPartials.map((p, idx) => (
              <div key={idx} className="col-span-2 space-y-1.5 pt-1 relative group">
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
                    label={`Parcial ${p.id}`}
                    value={p.nota}
                    numericValue={parsedExtraPartials[idx].nota}
                    onChange={(v) => updateExtraInput(idx, 'nota', v)}
                    disabled={disabled}
                    isEnabled={true}
                  />
                  <GradeInput
                    label={`Recup. ${p.id}`}
                    value={p.rec}
                    numericValue={parsedExtraPartials[idx].rec}
                    onChange={(v) => updateExtraInput(idx, 'rec', v)}
                    disabled={disabled}
                    isEnabled={parsedExtraPartials[idx].nota !== null && parsedExtraPartials[idx].nota < 60}
                    disabledReason={`${p.id} ≥ 60`}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            className="w-full flex items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-foreground hover:bg-[#FFE600]/20 bg-secondary rounded-xl transition-all border-2 border-dashed border-black shadow-[2px_2px_0_0_#000] active:translate-y-[1px]"
            onClick={addPartial}
            disabled={disabled}
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Agregar Otro Parcial (P{extraPartials.length + 3})
          </button>
          
          <div className="border-t-2 border-black/20 my-1" />
          
          {/* Instancias Finales */}
          <div className="grid grid-cols-2 gap-2">
            <GradeInput
              label="Examen Global"
              value={inputs.nota_global}
              numericValue={numericValues.nota_global}
              onChange={(v) => updateInput("nota_global", v)}
              disabled={disabled}
              isEnabled={isGlobalEnabled}
              disabledReason="Prom < 60"
            />
            <GradeInput
              label="Recup. Global"
              value={inputs.nota_rec_global}
              numericValue={numericValues.nota_rec_global}
              onChange={(v) => updateInput("nota_rec_global", v)}
              disabled={disabled}
              isEnabled={isRecGlobalEnabled}
              disabledReason="Global ≥ 60"
            />
          </div>
          
          <GradeInput
            label="Examen Final Regular"
            value={inputs.nota_final_examen}
            numericValue={numericValues.nota_final_examen}
            onChange={(v) => updateInput("nota_final_examen", v)}
            disabled={disabled}
            isEnabled={isFinalEnabled}
            disabledReason="Global ≥ 60"
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || isSaving || !isDirty}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs border-2 border-black",
                disabled || isSaving || !isDirty
                  ? "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed border-muted"
                  : "bg-card text-foreground shadow-[2px_2px_0_0_#000] hover:bg-secondary active:translate-y-[1px]"
              )}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isSaving}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-xs border-2 border-black",
                disabled || isSaving
                  ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-muted"
                  : "bg-[#48BD22] text-white shadow-[3px_3px_0_0_#000] hover:bg-[#3ea81d] active:translate-y-[1px]"
              )}
            >
              {isSaving ? "Guardando..." : "Guardar Parciales"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}