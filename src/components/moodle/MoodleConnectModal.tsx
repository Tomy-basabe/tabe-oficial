import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  MoodleSession,
  MoodleParsedEvent,
  DEFAULT_CAMPUS_URL,
  MOODLE_FEED_URL_KEY,
  getStoredMoodleSession,
  disconnectMoodle,
  connectMoodleByFeedUrl,
  fetchMoodleIcs,
  parseMoodleIcs,
  syncMoodleToTabe,
} from "@/lib/moodleService";
import {
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  Calendar,
  BookOpen,
  RefreshCw,
  LogOut,
  Loader2,
  AlertTriangle,
  Link,
  Info,
} from "lucide-react";

interface MoodleConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function MoodleConnectModal({ open, onClose, onSyncComplete }: MoodleConnectModalProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<MoodleSession | null>(null);

  // Formulario
  const [campusUrl, setCampusUrl] = useState(DEFAULT_CAMPUS_URL);
  const [feedUrl, setFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronización
  const [events, setEvents] = useState<MoodleParsedEvent[]>([]);
  const [courseNames, setCourseNames] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncSubjects, setSyncSubjects] = useState(true);
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const stored = getStoredMoodleSession();
      setSession(stored);
      setErrorMsg(null);
      setSyncResult(null);

      const savedFeed = localStorage.getItem(MOODLE_FEED_URL_KEY) || stored?.feedUrl || "";
      if (savedFeed) {
        setFeedUrl(savedFeed);
      }
    }
  }, [open]);

  // Abre el enlace directo en una pestaña nueva
  const handleOpenExportPage = () => {
    const cleanBase = campusUrl.trim().replace(/\/+$/, "");
    window.open(`${cleanBase}/calendar/export.php`, "_blank");
  };

  const handleConnectFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) {
      setErrorMsg("Pegá el enlace generado en tu campus virtual.");
      return;
    }

    if (!feedUrl.includes("calendar/export_execute.php") && !feedUrl.includes(".ics")) {
      setErrorMsg("El enlace debe ser la URL de exportación de Moodle (calendar/export_execute.php)");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { session: newSession, events: parsedEvents, courseNames: detectedCourses } =
        await connectMoodleByFeedUrl(feedUrl, "UTN FRM");

      setSession(newSession);
      setEvents(parsedEvents);
      setCourseNames(detectedCourses);

      toast.success(`¡Campus conectado! Se detectaron ${detectedCourses.length} materias y ${parsedEvents.length} eventos.`);

      // Sincronizar automáticamente la primera vez si el usuario está autenticado
      if (user) {
        setSyncing(true);
        const res = await syncMoodleToTabe(user.id, parsedEvents, detectedCourses, {
          syncSubjects: true,
          syncCalendar: true,
        });
        setSyncResult(
          `Sincronización inicial: se importaron ${res.addedSubjects} materias y ${res.addedEvents} entregas al calendario.`
        );
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err: any) {
      console.error("Error al conectar feed Moodle:", err);
      setErrorMsg(err.message || "No se pudo leer el calendario del campus.");
      toast.error(err.message || "Error al conectar Moodle");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    if (!session || !user) return;
    const urlToUse = feedUrl.trim() || session.feedUrl || localStorage.getItem(MOODLE_FEED_URL_KEY);
    if (!urlToUse) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const icsText = await fetchMoodleIcs(urlToUse);
      const { events: parsedEvents, courseNames: detectedCourses } = parseMoodleIcs(icsText);

      setEvents(parsedEvents);
      setCourseNames(detectedCourses);

      const res = await syncMoodleToTabe(user.id, parsedEvents, detectedCourses, {
        syncSubjects,
        syncCalendar,
      });

      const resultText = `Sincronización exitosa: ${
        syncSubjects ? `${res.addedSubjects} materias nuevas` : ""
      }${syncSubjects && syncCalendar ? " y " : ""}${
        syncCalendar ? `${res.addedEvents} tareas/parciales en tu calendario` : ""
      }.`;

      setSyncResult(resultText);
      toast.success("¡Campus sincronizado correctamente!");

      setSession(getStoredMoodleSession());
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      console.error("Error durante sincronización:", err);
      toast.error(err.message || "Ocurrió un error al sincronizar.");
      setErrorMsg("Ocurrió un error al sincronizar el calendario.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    disconnectMoodle();
    setSession(null);
    setEvents([]);
    setCourseNames([]);
    setFeedUrl("");
    setSyncResult(null);
    toast.info("Campus virtual desconectado.");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] p-6 border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl bg-card">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FF7900] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="font-black text-xl uppercase tracking-tight text-foreground">
                Campus Virtual Moodle
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground">
                Sincronizá tus materias, entregas y parciales automáticamente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {session ? (
            /* VISTA CONECTADO */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-3 border-foreground bg-muted/30 shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-foreground bg-[#00FF9D] text-black flex items-center justify-center font-black text-lg shrink-0">
                    UTN
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm uppercase truncate text-foreground">
                        {session.fullname}
                      </p>
                      <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00FF9D] text-black border border-foreground">
                        Vinculado
                      </span>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground truncate">
                      Campus Virtual UTN FRM
                    </p>
                    {courseNames.length > 0 && (
                      <p className="text-[11px] font-black text-[#FF7900] mt-0.5">
                        {courseNames.length} materias detectadas ({events.length} eventos / tareas)
                      </p>
                    )}
                  </div>
                </div>

                {session.lastSync && (
                  <p className="text-[11px] font-bold text-muted-foreground">
                    Última sincronización: {new Date(session.lastSync).toLocaleString("es-AR")}
                  </p>
                )}
              </div>

              {/* Opciones de Sincronización */}
              <div className="p-4 rounded-xl border-2 border-foreground bg-card space-y-2.5">
                <p className="text-xs font-black uppercase text-foreground">¿Qué querés sincronizar?</p>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={syncSubjects}
                    onChange={(e) => setSyncSubjects(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-foreground accent-[#FF7900]"
                  />
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span>Sincronizar materias detectadas a mis asignaturas</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={syncCalendar}
                    onChange={(e) => setSyncCalendar(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-foreground accent-[#FF7900]"
                  />
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Sincronizar tareas, TP y parciales a mi Calendario</span>
                </label>
              </div>

              {syncResult && (
                <div className="p-3 rounded-xl border-2 border-foreground bg-[#00FF9D]/20 text-foreground text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{syncResult}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleSyncNow}
                  disabled={syncing || (!syncSubjects && !syncCalendar)}
                  className="flex-1 font-black uppercase text-xs py-5 bg-[#FF7900] hover:bg-[#FF7900]/90 text-black border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar Ahora
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDisconnect}
                  disabled={syncing}
                  variant="outline"
                  className="font-black uppercase text-xs py-5 border-2 border-foreground text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* VISTA VINCULAR (PASO A PASO GUIADO) */
            <div className="space-y-4">
              {/* Botón de Acción Directa */}
              <div className="p-4 rounded-xl border-3 border-foreground bg-[#FFE600]/20 space-y-3">
                <p className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#FF7900]" />
                  Paso 1: Abrí tu calendario en el campus
                </p>
                <p className="text-xs font-bold text-muted-foreground">
                  Hacé clic en el siguiente botón para ir directo a la pantalla oficial de exportación de tu campus:
                </p>
                <Button
                  type="button"
                  onClick={handleOpenExportPage}
                  className="w-full font-black uppercase text-xs py-4 bg-[#FF7900] hover:bg-[#FF7900]/90 text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-2"
                >
                  <span>Abrir Exportar Calendario en mi Campus</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>

              {/* Guía en 3 Pasos */}
              <div className="p-3.5 rounded-xl border-2 border-foreground bg-muted/40 text-xs font-bold space-y-2">
                <p className="font-black uppercase text-foreground">Paso 2: En la pantalla del campus seleccioná:</p>
                <ul className="space-y-1 text-muted-foreground pl-1">
                  <li>✅ <strong>Eventos a exportar:</strong> "Todos los eventos"</li>
                  <li>✅ <strong>Periodo:</strong> "Eventos recientes y próximos 60 días" (o el que quieras)</li>
                  <li>✅ Hacé clic en el botón <strong>"Obtener URL del calendario"</strong> y copiá el enlace.</li>
                </ul>
              </div>

              {/* Formulario para Pegar el Enlace */}
              <form onSubmit={handleConnectFeed} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-foreground">
                    Paso 3: Pegá el enlace del calendario generado
                  </label>
                  <div className="relative">
                    <Link className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://campusvirtual.frm.utn.edu.ar/calendar/export_execute.php?..."
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      disabled={loading}
                      className="pl-9 font-bold text-xs border-2 border-foreground rounded-xl"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl border-2 border-foreground bg-destructive/15 text-destructive text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !feedUrl.trim()}
                  className="w-full font-black uppercase text-xs py-5 bg-[#00FF9D] hover:bg-[#00FF9D]/90 text-black border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0.5 active:translate-y-0.5 transition-all mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Descargando materias y entregas...
                    </>
                  ) : (
                    "Vincular Campus y Sincronizar"
                  )}
                </Button>

                <p className="text-[11px] font-bold text-center text-muted-foreground">
                  🔒 No requiere tu contraseña. Tu enlace es privado y permite a T.A.B.E. mantener tus entregas siempre al día.
                </p>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
