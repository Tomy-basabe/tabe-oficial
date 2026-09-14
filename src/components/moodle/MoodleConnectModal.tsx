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
  MoodleCourse,
  DEFAULT_CAMPUS_URL,
  getStoredMoodleSession,
  loginMoodle,
  disconnectMoodle,
  getMoodleCourses,
  getMoodleUpcomingEvents,
  syncMoodleCoursesToTabe,
  syncMoodleEventsToTabeCalendar,
} from "@/lib/moodleService";
import {
  GraduationCap,
  Lock,
  User,
  CheckCircle2,
  Calendar,
  BookOpen,
  RefreshCw,
  LogOut,
  Globe,
  Loader2,
  AlertTriangle,
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
  const [isCustomUrl, setIsCustomUrl] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronización
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncSubjects, setSyncSubjects] = useState(true);
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Cargar sesión existente al abrir
  useEffect(() => {
    if (open) {
      const stored = getStoredMoodleSession();
      setSession(stored);
      setErrorMsg(null);
      setSyncResult(null);

      if (stored) {
        // Cargar cursos si ya está conectado
        getMoodleCourses(stored)
          .then((crs) => setCourses(crs))
          .catch(() => {});
      }
    }
  }, [open]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Por favor, ingresá tu usuario y contraseña del campus.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const targetUrl = isCustomUrl ? campusUrl : DEFAULT_CAMPUS_URL;
      const newSession = await loginMoodle(username, password, targetUrl);
      setSession(newSession);
      toast.success(`¡Conectado como ${newSession.fullname}!`);

      // Cargar lista de materias detectadas
      try {
        const crs = await getMoodleCourses(newSession);
        setCourses(crs);
      } catch (crsErr) {
        console.warn("No se pudieron cargar materias iniciales:", crsErr);
      }
    } catch (err: any) {
      console.error("Error al conectar Moodle:", err);
      setErrorMsg(err.message || "Error al conectar con el campus virtual.");
      toast.error(err.message || "Error al conectar con Moodle");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectMoodle();
    setSession(null);
    setCourses([]);
    setUsername("");
    setPassword("");
    setSyncResult(null);
    toast.info("Cuenta de campus virtual desconectada.");
  };

  const handleSyncNow = async () => {
    if (!session || !user) return;
    setSyncing(true);
    setSyncResult(null);

    let addedSubjectsCount = 0;
    let addedEventsCount = 0;

    try {
      // 1. Sincronizar Materias
      if (syncSubjects) {
        const crs = courses.length > 0 ? courses : await getMoodleCourses(session);
        setCourses(crs);
        const subjRes = await syncMoodleCoursesToTabe(user.id, crs);
        addedSubjectsCount = subjRes.added;
      }

      // 2. Sincronizar Calendario y Tareas
      if (syncCalendar) {
        const evs = await getMoodleUpcomingEvents(session);
        const evRes = await syncMoodleEventsToTabeCalendar(user.id, evs);
        addedEventsCount = evRes.added;
      }

      const resultText = `Sincronización exitosa: ${
        syncSubjects ? `${addedSubjectsCount} materias nuevas` : ""
      }${syncSubjects && syncCalendar ? " y " : ""}${
        syncCalendar ? `${addedEventsCount} entregas/tareas en tu calendario` : ""
      }.`;

      setSyncResult(resultText);
      toast.success("¡Campus sincronizado con éxito!");

      // Actualizar sesión con lastSync
      setSession(getStoredMoodleSession());

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err: any) {
      console.error("Error durante sincronización:", err);
      toast.error(err.message || "Ocurrió un error al sincronizar.");
      setErrorMsg("Ocurrió un error durante la sincronización.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md w-[95vw] p-6 border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl bg-card">
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
                Conectá tu universidad para importar materias y fechas de exámenes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTENIDO DEL MODAL */}
        <div className="mt-4 space-y-4">
          {session ? (
            /* VISTA CONECTADO */
            <div className="space-y-4">
              {/* Tarjeta Alumno */}
              <div className="p-4 rounded-xl border-3 border-foreground bg-muted/30 shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-3">
                <div className="flex items-center gap-3">
                  {session.userpictureurl ? (
                    <img
                      src={session.userpictureurl}
                      alt={session.fullname}
                      className="w-12 h-12 rounded-full border-2 border-foreground object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-foreground bg-[#00FF9D] text-black flex items-center justify-center font-black text-lg">
                      {session.fullname.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm uppercase truncate text-foreground">
                        {session.fullname}
                      </p>
                      <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00FF9D] text-black border border-foreground">
                        Conectado
                      </span>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground truncate">
                      {session.campusUrl.replace(/^https?:\/\//, "")}
                    </p>
                    {courses.length > 0 && (
                      <p className="text-[11px] font-black text-[#FF7900] mt-0.5">
                        {courses.length} materias detectadas en el campus
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
                  <span>Sincronizar Materias matriculadas a mis asignaturas</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={syncCalendar}
                    onChange={(e) => setSyncCalendar(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-foreground accent-[#FF7900]"
                  />
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Sincronizar Tareas, Entregas y Parciales al Calendario</span>
                </label>
              </div>

              {/* Mensaje de Resultado */}
              {syncResult && (
                <div className="p-3 rounded-xl border-2 border-foreground bg-[#00FF9D]/20 text-foreground text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{syncResult}</span>
                </div>
              )}

              {/* Botones de Acción */}
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
            /* VISTA LOGIN / FORMULARIO */
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Selector de Universidad / Campus */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">Campus Universitario</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomUrl(false);
                      setCampusUrl(DEFAULT_CAMPUS_URL);
                    }}
                    className={`p-2.5 rounded-xl border-2 border-foreground font-black text-xs text-left transition-all ${
                      !isCustomUrl
                        ? "bg-[#FF7900] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    UTN FRM (Mendoza)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCustomUrl(true)}
                    className={`p-2.5 rounded-xl border-2 border-foreground font-black text-xs text-left transition-all ${
                      isCustomUrl
                        ? "bg-[#FF7900] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    Otro Campus Moodle
                  </button>
                </div>

                {isCustomUrl && (
                  <div className="relative mt-2">
                    <Globe className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://campus.tuuniversidad.edu.ar"
                      value={campusUrl}
                      onChange={(e) => setCampusUrl(e.target.value)}
                      className="pl-9 font-bold text-xs border-2 border-foreground rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Usuario */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-foreground">Usuario / Legajo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tu usuario o legajo institucional"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="pl-9 font-bold text-xs border-2 border-foreground rounded-xl"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-foreground">Contraseña del campus</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-9 font-bold text-xs border-2 border-foreground rounded-xl"
                  />
                </div>
              </div>

              {/* Error si existe */}
              {errorMsg && (
                <div className="p-3 rounded-xl border-2 border-foreground bg-destructive/15 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Botón Conectar */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-black uppercase text-xs py-5 bg-[#FF7900] hover:bg-[#FF7900]/90 text-black border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0.5 active:translate-y-0.5 transition-all mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando al Campus...
                  </>
                ) : (
                  "Conectar y Obtener Materias"
                )}
              </Button>

              <p className="text-[11px] font-bold text-center text-muted-foreground">
                🔒 Tu contraseña se utiliza únicamente para generar tu token de estudiante oficial. T.A.B.E. nunca almacena contraseñas en texto plano.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
