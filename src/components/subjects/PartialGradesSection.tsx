import { useMemo, useState, useCallback } from "react";
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
      <div className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded-lg opacity-50">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{disabledReason || "Bloqueado"}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors",
      isPassing && "bg-neon-green/10 border border-neon-green/30",
      isFailing && "bg-neon-red/10 border border-neon-red/30",
      !isPassing && !isFailing && "bg-secondary"
    )}>
      <span className="text-xs font-medium">{label}</span>
      <div className="flex items-center gap-1">
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
            "w-14 px-1.5 py-0.5 text-center text-xs font-medium rounded border bg-background",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
            isPassing && "text-neon-green border-neon-green/50",
            isFailing && "text-neon-red border-neon-red/50",
            !isPassing && !isFailing && "border-border"
          )}
        />
        {isPassing && <Check className="w-3 h-3 text-neon-green" />}
        {isFailing && <X className="w-3 h-3 text-neon-red" />}
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

  // Check if there are changes from persisted grades
  const isDirty = useMemo(() => {
    const keys: (keyof PartialGrades)[] = [
      'nota_parcial_1', 'nota_rec_parcial_1', 'nota_parcial_2', 'nota_rec_parcial_2',
      'nota_global', 'nota_rec_global', 'nota_final_examen'
    ];
    return keys.some(key => {
      const persisted = grades[key];
      const current = numericValues[key];
      // Both null/undefined = same
      if ((persisted === null || persisted === undefined) && current === null) return false;
      return persisted !== current;
    });
  }, [grades, numericValues]);

  const updateInput = useCallback((key: keyof typeof inputs, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (disabled || !isDirty) return;
    setIsSaving(true);
    try {
      await onUpdate(numericValues);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (disabled) return;
    setInputs({
      nota_parcial_1: grades.nota_parcial_1?.toString() ?? "",
      nota_rec_parcial_1: grades.nota_rec_parcial_1?.toString() ?? "",
      nota_parcial_2: grades.nota_parcial_2?.toString() ?? "",
      nota_rec_parcial_2: grades.nota_rec_parcial_2?.toString() ?? "",
      nota_global: grades.nota_global?.toString() ?? "",
      nota_rec_global: grades.nota_rec_global?.toString() ?? "",
      nota_final_examen: grades.nota_final_examen?.toString() ?? "",
    });
  };

  // Calculate effective grades (considering retakes)
  const effectiveP1 = numericValues.nota_rec_parcial_1 ?? numericValues.nota_parcial_1;
  const effectiveP2 = numericValues.nota_rec_parcial_2 ?? numericValues.nota_parcial_2;
  
  // Calculate average of parcials
  const hasP1 = effectiveP1 !== null;
  const hasP2 = effectiveP2 !== null;
  const promedioParciales = hasP1 && hasP2 ? (effectiveP1 + effectiveP2) / 2 : null;
  
  // Determine what's enabled
  const isRecP1Enabled = numericValues.nota_parcial_1 !== null && numericValues.nota_parcial_1 < 60;
  const isRecP2Enabled = numericValues.nota_parcial_2 !== null && numericValues.nota_parcial_2 < 60;
  const isGlobalEnabled = promedioParciales !== null && promedioParciales >= 60;
  const isRecGlobalEnabled = numericValues.nota_global !== null && numericValues.nota_global < 60;
  
  // Final is enabled if rec global < 60 (meaning they failed the global path)
  const effectiveGlobal = numericValues.nota_rec_global ?? numericValues.nota_global;
  const isFinalEnabled = effectiveGlobal !== null && effectiveGlobal < 60;

  // Count how many grades are filled
  const filledCount = Object.values(numericValues).filter(g => g !== null).length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Notas de Cursada</span>
          {filledCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {filledCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-2 space-y-1.5 animate-fade-in">
          {/* Promedio indicator */}
          {promedioParciales !== null && (
            <div className={cn(
              "text-center py-1 px-2 rounded-lg text-xs font-medium",
              promedioParciales >= 60 
                ? "bg-neon-green/10 text-neon-green border border-neon-green/30" 
                : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
            )}>
              Prom: {promedioParciales.toFixed(0)}
              {promedioParciales >= 60 && " → Global ✓"}
            </div>
          )}
          
          {/* Grid layout for compactness */}
          <div className="grid grid-cols-2 gap-1.5">
            <GradeInput
              label="P1"
              value={inputs.nota_parcial_1}
              numericValue={numericValues.nota_parcial_1}
              onChange={(v) => updateInput("nota_parcial_1", v)}
              disabled={disabled}
              isEnabled={true}
            />
            <GradeInput
              label="Rec P1"
              value={inputs.nota_rec_parcial_1}
              numericValue={numericValues.nota_rec_parcial_1}
              onChange={(v) => updateInput("nota_rec_parcial_1", v)}
              disabled={disabled}
              isEnabled={isRecP1Enabled}
              disabledReason="P1≥60"
            />
            <GradeInput
              label="P2"
              value={inputs.nota_parcial_2}
              numericValue={numericValues.nota_parcial_2}
              onChange={(v) => updateInput("nota_parcial_2", v)}
              disabled={disabled}
              isEnabled={true}
            />
            <GradeInput
              label="Rec P2"
              value={inputs.nota_rec_parcial_2}
              numericValue={numericValues.nota_rec_parcial_2}
              onChange={(v) => updateInput("nota_rec_parcial_2", v)}
              disabled={disabled}
              isEnabled={isRecP2Enabled}
              disabledReason="P2≥60"
            />
          </div>
          
          <div className="border-t border-border my-1" />
          
          <div className="grid grid-cols-2 gap-1.5">
            <GradeInput
              label="Global"
              value={inputs.nota_global}
              numericValue={numericValues.nota_global}
              onChange={(v) => updateInput("nota_global", v)}
              disabled={disabled}
              isEnabled={isGlobalEnabled}
              disabledReason="Prom<60"
            />
            <GradeInput
              label="Rec Glob"
              value={inputs.nota_rec_global}
              numericValue={numericValues.nota_rec_global}
              onChange={(v) => updateInput("nota_rec_global", v)}
              disabled={disabled}
              isEnabled={isRecGlobalEnabled}
              disabledReason="Glob≥60"
            />
          </div>
          
          <GradeInput
            label="Final"
            value={inputs.nota_final_examen}
            numericValue={numericValues.nota_final_examen}
            onChange={(v) => updateInput("nota_final_examen", v)}
            disabled={disabled}
            isEnabled={isFinalEnabled}
            disabledReason="Glob/Rec≥60"
          />

          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || isSaving || !isDirty}
              className={cn(
                "flex-1 py-1.5 rounded-lg font-medium transition-all text-xs",
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
              disabled={disabled || isSaving || !isDirty}
              className={cn(
                "flex-1 py-1.5 rounded-lg font-medium transition-all text-xs",
                disabled || isSaving || !isDirty
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
              )}
            >
              {isSaving ? "..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}