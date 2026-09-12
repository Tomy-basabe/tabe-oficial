import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, FileText, Copy, Loader2, BookOpen, ChevronRight } from "lucide-react";
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
  // Pre-selected note (when clicking "Importar" from a card)
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

  // Subject selection
  const [targetYear, setTargetYear] = useState<string>("all");
  const [targetSubjectId, setTargetSubjectId] = useState<string>("");

  const [importing, setImporting] = useState(false);

  // Helper to auto-match subject
  const autoMatchSubject = (noteSubject?: { nombre: string; codigo: string; año: number }) => {
    if (!noteSubject) return;
    const match = mySubjects.find(s => 
      (noteSubject.nombre && s.nombre && s.nombre.toLowerCase().trim() === noteSubject.nombre.toLowerCase().trim()) ||
      (noteSubject.codigo && s.codigo && s.codigo.toLowerCase().trim() === noteSubject.codigo.toLowerCase().trim())
    );
    if (match) {
      setTargetYear(match.año.toString());
      setTargetSubjectId(match.id);
    }
  };

  // Unique years from my subjects
  const myYears = useMemo(() => {
    const years = new Set<number>();
    mySubjects.forEach(s => years.add(s.año));
    return Array.from(years).sort((a, b) => a - b);
  }, [mySubjects]);

  const filteredSubjects = useMemo(() => {
    if (targetYear === "all") return mySubjects;
    return mySubjects.filter(s => s.año.toString() === targetYear);
  }, [mySubjects, targetYear]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(preselectedNote ? "select-subject" : "select-friend");
        setSelectedFriend(null);
        setFriendNotes([]);
        setSelectedNote(null);
        setTargetYear("all");
        setTargetSubjectId("");
      }, 300);
    } else {
      if (preselectedNote) {
        // Skip straight to subject selection
        setStep("select-subject");
        setSelectedNote(preselectedNote as any);
        autoMatchSubject(preselectedNote.subject);
      } else {
        setStep("select-friend");
      }
    }
  }, [open, preselectedNote]);

  const handleSelectFriend = async (friend: Friend) => {
    setSelectedFriend(friend);
    setStep("select-note");
    setLoadingNotes(true);

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
    } catch (err) {
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

  const handleImport = async () => {
    if (!selectedNote || !targetSubjectId) {
      toast.error("Seleccioná una materia de destino");
      return;
    }

    setImporting(true);
    try {
      // Fetch full content and details of the note
      const { data, error } = await supabase
        .from("notion_documents")
        .select("contenido, titulo, emoji, cover_url")
        .eq("id", selectedNote.id)
        .single();

      if (error || !data) throw error || new Error("No se pudo obtener el contenido");

      await onImport(
        data.contenido,
        data.titulo || selectedNote.titulo || "Sin título",
        targetSubjectId,
        data.emoji || selectedNote.emoji || "📝",
        data.cover_url || selectedNote.cover_url || null,
        selectedNote.id
      );

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al importar el apunte");
    } finally {
      setImporting(false);
    }
  };

  const noteTitle = preselectedNote?.titulo || selectedNote?.titulo || "";
  const ownerName = preselectedNote?.ownerName || selectedFriend?.nombre || selectedFriend?.username || "tu amigo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card text-foreground border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b-4 border-foreground bg-[#BFFF00]">
          <DialogTitle className="font-black text-black text-xl uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0">
              <Copy className="w-5 h-5 text-[#BFFF00]" />
            </div>
            Importar Apunte de Amigo
          </DialogTitle>
          <p className="text-black/70 font-bold text-sm mt-1">
            Crea una copia independiente en tus apuntes
          </p>
        </DialogHeader>

        {/* Step indicator */}
        {!preselectedNote && (
          <div className="flex items-center gap-0 px-6 pt-4">
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
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full border-2 border-foreground flex items-center justify-center text-xs font-black transition-all",
                      isActive ? "bg-foreground text-background" :
                      isDone ? "bg-[#BFFF00] text-black" : "bg-muted text-muted-foreground"
                    )}>
                      {isDone ? "✓" : s.n}
                    </div>
                    <span className={cn("text-xs font-bold uppercase", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 min-h-[220px]">

          {/* Step 1: Select Friend */}
          {step === "select-friend" && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase text-muted-foreground mb-3">Elegí un amigo</p>
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
                  <Users className="w-10 h-10 opacity-40" />
                  <p className="font-bold text-sm">No tienes amigos agregados</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {friends.map(friend => (
                    <button
                      key={friend.user_id}
                      onClick={() => handleSelectFriend(friend)}
                      className="w-full flex items-center gap-3 p-3 bg-background border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-left rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#C688EB] border-2 border-black flex items-center justify-center font-black text-black text-lg shrink-0">
                        {(friend.nombre || friend.username || "A").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-foreground truncate">{friend.nombre || friend.username || "Amigo"}</p>
                        {friend.username && <p className="text-xs text-muted-foreground font-bold">@{friend.username}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Note */}
          {step === "select-note" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase text-muted-foreground">
                  Apuntes de <span className="text-foreground">{ownerName}</span>
                </p>
                <button
                  onClick={() => { setStep("select-friend"); setFriendNotes([]); }}
                  className="text-xs font-black uppercase text-primary hover:underline"
                >
                  ← Volver
                </button>
              </div>

              {loadingNotes ? (
                <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-bold text-sm">Cargando apuntes...</span>
                </div>
              ) : friendNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
                  <FileText className="w-10 h-10 opacity-40" />
                  <p className="font-bold text-sm">Este amigo no tiene apuntes</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {friendNotes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className="w-full flex items-center gap-3 p-3 bg-background border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-left rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#FFD700] border-2 border-black flex items-center justify-center text-xl shrink-0">
                        {note.emoji || "📝"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-foreground truncate">{note.titulo || "Sin título"}</p>
                        {note.subject && (
                          <p className="text-xs text-muted-foreground font-bold">
                            {note.subject.codigo || note.subject.nombre} · Año {note.subject.año}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Target Subject */}
          {step === "select-subject" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 border-2 border-foreground rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-[#FFD700] border-2 border-black flex items-center justify-center text-lg shrink-0">
                  {(preselectedNote?.emoji || selectedNote?.emoji) || "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-foreground truncate">{noteTitle}</p>
                  <p className="text-xs text-muted-foreground font-bold">De: {ownerName}</p>
                </div>
              </div>

              {!preselectedNote && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setStep("select-note")}
                    className="text-xs font-black uppercase text-primary hover:underline"
                  >
                    ← Volver
                  </button>
                </div>
              )}

              <p className="text-xs font-black uppercase text-muted-foreground">
                ¿A qué materia querés asignarlo?
              </p>

              <div className="flex gap-2">
                {/* Year filter */}
                <Select value={targetYear} onValueChange={(v) => { setTargetYear(v); setTargetSubjectId(""); }}>
                  <SelectTrigger className="w-[130px] bg-background text-foreground border-2 border-foreground font-bold shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl focus:ring-0">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                    <SelectItem value="all" className="font-bold cursor-pointer">Todos</SelectItem>
                    {myYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-bold cursor-pointer">Año {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Subject select */}
                <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                  <SelectTrigger className="flex-1 bg-background text-foreground border-2 border-foreground font-bold shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl focus:ring-0">
                    <BookOpen className="w-4 h-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Elegí materia..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                    {filteredSubjects.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground font-bold">Sin materias</div>
                    ) : (
                      filteredSubjects.map(s => (
                        <SelectItem key={s.id} value={s.id} className="font-bold cursor-pointer">
                          {s.codigo || s.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {mySubjects.length === 0 && (
                <p className="text-xs text-muted-foreground font-bold bg-muted/40 border border-foreground/20 rounded-lg p-2">
                  ⚠️ No tienes materias configuradas. Primero creá materias en tu plan de carrera.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "select-subject" && (
          <DialogFooter className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-2 border-foreground font-black uppercase rounded-xl bg-card text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !targetSubjectId}
              className="flex-1 bg-[#BFFF00] text-black border-2 border-foreground font-black uppercase rounded-xl shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Importar Copia</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
