import React, { useState, useRef, useEffect, useCallback } from "react";
import { RoadmapLevel } from "@/types/studyRoadmap";
import {
  Lock,
  Check,
  Star,
  Play,
  Clock,
  BookOpen,
  Radio,
  Target,
  Mic,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  GitBranch,
  Compass,
  Cpu,
  Layers,
  Award,
} from "lucide-react";
import { EmojiPng } from "@/components/common/EmojiPng";
import { cn } from "@/lib/utils";

interface RoadmapSkillTreeProps {
  levels: RoadmapLevel[];
  currentLevel: number;
  onSelectLevel: (level: RoadmapLevel) => void;
}

interface NodeCoord {
  x: number;
  y: number;
  level: number;
  completed: boolean;
  unlocked: boolean;
}

export const RoadmapSkillTree: React.FC<RoadmapSkillTreeProps> = ({
  levels,
  currentLevel,
  onSelectLevel,
}) => {
  const [viewMode, setViewMode] = useState<"tree" | "modules">("tree");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [nodeCoords, setNodeCoords] = useState<NodeCoord[]>([]);

  // Ordenar por nivel 1..N
  const sortedLevels = [...levels].sort((a, b) => a.level - b.level);

  // Posiciones zigzag ergonómicas (0: centro, -1: izquierda, 1: derecha)
  const getOffset = (idx: number) => {
    const cycle = idx % 4;
    if (cycle === 0) return 0; // Centro
    if (cycle === 1) return -60; // Izquierda
    if (cycle === 2) return 0; // Centro
    return 60; // Derecha
  };

  const completedCount = sortedLevels.filter((l) => l.completed).length;

  // Medición geométrica exacta del centro de cada botón de nivel
  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const coords: NodeCoord[] = [];
    sortedLevels.forEach((lvl, idx) => {
      const btn = nodeRefs.current[idx];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        coords.push({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          level: lvl.level,
          completed: lvl.completed,
          unlocked: lvl.unlocked,
        });
      }
    });

    if (coords.length > 0) {
      setNodeCoords(coords);
    }
  }, [sortedLevels]);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      updateCoords();
    });
    return () => cancelAnimationFrame(timer);
  }, [updateCoords, viewMode, sortedLevels.length]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      updateCoords();
    });
    ro.observe(containerRef.current);
    window.addEventListener("resize", updateCoords);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateCoords);
    };
  }, [updateCoords]);

  return (
    <div className="w-full space-y-6">
      {/* ── BARRA SUPERIOR DE CONTROL FUTURISTA ── */}
      <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto px-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Árbol de Aprendizaje
          </span>
          <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">
            ({completedCount}/{sortedLevels.length} completados)
          </span>
        </div>

        {/* Toggle de vistas: Árbol vs Módulos */}
        <div className="flex items-center gap-1 p-1 bg-card/80 backdrop-blur-md border-2 border-foreground rounded-xl shadow-[3px_3px_0px_#000]">
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === "tree"
                ? "bg-[#FFE600] text-black border-2 border-foreground shadow-[2px_2px_0px_#000]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("modules")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === "modules"
                ? "bg-[#00E5FF] text-black border-2 border-foreground shadow-[2px_2px_0px_#000]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Módulos</span>
          </button>
        </div>
      </div>

      {/* ── MODO 1: MAPA DE NIVELES CON FONDO FUTURISTA TECH Y CONECTORES REALES ── */}
      {viewMode === "tree" && (
        <div
          ref={containerRef}
          className="relative py-12 px-4 max-w-xl mx-auto rounded-3xl border-3 border-foreground bg-card/90 overflow-hidden shadow-[8px_8px_0px_#000]"
        >
          {/* ── FONDO AMBIENTAL TECNOLÓGICO (CYBER-GRID & RADIAL GLOWS) ── */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.14]"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: "28px 28px",
            }}
          />

          {/* Destellos ambientales de fondo suaves (sin titilar) */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#FFE600]/10 rounded-full blur-3xl pointer-events-none" />

          {/* ── LÍNEA CONECTORA DINÁMICA EXACTA ENTRE NIVELES (SVG BÉZIER) ── */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ overflow: "visible" }}
          >
            {nodeCoords.length >= 2 &&
              nodeCoords.slice(0, -1).map((p1, idx) => {
                const p2 = nodeCoords[idx + 1];
                if (!p2) return null;

                const dy = p2.y - p1.y;
                const pathD = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + dy * 0.5}, ${p2.x} ${p1.y + dy * 0.5}, ${p2.x} ${p2.y}`;

                const isPathCompleted = p1.completed;
                const isPathActive = p1.unlocked && !p1.completed;

                return (
                  <g key={`path-${idx}`}>
                    {/* Trazo 1: Sombra y contorno neobrutalista */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#000000"
                      strokeWidth={12}
                      strokeLinecap="round"
                    />

                    {/* Trazo 2: Riel tecnológico base */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity={0.18}
                      strokeWidth={8}
                      strokeLinecap="round"
                    />

                    {/* Trazo 3: Pista de energía / progreso */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={
                        isPathCompleted
                          ? "#BFFF00"
                          : isPathActive
                          ? "#FFE600"
                          : "currentColor"
                      }
                      strokeOpacity={isPathCompleted || isPathActive ? 1 : 0.25}
                      strokeWidth={isPathCompleted || isPathActive ? 4 : 2.5}
                      strokeDasharray={isPathCompleted ? undefined : "6 6"}
                      strokeLinecap="round"
                    />

                    {/* Nodos de circuito / soldadura en los puntos de contacto */}
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r={5}
                      fill={isPathCompleted ? "#BFFF00" : "#000000"}
                      stroke="#000000"
                      strokeWidth={2}
                    />
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r={5}
                      fill={p2.completed ? "#BFFF00" : p2.unlocked ? "#FFE600" : "#666666"}
                      stroke="#000000"
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
          </svg>

          {/* Nodos de niveles */}
          <div className="relative z-10 space-y-12 flex flex-col items-center">
            {sortedLevels.map((lvl, index) => {
              const isCompleted = lvl.completed;
              const isCurrent = lvl.unlocked && !lvl.completed;
              const isLocked = !lvl.unlocked;
              const offsetX = getOffset(index);

              return (
                <div
                  key={lvl.level}
                  style={{ transform: `translateX(${offsetX}px)` }}
                  className="flex flex-col items-center transition-transform duration-300"
                >
                  {/* Badge de Nivel Activo (Estático, elegante, sin titilar) */}
                  {isCurrent && (
                    <div className="mb-2.5 px-3 py-1 bg-[#FFE600] text-black border-2 border-foreground rounded-full text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] flex items-center gap-1.5">
                      <EmojiPng emoji="🎯" size="xs" />
                      <span>Objetivo Activo</span>
                    </div>
                  )}

                  {/* Nodo Principal del Nivel */}
                  <button
                    ref={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    disabled={isLocked}
                    onClick={() => onSelectLevel(lvl)}
                    title={lvl.title}
                    className={cn(
                      "relative rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer select-none",
                      // Estado Bloqueado: Titanio mate limpio
                      isLocked &&
                        "w-16 h-16 md:w-20 md:h-20 bg-muted/80 text-muted-foreground border-3 border-foreground/40 shadow-[4px_4px_0px_rgba(0,0,0,0.25)] cursor-not-allowed opacity-80",
                      // Estado Completado: Verde neón con borde marcado
                      isCompleted &&
                        "w-16 h-16 md:w-20 md:h-20 bg-[#BFFF00] text-black border-3 border-foreground shadow-[5px_5px_0px_#000] hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000] active:translate-y-0",
                      // Estado Actual: Amarillo dorado con halo de foco limpio (sin parpadeos)
                      isCurrent &&
                        "w-20 h-20 md:w-24 md:h-24 bg-[#FFE600] text-black border-4 border-foreground shadow-[6px_6px_0px_#000] ring-4 ring-[#FFE600]/30 hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] active:translate-y-0"
                    )}
                  >
                    {/* Contenido interior del nodo */}
                    {isLocked ? (
                      <Lock className="w-6 h-6 md:w-7 md:h-7 text-foreground/50 stroke-[2.2]" />
                    ) : isCompleted ? (
                      <Check className="w-8 h-8 md:w-9 md:h-9 text-black stroke-[3.5]" />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xl md:text-2xl font-black text-black leading-none">
                          {lvl.level}
                        </span>
                        <span className="text-[9px] font-black uppercase text-black/70 tracking-widest mt-0.5">
                          Nivel
                        </span>
                      </div>
                    )}

                    {/* Insignia de Nivel Final / Simulacro */}
                    {index === sortedLevels.length - 1 && (
                      <div
                        className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-xl bg-[#00E5FF] border-2 border-foreground flex items-center justify-center shadow-[2px_2px_0px_#000]"
                        title="Simulacro Integrador Final"
                      >
                        <EmojiPng emoji="⭐" size="xs" />
                      </div>
                    )}
                  </button>

                  {/* Tarjeta de Información Compacta y Elegante */}
                  <div
                    onClick={() => !isLocked && onSelectLevel(lvl)}
                    className={cn(
                      "mt-2.5 px-3.5 py-2.5 rounded-2xl border-2 border-foreground bg-card/95 backdrop-blur-sm text-center max-w-[240px] shadow-[4px_4px_0px_#000] transition-all",
                      !isLocked
                        ? "cursor-pointer hover:bg-muted/80 hover:-translate-y-0.5"
                        : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-muted border border-foreground/30 text-muted-foreground">
                        Nivel {lvl.level}
                      </span>
                      {isCompleted && (
                        <span className="text-[9px] font-black uppercase text-[#22c55e] flex items-center gap-0.5">
                          <EmojiPng emoji="✅" size="xs" /> Superado
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-black uppercase block truncate text-foreground leading-tight">
                      {lvl.title}
                    </span>

                    <p className="text-[10px] font-medium text-muted-foreground line-clamp-2 mt-1 leading-normal">
                      {lvl.summary}
                    </p>

                    {/* Chips de recursos técnicos del nivel */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-foreground/15">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-bold text-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        {lvl.estimatedMinutes || 25}m
                      </span>

                      <span
                        className="px-1.5 py-0.5 rounded bg-[#FFE600]/25 text-foreground text-[9px] font-black uppercase flex items-center gap-0.5 border border-foreground/20"
                        title="Guía teórica de 5 módulos de cátedra"
                      >
                        <BookOpen className="w-2.5 h-2.5 text-primary" />
                        Guía
                      </span>

                      <span
                        className="px-1.5 py-0.5 rounded bg-[#00E5FF]/25 text-foreground text-[9px] font-black uppercase flex items-center gap-0.5 border border-foreground/20"
                        title="Podcast de voz con IA en tiempo real"
                      >
                        <Radio className="w-2.5 h-2.5 text-[#00E5FF]" />
                        Podcast
                      </span>

                      <span
                        className="px-1.5 py-0.5 rounded bg-[#FF3366]/20 text-foreground text-[9px] font-black uppercase flex items-center gap-0.5 border border-foreground/20"
                        title="Evaluación Oral con IA"
                      >
                        <Mic className="w-2.5 h-2.5 text-[#FF3366]" />
                        Oral
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODO 2: LISTA DE MÓDULOS TECNOLÓGICA TIPO CENTRO DE CONTROL ── */}
      {viewMode === "modules" && (
        <div className="max-w-3xl mx-auto space-y-3.5 px-2">
          {sortedLevels.map((lvl, index) => {
            const isCompleted = lvl.completed;
            const isCurrent = lvl.unlocked && !lvl.completed;
            const isLocked = !lvl.unlocked;

            return (
              <div
                key={lvl.level}
                onClick={() => !isLocked && onSelectLevel(lvl)}
                className={cn(
                  "p-4 rounded-2xl border-3 border-foreground transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0px_#000] relative overflow-hidden",
                  // Estado actual sin parpadeos, con halo estático limpio
                  isCurrent
                    ? "bg-[#FFE600]/10 border-foreground ring-2 ring-[#FFE600] cursor-pointer hover:bg-[#FFE600]/15"
                    : isCompleted
                    ? "bg-[#BFFF00]/10 cursor-pointer hover:bg-[#BFFF00]/15"
                    : isLocked
                    ? "bg-muted/40 opacity-70 cursor-not-allowed"
                    : "bg-card cursor-pointer hover:bg-muted/80"
                )}
              >
                {/* Riel de estado lateral izquierdo */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    isCompleted ? "bg-[#BFFF00]" : isCurrent ? "bg-[#FFE600]" : "bg-transparent"
                  )}
                />

                {/* Cabecera y descripción del módulo */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0 pl-1">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl border-2 border-foreground flex items-center justify-center shrink-0 font-black text-base shadow-[2px_2px_0px_#000]",
                      isCompleted
                        ? "bg-[#BFFF00] text-black"
                        : isCurrent
                        ? "bg-[#FFE600] text-black"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-foreground/50" />
                    ) : isCompleted ? (
                      <Check className="w-6 h-6 stroke-[3]" />
                    ) : (
                      lvl.level
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-foreground bg-muted text-foreground">
                        Nivel {lvl.level} de {sortedLevels.length}
                      </span>

                      {isCompleted && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-foreground bg-[#BFFF00] text-black flex items-center gap-1">
                          <EmojiPng emoji="✅" size="xs" />
                          <span>Completado</span>
                        </span>
                      )}

                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-foreground bg-[#FFE600] text-black flex items-center gap-1">
                          <EmojiPng emoji="🎯" size="xs" />
                          <span>En Curso</span>
                        </span>
                      )}

                      {index === sortedLevels.length - 1 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-foreground bg-[#00E5FF] text-black flex items-center gap-1">
                          <EmojiPng emoji="⭐" size="xs" />
                          <span>Simulacro Final</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm md:text-base font-black uppercase text-foreground truncate">
                      {lvl.title}
                    </h3>

                    <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                      {lvl.summary}
                    </p>

                    {/* Chips de temas clave */}
                    {lvl.keyTopics && lvl.keyTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {lvl.keyTopics.slice(0, 5).map((topic, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded bg-muted/80 text-[10px] font-bold text-foreground border border-foreground/30"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones y Badges del Nivel */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-foreground/15">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>~{lvl.estimatedMinutes || 25} min</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className="p-1 rounded bg-[#FFE600]/25 border border-foreground/30 text-foreground"
                      title="Guía teórica de 5 módulos"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </span>
                    <span
                      className="p-1 rounded bg-[#00E5FF]/25 border border-foreground/30 text-foreground"
                      title="Podcast con voz en tiempo real"
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </span>
                    <span
                      className="p-1 rounded bg-[#BFFF00]/25 border border-foreground/30 text-foreground"
                      title="Quizzes y Flashcards"
                    >
                      <Target className="w-3.5 h-3.5" />
                    </span>
                    <span
                      className="p-1 rounded bg-[#FF3366]/20 border border-foreground/30 text-foreground"
                      title="Examen oral con IA"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <button
                    disabled={isLocked}
                    onClick={() => onSelectLevel(lvl)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl border-2 border-foreground font-black text-xs uppercase flex items-center gap-1 transition-all shadow-[2px_2px_0px_#000]",
                      isLocked
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                        : isCompleted
                        ? "bg-card hover:bg-muted text-foreground cursor-pointer"
                        : "bg-[#BFFF00] hover:bg-[#a6df00] text-black cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                    )}
                  >
                    <span>{isCompleted ? "Repasar" : isCurrent ? "Entrar" : "Abrir"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
