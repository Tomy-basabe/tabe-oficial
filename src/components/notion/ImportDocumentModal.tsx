import { useState, useRef, useCallback, useEffect } from "react";
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

interface LibraryFile {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  subject_id: string | null;
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
      const { data, error } = await supabase
        .from("library_files")
        .select("*, subjects(nombre, codigo, año)")
        .in("tipo", ["pdf", "otro"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((f: any) => ({
        ...f,
        subject: f.subjects,
      }));
      setLibraryFiles(mapped);
    } catch (error) {
      console.error("Error fetching library files:", error);
      toast.error("Error al cargar archivos de la biblioteca");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            Importar Documento
          </DialogTitle>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-2 p-1 bg-secondary rounded-lg">
          <button
            onClick={() => setMode("upload")}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              mode === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="w-4 h-4" />
            Subir Archivo
          </button>
          <button
            onClick={() => setMode("library")}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              mode === "library"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Library className="w-4 h-4" />
            Biblioteca
          </button>
        </div>

        {/* Upload Mode */}
        {mode === "upload" && (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                dragActive
                  ? "border-primary bg-primary/5"
                  : selectedFile
                  ? "border-neon-green bg-neon-green/5"
                  : "border-border hover:border-primary/50 hover:bg-secondary/50",
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
                  <div className="w-12 h-12 rounded-xl bg-neon-green/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-neon-green" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-sm text-destructive hover:underline"
                    >
                      Cambiar archivo
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <FileUp className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Arrastra un archivo aquí</p>
                    <p className="text-sm text-muted-foreground">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, PowerPoint, Excel, TXT (máx. 20MB)
                  </p>
                </div>
              )}
            </div>

            {/* Process Button */}
            <button
              onClick={handleUploadAndProcess}
              disabled={!selectedFile || isProcessing}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                selectedFile && !isProcessing
                  ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-background hover:shadow-lg"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploading ? "Subiendo..." : "Procesando documento..."}
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  Importar a Notion
                </>
              )}
            </button>
          </div>
        )}

        {/* Library Mode */}
        {mode === "library" && (
          <div className="space-y-4">
            {loadingLibrary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : libraryFiles.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No hay archivos en la biblioteca</p>
                <p className="text-sm text-muted-foreground">Sube un PDF o Word primero</p>
              </div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {libraryFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedLibraryFile(file)}
                      disabled={isProcessing}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all flex items-center gap-3",
                        selectedLibraryFile?.id === file.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.nombre}</p>
                        {file.subject && (
                          <p className="text-xs text-primary">
                            {file.subject.codigo} • {file.subject.año}° año
                          </p>
                        )}
                      </div>
                      {selectedLibraryFile?.id === file.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleLibraryImport}
                  disabled={!selectedLibraryFile || isProcessing}
                  className={cn(
                    "w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                    selectedLibraryFile && !isProcessing
                      ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-background hover:shadow-lg"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando documento...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      Importar a Notion
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          El contenido del documento se convertirá en bloques editables de Notion
        </p>
      </DialogContent>
    </Dialog>
  );
}