import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isUserFromUtnFrm } from "@/lib/careerData";
import {
  MoodleSession,
  MoodleParsedEvent,
  DEFAULT_CAMPUS_URL,
  UTN_FRM_CAMPUS_URL,
  USER_CAMPUS_URL_KEY,
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

  // Perfil universitario y formulario
  const [isUtnUser, setIsUtnUser] = useState(false);
  const [campusUrl, setCampusUrl] = useState("");
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

      // Detectar facultad del usuario
      async function detectFaculty() {
        let userFac = typeof window !== "undefined" ? localStorage.getItem("tabe_guest_facultad") || "" : "";
        let userCar = typeof window !== "undefined" ? localStorage.getItem("tabe_guest_carrera") || "" : "";

        if (user) {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("facultad, carrera")
              .eq("user_id", user.id)
              .maybeSingle();
            if (data?.facultad) userFac = data.facultad;
            if (data?.carrera) userCar = data.carrera;
          } catch (_) {}
        }

        const isUtn = isUserFromUtnFrm({ facultad: userFac, carrera: userCar });
        setIsUtnUser(isUtn);

        if (isUtn) {
          setCampusUrl(UTN_FRM_CAMPUS_URL);
        } else {
          const userSavedCampus = typeof window !== "undefined" ? localStorage.getItem(USER_CAMPUS_URL_KEY) || "" : "";
          setCampusUrl(userSavedCampus || (stored?.campusUrl && !stored.campusUrl.includes("frm.utn.edu.ar") ? stored.campusUrl : ""));
        }
      }

      detectFaculty();
    }
  }, [open, user]);

  const handleOpenExportPage = () => {
    let raw = campusUrl.trim();
    if (!raw) {
      toast.error("Ingresá la dirección web de tu campus virtual para continuar");
      return;
    }
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
      raw = `https://${raw}`;
    }
    const cleanBase = raw.replace(/\/+$/, "");
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
        await connectMoodleByFeedUrl(feedUrl, isUtnUser ? "UTN FRM" : "Campus Virtual");

      setSession(newSession);
      setEvents(parsedEvents);
      setCourseNames(detectedCourses);

      toast.success(`¡Campus conectado! Se detectaron ${detectedCourses.length} materias y ${parsedEvents.length} eventos.`);

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
      <DialogContent className="max-w-lg w-[95vw] p-6 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl bg-white dark:bg-[#1f1f1f] space-y-4">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span>Campus Virtual Moodle</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Sincronizá tus materias, entregas y parciales automáticamente desde el campus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {session ? (
            /* VISTA CONECTADO */
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    UTN
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {session.fullname}
                      </p>
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        Vinculado
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">{session.sitename || (isUtnUser ? "Campus Virtual UTN FRM" : "Campus Virtual")}</p>
                    {courseNames.length > 0 && (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                        {courseNames.length} materias ({events.length} entregas/eventos)
                      </p>
                    )}
                  </div>
                </div>

                {session.lastSync && (
                  <p className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                    Última sincronización: {new Date(session.lastSync).toLocaleString("es-AR")}
                  </p>
                )}
              </div>

              {/* Opciones de Sincronización */}
              <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 space-y-2">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">¿Qué querés sincronizar?</p>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={syncSubjects}
                    onChange={(e) => setSyncSubjects(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-0"
                  />
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sincronizar materias detectadas a mis asignaturas</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={syncCalendar}
                    onChange={(e) => setSyncCalendar(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-0"
                  />
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sincronizar tareas, TP y parciales al Calendario</span>
                </label>
              </div>

              {syncResult && (
                <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{syncResult}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing || (!syncSubjects && !syncCalendar)}
                  className="flex-1 h-9 rounded-lg font-medium text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizar Ahora</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={syncing}
                  className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Desconectar campus"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* VISTA VINCULAR (PASO A PASO) */
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2.5">
                {isUtnUser ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-orange-500" />
                        <span>Paso 1: Abrí tu calendario en el campus (UTN FRM)</span>
                      </p>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        UTN FRM
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Hacé clic para ir directo a la pantalla oficial de exportación de tu campus virtual:
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenExportPage}
                      className="w-full h-9 rounded-lg font-medium text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>Abrir exportación en Campus UTN FRM</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-orange-500" />
                      <span>Paso 1: Ingresá la dirección de tu Campus Virtual</span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Escribí el enlace de tu Moodle o portal institucional para ir a la pantalla de exportación:
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="url"
                        placeholder="https://campusvirtual.tuuniversidad.edu.ar"
                        value={campusUrl}
                        onChange={(e) => {
                          setCampusUrl(e.target.value);
                          try {
                            localStorage.setItem(USER_CAMPUS_URL_KEY, e.target.value);
                          } catch (_) {}
                        }}
                        className="text-xs h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleOpenExportPage}
                        disabled={!campusUrl.trim()}
                        className="h-9 px-3 rounded-lg font-medium text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        <span>Ir a exportar</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/40 dark:bg-zinc-900/30 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Paso 2: En la pantalla del campus seleccioná:</p>
                <ul className="space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>• <strong>Eventos a exportar:</strong> "Todos los eventos"</li>
                  <li>• <strong>Periodo:</strong> "Eventos recientes y próximos 60 días"</li>
                  <li>• Hacé clic en <strong>"Obtener URL del calendario"</strong> y copiá el enlace.</li>
                </ul>
              </div>

              <form onSubmit={handleConnectFeed} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Paso 3: Pegá el enlace del calendario generado
                  </label>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                    <Input
                      type="url"
                      placeholder="https://campusvirtual.../calendar/export_execute.php?..."
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      disabled={loading}
                      className="pl-8 text-xs h-9 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-lg"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !feedUrl.trim()}
                  className="w-full h-9 rounded-lg font-medium text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Descargando materias y entregas...</span>
                    </>
                  ) : (
                    <span>Vincular Campus y Sincronizar</span>
                  )}
                </button>

                <p className="text-[11px] text-center text-zinc-400">
                  🔒 No requiere tu contraseña. Tu enlace es privado para mantener tus entregas al día.
                </p>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
