import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";

interface PartialGrades {
  nota_parcial_1?: number | null;
  nota_rec_parcial_1?: number | null;
  nota_parcial_2?: number | null;
  nota_rec_parcial_2?: number | null;
  nota_global?: number | null;
  nota_rec_global?: number | null;
  nota_final_examen?: number | null;
}

interface PartialGradesSectionProps {
  grades: PartialGrades;
  onUpdate: (grades: PartialGrades) => Promise<void> | void;
  disabled?: boolean;
}

interface GradeInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  isEnabled: boolean;
  disabledReason?: string;
}

function GradeInput({ label, value, onChange, disabled, isEnabled, disabledReason }: GradeInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() ?? "");

  // Sync input with external value changes (e.g., after refetch / after save)
  useEffect(() => {
    setInputValue(value?.toString() ?? "");
  }, [value]);

  const handleInputChange = (next: string) => {
    setInputValue(next);

    // Update draft immediately if valid, but DO NOT save to backend here.
    const trimmed = next.trim();
    if (trimmed === "") {
      onChange(null);
      return;
    }

    const num = Number(trimmed);
    if (!Number.isFinite(num)) return;
    if (num < 0 || num > 100) return;
    onChange(num);
  };

  const isPassing = value !== null && value !== undefined && value >= 60;
  const isFailing = value !== null && value !== undefined && value < 60;

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg opacity-50">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{disabledReason || "Bloqueado"}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
      isPassing && "bg-neon-green/10 border border-neon-green/30",
      isFailing && "bg-neon-red/10 border border-neon-red/30",
      !isPassing && !isFailing && "bg-secondary"
    )}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          disabled={disabled}
          placeholder="--"
          className={cn(
            "w-16 px-2 py-1 text-center text-sm font-medium rounded border bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            isPassing && "text-neon-green border-neon-green/50",
            isFailing && "text-neon-red border-neon-red/50",
            !isPassing && !isFailing && "border-border"
          )}
        />
        {isPassing && <Check className="w-4 h-4 text-neon-green" />}
        {isFailing && <X className="w-4 h-4 text-neon-red" />}
      </div>
    </div>
  );
}

