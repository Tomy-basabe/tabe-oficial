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
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
      const { data: filesData, error: filesError } = await supabase
        .from("library_files")
        .select("*, subjects(nombre, codigo, año)")
        .in("tipo", ["pdf", "otro"])
        .order("nombre", { ascending: true });

      if (filesError) throw filesError;

      const { data: foldersData, error: foldersError } = await supabase
        .from("library_folders")
        .select("*")
        .order("nombre", { ascending: true });

      if (foldersError) throw foldersError;

      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("año", { ascending: true })
        .order("nombre", { ascending: true });

      if (subjectsError) throw subjectsError;

      setLibraryFiles((filesData || []) as LibraryFile[]);
      setLibraryFolders((foldersData || []) as LibraryFolder[]);
      setSubjects((subjectsData || []) as Subject[]);
    } catch {
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = [".pdf", ".docx", ".doc", ".pptx", ".xlsx", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast.error("Formato no soportado", {
        description: "Formatos permitidos: PDF, Word (.docx), PPTX, Excel, TXT",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Archivo demasiado grande", {
        description: "El tamaño máximo permitido es de 20 MB",
      });
      return;
    }

    setSelectedFile(file);
  };

  const parseTextToTipTap = (text: string, title: string) => {
    const lines = text.split("\n");
    const contentNodes: any[] = [];

    contentNodes.push({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: title }],
    });

    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        contentNodes.push({
          type: "paragraph",
          content: [{ type: "text", text: currentParagraph.join(" ") }],
        });
        currentParagraph = [];
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        continue;
      }

      if (/^#{1,3}\s+/.test(line)) {
        flushParagraph();
        const level = (line.match(/^#+/)?.[0]?.length || 2) as 1 | 2 | 3;
        const text = line.replace(/^#+\s*/, "");
        contentNodes.push({
          type: "heading",
          attrs: { level: Math.min(level + 1, 3) },
          content: [{ type: "text", text }],
        });
        continue;
      }

      if (/^[•\-\*]\s+/.test(line)) {
        flushParagraph();
        const text = line.replace(/^[•\-\*]\s*/, "");
        contentNodes.push({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text }],
                },
              ],
            },
          ],
        });
        continue;
      }

      if (/^\d+[\.\)]\s+/.test(line)) {
        flushParagraph();
        const text = line.replace(/^\d+[\.\)]\s*/, "");
        contentNodes.push({
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text }],
                },
              ],
            },
          ],
        });
        continue;
      }

      currentParagraph.push(line);
    }

    flushParagraph();

    return {
      type: "doc",
      content: contentNodes.length > 1 ? contentNodes : [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: title }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: text.slice(0, 5000) || "Documento importado." }],
        },
      ],
    };
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");

    try {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();

      if (ext === "txt") {
        const text = await selectedFile.text();
        const tiptapDoc = parseTextToTipTap(text, fileName);
        onImport(tiptapDoc, fileName, null);
        handleClose(false);
        toast.success("Documento importado correctamente");
        return;
      }

      const fileExt = selectedFile.name.split(".").pop();
      const storagePath = `imports/${userId}/${Date.now()}-${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("library-files")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploading(false);
      setProcessing(true);

      const { data: funcData, error: funcError } = await supabase.functions.invoke(
        "process-library-file",
        {
          body: {
            storage_path: storagePath,
            tipo: fileExt,
            nombre: fileName,
          },
        }
      );

      if (funcError) throw funcError;

      const extractedText = funcData?.extracted_text || "";

      if (extractedText) {
        const tiptapDoc = parseTextToTipTap(extractedText, fileName);
        onImport(tiptapDoc, fileName, null);
        handleClose(false);
        toast.success("Documento procesado e importado con éxito");
      } else {
        const fallbackDoc = {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: fileName }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Archivo importado desde: " + selectedFile.name + ". Contenido pendiente de procesamiento.",
                },
              ],
            },
          ],
        };
        onImport(fallbackDoc, fileName, null);
        handleClose(false);
        toast.info("Documento creado", {
          description: "El contenido se procesará en segundo plano.",
        });
      }
    } catch {
      toast.error("Error al procesar el archivo");
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleLibraryImport = async () => {
    if (!selectedLibraryFile) return;

    setProcessing(true);
    const fileName = selectedLibraryFile.nombre.replace(/\.[^/.]+$/, "");

    try {
      const response = await fetch(selectedLibraryFile.url);
      if (!response.ok) throw new Error("No se pudo descargar el archivo de la biblioteca");

      const blob = await response.blob();
      const file = new File([blob], selectedLibraryFile.nombre, { type: blob.type });

      setSelectedFile(file);
      setMode("upload");

      const fallbackDoc = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: fileName }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Documento vinculado desde la biblioteca: " + selectedLibraryFile.nombre,
              },
            ],
          },
        ],
      };

      onImport(fallbackDoc, fileName, selectedLibraryFile.subject_id);
      handleClose(false);
      toast.success("Archivo de la biblioteca importado a tus apuntes");
    } catch {
      toast.error("Error al importar el archivo de la biblioteca");
    } finally {
      setProcessing(false);
    }
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
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-5 sm:p-6 text-zinc-900 dark:text-zinc-100">
        <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
          <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
              <FileUp className="w-4 h-4" />
            </div>
            <span>Importar Documento</span>
          </DialogTitle>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl my-2">
          <button
            onClick={() => setMode("upload")}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
              mode === "upload"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Subir Archivo</span>
          </button>
          <button
            onClick={() => setMode("library")}
            disabled={isProcessing}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
              mode === "library"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <Library className="w-3.5 h-3.5 shrink-0" />
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
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                dragActive
                  ? "border-primary bg-primary/5"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5 border-solid"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/30",
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
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{selectedFile.name}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
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
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      Cambiar archivo
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">Arrastra un archivo aquí</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      o haz clic para explorar tu dispositivo
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-500 font-medium">
                    PDF, Word (.docx), PPTX, TXT (hasta 20 MB)
                  </span>
                </div>
              )}
            </div>

            {/* Process Button */}
            <Button
              onClick={handleUploadAndProcess}
              disabled={!selectedFile || isProcessing}
              className="w-full h-9.5 rounded-xl font-medium text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploading ? "Subiendo archivo..." : "Extrayendo bloques..."}</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  <span>Importar a Apuntes</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Library Mode */}
        {mode === "library" && (
          <div className="space-y-3 pt-1">
            {loadingLibrary ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                <p className="text-xs text-zinc-500">Cargando biblioteca...</p>
              </div>
            ) : (
              <>
                {/* Year Selection */}
                {!selectedYear && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Seleccionar Año</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map((year) => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800/80 transition-all text-center group cursor-pointer"
                        >
                          <span className="text-xl block mb-0.5">📚</span>
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{year}° Año</span>
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
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 mb-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Volver a Años
                    </button>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {subjects.filter((s) => s.año === selectedYear).length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                          No hay materias registradas para este año
                        </div>
                      ) : (
                        subjects
                          .filter((s) => s.año === selectedYear)
                          .map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubjectId(sub.id)}
                              className="w-full p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800/70 transition-all text-left flex items-center gap-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center font-medium text-[10px] shrink-0">
                                {sub.codigo?.slice(0, 3) || "MAT"}
                              </div>
                              <span className="text-xs font-medium truncate text-zinc-800 dark:text-zinc-200">{sub.nombre}</span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Folder & File Navigation */}
                {selectedSubjectId && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs text-zinc-500">
                      <button
                        onClick={() => {
                          setSelectedSubjectId(null);
                          setCurrentFolderId(null);
                          setFolderPath([]);
                        }}
                        className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {subjects.find((s) => s.id === selectedSubjectId)?.nombre}
                      </button>
                      {folderPath.map((f, i) => (
                        <React.Fragment key={f.id}>
                          <span className="text-zinc-400">/</span>
                          <button
                            onClick={() => {
                              const newPath = folderPath.slice(0, i + 1);
                              setFolderPath(newPath);
                              setCurrentFolderId(f.id);
                            }}
                            className={cn(
                              "transition-colors whitespace-nowrap cursor-pointer",
                              i === folderPath.length - 1 ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                          >
                            {f.nombre}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
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
                            className="w-full p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800/70 transition-all flex items-center gap-2.5 text-left cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4 text-zinc-400" />
                            <span className="text-xs font-medium truncate text-zinc-800 dark:text-zinc-200">{folder.nombre}</span>
                          </button>
                        ))}

                      {/* Files */}
                      {libraryFiles.filter((f) => f.subject_id === selectedSubjectId && f.folder_id === currentFolderId).length === 0 &&
                      libraryFolders.filter((f) => f.subject_id === selectedSubjectId && f.parent_folder_id === currentFolderId).length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                          Esta carpeta no contiene archivos
                        </div>
                      ) : (
                        libraryFiles
                          .filter((f) => f.subject_id === selectedSubjectId && f.folder_id === currentFolderId)
                          .map((file) => (
                            <button
                              key={file.id}
                              onClick={() => setSelectedLibraryFile(file)}
                              className={cn(
                                "w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 border cursor-pointer",
                                selectedLibraryFile?.id === file.id
                                  ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                                  : "bg-white dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800/70 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                              )}
                            >
                              <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                              <span className="text-xs font-medium truncate flex-1 text-zinc-800 dark:text-zinc-200">{file.nombre}</span>
                              {selectedLibraryFile?.id === file.id && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleLibraryImport}
                  disabled={!selectedLibraryFile || isProcessing}
                  className="w-full h-9.5 rounded-xl font-medium text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs flex items-center justify-center gap-2 mt-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extrayendo bloques...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Importar a Apuntes</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Info text */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-zinc-400">
            Los encabezados, párrafos y listas se convertirán en bloques nativos editables.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
