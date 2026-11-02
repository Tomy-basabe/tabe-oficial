import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Unlink,
  GraduationCap,
  BookOpen,
  Mail,
  Bell,
  Lock,
  UserCheck,
  Sparkles,
  Eye,
  EyeOff,
  ClipboardCheck,
} from "lucide-react";
import {
  getStoredUtnFrmMcpCredentials,
  getStoredUtnFrmMcpSnapshot,
  hasUtnFrmPersonalData,
  isUtnFrmEncuestasAllowedForProfile,
  resolveUtnFrmEncuestas,
  syncUtnFrmMcp,
  disconnectUtnFrmMcp,
  UtnFrmMcpSnapshot,
} from "@/lib/utnFrmMcpService";
import { isUserFromUtnFrm } from "@/lib/careerData";
import { invalidateStudentContextCache } from "@/lib/aiClientService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UtnFrmMcpModalProps {
  open: boolean;
  onClose: () => void;
  academicProfile: {
    facultad?: string | null;
    carrera?: string | null;
    utnfrm_encuestas_enabled?: boolean | null;
    plan_type?: string | null;
  };
  onSyncChange?: (snapshot: UtnFrmMcpSnapshot | null) => void;
}

export function UtnFrmMcpModal({
  open,
  onClose,
  academicProfile,
  onSyncChange,
}: UtnFrmMcpModalProps) {
  const { user } = useAuth();
  const isUtnFrm = isUserFromUtnFrm(academicProfile);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [legajo, setLegajo] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resolvingEncuestas, setResolvingEncuestas] = useState(false);
  const [encuestasRating, setEncuestasRating] = useState("muy_bueno");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<UtnFrmMcpSnapshot | null>(null);
  const encuestasAllowed = isUtnFrmEncuestasAllowedForProfile(academicProfile);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    const savedCreds = getStoredUtnFrmMcpCredentials(user?.id);
    const savedSnap = getStoredUtnFrmMcpSnapshot(user?.id, user?.user_metadata);
    if (savedCreds) {
      setUsername(savedCreds.username || "");
      setPassword(savedCreds.password || "");
      setEmail(savedCreds.email || "");
      setLegajo(savedCreds.legajo || "");
    }
    setSnapshot(savedSnap);
  }, [open, user?.id, user?.user_metadata]);

  if (!isUtnFrm) {
    return null;
  }

  const handleConnectAndSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim();
    const cleanPass = password;
    if (!cleanUser || !cleanPass) {
      const msg = "Ingresa tu usuario (DNI) y clave de UTN FRM para sincronizar.";
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    let normalizedEmail = email.trim();
    if (normalizedEmail && !normalizedEmail.includes("@")) {
      normalizedEmail = `${normalizedEmail}@alumnos.frm.utn.edu.ar`;
      setEmail(normalizedEmail);
    }

    setLoading(true);
    try {
      const result = await syncUtnFrmMcp(
        user?.id,
        {
          username: cleanUser,
          password: cleanPass,
          email: normalizedEmail || undefined,
          legajo: legajo.trim() || undefined,
        },
        academicProfile
      );

      setSnapshot(result);
      onSyncChange?.(result);

      if (!hasUtnFrmPersonalData(result)) {
        const errors: string[] = [];
        if (result.sysacad?.error) errors.push(`Autogestión: ${result.sysacad.error}`);
        if (result.campus?.error) errors.push(`Campus: ${result.campus.error}`);
        if (result.mail?.error) errors.push(`Correo: ${result.mail.error}`);
        const msg =
          errors.length > 0
            ? errors.join(" · ")
            : "No se encontraron datos asociados al usuario y clave ingresados en Autogestión, Campus ni Correo UTN FRM. Verifica tus credenciales.";
        setErrorMessage(msg);
        toast.error("No se encontraron datos en UTN FRM", {
          description: msg,
          duration: 6000,
        });
        return;
      }

      invalidateStudentContextCache(user?.id);

      const connectedServices: string[] = [];
      if (result.sysacad?.connected) connectedServices.push("Autogestión (Sysacad)");
      if (result.campus?.connected) connectedServices.push("Campus Virtual");
      if (result.mail?.connected) connectedServices.push("Correo Institucional");

      toast.success("¡MCP UTN FRM sincronizado con TABE AI!", {
        description: `Conectado a: ${connectedServices.join(", ")}. TABE AI ya tiene todo tu contexto académico.`,
      });

      const partialWarnings: string[] = [];
      if (!result.sysacad?.connected && result.sysacad?.error) {
        partialWarnings.push(`Sysacad: ${result.sysacad.error}`);
      }
      if (!result.campus?.connected && result.campus?.error) {
        partialWarnings.push(`Campus: ${result.campus.error}`);
      }
      if (normalizedEmail && !result.mail?.connected && result.mail?.error) {
        partialWarnings.push(`Correo: ${result.mail.error}`);
      }
      if (partialWarnings.length > 0) {
        setErrorMessage(partialWarnings.join(" · "));
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        "No se encontraron datos para el usuario y clave ingresados en UTN FRM.";
      setErrorMessage(msg);
      toast.error("No se encontraron datos en UTN FRM", {
        description: msg,
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectUtnFrmMcp(user?.id);
    invalidateStudentContextCache(user?.id);
    setSnapshot(null);
    setPassword("");
    setErrorMessage(null);
    onSyncChange?.(null);
    toast.info(
      "MCP UTN FRM desvinculado. Se eliminaron las credenciales y el contexto de TABE AI."
    );
  };

  const handleResolveEncuestas = async () => {
    if (!encuestasAllowed) {
      toast.error("Permiso requerido", {
        description:
          "Solo los usuarios aprobados por el Administrador pueden usar la resolución automática de encuestas docentes.",
      });
      return;
    }

    setResolvingEncuestas(true);
    setErrorMessage(null);
    try {
      const res = await resolveUtnFrmEncuestas(
        user?.id,
        { rating: encuestasRating },
        academicProfile
      );
      toast.success("Encuestas Docentes UTN FRM", {
        description: res.message,
        duration: 6000,
      });
    } catch (err: any) {
      const msg = err?.message || "No se pudieron resolver las encuestas docentes.";
      setErrorMessage(msg);
      toast.error("Error en Encuestas Docentes", { description: msg });
    } finally {
      setResolvingEncuestas(false);
    }
  };

  const sysacadTablesCount =
    snapshot?.summary?.sysacadTablesCount ??
    (snapshot?.sysacad?.consultas
      ? Object.values(snapshot.sysacad.consultas).filter((t) => (t?.rows?.length || 0) > 0).length
      : 0);

  const isConnected = hasUtnFrmPersonalData(snapshot);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
              <Sparkles className="w-3.5 h-3.5" />
              Exclusivo UTN FRM · MCP TABE AI
            </span>
            {isConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Contexto IA Activo
              </span>
            )}
          </div>
          <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
            Conectar MCP UTN FRM (Autogestión, Campus y Correo)
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Sincroniza en modo lectura tu cuenta de <strong>Sysacad (Autogestión)</strong>,{" "}
            <strong>Campus Virtual Moodle</strong> y <strong>Correo Institucional</strong> para que{" "}
            <strong>TABE AI</strong> conozca tu estado académico, correlatividades, horarios,
            entregas y correos en tiempo real.
          </DialogDescription>
        </DialogHeader>

        {/* Estado actual de los 4 módulos del MCP si ya hay una sincronización */}
        {snapshot && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Sysacad */}
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  snapshot.sysacad?.connected
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-zinc-200/70 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Autogestión (Sysacad)
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      snapshot.sysacad?.connected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {snapshot.sysacad?.connected ? "Conectado" : "Sin datos"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {snapshot.sysacad?.connected
                    ? `${snapshot.summary?.studentLabel || snapshot.sysacad.studentInfo?.fullLabel || "Alumno"}${
                        snapshot.legajo ? ` · Leg. ${snapshot.legajo}` : ""
                      } (${sysacadTablesCount} tablas)`
                    : snapshot.sysacad?.error || "No se pudo autenticar"}
                </p>
              </div>
            </div>

            {/* Campus Virtual */}
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  snapshot.campus?.connected
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-zinc-200/70 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Campus Virtual
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      snapshot.campus?.connected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {snapshot.campus?.connected ? "Conectado" : "Sin datos"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {snapshot.campus?.connected
                    ? `${snapshot.campus.courses?.length || 0} aulas · ${
                        snapshot.campus.deadlines?.length || 0
                      } entregas`
                    : snapshot.campus?.error || "No disponible"}
                </p>
              </div>
            </div>

            {/* Correo Institucional */}
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  snapshot.mail?.connected
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-zinc-200/70 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Correo Institucional
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      snapshot.mail?.connected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {snapshot.mail?.connected ? "Conectado" : "Opcional"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {snapshot.mail?.connected
                    ? `${snapshot.mail.unreadCount ?? 0} sin leer de ${snapshot.mail.totalMessages ?? 0} mensajes`
                    : snapshot.mail?.error || "Ingresa tu mail @alumnos.frm.utn.edu.ar"}
                </p>
              </div>
            </div>

            {/* Avisos Autogestión */}
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Cartelera Autogestión
                  </span>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    {snapshot.avisos?.length || 0} avisos
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  Sincronizado: {new Date(snapshot.syncedAt).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerta explícita cuando no se encuentra nada o algún servicio falla */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-semibold">Aviso de sincronización UTN FRM</p>
              <p className="text-amber-800 dark:text-amber-300/90 whitespace-pre-line">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Formulario de credenciales */}
        <form onSubmit={handleConnectAndSync} className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Usuario / DNI *</span>
              </label>
              <Input
                type="text"
                placeholder="Ej: 44123456 (sin puntos)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                className="h-9 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Clave UTN FRM *</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña de Sysacad / Campus"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-9 pr-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Correo Institucional (opcional, para leer bandeja)</span>
              </label>
              <Input
                type="text"
                placeholder="usuario@alumnos.frm.utn.edu.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-9 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Legajo (opcional)
              </label>
              <Input
                type="text"
                placeholder="Automático"
                value={legajo}
                onChange={(e) => setLegajo(e.target.value)}
                disabled={loading}
                className="h-9 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>

          {/* Panel de Encuestas Docentes (Solo si fue aprobado en el Panel de Administrador) */}
          {encuestasAllowed ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Resolución de Encuestas Docentes (Aprobado por Administrador)
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  Habilitado en TABE AI
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
                Tu usuario está autorizado para que <strong>TABE AI</strong> resuelva tus encuestas docentes de Autogestión (puedes pedírselo por chat diciendo <em>"resolveme las encuestas docentes"</em> o ejecutarlo desde aquí).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value={encuestasRating}
                  onChange={(e) => setEncuestasRating(e.target.value)}
                  disabled={resolvingEncuestas || loading}
                  className="h-8 px-2.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="excelente">Valoración: Excelente (5/5)</option>
                  <option value="muy_bueno">Valoración: Muy Bueno (4/5)</option>
                  <option value="bueno">Valoración: Bueno (3/5)</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleResolveEncuestas}
                  disabled={resolvingEncuestas || loading || !snapshot}
                  className="h-8 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                >
                  {resolvingEncuestas ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Resolviendo encuestas...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                      Resolver encuestas pendientes ahora
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <strong>Modo Lectura Segura:</strong> El MCP UTN FRM consulta tus tablas de
                Sysacad, aulas del Campus y bandeja de entrada sin modificar inscripciones ni enviar
                correos. La resolución automática de encuestas docentes requiere aprobación del Administrador.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              {snapshot && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 rounded-lg cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  Desvincular MCP
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="h-8 text-xs rounded-lg cursor-pointer"
              >
                Cerrar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="h-8 px-4 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Consultando UTN FRM...
                  </>
                ) : snapshot ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Actualizar contexto MCP
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Conectar y sincronizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
