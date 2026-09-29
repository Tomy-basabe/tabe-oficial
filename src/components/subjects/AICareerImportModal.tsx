import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  BookOpen,
  ArrowLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [extractedPlan, setExtractedPlan] = useState<CareerPlanAIResult | null>(null);
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
      return <FileSpreadsheet className="w-5 h-5 text-[#25d06c]" />;
    }
    if (ext === "pdf") {
      return <FileText className="w-5 h-5 text-[#ff4e4e]" />;
    }
    return <ImageIcon className="w-5 h-5 text-[#1475e5]" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSaving && step !== "processing" && !v && handleClose()}>
      <DialogContent className="w-full max-w-4xl sm:w-[92vw] bg-card border-[3px] border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] rounded-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b-[3px] border-foreground bg-yellow-50/40 dark:bg-muted/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-[10px] uppercase border-2 border-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]">
              IA POWERED
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {step === "upload" ? "Paso 1: Subida de archivos" : step === "processing" ? "Paso 2: Procesando" : "Paso 3: Verificación"}
            </span>
          </div>
          <DialogTitle className="font-black text-xl sm:text-2xl uppercase tracking-wider text-foreground flex items-center gap-2 mt-1">
            <Sparkles className="w-6 h-6 text-[#ffd21c] fill-[#ffd21c]" />
            Cargar Plan de Carrera con IA
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Subí planillas Excel, archivos PDF o capturas/fotos de tu plan de estudios y la IA armará tu malla con correlativas al instante.
          </p>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-5">
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
                className="border-[3px] border-dashed border-foreground/60 hover:border-foreground bg-muted/20 hover:bg-muted/40 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3 shadow-[4px_4px_0_0_transparent] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#ffd21c] border-[3px] border-foreground flex items-center justify-center shadow-[3px_3px_0_0_#000] group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-black stroke-[2.5]" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-wide text-foreground">
                    Arrastrá tus archivos o hacé clic acá
                  </p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
                    Formatos soportados: Excel (.xlsx, .xls, .csv), PDF (.pdf), Imágenes (.png, .jpg, .webp)
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
                  <p className="text-xs font-black uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span>Archivos seleccionados ({files.length})</span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-[10px] text-destructive hover:underline font-bold"
                    >
                      Quitar todos
                    </button>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-card border-[2px] border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {getFileIcon(file.name)}
                          <div className="truncate">
                            <p className="text-xs font-black text-foreground truncate">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold">
                              {(file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground block mb-1.5">
                  Aclaraciones opcionales (Universidad, Orientación, Plan)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Ej: Licenciatura en Administración, Plan 2023, UBA. Hay materias optativas que aún no cursé."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-background border-[2px] border-foreground rounded-xl text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ffd21c] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                />
              </div>

              {/* Informative Box */}
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border-[2px] border-[#1475e5] rounded-xl flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-[#1475e5] shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-foreground leading-relaxed">
                  <span className="font-black text-[#1475e5] block uppercase">¿Cómo funciona?</span>
                  Nuestros modelos de Visión e IA leen la estructura de tu plan, detectan cada materia, su año correspondiente y las materias correlativas necesarias para cursar o rendir. Luego podrás revisar y ajustar todo antes de guardar.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-[#ffd21c] border-4 border-foreground shadow-[6px_6px_0_0_#000] flex items-center justify-center animate-bounce">
                  <TabeLogo size={52} className="drop-shadow-sm select-none pointer-events-none" />
                </div>
              </div>

              <div className="max-w-md space-y-2">
                <h3 className="font-black text-xl uppercase tracking-wider text-foreground">
                  Procesando tu Plan de Carrera
                </h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-h-[20px]">
                  {progressMsg}
                </p>
              </div>

              <div className="w-full max-w-sm h-3 bg-secondary rounded-full overflow-hidden border-2 border-foreground">
                <div className="h-full bg-[#25d06c] rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT */}
          {step === "review" && (
            <div className="space-y-6">
              {/* Career Metadata Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/30 border-[2px] border-foreground rounded-xl">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-foreground block mb-1">
                    Nombre de la Carrera
                  </label>
                  <input
                    type="text"
                    value={careerName}
                    onChange={(e) => setCareerName(e.target.value)}
                    placeholder="Ej: Ingeniería en Sistemas"
                    className="w-full px-3 py-2 bg-background border-[2px] border-foreground rounded-lg font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-foreground block mb-1">
                    Facultad / Universidad (Opcional)
                  </label>
                  <input
                    type="text"
                    value={facultad}
                    onChange={(e) => setFacultad(e.target.value)}
                    placeholder="Ej: UTN, UBA, UNLP"
                    className="w-full px-3 py-2 bg-background border-[2px] border-foreground rounded-lg font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  />
                </div>
              </div>

              {/* Metrics Pill Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-[#ffd21c] text-black border-[2px] border-foreground shadow-[2px_2px_0_0_#000] rounded-lg text-xs font-black uppercase">
                  {editableSubjects.length} Materias
                </span>
                <span className="px-3 py-1 bg-[#1475e5] text-white border-[2px] border-foreground shadow-[2px_2px_0_0_#000] rounded-lg text-xs font-black uppercase">
                  {uniqueYears.length} Años Académicos
                </span>
                <span className="px-3 py-1 bg-blue-500 text-white border-[2px] border-foreground shadow-[2px_2px_0_0_#000] rounded-lg text-xs font-black uppercase">
                  {editableSubjects.reduce((acc, s) => acc + s.requiere_regular.length, 0)} Regulares
                </span>
                <span className="px-3 py-1 bg-[#25d06c] text-black border-[2px] border-foreground shadow-[2px_2px_0_0_#000] rounded-lg text-xs font-black uppercase">
                  {editableSubjects.reduce((acc, s) => acc + s.requiere_aprobada.length, 0)} Aprobadas
                </span>
              </div>

              {/* Grouped Subjects */}
              <div className="space-y-5">
                {uniqueYears.map((yearNum) => {
                  const yearSubs = editableSubjects.filter((s) => s.año === yearNum);
                  return (
                    <div key={yearNum} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-foreground text-background flex items-center justify-center font-black text-xs">
                          {yearNum}
                        </span>
                        <h4 className="font-black text-sm uppercase tracking-wider text-foreground">
                          Año {yearNum} ({yearSubs.length} materias)
                        </h4>
                      </div>

                      <div className="space-y-2">
                        {yearSubs.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-3 bg-card border-[2px] border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              {/* Codigo */}
                              <input
                                type="text"
                                value={sub.codigo}
                                onChange={(e) => handleUpdateSubject(sub.id!, "codigo", e.target.value.toUpperCase())}
                                className="sm:col-span-3 px-2 py-1 bg-background border-[2px] border-foreground rounded-md text-xs font-black uppercase text-center"
                                placeholder="CÓDIGO"
                              />

                              {/* Nombre */}
                              <input
                                type="text"
                                value={sub.nombre}
                                onChange={(e) => handleUpdateSubject(sub.id!, "nombre", e.target.value)}
                                className="sm:col-span-7 px-2.5 py-1 bg-background border-[2px] border-foreground rounded-md text-xs font-black"
                                placeholder="Nombre de la materia"
                              />

                              {/* Año Select */}
                              <select
                                value={sub.año}
                                onChange={(e) => handleUpdateSubject(sub.id!, "año", parseInt(e.target.value) || 1)}
                                className="sm:col-span-2 px-2 py-1 bg-background border-[2px] border-foreground rounded-md text-xs font-black uppercase"
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
                                  className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded border border-blue-400"
                                  title={`Requiere regular: ${sub.requiere_regular.join(", ")}`}
                                >
                                  Reg: {sub.requiere_regular.join(", ")}
                                </span>
                              )}
                              {sub.requiere_aprobada.length > 0 && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-400"
                                  title={`Requiere aprobada: ${sub.requiere_aprobada.join(", ")}`}
                                >
                                  Aprob: {sub.requiere_aprobada.join(", ")}
                                </span>
                              )}
                              {sub.requiere_regular.length === 0 && sub.requiere_aprobada.length === 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 text-muted-foreground/60">
                                  Sin correlativas
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(sub.id!)}
                                className="p-1 hover:bg-destructive/10 text-destructive rounded-lg transition-colors ml-1"
                                title="Eliminar materia"
                              >
                                <Trash2 className="w-4 h-4" />
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
                  className="w-full text-xs font-black uppercase border-[2px] border-foreground"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar otra materia manualmente
                </Button>
              </div>

              {/* Option to replace existing if count > 0 */}
              {existingSubjectsCount > 0 && (
                <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border-[2px] border-amber-500 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="font-black text-xs uppercase tracking-wide">
                      Ya tenés {existingSubjectsCount} materias cargadas
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-foreground accent-[#ffd21c]"
                    />
                    <span>Reemplazar completamente mis materias existentes por este nuevo plan</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t-[3px] border-foreground bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2">
          {step === "upload" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="text-xs font-black uppercase border-[2px] border-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleProcessFiles}
                disabled={files.length === 0}
                className="bg-[#25d06c] text-black hover:bg-[#25d06c]/90 text-xs font-black uppercase border-[2px] border-foreground shadow-[2px_2px_0_0_#000]"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 fill-black" />
                Analizar con IA ({files.length})
              </Button>
            </>
          )}

          {step === "processing" && (
            <div className="w-full text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Por favor esperá un momento, no cierres esta ventana...
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
                className="text-xs font-black uppercase border-[2px] border-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Atrás
              </Button>
              <Button
                type="button"
                onClick={handleFinalConfirm}
                disabled={isSaving || editableSubjects.length === 0}
                className="bg-[#ffd21c] text-black hover:bg-[#ffd21c]/90 text-xs font-black uppercase border-[2px] border-foreground shadow-[2px_2px_0_0_#000]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Confirmar e Importar Plan ({editableSubjects.length})
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