export function PartialGradesSection({ grades, onUpdate, disabled }: PartialGradesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState<PartialGrades>(grades);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep draft synced with persisted grades when we're not editing.
  useEffect(() => {
    if (!isDirty) setDraft(grades);
  }, [grades, isDirty]);

  const persistedFingerprint = useMemo(() => JSON.stringify(grades ?? {}), [grades]);
  const draftFingerprint = useMemo(() => JSON.stringify(draft ?? {}), [draft]);
  const canSave = isDirty && persistedFingerprint !== draftFingerprint;
  
  // Calculate effective grades (considering retakes)
  const effectiveP1 = draft.nota_rec_parcial_1 ?? draft.nota_parcial_1;
  const effectiveP2 = draft.nota_rec_parcial_2 ?? draft.nota_parcial_2;
  
  // Calculate average of parcials
  const hasP1 = effectiveP1 !== null && effectiveP1 !== undefined;
  const hasP2 = effectiveP2 !== null && effectiveP2 !== undefined;
  const promedioParciales = hasP1 && hasP2 ? (effectiveP1 + effectiveP2) / 2 : null;
  
  // Determine what's enabled
  const isRecP1Enabled = draft.nota_parcial_1 !== null && draft.nota_parcial_1 !== undefined && draft.nota_parcial_1 < 60;
  const isRecP2Enabled = draft.nota_parcial_2 !== null && draft.nota_parcial_2 !== undefined && draft.nota_parcial_2 < 60;
  const isGlobalEnabled = promedioParciales !== null && promedioParciales >= 60;
  const isRecGlobalEnabled = draft.nota_global !== null && draft.nota_global !== undefined && draft.nota_global < 60;
  
  // Final is enabled if rec global < 60 (meaning they failed the global path)
  const effectiveGlobal = draft.nota_rec_global ?? draft.nota_global;
  const isFinalEnabled = effectiveGlobal !== null && effectiveGlobal !== undefined && effectiveGlobal < 60;

  const updateGrade = (key: keyof PartialGrades, value: number | null) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (disabled || !canSave) return;
    setIsSaving(true);
    try {
      await onUpdate(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (disabled) return;
    setDraft(grades);
    setIsDirty(false);
  };

  // Count how many grades are filled
  const filledCount = [
    draft.nota_parcial_1,
    draft.nota_rec_parcial_1,
    draft.nota_parcial_2,
    draft.nota_rec_parcial_2,
    draft.nota_global,
    draft.nota_rec_global,
    draft.nota_final_examen
  ].filter(g => g !== null && g !== undefined).length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Notas de Cursada</span>
          {filledCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {filledCount} registradas
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-3 space-y-2 animate-fade-in">
          {/* Promedio indicator */}
          {promedioParciales !== null && (
            <div className={cn(
              "text-center py-2 px-3 rounded-lg text-sm font-medium",
              promedioParciales >= 60 
                ? "bg-neon-green/10 text-neon-green border border-neon-green/30" 
                : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
            )}>
              Promedio Parciales: {promedioParciales.toFixed(1)}
              {promedioParciales >= 60 && " → Global habilitado"}
            </div>
          )}
          
          {/* Parcial 1 */}
          <GradeInput
            label="Parcial 1"
            value={draft.nota_parcial_1}
            onChange={(v) => updateGrade("nota_parcial_1", v)}
            disabled={disabled}
            isEnabled={true}
          />
          
          {/* Rec Parcial 1 */}
          <GradeInput
            label="Rec. Parcial 1"
            value={draft.nota_rec_parcial_1}
            onChange={(v) => updateGrade("nota_rec_parcial_1", v)}
            disabled={disabled}
            isEnabled={isRecP1Enabled}
            disabledReason="Parcial 1 ≥ 60"
          />
          
          {/* Parcial 2 */}
          <GradeInput
            label="Parcial 2"
            value={draft.nota_parcial_2}
            onChange={(v) => updateGrade("nota_parcial_2", v)}
            disabled={disabled}
            isEnabled={true}
          />
          
          {/* Rec Parcial 2 */}
          <GradeInput
            label="Rec. Parcial 2"
            value={draft.nota_rec_parcial_2}
            onChange={(v) => updateGrade("nota_rec_parcial_2", v)}
            disabled={disabled}
            isEnabled={isRecP2Enabled}
            disabledReason="Parcial 2 ≥ 60"
          />
          
          <div className="border-t border-border my-2" />
          
          {/* Global */}
          <GradeInput
            label="Global"
            value={draft.nota_global}
            onChange={(v) => updateGrade("nota_global", v)}
            disabled={disabled}
            isEnabled={isGlobalEnabled}
            disabledReason="Promedio parciales < 60"
          />
          
          {/* Rec Global */}
          <GradeInput
            label="Rec. Global"
            value={draft.nota_rec_global}
            onChange={(v) => updateGrade("nota_rec_global", v)}
            disabled={disabled}
            isEnabled={isRecGlobalEnabled}
            disabledReason="Global ≥ 60"
          />
          
          <div className="border-t border-border my-2" />
          
          {/* Final */}
          <GradeInput
            label="Final"
            value={draft.nota_final_examen}
            onChange={(v) => updateGrade("nota_final_examen", v)}
            disabled={disabled}
            isEnabled={isFinalEnabled}
            disabledReason="Global/Rec Global ≥ 60"
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || isSaving || !isDirty}
              className={cn(
                "flex-1 py-2 rounded-xl font-medium transition-all text-sm",
                disabled || isSaving || !isDirty
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isSaving || !canSave}
              className={cn(
                "flex-1 py-2 rounded-xl font-medium transition-all text-sm",
                disabled || isSaving || !canSave
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
              )}
            >
              {isSaving ? "Guardando..." : "Guardar notas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
