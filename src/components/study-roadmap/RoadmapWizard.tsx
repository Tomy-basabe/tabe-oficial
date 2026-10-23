import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStudyRoadmapWizard, daysUntil } from "@/hooks/useStudyRoadmapWizard";
import { useSubjects } from "@/hooks/useSubjects";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { StudyRoadmap, ExamDateOption, WizardEventOption, NotionDocOption } from "@/types/studyRoadmap";
import { ACCEPTED_MATERIAL, MAX_FILES } from "@/lib/materialExtractor";
import { fetchUserNotionDocs } from "@/lib/notionMaterialExtractor";
import { computeLevelPlan } from "@/lib/roadmapHeuristics";
import { IsoCubesLoader } from "./IsoCubesLoader";
import {
  BookOpen, Calendar, Upload, FileText, ArrowRight, ArrowLeft, Flame, Zap, Clock, Radio, PenTool, Check, X, CalendarCheck, Layers, Loader2, Search, GitBranch, Brain, Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TabeIconRenderer } from "@/components/notion/TabeIcons";

interface RoadmapWizardProps {
  userId?: string;
  onComplete: (roadmap: StudyRoadmap) => void;
  onCancel?: () => void;
}

const PROCESSING_TIPS = [
  "Cada nivel se arma con fragmentos reales de tus apuntes.",
  "Más material = más niveles. Menos días = ritmo más enfocado.",
  "Los desafíos de cada nivel se generan a partir de tu propio contenido.",
  "Al superar un nivel avanzás en tu progreso y consolidás conocimientos.",
];

const EVENT_DONE_TYPES = new Set(["Estudio", "Clase"]);

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

