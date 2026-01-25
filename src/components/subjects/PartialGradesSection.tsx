import { useState, useEffect, useRef } from "react";
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
  onUpdate: (grades: PartialGrades) => void;
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
  const debounceRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);
  const lastSavedValue = useRef(value);
  
  // Sync input with external value changes (e.g., after refetch)
  useEffect(() => {
    setInputValue(value?.toString() ?? "");
    lastSavedValue.current = value;
  }, [value]);

  // Auto-save (debounced) - only after user interaction
  useEffect(() => {
    // Skip first render to avoid saving on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (disabled || !isEnabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      const trimmed = inputValue.trim();
      const numValue = trimmed === "" ? null : parseFloat(trimmed);
      
      // Validate
      if (numValue !== null && (Number.isNaN(numValue) || numValue < 0 || numValue > 100)) return;
      
      // Only save if value actually changed
      if (numValue === lastSavedValue.current) return;
      
      lastSavedValue.current = numValue;
      onChange(numValue);
    }, 800);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const handleBlur = () => {
    // Clear any pending debounce and save immediately on blur
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    
    const trimmed = inputValue.trim();
    const numValue = trimmed === "" ? null : parseFloat(trimmed);
    
    if (numValue !== null && (Number.isNaN(numValue) || numValue < 0 || numValue > 100)) return;
    if (numValue === lastSavedValue.current) return;
    
    lastSavedValue.current = numValue;
    onChange(numValue);
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
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
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
  
  // Calculate effective grades (considering retakes)
  const effectiveP1 = grades.nota_rec_parcial_1 ?? grades.nota_parcial_1;
  const effectiveP2 = grades.nota_rec_parcial_2 ?? grades.nota_parcial_2;
  
  // Calculate average of parcials
  const hasP1 = effectiveP1 !== null && effectiveP1 !== undefined;
  const hasP2 = effectiveP2 !== null && effectiveP2 !== undefined;
  const promedioParciales = hasP1 && hasP2 ? (effectiveP1 + effectiveP2) / 2 : null;
  
  // Determine what's enabled
  const isRecP1Enabled = grades.nota_parcial_1 !== null && grades.nota_parcial_1 !== undefined && grades.nota_parcial_1 < 60;
  const isRecP2Enabled = grades.nota_parcial_2 !== null && grades.nota_parcial_2 !== undefined && grades.nota_parcial_2 < 60;
  const isGlobalEnabled = promedioParciales !== null && promedioParciales >= 60;
  const isRecGlobalEnabled = grades.nota_global !== null && grades.nota_global !== undefined && grades.nota_global < 60;
  
  // Final is enabled if rec global < 60 (meaning they failed the global path)
  const effectiveGlobal = grades.nota_rec_global ?? grades.nota_global;
  const isFinalEnabled = effectiveGlobal !== null && effectiveGlobal !== undefined && effectiveGlobal < 60;

  const updateGrade = (key: keyof PartialGrades, value: number | null) => {
    onUpdate({ ...grades, [key]: value });
  };

  // Count how many grades are filled
  const filledCount = [
    grades.nota_parcial_1,
    grades.nota_rec_parcial_1,
    grades.nota_parcial_2,
    grades.nota_rec_parcial_2,
    grades.nota_global,
    grades.nota_rec_global,
    grades.nota_final_examen
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
            value={grades.nota_parcial_1}
            onChange={(v) => updateGrade("nota_parcial_1", v)}
            disabled={disabled}
            isEnabled={true}
          />
          
          {/* Rec Parcial 1 */}
          <GradeInput
            label="Rec. Parcial 1"
            value={grades.nota_rec_parcial_1}
            onChange={(v) => updateGrade("nota_rec_parcial_1", v)}
            disabled={disabled}
            isEnabled={isRecP1Enabled}
            disabledReason="Parcial 1 ≥ 60"
          />
          
          {/* Parcial 2 */}
          <GradeInput
            label="Parcial 2"
            value={grades.nota_parcial_2}
            onChange={(v) => updateGrade("nota_parcial_2", v)}
            disabled={disabled}
            isEnabled={true}
          />
          
          {/* Rec Parcial 2 */}
          <GradeInput
            label="Rec. Parcial 2"
            value={grades.nota_rec_parcial_2}
            onChange={(v) => updateGrade("nota_rec_parcial_2", v)}
            disabled={disabled}
            isEnabled={isRecP2Enabled}
            disabledReason="Parcial 2 ≥ 60"
          />
          
          <div className="border-t border-border my-2" />
          
          {/* Global */}
          <GradeInput
            label="Global"
            value={grades.nota_global}
            onChange={(v) => updateGrade("nota_global", v)}
            disabled={disabled}
            isEnabled={isGlobalEnabled}
            disabledReason="Promedio parciales < 60"
          />
          
          {/* Rec Global */}
          <GradeInput
            label="Rec. Global"
            value={grades.nota_rec_global}
            onChange={(v) => updateGrade("nota_rec_global", v)}
            disabled={disabled}
            isEnabled={isRecGlobalEnabled}
            disabledReason="Global ≥ 60"
          />
          
          <div className="border-t border-border my-2" />
          
          {/* Final */}
          <GradeInput
            label="Final"
            value={grades.nota_final_examen}
            onChange={(v) => updateGrade("nota_final_examen", v)}
            disabled={disabled}
            isEnabled={isFinalEnabled}
            disabledReason="Global/Rec Global ≥ 60"
          />
        </div>
      )}
    </div>
  );
}
