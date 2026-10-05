import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileUp,
  FileText,
  FolderOpen,
  Loader2,
  Upload,
  X,
  Library,
  CheckCircle2,
} from "lucide-react";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

interface LibraryFolder {
  id: string;
  nombre: string;
  color: string;
  subject_id: string | null;
  parent_folder_id: string | null;
}

interface LibraryFile {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  subject_id: string | null;
  folder_id: string | null;
  subject?: { nombre: string; codigo: string; año: number };
}

interface ImportDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: any, title: string, subjectId: string | null) => void;
  userId: string;
}

export function ImportDocumentModal({
  open,
  onOpenChange,
  onImport,
  userId,
}: ImportDocumentModalProps) {
  const [mode, setMode] = useState<"upload" | "library">("upload");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolder[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const activeYears = useMemo(() => {
    const unique = [...new Set(subjects.map(s => Number(s.año)).filter(y => !isNaN(y) && y > 0))].sort((a, b) => a - b);
    return unique.filter(year => subjects.some(s => Number(s.año) === year));
  }, [subjects]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<LibraryFolder[]>([]);

  const [selectedLibraryFile, setSelectedLibraryFile] = useState<LibraryFile | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch library files when in library mode
  useEffect(() => {
    if (mode === "library" && open) {
      fetchLibraryFiles();
    }
  }, [mode, open]);

  const fetchLibraryFiles = async () => {
    setLoadingLibrary(true);
    try {
      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from("library_files")
        .select("*, subjects(nombre, codigo, año)")
        .in("tipo", ["pdf", "otro"])
        .order("nombre", { ascending: true });

      if (filesError) throw filesError;

      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from("library_folders")
        .select("*")
        .order("nombre", { ascending: true });

      if (foldersError) throw foldersError;

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("nombre", { ascending: true });

      if (subjectsError) throw subjectsError;

      setLibraryFiles((filesData || []).map((f: any) => ({ ...f, subject: f.subjects })));
      setLibraryFolders(foldersData || []);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error("Error fetching library data:", error);
      toast.error("Error al cargar la biblioteca");
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];
    const validExtensions = ["pdf", "docx", "doc", "pptx", "xlsx", "txt"];
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext || "")) {
      toast.error("Formato no soportado. Usa PDF, Word, PowerPoint, Excel o TXT.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo es muy grande. Máximo 20MB.");
      return;
    }

    setSelectedFile(file);
  };

  const processDocument = async (fileUrl: string, fileName: string, fileType: string, subjectId: string | null) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: { fileUrl, fileName, fileType },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Error al procesar documento");

      // Extract title from filename
      const title = fileName.replace(/\.[^.]+$/, "");

      onImport(data.content, title, subjectId);
      onOpenChange(false);
      resetState();
      toast.success("¡Documento importado exitosamente!");
    } catch (error: any) {
      console.error("Error processing document:", error);
      toast.error(error.message || "Error al procesar el documento");
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/imports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("library-files")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploading(false);
      // Use storagePath instead of URL for private bucket - edge function will download it
      await processDocumentFromStorage(filePath, selectedFile.name, selectedFile.type, null);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
      setUploading(false);
    }
  };

  const processDocumentFromStorage = async (storagePath: string, fileName: string, fileType: string, subjectId: string | null) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: { storagePath, fileName, fileType },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Error al procesar documento");

      // Extract title from filename
      const title = fileName.replace(/\.[^.]+$/, "");

      onImport(data.content, title, subjectId);
      onOpenChange(false);
      resetState();
      toast.success("¡Documento importado exitosamente!");
    } catch (error: any) {
      console.error("Error processing document:", error);
      toast.error(error.message || "Error al procesar el documento");
    } finally {
      setProcessing(false);
    }
  };

  const handleLibraryImport = async () => {
    if (!selectedLibraryFile) return;
    await processDocument(
      selectedLibraryFile.url,
      selectedLibraryFile.nombre,
      selectedLibraryFile.tipo,
      selectedLibraryFile.subject_id
    );
  };

  const resetState = () => {
    setSelectedFile(null);
    setSelectedLibraryFile(null);
    setSelectedYear(null);
    setSelectedSubjectId(null);
    setCurrentFolderId(null);
    setFolderPath([]);
    setMode("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const isProcessing = uploading || processing;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl bg-card border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-5 sm:p-6 text-foreground">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-display text-xl font-black uppercase tracking-wider text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF] border-2 border-foreground shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <span>Importar Documento</span>
          </DialogTitle>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-2 p-1.5 bg-muted/60 border-2 border-foreground rounded-xl">
          <button
            onClick={() => setMode("upload")}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              mode === "upload"
                ? "bg-[#FFE600] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000]"
                : "text-muted-foreground hover:text-foreground border-2 border-transparent"
            )}
          >
            <Upload className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span>Subir Archivo</span>
          </button>
          <button
            onClick={() => setMode("library")}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              mode === "library"
                ? "bg-[#FFE600] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000]"
                : "text-muted-foreground hover:text-foreground border-2 border-transparent"
            )}
          >
            <Library className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span>Desde Biblioteca</span>
          </button>
        </div>

        {/* Upload Mode */}
        {mode === "upload" && (
          <div className="space-y-4 pt-1">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={cn(
                "relative border-3 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all",
                dragActive
                  ? "border-primary bg-primary/10 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                  : selectedFile
                  ? "border-foreground bg-[#BFFF00]/15 shadow-[4px_4px_0_0_#000] border-solid"
                  : "border-foreground/30 hover:border-foreground hover:bg-muted/40 shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                isProcessing && "pointer-events-none opacity-60"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.pptx,.xlsx,.txt"
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#BFFF00] border-2 border-foreground shadow-[3px_3px_0_0_#000] flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-black stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-foreground line-clamp-1">{selectedFile.name}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-black uppercase text-destructive hover:bg-destructive/10 border border-destructive transition-colors"
                    >
                      Cambiar archivo
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-card border-2 border-foreground shadow-[3px_3px_0_0_#000] flex items-center justify-center">
                    <FileUp className="w-7 h-7 text-foreground" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-black text-base text-foreground">Arrastra un archivo aquí</p>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5">
                      o haz clic para explorar tu dispositivo
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-muted border border-foreground/30 text-[11px] font-bold text-muted-foreground">
                    PDF, Word (.docx), PPTX, Excel, TXT (hasta 20 MB)
                  </div>
                </div>
              )}
            </div>

            {/* Process Button */}
            <button
              onClick={handleUploadAndProcess}
              disabled={!selectedFile || isProcessing}
              className={cn(
                "w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-xs border-[3px] transition-all flex items-center justify-center gap-2",
                selectedFile && !isProcessing
                  ? "bg-[#00E5FF] text-black border-foreground shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none cursor-pointer"
                  : "bg-muted text-muted-foreground border-foreground/30 shadow-none cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                  <span>{uploading ? "Subiendo archivo..." : "Extrayendo bloques de apunte..."}</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 text-black shrink-0" strokeWidth={2.5} />
                  <span>Importar a Apuntes</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Library Mode */}
        {mode === "library" && (
          <div className="space-y-4 pt-1">
            {loadingLibrary ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-black uppercase text-muted-foreground tracking-wider">Cargando biblioteca...</p>
              </div>
            ) : (
              <>
                {/* Year Selection */}
                {!selectedYear && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Seleccionar Año</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map((year) => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className="p-4 rounded-xl bg-card hover:bg-[#FFE600] text-foreground hover:text-black border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all text-center group cursor-pointer"
                        >
                          <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">📅</span>
                          <span className="text-xs font-black uppercase tracking-wider">{year}° Año</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject Selection */}
                {selectedYear && !selectedSubjectId && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedYear(null)}
                      className="text-xs font-black uppercase text-primary hover:underline flex items-center gap-1 mb-2 cursor-pointer"
                    >
                      ← Volver a Años
                    </button>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {subjects.filter((s) => s.año === selectedYear).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-foreground/30 rounded-xl">
                          <p className="text-xs font-black uppercase">No hay materias registradas para este año</p>
                        </div>
                      ) : (
                        subjects
                          .filter((s) => s.año === selectedYear)
                          .map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubjectId(sub.id)}
                              className="w-full p-3 rounded-xl bg-card hover:bg-[#00E5FF]/20 text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 transition-all text-left flex items-center gap-3 cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[#00E5FF] text-black border border-foreground flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0_0_#000]">
                                {sub.codigo?.slice(0, 4) || "MAT"}
                              </div>
                              <span className="text-sm font-black truncate">{sub.nombre}</span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Folder & File Navigation */}
                {selectedSubjectId && (
                  <div className="space-y-3">
                    {/* Breadcrumbs for Subjects/Folders */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar font-bold">
                      <button
                        onClick={() => {
                          setSelectedSubjectId(null);
                          setCurrentFolderId(null);
                          setFolderPath([]);
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {subjects.find((s) => s.id === selectedSubjectId)?.nombre}
                      </button>
                      {folderPath.map((f, i) => (
                        <React.Fragment key={f.id}>
                          <span className="text-muted-foreground/50">/</span>
                          <button
                            onClick={() => {
                              const newPath = folderPath.slice(0, i + 1);
                              setFolderPath(newPath);
                              setCurrentFolderId(f.id);
                            }}
                            className={cn(
                              "transition-colors whitespace-nowrap cursor-pointer",
                              i === folderPath.length - 1 ? "text-primary font-black" : "text-muted-foreground hover:text-primary"
                            )}
                          >
                            {f.nombre}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {/* Sub-Folders */}
                      {libraryFolders
                        .filter((f) => f.subject_id === selectedSubjectId && f.parent_folder_id === currentFolderId)
                        .map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => {
                              setCurrentFolderId(folder.id);
                              setFolderPath((prev) => [...prev, folder]);
                            }}
                            className="w-full p-2.5 rounded-xl bg-card hover:bg-muted text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all flex items-center gap-3 text-left cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg border border-foreground flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#000]" style={{ backgroundColor: `${folder.color}25` }}>
                              <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
                            </div>
                            <span className="text-xs font-black truncate">{folder.nombre}</span>
                          </button>
                        ))}

                      {/* Files */}
                      {libraryFiles.filter((f) => f.subject_id === selectedSubjectId && f.folder_id === currentFolderId).length === 0 &&
                      libraryFolders.filter((f) => f.subject_id === selectedSubjectId && f.parent_folder_id === currentFolderId).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-foreground/30 rounded-xl">
                          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-foreground" />
                          <p className="text-xs font-black uppercase">Esta carpeta no contiene archivos</p>
                        </div>
                      ) : (
                        libraryFiles
                          .filter((f) => f.subject_id === selectedSubjectId && f.folder_id === currentFolderId)
                          .map((file) => (
                            <button
                              key={file.id}
                              onClick={() => setSelectedLibraryFile(file)}
                              className={cn(
                                "w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 border-2 border-foreground cursor-pointer",
                                selectedLibraryFile?.id === file.id
                                  ? "bg-[#00E5FF]/20 shadow-[3px_3px_0_0_#000] translate-x-1"
                                  : "bg-card hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                              )}
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 border border-foreground flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-black truncate flex-1 text-foreground">{file.nombre}</span>
                              {selectedLibraryFile?.id === file.id && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
                              )}
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLibraryImport}
                  disabled={!selectedLibraryFile || isProcessing}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-xs border-[3px] transition-all flex items-center justify-center gap-2 mt-4",
                    selectedLibraryFile && !isProcessing
                      ? "bg-[#00E5FF] text-black border-foreground shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none cursor-pointer"
                      : "bg-muted text-muted-foreground border-foreground/30 shadow-none cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                      <span>Extrayendo bloques de apunte...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 text-black shrink-0" strokeWidth={2.5} />
                      <span>Importar a Apuntes</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Info Pill */}
        <div className="pt-2 text-center">
          <p className="text-[11px] font-bold text-muted-foreground">
            El texto, encabezados y listas se convertirán en bloques nativos editables en tu apunte.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}