export const RoadmapWizard: React.FC<RoadmapWizardProps> = ({ userId, onComplete, onCancel }) => {
  const wizard = useStudyRoadmapWizard(userId, onComplete);
  const { state } = wizard;

  const { subjects, loading: loadingSubjects } = useSubjects();
  const { events } = useCalendarEvents();
  const [dragOver, setDragOver] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  // Estados para selector de apuntes de Notion en TABE
  const [userNotionDocs, setUserNotionDocs] = useState<NotionDocOption[]>([]);
  const [loadingNotionDocs, setLoadingNotionDocs] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [filterSubjectDocs, setFilterSubjectDocs] = useState(true);
  const [materialSourceTab, setMaterialSourceTab] = useState<"notion" | "files">("notion");

  // Cargar apuntes del usuario para el Wizard
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    setLoadingNotionDocs(true);

    fetchUserNotionDocs(userId, null).then((docs) => {
      if (!isMounted) return;
      setUserNotionDocs(docs);
      setLoadingNotionDocs(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Rotar tips en procesamiento
  useEffect(() => {
    if (state.step !== 5) return;
    const t = setInterval(() => setTipIdx((i) => (i + 1) % PROCESSING_TIPS.length), 3200);
    return () => clearInterval(t);
  }, [state.step]);

  // Filtrar apuntes según búsqueda y materia seleccionada
  const filteredNotionDocs = useMemo(() => {
    return userNotionDocs.filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(docSearch.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (filterSubjectDocs && state.subjectId) {
        return doc.subject_id === state.subjectId;
      }
      return true;
    });
  }, [userNotionDocs, docSearch, filterSubjectDocs, state.subjectId]);

  // Solo materias que el estudiante puede rendir: regulares o cursables
  const eligibleSubjects = useMemo(
    () => subjects.filter((s) => s.status === "regular" || s.status === "cursable"),
    [subjects]
  );

  // Eventos futuros reales de la materia elegida
  const subjectEvents = useMemo<WizardEventOption[]>(() => {
    if (!state.subjectId) return [];
    const today = new Date().toISOString().split("T")[0];
    return events
      .filter(
        (e) =>
          e.subject_id === state.subjectId &&
          e.fecha >= today &&
          !EVENT_DONE_TYPES.has(e.tipo_examen)
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 6);
  }, [events, state.subjectId]);

  const totalSize = state.files.reduce((a, f) => a + f.size, 0);
  const hasMaterial =
    state.files.length > 0 ||
    state.pastedText.trim().length > 0 ||
    state.selectedDocIds.length > 0;
  const daysLeft = daysUntil(state.customExamDate);
  const previewPlan = computeLevelPlan({
    totalChars: state.pastedText.length + totalSize * 0.6 + state.selectedDocIds.length * 4000,
    daysLeft,
    targetMastery: state.targetMastery,
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) wizard.addFiles(Array.from(e.dataTransfer.files));
  };

  const totalMinutes = state.generatedTopics
    .filter((t) => t.selected)
    .reduce((a, t) => a + (t.estimatedMinutes || 0), 0);

  return (
    <div className="w-full max-w-2xl mx-auto p-5 sm:p-7 bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl shadow-sm transition-all">
      {/* ── BARRA DE PROGRESO DE PASOS (ESTILO APPLE) ── */}
      <div className="mb-6 pb-4 border-b border-border/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {state.step > 1 && state.step !== 5 && (
            <button
              onClick={() => wizard.setStep((state.step === 6 ? 4 : state.step - 1) as any)}
              className="p-1.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Paso anterior"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            Paso <span className="text-foreground font-semibold">{state.step}</span> de 6
          </span>
        </div>

        {/* Indicador de píldoras */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <div
              key={st}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                st === state.step
                  ? "w-6 bg-primary"
                  : st < state.step
                  ? "w-3 bg-primary/40"
                  : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        {onCancel && state.step !== 5 ? (
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* ───── PASO 1: MATERIA (solo regulares / cursables) ───── */}
      {state.step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              ¿Qué materia vas a rendir?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Selecciona una de tus materias regulares o en curso para estructurar tu plan.
            </p>
          </div>

          {loadingSubjects ? (
            <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Cargando tus materias...</span>
            </div>
          ) : eligibleSubjects.length === 0 ? (
            <div className="p-6 border border-dashed border-border/80 rounded-xl text-center space-y-3 bg-muted/20">
              <p className="text-sm font-medium text-foreground">
                Todavía no tenés materias regulares o cursables.
              </p>
              <p className="text-xs text-muted-foreground">
                Actualizá el estado de tus materias para generar una ruta personalizada.
              </p>
              <Link
                to="/materias"
                className="inline-flex px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-all shadow-xs"
              >
                Ir a Mis Materias
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-none">
              {eligibleSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => wizard.selectSubject(s.id, s.nombre)}
                  className="p-3.5 rounded-xl border border-border/60 bg-card/60 hover:bg-accent/40 hover:border-primary/40 transition-all duration-150 text-left flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {s.nombre}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5 font-medium border",
                          s.status === "regular"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {s.status === "regular" ? "Regular · Final" : "Cursable"}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───── PASO 2: EVENTO / FECHA ───── */}
      {state.step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium mb-2">
              <span>{state.subjectName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              ¿Para qué fecha o evento te preparás?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              El ritmo y la cantidad de niveles se calibrarán según los días restantes.
            </p>
          </div>

          {subjectEvents.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                Eventos agendados en tu calendario
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subjectEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => wizard.selectEvent(ev)}
                    className="p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 hover:border-primary/40 transition-all text-left cursor-pointer"
                  >
                    <span className="text-xs font-medium text-foreground block truncate">{ev.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      {fmtDate(ev.date)} · en {daysUntil(ev.date)} día/s
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {subjectEvents.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground">O elegí un plazo:</span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: "manana", label: "Mañana", desc: "Modo intensivo / Sprint exprés", icon: Zap },
                { id: "2dias", label: "En 2 días", desc: "Sprint de 48 horas focalizado", icon: Flame },
                { id: "proxima_semana", label: "Próxima semana", desc: "Ruta equilibrada y profunda", icon: Calendar },
                { id: "personalizado", label: "Fecha personalizada", desc: "Elegir un día específico del calendario", icon: Clock },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => wizard.selectExamDate(opt.id as ExamDateOption, state.customExamDate)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all text-left cursor-pointer flex items-center gap-3",
                    state.examDateOption === opt.id
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                      : "border-border/60 bg-card/60 hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center text-muted-foreground shrink-0">
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground block">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {state.examDateOption === "personalizado" && (
            <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3 animate-in fade-in duration-150">
              <label className="text-xs font-medium text-foreground block">
                Fecha exacta del examen:
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={state.customExamDate}
                onChange={(e) => wizard.selectExamDate("personalizado", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border/70 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => wizard.setStep(3)}
                className="w-full py-2 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                Confirmar fecha y continuar ➔
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───── PASO 3: META + PREFERENCIA ───── */}
      {state.step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Tu meta y estilo de estudio
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Ajustan la profundidad conceptual y la exigencia de las evaluaciones.
            </p>
          </div>

          <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-4">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-muted-foreground">Meta de dominio deseada</span>
              <span className="text-primary font-semibold text-sm">{state.targetMastery}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={state.targetMastery}
              onChange={(e) => wizard.setTargetMastery(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { val: 60, desc: "Aprobar" },
                { val: 75, desc: "Promoción" },
                { val: 90, desc: "Nota alta" },
                { val: 100, desc: "Maestría" },
              ].map((m) => (
                <button
                  key={m.val}
                  onClick={() => wizard.setTargetMastery(m.val)}
                  className={cn(
                    "py-1.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer",
                    state.targetMastery === m.val
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background/80 text-foreground border-border/60 hover:bg-muted"
                  )}
                >
                  {m.val}%<span className="block text-[10px] text-muted-foreground opacity-90">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground block">¿Cómo preferís abordar cada nivel?</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "leer", label: "Lectura", desc: "Guía teórica previa", icon: BookOpen },
                { id: "podcast", label: "Podcast IA", desc: "Voz sintetizada", icon: Radio },
                { id: "practicar", label: "Práctica", desc: "Directo a desafíos", icon: PenTool },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => wizard.setStudyPreference(p.id as any)}
                  className={cn(
                    "p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all cursor-pointer",
                    state.studyPreference === p.id
                      ? "bg-primary/10 border-primary text-primary ring-1 ring-primary"
                      : "bg-card/60 border-border/60 text-foreground hover:bg-muted/50"
                  )}
                >
                  <p.icon className="w-4 h-4" />
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={wizard.goToUploadStep}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <span>Continuar al material de estudio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───── PASO 4: MATERIAL (APUNTES DE LA APP + ARCHIVOS) ───── */}
      {state.step === 4 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Cargá tu material de estudio
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Podés vincular tus apuntes de TABE, subir documentos en PDF o pegar el programa.
            </p>
          </div>

          {/* Segmented Control Notion / Apple */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 border border-border/50 rounded-xl">
            <button
              type="button"
              onClick={() => setMaterialSourceTab("notion")}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer",
                materialSourceTab === "notion"
                  ? "bg-background text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Apuntes de TABE</span>
              {state.selectedDocIds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {state.selectedDocIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMaterialSourceTab("files")}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer",
                materialSourceTab === "files"
                  ? "bg-background text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Archivos & Texto</span>
              {state.files.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {state.files.length}
                </span>
              )}
            </button>
          </div>

          {/* ── SUB-TAB 1: MIS APUNTES DE TABE (NOTION) ── */}
          {materialSourceTab === "notion" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3 bg-muted/30 border border-border/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Extracción Inteligente</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  TABE AI analiza tus apuntes, subpáginas anidadas y diagramas para construir las lecciones de cada nivel.
                </p>
              </div>

              {/* Filtros y Buscador */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Buscar por título..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {docSearch && (
                    <button
                      type="button"
                      onClick={() => setDocSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {state.subjectId && (
                  <button
                    type="button"
                    onClick={() => setFilterSubjectDocs(!filterSubjectDocs)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                      filterSubjectDocs
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/40 text-muted-foreground border-border/50 hover:text-foreground"
                    )}
                  >
                    {filterSubjectDocs ? `Solo ${state.subjectName}` : "Todos los apuntes"}
                  </button>
                )}
              </div>

              {/* Acciones masivas */}
              {filteredNotionDocs.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {state.selectedDocIds.length} de {filteredNotionDocs.length} seleccionado(s)
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        filteredNotionDocs.forEach((d) => {
                          if (!state.selectedDocIds.includes(d.id)) {
                            wizard.toggleNotionDoc({ id: d.id, title: d.title });
                          }
                        });
                      }}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      Marcar todos
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => wizard.clearNotionDocs()}
                      className="hover:text-destructive transition-colors cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Apuntes */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
                {loadingNotionDocs ? (
                  <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Cargando tus apuntes...</span>
                  </div>
                ) : filteredNotionDocs.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-border/60 rounded-xl bg-muted/20 p-4 space-y-2">
                    <BookOpen className="w-5 h-5 mx-auto text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground">
                      {docSearch
                        ? `No hay apuntes que coincidan con "${docSearch}".`
                        : filterSubjectDocs && state.subjectId
                        ? `No tenés apuntes asignados a "${state.subjectName}". Podés desmarcar el filtro o subir archivos en la otra pestaña.`
                        : "Aún no creaste apuntes en TABE. Podés subir archivos PDF en la pestaña contigua."}
                    </p>
                  </div>
                ) : (
                  filteredNotionDocs.map((doc) => {
                    const isSelected = state.selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => wizard.toggleNotionDoc({ id: doc.id, title: doc.title })}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none",
                          isSelected
                            ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                            : "bg-card/60 border-border/50 hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border/80 bg-background"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="w-7 h-7 rounded-md bg-muted/60 border border-border/40 flex items-center justify-center text-sm shrink-0">
                            <TabeIconRenderer iconId={doc.emoji || "book"} size={16} />
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <span className="text-xs font-medium text-foreground block truncate">
                              {doc.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {doc.subpagesCount && doc.subpagesCount > 0 ? (
                                <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground text-[10px] font-medium border border-border/40 flex items-center gap-1">
                                  <GitBranch className="w-2.5 h-2.5 text-primary" />
                                  {doc.subpagesCount} subpáginas
                                </span>
                              ) : null}
                              <span className="text-[10px] text-muted-foreground">
                                {doc.updated_at ? fmtDate(doc.updated_at) : "Reciente"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full shrink-0">
                            Incluido
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── SUB-TAB 2: ARCHIVOS Y TEXTO PEGADO ── */}
          {materialSourceTab === "files" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("wizard-file-input")?.click()}
                className={cn(
                  "p-5 border border-dashed rounded-xl text-center transition-all bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : state.files.length
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/70 hover:border-primary/50"
                )}
              >
                <input
                  id="wizard-file-input"
                  type="file"
                  multiple
                  accept={ACCEPTED_MATERIAL}
                  onChange={(e) => {
                    if (e.target.files?.length) wizard.addFiles(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <div className="w-9 h-9 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="font-medium text-xs block text-foreground">
                  Arrastrá archivos o hacé clic para explorar
                </span>
                <span className="text-[11px] text-muted-foreground">
                  PDF, DOCX, TXT, MD — hasta {MAX_FILES} archivos
                </span>
              </div>

              {state.files.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> {state.files.length} archivo(s) · {(totalSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
                    {state.files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 p-2 bg-muted/30 border border-border/50 rounded-lg"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="text-xs truncate flex-1 text-foreground">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={() => wizard.removeFile(i)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label={`Quitar ${f.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  O pegá el temario, resumen o programa de la materia:
                </label>
                <textarea
                  rows={2}
                  value={state.pastedText}
                  onChange={(e) => wizard.setPastedText(e.target.value)}
                  placeholder="Ej: Unidad 1: Álgebra matricial. Unidad 2: Espacios vectoriales..."
                  className="w-full p-2.5 bg-muted/30 border border-border/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>
          )}

          {/* Resumen del Material Seleccionado */}
          <div className="p-3 bg-muted/30 border border-border/50 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Compass className="w-3 h-3 text-primary" />
                Material consolidado:
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                {state.selectedDocIds.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 rounded-full font-medium">
                    {state.selectedDocIds.length} apunte(s)
                  </span>
                )}
                {state.files.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-muted text-foreground border border-border/40 rounded-full font-medium">
                    {state.files.length} archivo(s)
                  </span>
                )}
                {state.pastedText.trim() && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                    Texto
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {hasMaterial ? (
                <span>
                  Estimamos <b>{previewPlan.min}–{previewPlan.max} niveles</b> para {state.eventLabel || "tu examen"} en {daysLeft} día/s adaptados a tu meta del {state.targetMastery}%.
                </span>
              ) : (
                <span>
                  Si no cargás material, TABE AI deducirá el temario universitario estándar de <b>{state.subjectName}</b>.
                </span>
              )}
            </p>
          </div>

          <button
            onClick={wizard.processMaterialAndGenerate}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>
              {hasMaterial
                ? "Generar ruta de estudio con IA"
                : "Generar temario sugerido con IA"}
            </span>
          </button>
        </div>
      )}

      {/* ───── PASO 5: PROCESANDO (LOADER ELEGANTE) ───── */}
      {state.step === 5 && (
        <div className="py-8 px-2 text-center space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-border/50 bg-muted/20 py-6 overflow-hidden flex items-center justify-center">
            <IsoCubesLoader scale={0.65} duration={3} />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              {state.processingStatusText}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto min-h-[2.5rem]">
              {PROCESSING_TIPS[tipIdx]}
            </p>
          </div>

          <div className="max-w-xs mx-auto w-full space-y-2">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${state.processingProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {state.processingProgress}% · {state.subjectName}{state.eventLabel ? ` · ${state.eventLabel}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* ───── PASO 6: CONFIRMACIÓN ───── */}
      {state.step === 6 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Tu ruta personalizada
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {state.generatedTopics.length} niveles
              {totalMinutes > 0 ? ` · ~${Math.round(totalMinutes / 60 * 10) / 10} h estimadas` : ""}
              . Podés desmarcar temas que ya domines.
            </p>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-none">
            {state.generatedTopics.map((topic, idx) => (
              <div
                key={topic.id}
                onClick={() => wizard.toggleTopic(topic.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                  topic.selected
                    ? "bg-card/80 border-border/70 text-foreground"
                    : "bg-muted/20 border-border/40 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                    topic.selected ? "bg-primary border-primary text-primary-foreground" : "border-border/80 bg-background"
                  )}
                >
                  {topic.selected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold block truncate">
                      Nivel {idx + 1}: {topic.title}
                    </span>
                    {topic.estimatedMinutes ? (
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        ~{topic.estimatedMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {topic.summary}
                  </p>
                  {topic.keyTopics && topic.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {topic.keyTopics.slice(0, 5).map((k) => (
                        <span
                          key={k}
                          className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/40"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            <span className="px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/50 text-[11px] font-medium">
              {state.eventLabel || "Examen"} · {fmtDate(state.customExamDate)}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/50 text-[11px] font-medium">
              Meta: {state.targetMastery}%
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/50 text-[11px] font-medium">
              Estilo: {state.studyPreference}
            </span>
          </div>

          <button
            onClick={wizard.finalizeRoadmap}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Crear mapa de niveles</span>
          </button>
        </div>
      )}
    </div>
  );
};
