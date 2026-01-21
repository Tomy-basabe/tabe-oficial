import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Image, Link as LinkIcon, Upload, Plus, 
  Trash2, ExternalLink, Download, Filter, FolderOpen 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LibraryFile {
  id: string;
  nombre: string;
  tipo: "pdf" | "imagen" | "link" | "video" | "otro";
  url: string;
  storage_path: string | null;
  tamaño_bytes: number | null;
  subject_id: string | null;
  created_at: string;
  subject?: { nombre: string; codigo: string; año: number };
}

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

const fileTypeIcons = {
  pdf: FileText,
  imagen: Image,
  link: LinkIcon,
  video: FileText,
  otro: FileText,
};

const fileTypeColors = {
  pdf: "text-neon-red bg-neon-red/20",
  imagen: "text-neon-green bg-neon-green/20",
  link: "text-neon-cyan bg-neon-cyan/20",
  video: "text-neon-purple bg-neon-purple/20",
  otro: "text-muted-foreground bg-secondary",
};

export default function Library() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [uploadSubject, setUploadSubject] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchSubjects();
      fetchFiles();
    }
  }, [user]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("año", { ascending: true });
    
    if (!error && data) {
      setSubjects(data);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("library_files")
      .select("*, subjects(nombre, codigo, año)")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      const mapped = data.map((d: any) => ({ ...d, subject: d.subjects }));
      setFiles(mapped as LibraryFile[]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !uploadSubject) return;

    setUploading(true);
    try {
      // Determine file type
      let tipo: "pdf" | "imagen" | "otro" = "otro";
      if (file.type === "application/pdf") tipo = "pdf";
      else if (file.type.startsWith("image/")) tipo = "imagen";

      // For now, we'll create a local object URL (in production, use Supabase Storage)
      const objectUrl = URL.createObjectURL(file);

      const { error } = await supabase
        .from("library_files")
        .insert({
          user_id: user.id,
          subject_id: uploadSubject,
          nombre: file.name,
          tipo,
          url: objectUrl,
          tamaño_bytes: file.size,
        });

      if (error) throw error;

      toast.success("¡Archivo subido exitosamente!");
      fetchFiles();
      setShowUploadModal(false);
      setUploadSubject("");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const addLink = async () => {
    if (!user || !uploadSubject || !linkUrl.trim() || !linkName.trim()) return;

    try {
      const { error } = await supabase
        .from("library_files")
        .insert({
          user_id: user.id,
          subject_id: uploadSubject,
          nombre: linkName.trim(),
          tipo: "link",
          url: linkUrl.trim(),
        });

      if (error) throw error;

      toast.success("¡Link agregado exitosamente!");
      fetchFiles();
      setShowLinkModal(false);
      setUploadSubject("");
      setLinkUrl("");
      setLinkName("");
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Error al agregar el link");
    }
  };

  const deleteFile = async (id: string) => {
    const { error } = await supabase
      .from("library_files")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error al eliminar el archivo");
    } else {
      toast.success("Archivo eliminado");
      fetchFiles();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter(file => {
    const matchesYear = !selectedYear || file.subject?.año === selectedYear;
    const matchesSubject = !selectedSubject || file.subject_id === selectedSubject;
    const matchesType = !selectedType || file.tipo === selectedType;
    return matchesYear && matchesSubject && matchesType;
  });

  const filteredSubjects = subjects.filter(s => !selectedYear || s.año === selectedYear);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Biblioteca
          </h1>
          <p className="text-muted-foreground mt-1">
            Todos tus recursos de estudio en un solo lugar
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Agregar Link
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Subir Archivo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Year Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              !selectedYear ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            )}
          >
            Todos
          </button>
          {[1, 2, 3, 4, 5].map(year => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year); setSelectedSubject(null); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedYear === year ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Año {year}
            </button>
          ))}
        </div>

        {/* Subject Filter */}
        {selectedYear && (
          <select
            value={selectedSubject || ""}
            onChange={(e) => setSelectedSubject(e.target.value || null)}
            className="px-4 py-2 bg-secondary rounded-lg text-sm border border-border"
          >
            <option value="">Todas las materias</option>
            {filteredSubjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.nombre}
              </option>
            ))}
          </select>
        )}

        {/* Type Filter */}
        <div className="flex gap-2">
          {["pdf", "imagen", "link"].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                selectedType === type 
                  ? fileTypeColors[type as keyof typeof fileTypeColors]
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              {type === "pdf" && <FileText className="w-4 h-4" />}
              {type === "imagen" && <Image className="w-4 h-4" />}
              {type === "link" && <LinkIcon className="w-4 h-4" />}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-gamer rounded-xl p-4 animate-pulse">
              <div className="w-12 h-12 bg-secondary rounded-lg mb-4" />
              <div className="h-4 bg-secondary rounded mb-2" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No hay archivos en tu biblioteca</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Subir primer archivo
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => {
            const Icon = fileTypeIcons[file.tipo];
            const colors = fileTypeColors[file.tipo];

            return (
              <div key={file.id} className="card-gamer rounded-xl p-4 group relative">
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{file.nombre}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {file.subject?.nombre || "Sin materia"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Año {file.subject?.año}</span>
                  <span>{formatFileSize(file.tamaño_bytes)}</span>
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-secondary rounded-lg hover:bg-secondary/80"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-2 bg-neon-red/20 text-neon-red rounded-lg hover:bg-neon-red/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text">Subir Archivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Año</label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setUploadSubject(""); }}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedYear === year ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}
                  >
                    {year}°
                  </button>
                ))}
              </div>
            </div>

            {selectedYear && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Materia</label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border"
                >
                  <option value="">Seleccionar materia</option>
                  {filteredSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              onClick={() => uploadSubject && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                uploadSubject
                  ? "border-primary/50 hover:border-primary bg-primary/5"
                  : "border-border opacity-50 cursor-not-allowed"
              )}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {uploading ? "Subiendo..." : "Click para seleccionar archivo"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, imágenes (máx 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={!uploadSubject || uploading}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text">Agregar Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Año</label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setUploadSubject(""); }}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedYear === year ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}
                  >
                    {year}°
                  </button>
                ))}
              </div>
            </div>

            {selectedYear && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Materia</label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border"
                >
                  <option value="">Seleccionar materia</option>
                  {filteredSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Nombre del recurso</label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Ej: Video explicativo - Tema 1"
                className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border"
              />
            </div>

            <button
              onClick={addLink}
              disabled={!uploadSubject || !linkUrl.trim() || !linkName.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
            >
              Agregar Link
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
