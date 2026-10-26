import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, FileText, Copy, Loader2, BookOpen, ChevronRight, ArrowLeft } from "lucide-react";
import { TabeIconRenderer } from "@/components/notion/TabeIcons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Friend {
  user_id: string;
  nombre: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface FriendNote {
  id: string;
  titulo: string;
  emoji: string;
  subject_id: string | null;
  cover_url: string | null;
  subject?: {
    nombre: string;
    codigo: string;
    año: number;
  };
}

interface MySubject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: Friend[];
  mySubjects: MySubject[];
  onImport: (content: any, title: string, subjectId: string, emoji: string, coverUrl?: string | null, sourceDocId?: string) => Promise<void>;
  preselectedNote?: {
    id: string;
    titulo: string;
    emoji: string;
    subject_id: string | null;
    user_id: string;
    ownerName?: string;
    cover_url?: string | null;
    subject?: { nombre: string; codigo: string; año: number };
  } | null;
}

export function ImportFriendNoteModal({ open, onOpenChange, friends, mySubjects, onImport, preselectedNote }: Props) {
  const { user } = useAuth();

  // Step: "select-friend" | "select-note" | "select-subject"
  const [step, setStep] = useState<"select-friend" | "select-note" | "select-subject">("select-friend");

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendNotes, setFriendNotes] = useState<FriendNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selectedNote, setSelectedNote] = useState<FriendNote | null>(null);

  // Target subject selection
  const [targetYear, setTargetYear] = useState<string>("all");
  const [targetSubjectId, setTargetSubjectId] = useState<string>("");

  const [importing, setImporting] = useState(false);

  // Helper to auto-match user's subject with friend note's subject
  const autoMatchSubject = (noteSubject?: { nombre: string; codigo: string; año: number }) => {
    if (!noteSubject) return;
    const match = mySubjects.find(s => 
      (noteSubject.nombre && s.nombre && s.nombre.toLowerCase().trim() === noteSubject.nombre.toLowerCase().trim()) ||
      (noteSubject.codigo && s.codigo && s.codigo.toLowerCase().trim() === noteSubject.codigo.toLowerCase().trim())
    );
    if (match) {
      setTargetSubjectId(match.id);
      setTargetYear(match.año.toString());
    }
  };

  useEffect(() => {
    if (open) {
      if (preselectedNote) {
        setStep("select-subject");
        setSelectedNote({
          id: preselectedNote.id,
          titulo: preselectedNote.titulo,
          emoji: preselectedNote.emoji,
          subject_id: preselectedNote.subject_id,
          cover_url: preselectedNote.cover_url || null,
          subject: preselectedNote.subject,
        });
        autoMatchSubject(preselectedNote.subject);
      } else {
        setStep("select-friend");
        setSelectedFriend(null);
        setSelectedNote(null);
        setFriendNotes([]);
        setTargetSubjectId("");
        setTargetYear("all");
      }
    }
  }, [open, preselectedNote]);

  const myYears = useMemo(() => {
    const years = new Set<number>();
    mySubjects.forEach(s => {
      if (s.año) years.add(s.año);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [mySubjects]);

  const filteredSubjects = useMemo(() => {
    if (targetYear === "all") return mySubjects;
    return mySubjects.filter(s => s.año.toString() === targetYear);
  }, [mySubjects, targetYear]);

  const selectedTargetSubject = useMemo(() => {
    return mySubjects.find(s => s.id === targetSubjectId);
  }, [mySubjects, targetSubjectId]);

  const handleSelectFriend = async (friend: Friend) => {
    setSelectedFriend(friend);
    setLoadingNotes(true);
    setStep("select-note");

    try {
      const { data, error } = await supabase
        .from("notion_documents")
        .select(`
          id, titulo, emoji, subject_id, cover_url,
          subject:subjects(nombre, codigo, año)
        `)
        .eq("user_id", friend.user_id)
        .is("parent_id", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setFriendNotes((data || []) as FriendNote[]);
    } catch {
      toast.error("Error al cargar los apuntes del amigo");
      setFriendNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSelectNote = (note: FriendNote) => {
    setSelectedNote(note);
    setStep("select-subject");
    autoMatchSubject(note.subject);
  };

  const handleImport = () => {
    if (!selectedNote || !targetSubjectId) {
      toast.error("Seleccioná una materia de destino");
      return;
    }

    const noteToImport = selectedNote;
    const subjectId = targetSubjectId;
    const title = noteToImport.titulo || "Sin título";
    const toastId = `import-friend-note-${noteToImport.id}-${Date.now()}`;

    // 1. Cerrar el modal inmediatamente (sin esperas para el usuario)
    onOpenChange(false);

    // 2. Notificación en segundo plano no bloqueante
    toast.loading(`Descargando apunte "${title}" en segundo plano...`, {
      id: toastId,
      description: "Podés seguir navegando o escribiendo. Te avisaremos cuando esté listo.",
      duration: Infinity,
    });

    // 3. Descarga e importación en segundo plano
    (async () => {
      try {
        const { data, error } = await supabase
          .from("notion_documents")
          .select("contenido, titulo, emoji, cover_url")
          .eq("id", noteToImport.id)
          .single();

        if (error || !data) throw error || new Error("No se pudo obtener el contenido");

        await onImport(
          data.contenido,
          data.titulo || noteToImport.titulo || "Sin título",
          subjectId,
          data.emoji || noteToImport.emoji || "book",
          data.cover_url || noteToImport.cover_url || null,
          noteToImport.id
        );

        toast.success(`¡Apunte "${title}" importado con éxito!`, {
          id: toastId,
          description: "Ya podés abrirlo y editarlo desde tus notas.",
          duration: 4500,
        });
      } catch (err: any) {
        toast.error(`Error al importar el apunte "${title}"`, {
          id: toastId,
          description: err.message || "Error al conectar con la base de datos.",
          duration: 5000,
        });
      }
    })();
  };

  const noteTitle = preselectedNote?.titulo || selectedNote?.titulo || "Sin título";
  const noteEmoji = preselectedNote?.emoji || selectedNote?.emoji || "book";
  const ownerName = preselectedNote?.ownerName || selectedFriend?.nombre || selectedFriend?.username || "tu amigo";
  const originalSubject = preselectedNote?.subject || selectedNote?.subject;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-5 sm:p-6">
        <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Importar Apunte de Amigo
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Se guardará una copia editable e independiente en tus apuntes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator (when browsing from start) */}
        {!preselectedNote && (
          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/60 text-xs">
            {[
              { n: 1, label: "Amigo", stepId: "select-friend" },
              { n: 2, label: "Apunte", stepId: "select-note" },
              { n: 3, label: "Materia", stepId: "select-subject" },
            ].map((s, i) => {
              const isDone = (step === "select-note" && i === 0) ||
                             (step === "select-subject" && i <= 1);
              const isActive = step === s.stepId;
              return (
                <React.Fragment key={s.n}>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all",
                      isActive ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" :
                      isDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    )}>
                      {isDone ? "✓" : s.n}
                    </div>
                    <span className={cn("text-[11px] font-medium", isActive ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-400")}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Body Content */}
        <div className="py-3 min-h-[200px]">
          {/* Step 1: Select Friend */}
          {step === "select-friend" && (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Elegí un amigo de tu red:</p>
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-400 gap-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <Users className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-medium">Aún no tienes amigos agregados</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {friends.map(friend => (
                    <button
                      key={friend.user_id}
                      onClick={() => handleSelectFriend(friend)}
                      className="w-full flex items-center gap-3 p-2.5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-all text-left rounded-xl group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-semibold text-xs text-zinc-700 dark:text-zinc-300 shrink-0">
                        {(friend.nombre || friend.username || "A").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">{friend.nombre || friend.username || "Amigo"}</p>
                        {friend.username && <p className="text-[11px] text-zinc-400">@{friend.username}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Note */}
          {step === "select-note" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Apuntes de <strong className="text-zinc-900 dark:text-zinc-100">{ownerName}</strong>
                </p>
                <button
                  onClick={() => { setStep("select-friend"); setFriendNotes([]); }}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
              </div>

              {loadingNotes ? (
                <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Cargando apuntes...</span>
                </div>
              ) : friendNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400 gap-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-medium">Este compañero aún no tiene apuntes creados</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {friendNotes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className="w-full flex items-center gap-3 p-2.5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-all text-left rounded-xl group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-base">
                        <TabeIconRenderer iconId={note.emoji || "book"} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">{note.titulo || "Sin título"}</p>
                        {note.subject && (
                          <p className="text-[11px] text-zinc-400">
                            {note.subject.codigo || note.subject.nombre} · Año {note.subject.año}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Target Subject */}
          {step === "select-subject" && (
            <div className="space-y-3.5">
              {/* Note Preview Card */}
              <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
                  <TabeIconRenderer iconId={noteEmoji} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {noteTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-zinc-400">
                    <span>De: @{ownerName}</span>
                    {originalSubject && (
                      <span className="px-1.5 py-0.2 bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded font-medium">
                        {originalSubject.codigo || originalSubject.nombre}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!preselectedNote && (
                <button
                  onClick={() => setStep("select-note")}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Elegir otro apunte
                </button>
              )}

              {/* Subject Selection Area */}
              <div className="space-y-2.5 pt-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  ¿A qué materia querés asignarlo?
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Year Select */}
                  <div className="sm:col-span-1">
                    <Select value={targetYear} onValueChange={(v) => { setTargetYear(v); setTargetSubjectId(""); }}>
                      <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-xs rounded-lg">
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl shadow-md">
                        <SelectItem value="all">Todos los años</SelectItem>
                        {myYears.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}° Año</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject Select */}
                  <div className="sm:col-span-2">
                    <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                      <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-xs rounded-lg">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5 shrink-0 text-zinc-400" />
                        <SelectValue placeholder="Elegí materia..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl shadow-md max-h-56">
                        {filteredSubjects.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-zinc-400">Sin materias disponibles</div>
                        ) : (
                          filteredSubjects.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              <span className="text-zinc-400 mr-1.5">{s.codigo ? `[${s.codigo}]` : ''}</span>
                              {s.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Subject Preview Confirmation */}
                {selectedTargetSubject && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      Se guardará en: <strong>{selectedTargetSubject.nombre}</strong> (Año {selectedTargetSubject.año})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "select-subject" && (
          <DialogFooter className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={importing || !targetSubjectId}
              className="rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs"
            >
              {importing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Importando...</>
              ) : (
                <><Copy className="w-3.5 h-3.5 mr-1.5" /> Importar Copia</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
