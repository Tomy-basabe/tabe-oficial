import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStudyRoadmapWizard, daysUntil } from "@/hooks/useStudyRoadmapWizard";
import { useSubjects } from "@/hooks/useSubjects";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { StudyRoadmap, ExamDateOption, WizardEventOption } from "@/types/studyRoadmap";
import { ACCEPTED_MATERIAL, MAX_FILES } from "@/lib/materialExtractor";
import { fetchUserNotionDocs } from "@/lib/notionMaterialExtractor";
import { NotionDocOption } from "@/types/studyRoadmap";
import { computeLevelPlan } from "@/lib/roadmapHeuristics";
import { IsoCubesLoader } from "./IsoCubesLoader";
import {
  BookOpen,
  Calendar,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Flame,
  Zap,
  Clock,
  Headphones,
  PenTool,
  Check,
  X,
  CalendarCheck,
  Layers,
  Loader2,
  Radio,
  Search,
  CheckSquare,
  Square,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapWizardProps {
  userId?: string;
  onComplete: (roadmap: StudyRoadmap) => void;
  onCancel?: () => void;
}

const PROCESSING_TIPS = [
  "Cada nivel se arma con fragmentos reales de tus apuntes.",
  "Más material = más niveles. Menos días = ritmo más intenso.",
  "Los desafíos de cada nivel salen de tu propio contenido.",
  "Al superar un nivel ganás Tabecoins y XP para tu mascota.",
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
  const [materialSourceTab, setMaterialSourceTab] = useState<"files" | "notion">("notion");

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

  // Eventos futuros reales de la materia elegida (parciales, globales, finales, TP...)
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
      .slice(0, 6)
      .map((e) => ({
        id: e.id,
        label: `${e.tipo_examen}${e.titulo && e.titulo !== e.tipo_examen ? " · " + e.titulo : ""}`,
        date: e.fecha,
      }));
  }, [events, state.subjectId]);

  useEffect(() => {
    if (state.step !== 5) return;
    const t = setInterval(() => setTipIdx((i) => (i + 1) % PROCESSING_TIPS.length), 3200);
    return () => clearInterval(t);
  }, [state.step]);

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
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 bg-card border-4 border-foreground rounded-2xl shadow-[8px_8px_0px_#000]">
      {/* Barra de progreso de pasos */}
      <div className="mb-6 pb-4 border-b-2 border-foreground/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state.step > 1 && state.step !== 5 && (
            <button
              onClick={() => wizard.setStep((state.step === 6 ? 4 : state.step - 1) as any)}
              className="p-1.5 rounded-lg border-2 border-foreground bg-muted hover:bg-muted/80 text-foreground transition-transform active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="font-black text-xs uppercase tracking-wider text-muted-foreground">Paso {state.step} de 6</span>
        </div>

        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <div
              key={st}
              className={cn(
                "h-2 rounded-full border border-foreground transition-all",
                st === state.step ? "w-8 bg-[#FFE600]" : st < state.step ? "w-4 bg-[#BFFF00]" : "w-3 bg-muted"
              )}
            />
          ))}
        </div>

        {onCancel && state.step !== 5 && (
          <button onClick={onCancel} className="text-[10px] font-black uppercase text-muted-foreground hover:text-foreground underline">
            Cancelar
          </button>
        )}
      </div>

      {/* ───── PASO 1: MATERIA (solo regulares / cursables) ───── */}
      {state.step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-foreground">¿Qué materia vas a rendir?</h2>
            <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">
              Solo aparecen tus materias <b>regulares</b> y <b>cursables</b>.
            </p>
          </div>

          {loadingSubjects ? (
            <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground font-black text-xs uppercase">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando tus materias...
            </div>
          ) : eligibleSubjects.length === 0 ? (
            <div className="p-5 border-3 border-dashed border-foreground/50 rounded-xl text-center space-y-3">
              <p className="text-sm font-bold text-foreground">Todavía no tenés materias regulares o cursables.</p>
              <p className="text-xs text-muted-foreground">Marcá el estado de tus materias para poder armar tu ruta.</p>
              <Link
                to="/subjects"
                className="inline-flex px-4 py-2 bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-foreground rounded-lg shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                Ir a Mis Materias
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {eligibleSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => wizard.selectSubject(s.id, s.nombre)}
                  className="p-4 rounded-xl border-3 border-foreground bg-card hover:bg-[#FFE600] hover:text-black transition-all shadow-[4px_4px_0px_#000] hover:translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-left font-black text-sm uppercase flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-muted group-hover:bg-black group-hover:text-white border-2 border-foreground flex items-center justify-center transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate">{s.nombre}</span>
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded border border-foreground inline-block mt-0.5 text-black",
                          s.status === "regular" ? "bg-[#00E5FF]" : "bg-[#BFFF00]"
                        )}
                      >
                        {s.status === "regular" ? "Regular · final" : "Cursable"}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
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
            <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-[#FFE600] text-black border-2 border-foreground rounded-full shadow-[2px_2px_0px_#000] inline-block mb-2">
              {state.subjectName}
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-foreground">¿Para qué evento estudiás?</h2>
            <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">
              La ruta se arma <b>para ese evento</b>: el ritmo y la cantidad de niveles dependen de los días que faltan.
            </p>
          </div>

          {subjectEvents.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5" /> De tu calendario
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {subjectEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => wizard.selectEvent(ev)}
                    className="p-3 rounded-xl border-3 border-foreground bg-card hover:bg-[#BFFF00] hover:text-black transition-all shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 text-left cursor-pointer"
                  >
                    <span className="text-xs font-black uppercase block truncate">{ev.label}</span>
                    <span className="text-[11px] font-bold opacity-80">
                      {fmtDate(ev.date)} · en {daysUntil(ev.date)} día/s
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {subjectEvents.length > 0 && <span className="text-[11px] font-black uppercase text-muted-foreground">O elegí una fecha</span>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "manana", label: "Mañana", desc: "Modo emergencia / ultra intensivo", icon: Zap, color: "hover:bg-[#FF3366] hover:text-white" },
                { id: "2dias", label: "En 2 días", desc: "Sprint rápido de 48 horas", icon: Flame, color: "hover:bg-[#FF9900] hover:text-black" },
                { id: "proxima_semana", label: "Próxima semana", desc: "Ruta equilibrada y completa", icon: Calendar, color: "hover:bg-[#BFFF00] hover:text-black" },
                { id: "personalizado", label: "Fecha personalizada", desc: "Elegir un día específico", icon: Clock, color: "hover:bg-[#00E5FF] hover:text-black" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => wizard.selectExamDate(opt.id as ExamDateOption, state.customExamDate)}
                  className={cn(
                    "p-4 rounded-xl border-3 border-foreground bg-card transition-all shadow-[4px_4px_0px_#000] text-left font-black cursor-pointer group hover:-translate-y-0.5",
                    opt.color,
                    state.examDateOption === opt.id && opt.id === "personalizado" && "bg-[#00E5FF] text-black"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <opt.icon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-sm uppercase block">{opt.label}</span>
                      <span className="text-[11px] font-medium opacity-80 block">{opt.desc}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {state.examDateOption === "personalizado" && (
            <div className="p-4 bg-muted/60 border-2 border-foreground rounded-xl space-y-2 shadow-[3px_3px_0px_#000]">
              <label className="text-xs font-black uppercase text-foreground block">Fecha exacta del evento:</label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={state.customExamDate}
                onChange={(e) => wizard.selectExamDate("personalizado", e.target.value)}
                className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-lg font-bold text-sm text-foreground focus:outline-none"
              />
              <button
                onClick={() => wizard.setStep(3)}
                className="mt-2 w-full py-2.5 bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-foreground rounded-lg shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                Confirmar fecha ➔
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───── PASO 3: META + PREFERENCIA ───── */}
      {state.step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-foreground">Tu meta y tu estilo</h2>
            <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">
              Definen la profundidad de los niveles y la dificultad de los desafíos.
            </p>
          </div>

          <div className="p-4 bg-muted/60 border-2 border-foreground rounded-xl shadow-[3px_3px_0px_#000] space-y-3">
            <div className="flex justify-between text-xs font-black uppercase">
              <span>Meta de dominio</span>
              <span className="text-primary text-base">{state.targetMastery}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={state.targetMastery}
              onChange={(e) => wizard.setTargetMastery(Number(e.target.value))}
              className="w-full h-3 accent-[#FFE600] cursor-pointer"
            />
            <div className="h-6 w-full bg-background border-2 border-foreground rounded-lg overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#FFE600] via-[#00E5FF] to-[#BFFF00] border-r-2 border-foreground transition-all duration-200"
                style={{ width: `${state.targetMastery}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
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
                    "py-2 rounded-lg border-2 border-foreground font-black text-center text-xs shadow-[2px_2px_0px_#000] transition-all",
                    state.targetMastery === m.val ? "bg-[#FFE600] text-black" : "bg-card text-foreground hover:bg-muted"
                  )}
                >
                  {m.val}%<span className="block text-[9px] uppercase opacity-70">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-foreground block">¿Cómo preferís estudiar?</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "leer", label: "Leer", desc: "Guía teórica antes del desafío", icon: BookOpen },
                { id: "podcast", label: "Podcast IA", desc: "Clase explicada por voz en tiempo real", icon: Radio },
                { id: "practicar", label: "Practicar", desc: "Directo a rendir el nivel", icon: PenTool },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => wizard.setStudyPreference(p.id as any)}
                  className={cn(
                    "p-2.5 rounded-xl border-2 border-foreground font-black text-xs uppercase flex flex-col items-center gap-1 transition-all shadow-[2px_2px_0px_#000] cursor-pointer",
                    state.studyPreference === p.id ? "bg-[#FFE600] text-black" : "bg-muted text-foreground hover:bg-card"
                  )}
                >
                  <p.icon className="w-4 h-4" />
                  <span>{p.label}</span>
                  <span className="text-[9px] font-medium normal-case opacity-70 text-center leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={wizard.goToUploadStep}
            className="w-full py-3 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-sm border-3 border-foreground rounded-xl shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Continuar a mi material</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───── PASO 4: MATERIAL (APUNTES DE LA APP + ARCHIVOS) ───── */}
      {state.step === 4 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-foreground">
              Cargá tu material de estudio
            </h2>
            <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">
              Podés usar tus apuntes creados en TABE, subir PDFs/archivos o pegar texto. La IA lee subpáginas, diagramas Mermaid y desplegables.
            </p>
          </div>

          {/* Selector de Pestañas de Material */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 border-2 border-foreground rounded-xl shadow-[3px_3px_0px_#000]">
            <button
              type="button"
              onClick={() => setMaterialSourceTab("notion")}
              className={cn(
                "py-2 px-3 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer",
                materialSourceTab === "notion"
                  ? "bg-[#FFE600] text-black border-2 border-foreground shadow-[2px_2px_0px_#000]"
                  : "text-foreground hover:bg-card border border-transparent"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Mis Apuntes de TABE</span>
              {state.selectedDocIds.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-[#FFE600] text-[10px] flex items-center justify-center font-black">
                  {state.selectedDocIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMaterialSourceTab("files")}
              className={cn(
                "py-2 px-3 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer",
                materialSourceTab === "files"
                  ? "bg-[#00E5FF] text-black border-2 border-foreground shadow-[2px_2px_0px_#000]"
                  : "text-foreground hover:bg-card border border-transparent"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Archivos & Texto</span>
              {state.files.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-[#00E5FF] text-[10px] flex items-center justify-center font-black">
                  {state.files.length}
                </span>
              )}
            </button>
          </div>

          {/* ── SUB-TAB 1: MIS APUNTES DE TABE (NOTION) ── */}
          {materialSourceTab === "notion" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Banner explicativo de capacidades */}
              <div className="p-3 bg-muted/50 border-2 border-foreground rounded-xl text-xs font-bold text-foreground space-y-1 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-1.5 text-primary text-[11px] font-black uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extracción Inteligente de Apuntes</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Al seleccionar un apunte, TABE AI leerá también todas sus <b>subpáginas anidadas (/pagina)</b>, abrirá todos los <b>desplegables/toggles</b> y analizará los <b>diagramas Mermaid</b> para estructurar tu ruta.
                </p>
              </div>

              {/* Filtros y Buscador de Apuntes */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Buscar apunte por título..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-muted/40 border-2 border-foreground rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none shadow-[2px_2px_0px_#000]"
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
                      "px-3 py-2 rounded-xl border-2 border-foreground text-[11px] font-black uppercase transition-all shadow-[2px_2px_0px_#000] cursor-pointer whitespace-nowrap",
                      filterSubjectDocs ? "bg-[#BFFF00] text-black" : "bg-card text-foreground"
                    )}
                  >
                    {filterSubjectDocs ? `Solo ${state.subjectName}` : "Todos los apuntes"}
                  </button>
                )}
              </div>

              {/* Acciones masivas de selección */}
              {filteredNotionDocs.length > 0 && (
                <div className="flex items-center justify-between text-[11px] font-black uppercase text-muted-foreground px-1">
                  <span>
                    {state.selectedDocIds.length} seleccionado(s) de {filteredNotionDocs.length}
                  </span>
                  <div className="flex items-center gap-2">
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

              {/* Lista de Apuntes Scrolleable */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {loadingNotionDocs ? (
                  <div className="py-8 text-center text-xs font-black uppercase text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Cargando tus apuntes...</span>
                  </div>
                ) : filteredNotionDocs.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-foreground/30 rounded-2xl bg-muted/20 p-4 space-y-2">
                    <BookOpen className="w-6 h-6 mx-auto text-muted-foreground opacity-60" />
                    <p className="text-xs font-bold text-muted-foreground">
                      {docSearch
                        ? `No hay apuntes que coincidan con "${docSearch}".`
                        : filterSubjectDocs && state.subjectId
                        ? `No tenés apuntes asignados a "${state.subjectName}". Cambiá a "Todos los apuntes" o subí tus PDFs en la otra pestaña.`
                        : "Aún no creaste apuntes en TABE. Podés subir archivos PDF/DOCX en la pestaña contigua."}
                    </p>
                    {filterSubjectDocs && state.subjectId && (
                      <button
                        type="button"
                        onClick={() => setFilterSubjectDocs(false)}
                        className="px-3 py-1 bg-card hover:bg-muted border border-foreground rounded-lg text-[10px] font-black uppercase cursor-pointer shadow-[2px_2px_0px_#000]"
                      >
                        Ver todos mis apuntes
                      </button>
                    )}
                  </div>
                ) : (
                  filteredNotionDocs.map((doc) => {
                    const isSelected = state.selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => wizard.toggleNotionDoc({ id: doc.id, title: doc.title })}
                        className={cn(
                          "p-3 rounded-xl border-2 border-foreground transition-all cursor-pointer flex items-center justify-between gap-3 shadow-[3px_3px_0px_#000] select-none",
                          isSelected
                            ? "bg-[#FFE600]/20 border-foreground ring-2 ring-[#FFE600]"
                            : "bg-card hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-5 h-5 rounded border-2 border-foreground flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "bg-[#BFFF00] text-black" : "bg-background"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="w-8 h-8 rounded-lg bg-muted border border-foreground flex items-center justify-center text-base shrink-0 shadow-[1px_1px_0px_#000]">
                            {doc.emoji || "📝"}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <span className="text-xs font-black uppercase block truncate text-foreground">
                              {doc.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {doc.subpagesCount && doc.subpagesCount > 0 ? (
                                <span className="px-1.5 py-0.2 rounded bg-[#00E5FF] text-black text-[9px] font-black uppercase border border-foreground flex items-center gap-1">
                                  <GitBranch className="w-2.5 h-2.5" />
                                  {doc.subpagesCount} subpágina(s)
                                </span>
                              ) : null}
                              <span className="text-[9px] text-muted-foreground font-semibold">
                                {doc.updated_at ? fmtDate(doc.updated_at) : "Reciente"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#BFFF00] text-black border border-foreground rounded shrink-0 shadow-[1px_1px_0px_#000]">
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
                  "p-5 border-3 border-dashed rounded-2xl text-center transition-all bg-card flex flex-col items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000]",
                  dragOver
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : state.files.length
                    ? "border-[#BFFF00] bg-[#BFFF00]/10"
                    : "border-foreground/40 hover:border-foreground"
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
                <div className="w-10 h-10 rounded-xl bg-muted border-2 border-foreground flex items-center justify-center shadow-[2px_2px_0px_#000]">
                  <Upload className="w-5 h-5 text-foreground" />
                </div>
                <span className="font-black text-xs uppercase block text-foreground">
                  Arrastrá archivos o hacé clic
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  PDF · PPTX · DOCX · TXT · MD · CSV — hasta {MAX_FILES} archivos
                </span>
              </div>

              {state.files.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> {state.files.length} archivo/s · {(totalSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {state.files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 p-2 bg-muted/50 border-2 border-foreground rounded-lg"
                      >
                        <FileText className="w-4 h-4 shrink-0 text-primary" />
                        <span className="text-xs font-bold truncate flex-1">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={() => wizard.removeFile(i)}
                          className="p-0.5 rounded border border-foreground bg-card hover:bg-destructive hover:text-white transition-colors"
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
                <label className="text-xs font-black uppercase text-muted-foreground">
                  Y/o pegá temario, resumen o programa de la materia:
                </label>
                <textarea
                  rows={2}
                  value={state.pastedText}
                  onChange={(e) => wizard.setPastedText(e.target.value)}
                  placeholder="Ej: Unidad 1: Límites y continuidad. Unidad 2: Derivadas..."
                  className="w-full p-2.5 bg-muted/40 border-2 border-foreground rounded-xl font-medium text-xs text-foreground focus:outline-none resize-none shadow-[2px_2px_0px_#000]"
                />
              </div>
            </div>
          )}

          {/* Resumen del Material Seleccionado */}
          <div className="p-3 bg-muted/60 border-2 border-foreground rounded-xl text-xs font-bold text-foreground space-y-1.5 shadow-[2px_2px_0px_#000]">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Material Consolidado:
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                {state.selectedDocIds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#FFE600] text-black border border-foreground rounded">
                    {state.selectedDocIds.length} apunte(s)
                  </span>
                )}
                {state.files.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#00E5FF] text-black border border-foreground rounded">
                    {state.files.length} archivo(s)
                  </span>
                )}
                {state.pastedText.trim() && (
                  <span className="px-1.5 py-0.5 bg-[#BFFF00] text-black border border-foreground rounded">
                    Texto
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground font-medium">
              {hasMaterial ? (
                <span>
                  Estimamos <b>{previewPlan.min}–{previewPlan.max} niveles</b> para {state.eventLabel || "tu examen"} en {daysLeft} día/s adaptados a tu meta del {state.targetMastery}%.
                </span>
              ) : (
                <span>
                  Si no cargás material, TABE AI deducirá el <b>temario universitario de {state.subjectName}</b> por su nombre oficial.
                </span>
              )}
            </p>
          </div>

          <button
            onClick={wizard.processMaterialAndGenerate}
            className="w-full py-3.5 bg-[#FFE600] hover:bg-[#ffe100] text-black font-black uppercase text-sm border-3 border-foreground rounded-xl shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {hasMaterial
                ? "Generar mi ruta con IA 🚀"
                : "Generar ruta desde el nombre de la materia 🚀"}
            </span>
          </button>
        </div>
      )}

      {/* ───── PASO 5: PROCESANDO (LOADER ISOMÉTRICO) ───── */}
      {state.step === 5 && (
        <div className="py-6 px-2 text-center space-y-5 animate-in fade-in duration-300">
          <div className="rounded-2xl border-4 border-foreground bg-[#0f0f14] shadow-[6px_6px_0px_#000] py-4 overflow-hidden">
            <IsoCubesLoader scale={0.62} duration={3} />
          </div>

          <div>
            <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-foreground">{state.processingStatusText}</h3>
            <p className="text-xs font-medium text-muted-foreground mt-1 min-h-[2rem] transition-opacity">
              {PROCESSING_TIPS[tipIdx]}
            </p>
          </div>

          <div className="max-w-md mx-auto w-full space-y-2">
            <div className="h-4 w-full bg-background border-2 border-foreground rounded-lg overflow-hidden p-0.5 shadow-[2px_2px_0px_#000]">
              <div className="h-full bg-[#BFFF00] transition-all duration-500 rounded" style={{ width: `${state.processingProgress}%` }} />
            </div>
            <span className="text-[10px] font-black uppercase text-muted-foreground">
              {state.processingProgress}% · {state.subjectName}{state.eventLabel ? ` · ${state.eventLabel}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* ───── PASO 6: CONFIRMACIÓN ───── */}
      {state.step === 6 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-foreground">Tu ruta personalizada</h2>
            <p className="text-xs md:text-sm font-medium text-muted-foreground mt-1">
              {state.generatedTopics.length} niveles
              {totalMinutes > 0 ? ` · ~${Math.round(totalMinutes / 60 * 10) / 10} h de estudio` : ""}
              {state.subjectOnly
                ? ` · temario deducido de "${state.subjectName}" (cargá material para personalizarlo más)`
                : ` · armada con ${state.files.length + (state.pastedText.trim() ? 1 : 0)} fuente/s de tu material`}
              . Desactivá los niveles que no quieras.
            </p>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {state.generatedTopics.map((topic, idx) => (
              <div
                key={topic.id}
                onClick={() => wizard.toggleTopic(topic.id)}
                className={cn(
                  "p-3 rounded-xl border-2 border-foreground transition-all cursor-pointer flex items-start gap-3 shadow-[3px_3px_0px_#000]",
                  topic.selected ? "bg-card text-foreground" : "bg-muted/40 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 mt-0.5 rounded border-2 border-foreground flex items-center justify-center shrink-0",
                    topic.selected ? "bg-[#BFFF00] text-black" : "bg-background"
                  )}
                >
                  {topic.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase block truncate">
                      Nivel {idx + 1}: {topic.title}
                    </span>
                    {topic.estimatedMinutes ? (
                      <span className="text-[10px] font-black text-muted-foreground shrink-0">~{topic.estimatedMinutes} min</span>
                    ) : null}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground line-clamp-2">{topic.summary}</p>
                  {topic.keyTopics && topic.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {topic.keyTopics.slice(0, 5).map((k) => (
                        <span key={k} className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#00E5FF] text-black border border-foreground">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  {topic.sourceFiles && topic.sourceFiles.length > 0 && (
                    <span className="text-[9px] font-bold text-muted-foreground block truncate">📄 {topic.sourceFiles.join(" · ")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <span className="px-2 py-1 rounded-full border-2 border-foreground bg-[#FFE600] text-black">{state.eventLabel || "Examen"} · {fmtDate(state.customExamDate)}</span>
            <span className="px-2 py-1 rounded-full border-2 border-foreground bg-muted">Meta {state.targetMastery}%</span>
            <span className="px-2 py-1 rounded-full border-2 border-foreground bg-muted">Estilo: {state.studyPreference}</span>
          </div>

          <button
            onClick={wizard.finalizeRoadmap}
            className="w-full py-3.5 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-sm border-3 border-foreground rounded-xl shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>¡Crear mi mapa de niveles! 🗺️</span>
          </button>
        </div>
      )}
    </div>
  );
};
