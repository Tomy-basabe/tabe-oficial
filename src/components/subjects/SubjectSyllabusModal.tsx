import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubjectWithStatus, ExtraPartial } from "@/hooks/useSubjects";
import {
  parseSubjectSyllabusWithAI,
  SyllabusParsedResult,
  SyllabusDetectedEvent,
  SyllabusDetectedPartial
} from "@/services/aiSubjectSyllabusParser";
import {
  Sparkles,
  Upload,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Scale,
  Clock,
  BookOpen,
  ArrowRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getColorForType, invalidateCalendarCache } from "@/hooks/useCalendarEvents";

interface SubjectSyllabusModalProps {
  open: boolean;
  onClose: () => void;
  subject: SubjectWithStatus;
  onSuccess?: () => void;
}

export function SubjectSyllabusModal({
  open,
  onClose,
  subject,
  onSuccess
}: SubjectSyllabusModalProps) {
  const { user, isGuest } = useAuth();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [applyingChanges, setApplyingChanges] = useState(false);

  // Review step state
  const [aiResult, setAiResult] = useState<SyllabusParsedResult | null>(null);
  const [events, setEvents] = useState<SyllabusDetectedEvent[]>([]);
  const [extraPartials, setExtraPartials] = useState<SyllabusDetectedPartial[]>([]);
  const [enableWeights, setEnableWeights] = useState(true);
  const [weights, setWeights] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setStep("upload");
    setFiles([]);
    setPastedText("");
    setLoading(false);
    setProgressStep("");
    setApplyingChanges(false);
    setAiResult(null);
    setEvents([]);
    setExtraPartials([]);
    setEnableWeights(true);
    setWeights({});
  };

  const handleClose = () => {
    if (loading || applyingChanges) return;
    resetAll();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    setFiles(prev => [...prev, ...incoming]);
    ComicAudio.playPop();
  };

  const removeFile = (index: number) => {
    ComicAudio.playPop();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0 && pastedText.trim().length === 0) {
      toast.error("Por favor agrega al menos un archivo (PDF, Excel, Imagen) o escribe/pega el texto del plan.");
      return;
    }

    setLoading(true);
    ComicAudio.playPowerUp();

    try {
      const result = await parseSubjectSyllabusWithAI({
        subjectName: subject.nombre,
        files,
        pastedText: pastedText.trim() || undefined,
        onProgress: (p) => setProgressStep(p),
      });

      setAiResult(result);
      setEvents(result.eventosDetectados);
      setExtraPartials(result.parcialesExtraSugeridos);
      setWeights(result.pesosSugeridos || {});
      setEnableWeights(Object.keys(result.pesosSugeridos || {}).length > 0);
      setStep("review");
      ComicAudio.playWin();
      toast.success("¡Plan analizado con éxito por TABE AI!");
    } catch (err: any) {
      console.error("Error analyzing syllabus:", err);
      toast.error(err?.message || "Ocurrió un error al analizar el plan de la materia.");
    } finally {
      setLoading(false);
      setProgressStep("");
    }
  };

  // Toggle single event checkbox
  const toggleEvent = (index: number) => {
    ComicAudio.playPop();
    setEvents(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const toggleAllEvents = (selectAll: boolean) => {
    ComicAudio.playPop();
    setEvents(prev => prev.map(ev => ({ ...ev, selected: selectAll })));
  };

  // Toggle extra partial
  const toggleExtraPartial = (index: number) => {
    ComicAudio.playPop();
    setExtraPartials(prev => {
      const copy = [...prev];
      const target = copy[index];
      const nextSelected = !target.selected;
      copy[index] = { ...target, selected: nextSelected };

      // Coherence rule: If a partial is deselected, remove it from active weights
      if (!nextSelected) {
        setWeights(currentW => {
          const nextW = { ...currentW };
          delete nextW[target.id];
          return nextW;
        });
      } else {
        // If re-selected and weights enabled, add it back evenly
        setWeights(currentW => ({ ...currentW, [target.id]: 0 }));
      }

      return copy;
    });
  };

  // Active partial IDs that are actually selected/available
  const activePartialIds = useMemo(() => {
    const base = ["P1", "P2"];
    const extra = extraPartials.filter(p => p.selected !== false).map(p => p.id);
    return [...base, ...extra];
  }, [extraPartials]);

  // Total sum of active weights
  const totalWeightsSum = useMemo(() => {
    if (!enableWeights) return 0;
    return activePartialIds.reduce((acc, id) => acc + (Number(weights[id]) || 0), 0);
  }, [enableWeights, activePartialIds, weights]);

  const handleWeightChange = (id: string, valStr: string) => {
    const val = parseFloat(valStr);
    const num = isNaN(val) || val < 0 ? 0 : Math.min(100, val);
    setWeights(prev => ({ ...prev, [id]: num }));
  };

  const handleDistributeWeightsEvenly = () => {
    ComicAudio.playPop();
    const count = activePartialIds.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const rem = 100 - base * count;
    const nextWeights: Record<string, number> = {};
    activePartialIds.forEach((id, idx) => {
      nextWeights[id] = base + (idx < rem ? 1 : 0);
    });
    setWeights(nextWeights);
  };

  // Apply all selected changes to database
  const handleApplyChanges = async () => {
    if (isGuest) {
      toast.error("No puedes guardar cambios en modo invitado");
      return;
    }
    if (!user) {
      toast.error("Debes iniciar sesión para guardar cambios");
      return;
    }

    // Coherence check: if weights are enabled, they must sum to 100%
    if (enableWeights && totalWeightsSum !== 100) {
      toast.error(`La suma de pesos debe ser exactamente 100% (actualmente suma ${totalWeightsSum}%). Puedes tocar 'Distribuir equitativo' para ajustarla automáticamente.`);
      return;
    }

    setApplyingChanges(true);
    ComicAudio.playPowerUp();

    try {
      // 1. Insert selected events into calendar_events
      const selectedEvents = events.filter(e => e.selected !== false);
      if (selectedEvents.length > 0) {
        const eventsToInsert = selectedEvents.map(e => ({
          user_id: user.id,
          subject_id: subject.id,
          titulo: e.titulo,
          fecha: e.fecha,
          hora: e.hora || null,
          tipo_examen: e.tipo_examen,
          notas: e.descripcion ? `${e.descripcion}\n(Agendado desde Plan de Materia)` : "Agendado desde Plan de Materia por TABE AI",
          is_all_day: !e.hora,
          color: getColorForType(e.tipo_examen),
        }));

        const { error: eventError } = await supabase
          .from("calendar_events")
          .insert(eventsToInsert);

        if (eventError) {
          console.error("Error inserting syllabus calendar events:", eventError);
          throw new Error("No se pudieron agendar los eventos en el calendario.");
        }
        invalidateCalendarCache(user.id);
      }

      // 2. Update user_subject_status with extra partials & weights
      const selectedExtras = extraPartials.filter(p => p.selected !== false);

      // Fetch existing status to merge cleanly
      const { data: statusRow } = await supabase
        .from("user_subject_status")
        .select("*")
        .eq("user_id", user.id)
        .eq("subject_id", subject.id)
        .maybeSingle();

      const existingRawExtras = statusRow?.extra_partials;
      let existingPartials: ExtraPartial[] = [];
      let existingGlobals: any[] = [];
      let existingFinals: any[] = [];

      if (existingRawExtras) {
        if (Array.isArray(existingRawExtras)) {
          existingPartials = existingRawExtras;
        } else if (typeof existingRawExtras === "object") {
          existingPartials = Array.isArray(existingRawExtras.partials) ? existingRawExtras.partials : [];
          existingGlobals = Array.isArray(existingRawExtras.globals) ? existingRawExtras.globals : [];
          existingFinals = Array.isArray(existingRawExtras.finals) ? existingRawExtras.finals : [];
        }
      }

      // Merge newly selected extra partials without duplicating IDs
      const mergedPartials = [...existingPartials];
      selectedExtras.forEach(sp => {
        if (!mergedPartials.some(ep => ep.id === sp.id)) {
          mergedPartials.push({
            id: sp.id,
            nota: null,
            rec: null,
          });
        }
      });

      // Prepare final weights payload
      const finalWeightsPayload: Record<string, number> = {};
      if (enableWeights) {
        activePartialIds.forEach(id => {
          if (weights[id] !== undefined) {
            finalWeightsPayload[id] = weights[id];
          }
        });
      }

      const updatedExtrasJson = {
        partials: mergedPartials,
        globals: existingGlobals,
        finals: existingFinals,
        grade_weights: enableWeights && Object.keys(finalWeightsPayload).length > 0 ? finalWeightsPayload : undefined,
      };

      if (statusRow) {
        const { error: updateError } = await supabase
          .from("user_subject_status")
          .update({
            extra_partials: updatedExtrasJson,
          })
          .eq("id", statusRow.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("user_subject_status")
          .insert({
            user_id: user.id,
            subject_id: subject.id,
            estado: "cursable",
            extra_partials: updatedExtrasJson,
          });

        if (insertError) throw insertError;
      }

      ComicAudio.playWin();
      toast.success("¡Plan de materia aplicado correctamente!", {
        description: `${selectedEvents.length} eventos agendados y parciales/pesos configurados.`,
      });

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error("Error applying syllabus changes:", err);
      toast.error(err?.message || "Ocurrió un error al aplicar los cambios.");
    } finally {
      setApplyingChanges(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
        <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{subject.nombre}</span>
            <span>•</span>
            <span>Año {subject.año}</span>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            Plan de Materia con TABE AI
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sube el programa, cronograma o syllabus para autoconfigurar eventos en calendario, cantidad de parciales y ponderación de notas.
          </p>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-4 pt-2">
            {/* File drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/70"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-2 text-zinc-600 dark:text-zinc-300">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Arrastra o haz clic para subir archivos
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Admite PDFs, Excel (.xlsx, .csv) y fotos o capturas (.png, .jpg)
              </p>
            </div>

            {/* Uploaded files list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Archivos seleccionados ({files.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {files.map((file, idx) => {
                    const isPdf = file.name.endsWith(".pdf");
                    const isExcel = [".xlsx", ".xls", ".csv"].some(ext => file.name.endsWith(ext));
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          {isPdf && <FileText className="w-4 h-4 text-rose-500 shrink-0" />}
                          {isExcel && <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {!isPdf && !isExcel && <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />}
                          <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{file.name}</span>
                          <span className="text-[10px] text-zinc-400">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paste text section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>O copia y pega el texto del régimen / cronograma</span>
                <span className="text-[10px] text-zinc-400 font-normal">Opcional</span>
              </label>
              <textarea
                rows={3}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Ejemplo: 'Régimen de evaluación: 4 parciales con recuperatorios. P1 (25%), P2 (25%), P3 (25%), P4 (25%). 1° Parcial: 15 de mayo 18:00 hs...'"
                className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
            </div>

            {/* Helper callout */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>¿Qué detecta TABE AI?</strong>
                <p className="mt-0.5">
                  Extraerá las fechas de parciales, recuperatorios, TPs y globales para el calendario; si hay más de 2 parciales los agregará a tu planilla, y configurará el peso (%) de cada examen para tu promedio. Podrás revisar y desmarcar lo que no quieras antes de guardar.
                </p>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || (files.length === 0 && pastedText.trim().length === 0)}
                className="flex items-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-lg px-4 py-2 text-xs font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{progressStep || "Analizando con IA..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Analizar Plan de Materia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & SELECT */}
        {step === "review" && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* Summary card */}
            {aiResult?.resumenRegimen && (
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Régimen detectado por TABE AI:</span>
                  <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">{aiResult.resumenRegimen}</p>
                </div>
              </div>
            )}

            {/* SECTION 1: CALENDAR EVENTS */}
            <div className="space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    1. Eventos a agendar en el Calendario ({events.filter(e => e.selected !== false).length}/{events.length})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleAllEvents(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Marcar todos
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => toggleAllEvents(false)}
                    className="text-zinc-500 hover:underline"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {events.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2 italic text-center">
                  No se detectaron fechas específicas en el documento.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {events.map((ev, idx) => {
                    const isSelected = ev.selected !== false;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => toggleEvent(idx)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                          isSelected
                            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            : "bg-zinc-100/50 dark:bg-zinc-900/20 border-zinc-200/50 dark:border-zinc-800/50 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-zinc-300 text-primary focus:ring-primary w-3.5 h-3.5 pointer-events-none"
                          />
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
                            style={{
                              backgroundColor: `${getColorForType(ev.tipo_examen)}20`,
                              color: getColorForType(ev.tipo_examen),
                              borderColor: `${getColorForType(ev.tipo_examen)}40`,
                              borderWidth: 1,
                            }}
                          >
                            {ev.tipo_examen}
                          </span>
                          <div className="truncate">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate">
                              {ev.titulo}
                            </span>
                            {ev.descripcion && (
                              <span className="text-[10px] text-zinc-400 block truncate">
                                {ev.descripcion}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          <span>{ev.fecha}</span>
                          {ev.hora && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {ev.hora}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: EXTRA PARTIALS STRUCTURE */}
            <div className="space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    2. Estructura de Parciales en Planilla (Por defecto: P1 y P2)
                  </span>
                </div>
                {extraPartials.length > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    +{extraPartials.filter(p => p.selected !== false).length} adicionales
                  </span>
                )}
              </div>

              {extraPartials.length === 0 ? (
                <p className="text-xs text-zinc-500 py-1">
                  La materia utiliza la estructura estándar de 2 parciales (P1 y P2). No se requieren parciales extra.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Se detectaron más de 2 parciales en el plan. Desmarca los que no desees incorporar a tu libreta:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extraPartials.map((p, idx) => {
                      const isSelected = p.selected !== false;
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                            isSelected
                              ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                              : "bg-zinc-100/50 dark:bg-zinc-900/20 border-zinc-200/50 dark:border-zinc-800/50 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExtraPartial(idx)}
                              className="rounded border-zinc-300 text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{p.id}</span>
                            <span className="text-zinc-500 dark:text-zinc-400 truncate">({p.nombre})</span>
                          </div>
                          {p.incluyeRecuperatorio && (
                            <span className="text-[10px] text-zinc-400 shrink-0">c/ Recup.</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: GRADE WEIGHTS (%) */}
            <div className="space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableWeights}
                    onChange={(e) => {
                      ComicAudio.playPop();
                      setEnableWeights(e.target.checked);
                      if (e.target.checked && Object.keys(weights).length === 0) {
                        handleDistributeWeightsEvenly();
                      }
                    }}
                    className="rounded border-zinc-300 text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      3. Peso porcentual de cada parcial para el promedio (%)
                    </span>
                  </div>
                </label>

                {enableWeights && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    totalWeightsSum === 100
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  )}>
                    {totalWeightsSum === 100 ? "Total: 100% ✓" : `Total: ${totalWeightsSum}%`}
                  </span>
                )}
              </div>

              {enableWeights && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Ajusta el porcentaje que aportará cada parcial de tu cursada. Debe sumar exactamente 100%:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activePartialIds.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between bg-white dark:bg-zinc-900 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs"
                      >
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {id}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={weights[id] ?? ""}
                            onChange={(e) => handleWeightChange(id, e.target.value)}
                            placeholder="%"
                            className="w-12 px-1 py-0.5 text-center text-xs font-semibold rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-zinc-400">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={handleDistributeWeightsEvenly}
                      className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className="w-3 h-3" /> Distribuir equitativo ({Math.floor(100 / activePartialIds.length)}% c/u)
                    </button>
                    {totalWeightsSum !== 100 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">
                        {totalWeightsSum < 100 ? `Falta ${100 - totalWeightsSum}%` : `Excedido por ${totalWeightsSum - 100}%`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep("upload")}
                disabled={applyingChanges}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                Volver a subir
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={applyingChanges}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={applyingChanges || (enableWeights && totalWeightsSum !== 100)}
                  className="flex items-center gap-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-lg px-4 py-2 text-xs font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applyingChanges ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Aplicando cambios...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Aplicar cambios a la materia</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
