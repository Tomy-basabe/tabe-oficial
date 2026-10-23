import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BookOpen,
  ArrowLeft,
  X, FileUp } from "lucide-react";
import { toast } from "sonner";
import { TabeLogo } from "@/components/ui/TabeLogo";
import {
  parseCareerPlanWithAI,
  ParsedSubject,
  CareerPlanAIResult,
} from "@/services/aiCareerPlanParser";

interface AICareerImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: {
    careerName?: string;
    facultad?: string;
    subjects: ParsedSubject[];
    replaceExisting?: boolean;
  }) => Promise<void>;
  existingSubjectsCount?: number;
}

export function AICareerImportModal({
  open,
  onClose,
  onImport,
  existingSubjectsCount = 0,
}: AICareerImportModalProps) {
  // Steps: 'upload' | 'processing' | 'review'
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [, setExtractedPlan] = useState<CareerPlanAIResult | null>(null);
  const [careerName, setCareerName] = useState("");
  const [facultad, setFacultad] = useState("");
  const [editableSubjects, setEditableSubjects] = useState<ParsedSubject[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(existingSubjectsCount > 0);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setFiles([]);
    setAdditionalNotes("");
    setProgressMsg("");
    setExtractedPlan(null);
    setCareerName("");
    setFacultad("");
    setEditableSubjects([]);
    setReplaceExisting(existingSubjectsCount > 0);
    setIsSaving(false);
  };

  const handleClose = () => {
    if (step === "processing") return;
    resetState();
    onClose();
  };

  const handleFileChange = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validExtensions = ["xlsx", "xls", "csv", "pdf", "png", "jpg", "jpeg", "webp"];
    const addedFiles: File[] = [];

    Array.from(newFiles).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (validExtensions.includes(ext) || file.type.startsWith("image/") || file.type === "application/pdf") {
        addedFiles.push(file);
      } else {
        toast.error(`Formato no soportado: "${file.name}". Subí archivos Excel (.xlsx, .csv), PDF o Imágenes (.png, .jpg).`);
      }
    });

    if (addedFiles.length > 0) {
      setFiles((prev) => [...prev, ...addedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessFiles = async () => {
    if (files.length === 0) {
      toast.error("Selecciona al menos un archivo para analizar");
      return;
    }

    setStep("processing");
    setProgressMsg("Iniciando análisis inteligente de tu plan...");

    try {
      const result = await parseCareerPlanWithAI(
        files,
        additionalNotes,
        (msg) => setProgressMsg(msg)
      );

      setExtractedPlan(result);
      setCareerName(result.careerName || "Mi Carrera");
      setFacultad(result.facultad || "");
      setEditableSubjects(result.subjects);
      setStep("review");
      toast.success(`¡Se detectaron ${result.subjects.length} materias con éxito!`);
    } catch (err: any) {
      console.error("Error processing career plan with AI:", err);
      toast.error(err.message || "Error al analizar los archivos");
      setStep("upload");
    }
  };

  const handleUpdateSubject = (id: string, field: keyof ParsedSubject, value: any) => {
    setEditableSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleDeleteSubject = (id: string) => {
    setEditableSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddBlankSubject = () => {
    const maxYear = editableSubjects.reduce((m, s) => Math.max(m, s.año), 1);
    const newSub: ParsedSubject = {
      id: crypto.randomUUID(),
      nombre: "NUEVA MATERIA",
      codigo: "NUEVA",
      año: maxYear,
      numero_materia: editableSubjects.length + 1,
      requiere_regular: [],
      requiere_aprobada: [],
    };
    setEditableSubjects((prev) => [...prev, newSub]);
  };

  const handleFinalConfirm = async () => {
    if (editableSubjects.length === 0) {
      toast.error("El plan no contiene materias para importar");
      return;
    }

    setIsSaving(true);
    try {
      await onImport({
        careerName: careerName.trim() || "Mi Carrera",
        facultad: facultad.trim() || undefined,
        subjects: editableSubjects,
        replaceExisting,
      });
      handleClose();
    } catch (err: any) {
      console.error("Error final import:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Group editable subjects by Year
  const uniqueYears = Array.from(new Set(editableSubjects.map((s) => s.año))).sort((a, b) => a - b);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["xlsx", "xls", "csv"].includes(ext || "")) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (ext === "pdf") {
      return <FileText className="w-4 h-4 text-rose-500" />;
    }
    return <ImageIcon className="w-4 h-4 text-sky-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSaving && step !== "processing" && !v && handleClose()}>
      <DialogContent className="w-full max-w-4xl sm:w-[92vw] bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              IA Asistida
            </span>
            <span className="text-xs text-zinc-400">
              {step === "upload" ? "Paso 1: Archivos" : step === "processing" ? "Paso 2: Procesando" : "Paso 3: Verificación"}
            </span>
          </div>
          <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-1">
            <BookOpen className="w-4 h-4 text-zinc-500" />
            Cargar plan de carrera con IA
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sube planillas Excel, archivos PDF o capturas de tu programa y la IA generará el plan con correlatividades automáticamente.
          </p>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Drag and drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFileChange(e.dataTransfer.files);
                }}
                className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors group flex flex-col items-center justify-center gap-2.5"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    Arrastra tus archivos aquí o haz clic para buscar
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Formatos soportados: Excel (.xlsx, .csv), PDF (.pdf), Imágenes (.png, .jpg, .webp)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.pdf,image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                />
              </div>

              {/* Uploaded files list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Archivos seleccionados ({files.length})</span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Quitar todos
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {getFileIcon(file.name)}
                          <div className="truncate">
                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
                            <p className="text-[10px] text-zinc-400">
                              {(file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Aclaraciones opcionales (Universidad, Orientación, Plan)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Ej: Licenciatura en Administración, Plan 2023, UBA. Hay materias optativas que aún no cursé."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs resize-none"
                />
              </div>

              {/* Informative Box */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 block">¿Cómo funciona?</span>
                  El modelo procesa la estructura de tu plan, identificando materias, años correspondientes y las correlativas necesarias para cursar o rendir. Podrás revisar y ajustar el resultado antes de confirmar la importación.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === "processing" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <TabeLogo size={36} className="opacity-90 select-none pointer-events-none" />
              </div>

              <div className="max-w-md space-y-1.5">
                <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                  Procesando tu plan de carrera
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 min-h-[18px]">
                  {progressMsg}
                </p>
              </div>

              <div className="w-full max-w-xs h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT */}
          {step === "review" && (
            <div className="space-y-5">
              {/* Career Metadata Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg">
                <div>
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Nombre de la carrera
                  </label>
                  <input
                    type="text"
                    value={careerName}
                    onChange={(e) => setCareerName(e.target.value)}
                    placeholder="Ej: Ingeniería en Sistemas"
                    className="w-full px-2.5 py-1.5 rounded-md border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#1e1e1e] text-xs font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Facultad / Universidad (Opcional)
                  </label>
                  <input
                    type="text"
                    value={facultad}
                    onChange={(e) => setFacultad(e.target.value)}
                    placeholder="Ej: UTN, UBA, UNLP"
                    className="w-full px-2.5 py-1.5 rounded-md border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#1e1e1e] text-xs font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  />
                </div>
              </div>

              {/* Metrics Pill Bar */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  {editableSubjects.length} materias
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  {uniqueYears.length} años
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                  {editableSubjects.reduce((acc, s) => acc + s.requiere_regular.length, 0)} regulares
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {editableSubjects.reduce((acc, s) => acc + s.requiere_aprobada.length, 0)} aprobadas
                </span>
              </div>

              {/* Grouped Subjects */}
              <div className="space-y-4">
                {uniqueYears.map((yearNum) => {
                  const yearSubs = editableSubjects.filter((s) => s.año === yearNum);
                  return (
                    <div key={yearNum} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          Año {yearNum}
                        </span>
                        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          ({yearSubs.length} materias)
                        </h4>
                      </div>

                      <div className="space-y-1.5">
                        {yearSubs.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-2.5 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              {/* Codigo */}
                              <input
                                type="text"
                                value={sub.codigo}
                                onChange={(e) => handleUpdateSubject(sub.id!, "codigo", e.target.value.toUpperCase())}
                                className="sm:col-span-3 px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-mono uppercase text-center shadow-2xs"
                                placeholder="CÓDIGO"
                              />

                              {/* Nombre */}
                              <input
                                type="text"
                                value={sub.nombre}
                                onChange={(e) => handleUpdateSubject(sub.id!, "nombre", e.target.value)}
                                className="sm:col-span-7 px-2.5 py-1 bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-2xs"
                                placeholder="Nombre de la materia"
                              />

                              {/* Año Select */}
                              <select
                                value={sub.año}
                                onChange={(e) => handleUpdateSubject(sub.id!, "año", parseInt(e.target.value) || 1)}
                                className="sm:col-span-2 px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium shadow-2xs"
                              >
                                {[1, 2, 3, 4, 5, 6].map((y) => (
                                  <option key={y} value={y}>
                                    Año {y}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Dependencies chips */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0 max-w-sm">
                              {sub.requiere_regular.length > 0 && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 rounded border border-sky-500/20"
                                  title={`Requiere regular: ${sub.requiere_regular.join(", ")}`}
                                >
                                  Reg: {sub.requiere_regular.join(", ")}
                                </span>
                              )}
                              {sub.requiere_aprobada.length > 0 && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-500/20"
                                  title={`Requiere aprobada: ${sub.requiere_aprobada.join(", ")}`}
                                >
                                  Aprob: {sub.requiere_aprobada.join(", ")}
                                </span>
                              )}
                              {sub.requiere_regular.length === 0 && sub.requiere_aprobada.length === 0 && (
                                <span className="text-[10px] text-zinc-400">
                                  Sin correlativas
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(sub.id!)}
                                className="p-1 text-zinc-400 hover:text-rose-500 transition-colors ml-1"
                                title="Eliminar materia"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBlankSubject}
                  className="w-full text-xs font-medium border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar otra materia manualmente
                </Button>
              </div>

              {/* Option to replace existing if count > 0 */}
              {existingSubjectsCount > 0 && (
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-xs">
                      Ya tienes {existingSubjectsCount} materias cargadas
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span>Reemplazar completamente mis materias existentes por este nuevo plan</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0 flex flex-row items-center justify-between gap-2">
          {step === "upload" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg h-auto py-2 px-3.5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleProcessFiles}
                disabled={files.length === 0}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium rounded-lg h-auto py-2 px-3.5 shadow-2xs transition-colors"
              >
                <FileUp className="w-3.5 h-3.5 mr-1.5" />
                Analizar con IA ({files.length})
              </Button>
            </>
          )}

          {step === "processing" && (
            <div className="w-full text-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Por favor espera un momento, no cierres esta ventana...
              </span>
            </div>
          )}

          {step === "review" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={isSaving}
                className="text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg h-auto py-2 px-3.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Atrás
              </Button>
              <Button
                type="button"
                onClick={handleFinalConfirm}
                disabled={isSaving || editableSubjects.length === 0}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium rounded-lg h-auto py-2 px-3.5 shadow-2xs transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar e importar ({editableSubjects.length})
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
