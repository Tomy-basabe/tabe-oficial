import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Zap,
  Bot,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { encodeUserToken } from "@/lib/tabeTokenService";
import { cn } from "@/lib/utils";

interface TabeUniversalAiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
}

export function TabeUniversalAiModal({
  open,
  onOpenChange,
  userId,
}: TabeUniversalAiModalProps) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedGptUrl, setCopiedGptUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedGeminiCli, setCopiedGeminiCli] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sincronizar automáticamente el contexto del usuario con su token cuando se abre el modal
  useEffect(() => {
    if (open && userId) {
      handleSyncCredentials();
    }
  }, [open, userId]);

  const token = userId ? encodeUserToken(userId) : "tabe_usr_no_auth";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
  const openApiUrl = `${baseUrl}/api/tabe-actions/openapi.json`;
  const mcpScriptPath = "C:\\Users\\Hp\\Desktop\\StackHard\\zzzproyectos\\tabe\\mcp\\tabe-mcp-server.cjs";

  const copyText = (text: string, callback: (v: boolean) => void, msg = "Copiado al portapapeles") => {
    navigator.clipboard.writeText(text);
    callback(true);
    toast.success(msg);
    setTimeout(() => callback(false), 2000);
  };

  // Descargar lanzador .bat para Gemini en Windows
  const downloadGeminiLauncher = () => {
    const geminiScriptPath = mcpScriptPath.replace("tabe-mcp-server.cjs", "tabe-gemini-chat.cjs");
    const batContent = `@echo off
chcp 65001 >nul
title TABE AI x Google Gemini (MCP Local)
echo ========================================================
echo        TABE AI - Google Gemini MCP (Modo Local)
echo ========================================================
echo.
echo Conectando con servidor local de TABE (${baseUrl})...
echo.
node "${geminiScriptPath.replace(/\\/g, "\\\\")}" --host="${baseUrl}"
if errorlevel 1 (
  echo.
  echo Revisa que el servidor local de TABE este corriendo (npm run dev).
  pause
)
`;

    const blob = new Blob([batContent], { type: "application/bat" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iniciar_gemini_tabe.bat";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Lanzador de Gemini descargado", {
      description: "Abrí 'iniciar_gemini_tabe.bat' e ingresá tu usuario y contraseña de TABE para conectar Gemini.",
      duration: 6000,
    });
  };

  // Descargar instalador automático .bat para Claude Desktop en Windows
  const downloadClaudeInstaller = () => {
    const batContent = `@echo off
chcp 65001 >nul
echo ========================================================
echo     Configurando TABE AI en Claude Desktop (1 Clic)
echo ========================================================
echo.
set "CLAUDE_DIR=%APPDATA%\\Claude"
if not exist "%CLAUDE_DIR%" mkdir "%CLAUDE_DIR%"
set "CONFIG_FILE=%CLAUDE_DIR%\\claude_desktop_config.json"

powershell -Command "$configPath = '%CONFIG_FILE%';" ^
  "$json = if (Test-Path $configPath) { try { Get-Content $configPath -Raw | ConvertFrom-Json } catch { [PSCustomObject]@{} } } else { [PSCustomObject]@{} };" ^
  "if (-not $json.mcpServers) { $json | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([PSCustomObject]@{}) -Force };" ^
  "$tabeServer = [PSCustomObject]@{ command = 'node'; args = @('${mcpScriptPath.replace(/\\/g, "\\\\")}'); env = [PSCustomObject]@{ TABE_TOKEN = '${token}'; TABE_HOST = '${baseUrl}' } };" ^
  "$json.mcpServers | Add-Member -NotePropertyName tabe -NotePropertyValue $tabeServer -Force;" ^
  "$json | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8;"

echo.
echo [OK] TABE quedo configurado exitosamente en tu Claude Desktop.
echo.
echo Ya podes abrir Claude Desktop y pedirle:
echo  - Resolver cuestionarios del Campus Virtual
echo  - Consultar materias aprobadas y notas
echo  - Ver entregas y deadlines proximos
echo ========================================================
echo.
pause
`;

    const blob = new Blob([batContent], { type: "application/bat" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conectar_tabe_en_claude.bat";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Descargando instalador de Claude", {
      description: "Abrí el archivo 'conectar_tabe_en_claude.bat' para autoconfigurar Claude Desktop en 1 segundo.",
      duration: 6000,
    });
  };

  const handleSyncCredentials = async () => {
    setIsSyncing(true);
    try {
      let creds: any = null;
      try {
        const raw = localStorage.getItem("utnfrm_mcp_creds");
        if (raw) creds = JSON.parse(raw);
      } catch {}

      // Extraer contexto académico real desde el caché local del usuario
      let academicContext: any = null;
      try {
        const cachedRaw = localStorage.getItem("tabe_subjects_daily_cache");
        if (cachedRaw) {
          const parsedCache = JSON.parse(cachedRaw);
          if (parsedCache && Array.isArray(parsedCache.subjects) && Array.isArray(parsedCache.userStatuses)) {
            const subs = parsedCache.subjects;
            const statuses = parsedCache.userStatuses;

            const aprobadas: any[] = [];
            const regulares: any[] = [];
            const cursando: any[] = [];
            let suma = 0;
            let cant = 0;

            statuses.forEach((st: any) => {
              const sub = subs.find((s: any) => s.id === st.subject_id);
              const name = sub?.nombre || "Materia";
              const grade = st.nota_final_examen ?? st.nota;
              const isAprobada = st.estado === "aprobada" || (typeof grade === "number" && grade >= 6);

              if (isAprobada) {
                aprobadas.push({ materia: name, nota: grade, fecha: st.fecha_aprobacion });
                if (typeof grade === "number" && grade > 0) {
                  suma += grade;
                  cant++;
                }
              } else if (st.estado === "regular") {
                regulares.push({ materia: name, nota: grade });
              } else if (st.estado === "cursando" || st.estado === "cursable") {
                cursando.push({ materia: name });
              }
            });

            const avg = cant > 0 ? parseFloat((suma / cant).toFixed(2)) : 0;
            academicContext = {
              materiasAprobadas: aprobadas,
              materiasRegulares: regulares,
              materiasCursando: cursando,
              promedio: avg,
              progreso: {
                materiasAprobadas: aprobadas.length,
                totalMaterias: subs.length || 37,
                porcentajeCarrera: `${Math.round((aprobadas.length / (subs.length || 37)) * 100)}%`,
                promedioGeneral: avg,
              },
            };
          }
        }
      } catch {}

      const res = await fetch("/api/tabe-actions/sync-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tabe-Token": token,
        },
        body: JSON.stringify({
          username: creds?.username || "",
          password: creds?.password || "",
          legajo: creds?.legajo || "",
          academicContext,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("¡Tus notas y datos de TABE quedaron vinculados a tus IAs externas!");
      } else {
        toast.error(data.error || "No se pudieron sincronizar los datos.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al conectar con el servidor.");
    } finally {
      setIsSyncing(false);
    }
  };

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        tabe: {
          command: "node",
          args: [mcpScriptPath],
          env: {
            TABE_TOKEN: token,
            TABE_HOST: baseUrl,
          },
        },
      },
    },
    null,
    2
  );

  const quickPrompt = `Actúa como mi copiloto universitario de TABE. Conéctate a mi cuenta con este token: ${token}. Puedes consultar mis notas, materias y entregas de UTN FRM desde: ${baseUrl}/api/tabe-actions/academic-context?token=${token}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-transparent dark:from-purple-950/20 dark:via-indigo-950/10 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Conectar TABE con Claude, ChatGPT o Gemini
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Elegí la IA que usás habitualmente para conectarla a tu cuenta con 1 solo clic.
              </DialogDescription>
            </div>
          </div>

          {/* Token Box Compacto */}
          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Tu Código Único de Estudiante:
              </span>
              <p className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-bold truncate mt-0.5">
                {token}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyText(token, setCopiedToken, "¡Código copiado!")}
              className="h-8 px-3 text-xs gap-1.5 shrink-0 border-zinc-300 dark:border-zinc-700"
            >
              {copiedToken ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 3 Opciones Sencillas (Claude, ChatGPT, Gemini) */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Seleccioná tu IA preferida:
          </p>

          <div className="grid grid-cols-1 gap-3.5">
            {/* Opción 1: Claude Desktop (1 Clic) */}
            <div className="p-4 rounded-xl border border-purple-200/70 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Claude Desktop (Recomendado)
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Instalación automática en Windows con 1 solo clic.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  Automático
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={downloadClaudeInstaller}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Instalador (1 Clic)</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(claudeDesktopConfig, setCopiedClaude, "Configuración de Claude copiada")}
                  className="text-xs h-8 px-3 gap-1.5 border-purple-200 dark:border-purple-800 hover:bg-purple-100/50 dark:hover:bg-purple-950/30"
                >
                  {copiedClaude ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Configuración JSON</span>
                </Button>
              </div>
            </div>

            {/* Opción 2: ChatGPT */}
            <div className="p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      ChatGPT (Custom GPT o Chat)
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Creá un GPT personalizado pegando la URL de TABE o usá el prompt rápido.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Custom Actions
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => {
                    copyText(openApiUrl, setCopiedGptUrl, "URL de ChatGPT copiada al portapapeles");
                    window.open("https://chatgpt.com/gpts/editor", "_blank");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir ChatGPT y Copiar Enlace</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(quickPrompt, setCopiedPrompt, "Prompt rápido copiado")}
                  className="text-xs h-8 px-3 gap-1.5 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Prompt Rápido</span>
                </Button>
              </div>
            </div>

            {/* Opción 3: Google Gemini */}
            <div className="p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Google Gemini (MCP con Usuario y Contraseña)
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Conectá Gemini directamente a tu cuenta de TABE para consultar notas, materias y resolver cuestionarios del campus.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  MCP Gemini
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Al arrancar, ingresás tu <span className="font-semibold text-zinc-800 dark:text-zinc-200">Usuario (Email)</span> y <span className="font-semibold text-zinc-800 dark:text-zinc-200">Contraseña</span> de TABE y Gemini queda 100% autenticado con tu perfil académico.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={downloadGeminiLauncher}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Lanzador (.bat)</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText("npm run gemini", setCopiedGeminiCli, "Comando 'npm run gemini' copiado")}
                  className="text-xs h-8 px-3 gap-1.5 border-blue-200 dark:border-blue-800 hover:bg-blue-100/50 dark:hover:bg-blue-950/30"
                >
                  {copiedGeminiCli ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Terminal className="w-3.5 h-3.5" />}
                  <span>Copiar 'npm run gemini'</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Sincronización de Credenciales */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Vincular datos de UTN FRM a tu Código
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Permite a tus IAs resolver cuestionarios y ver entregas sin pedirte clave cada vez.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncCredentials}
              disabled={isSyncing}
              className="h-8 px-3 text-xs gap-1.5 shrink-0 border-zinc-300 dark:border-zinc-700"
            >
              <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Vinculando..." : "Vincular"}</span>
            </Button>
          </div>

          {/* Desplegable Técnico / Opcional */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <span>{showAdvanced ? "Ocultar detalles técnicos" : "Ver detalles técnicos y rutas"}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[11px] space-y-2 border border-zinc-800">
                <p className="text-zinc-400 font-sans font-semibold">Configuración manual de Claude:</p>
                <pre className="overflow-x-auto text-[10px] leading-relaxed">
                  {claudeDesktopConfig}
                </pre>
                <p className="text-zinc-400 font-sans font-semibold pt-2">Esquema OpenAPI para ChatGPT:</p>
                <code className="text-purple-300 text-[10px] break-all">{openApiUrl}</code>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
