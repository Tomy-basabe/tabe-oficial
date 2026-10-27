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
  Upload,
  FileText,
  Calendar,
  Check,
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
  Info,
  ChevronRight,
  Layers
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

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setStep("upload");
    setIsDragging(false);
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
      ComicAudio.playFanfare();
      toast.success("Plan analizado correctamente");
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
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  // Calculate active partial IDs
  const activePartialIds = useMemo(() => {
    const selectedExtras = extraPartials.filter(p => p.selected !== false).map(p => p.id);
    return ["P1", "P2", ...selectedExtras];
  }, [extraPartials]);

  // Total percentage sum
  const totalWeightsSum = useMemo(() => {
    if (!enableWeights) return 100;
    return activePartialIds.reduce((acc, id) => acc + (Number(weights[id]) || 0), 0);
  }, [enableWeights, activePartialIds, weights]);

  const handleWeightChange = (id: string, value: string) => {
    const num = value === "" ? 0 : Math.max(0, Math.min(100, parseInt(value, 10) || 0));
    setWeights(prev => ({
      ...prev,
      [id]: num,
    }));
  };

  const handleDistributeWeightsEvenly = () => {
    ComicAudio.playPop();
    const count = activePartialIds.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const nextWeights: Record<string, number> = {};
    activePartialIds.forEach((id, i) => {
      nextWeights[id] = base + (i < remainder ? 1 : 0);
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

    if (enableWeights && totalWeightsSum !== 100) {
      toast.error(`La suma de ponderaciones debe ser exactamente 100% (actual: ${totalWeightsSum}%).`);
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
          notas: e.descripcion ? `${e.descripcion}\n(Configurado desde Plan de Materia)` : "Configurado desde Plan de Materia",
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

      // Merge newly selected extra partials without duplicates
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

      ComicAudio.playFanfare();
      toast.success("Plan de materia aplicado", {
        description: `${selectedEvents.length} eventos agendados y estructura configurada.`,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-xl rounded-2xl">
        {/* Header estilo Notion / Apple */}
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs tracking-tight mb-1">
            <span className="font-medium text-zinc-900 dark:text-zinc-200">{subject.nombre}</span>
            <span>/</span>
            <span>Año {subject.año}</span>
            {subject.codigo && (
              <>
                <span>/</span>
                <span className="font-mono text-[11px]">{subject.codigo}</span>
              </>
            )}
          </div>
          <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <FileText className="w-4 h-4" />
            </div>
            <span>Plan de Materia</span>
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Sube el programa o cronograma de la cátedra para sincronizar evaluaciones, estructura de parciales y ponderación de notas.
          </p>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-4 pt-3">
            {/* File drop zone estilo Notion/Apple */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  const incoming = Array.from(e.dataTransfer.files);
                  setFiles(prev => [...prev, ...incoming]);
                  ComicAudio.playPop();
                }
              }}
              className={cn(
                "border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
                isDragging
                  ? "border-zinc-500 dark:border-zinc-400 bg-zinc-100/60 dark:bg-zinc-800/50 scale-[1.005]"
                  : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/70"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center mx-auto mb-2.5 text-zinc-600 dark:text-zinc-300">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Arrastra o selecciona tus archivos
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Admite PDFs, planillas Excel (.xlsx, .csv) e imágenes o capturas (.png, .jpg)
              </p>
            </div>

            {/* Uploaded files list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Archivos adjuntos ({files.length})</span>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="hover:underline text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    Quitar todos
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {files.map((file, idx) => {
                    const ext = file.name.split(".").pop()?.toLowerCase() || "";
                    const isPdf = ext === "pdf";
                    const isExcel = ["xlsx", "xls", "csv"].includes(ext);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            {isPdf && <FileText className="w-3.5 h-3.5 text-rose-500" />}
                            {isExcel && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                            {!isPdf && !isExcel && <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{file.name}</span>
                          <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-rose-500 transition-colors"
                          title="Eliminar archivo"
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
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Notas o aclaraciones de la cursada</span>
                <span className="text-[10px] text-zinc-400 font-normal">Opcional</span>
              </label>
              <textarea
                rows={3}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Pega texto del reglamento, requisitos de regularidad o fechas dictadas en clase..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all font-sans leading-relaxed"
              />
            </div>

            {/* Helper callout estilo Notion */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p>
                  Puedes cargar 1 documento consolidado o varios archivos por separado (ej: programa de contenidos, cronograma semanal y fotos de apuntes). Toda la información se integra de forma unificada y deduplicada.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || (files.length === 0 && pastedText.trim().length === 0)}
                className="flex items-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{progressStep || "Analizando contenido..."}</span>
                  </>
                ) : (
                  <>
                    <span>Analizar contenido</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & SELECT */}
        {step === "review" && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* Summary card estilo Notion Callout */}
            {aiResult?.resumenRegimen && (
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-3 border-l-3 border-l-zinc-900 dark:border-l-zinc-100">
                <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Régimen detectado:</span>
                  <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{aiResult.resumenRegimen}</p>
                </div>
              </div>
            )}

            {/* SECTION 1: CALENDAR EVENTS */}
            <div className="space-y-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50/40 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    1. Evaluaciones a agendar ({events.filter(e => e.selected !== false).length}/{events.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleAllEvents(true)}
                    className="text-zinc-700 dark:text-zinc-300 hover:underline font-medium"
                  >
                    Marcar todos
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
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
                <p className="text-xs text-zinc-500 py-3 italic text-center">
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
                          "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all duration-150",
                          isSelected
                            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs"
                            : "bg-zinc-100/40 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-0 w-3.5 h-3.5 pointer-events-none"
                          />
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0"
                            style={{
                              backgroundColor: `${getColorForType(ev.tipo_examen)}15`,
                              color: getColorForType(ev.tipo_examen),
                              borderColor: `${getColorForType(ev.tipo_examen)}30`,
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
            <div className="space-y-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50/40 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    2. Estructura de parciales
                  </span>
                </div>
                {extraPartials.length > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    +{extraPartials.filter(p => p.selected !== false).length} adicionales
                  </span>
                )}
              </div>

              {extraPartials.length === 0 ? (
                <p className="text-xs text-zinc-500 py-1">
                  La cátedra utiliza la estructura habitual de 2 parciales (P1 y P2). No se requieren parciales extra.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Se detectaron más de 2 parciales requeridos. Puedes desmarcar los que no correspondan:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {extraPartials.map((p, idx) => {
                      const isSelected = p.selected !== false;
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors",
                            isSelected
                              ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs"
                              : "bg-zinc-100/40 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExtraPartial(idx)}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{p.id}</span>
                            <span className="text-zinc-500 dark:text-zinc-400 truncate">({p.nombre})</span>
                          </div>
                          {p.incluyeRecuperatorio && (
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">c/ Recup.</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: GRADE WEIGHTS (%) ESTILO APPLE / NOTION */}
            <div className="space-y-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50/40 dark:bg-zinc-900/30">
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
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-0 w-3.5 h-3.5"
                  />
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      3. Ponderación de parciales (%)
                    </span>
                  </div>
                </label>

                {enableWeights && (
                  <span className={cn(
                    "text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border",
                    totalWeightsSum === 100
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                  )}>
                    {totalWeightsSum === 100 ? "Total: 100% ✓" : `Total: ${totalWeightsSum}%`}
                  </span>
                )}
              </div>

              {enableWeights && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                  {/* Barra de progreso segmentada estilo Linear/Apple */}
                  <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex">
                    {activePartialIds.map((id, idx) => {
                      const val = Number(weights[id]) || 0;
                      if (val <= 0) return null;
                      const colors = ["bg-zinc-900 dark:bg-zinc-100", "bg-zinc-600 dark:bg-zinc-400", "bg-zinc-400 dark:bg-zinc-600", "bg-zinc-500 dark:bg-zinc-500"];
                      const segmentColor = colors[idx % colors.length];
                      return (
                        <div
                          key={id}
                          style={{ width: `${Math.min(100, val)}%` }}
                          className={cn("h-full transition-all border-r border-white/20 dark:border-black/20", segmentColor)}
                          title={`${id}: ${val}%`}
                        />
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activePartialIds.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs shadow-2xs"
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
                            className="w-12 px-1.5 py-0.5 text-center text-xs font-mono font-medium rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={handleDistributeWeightsEvenly}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline flex items-center gap-1 font-medium transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Distribuir en partes iguales ({Math.floor(100 / activePartialIds.length)}% c/u)
                    </button>
                    {totalWeightsSum !== 100 && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {totalWeightsSum < 100 ? `Resta ${100 - totalWeightsSum}%` : `Exceso de ${totalWeightsSum - 100}%`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep("upload")}
                disabled={applyingChanges}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                Volver a cargar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={applyingChanges}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={applyingChanges || (enableWeights && totalWeightsSum !== 100)}
                  className="flex items-center gap-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applyingChanges ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Aplicando cambios...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Aplicar a la materia</span>
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
