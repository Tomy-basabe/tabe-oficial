import React, { useState, useRef, useEffect, useCallback } from "react";
import { RoadmapLevel } from "@/types/studyRoadmap";
import {
  Lock,
  Check,
  Clock,
  BookOpen,
  Radio,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  GitBranch,
  Mic,
  Target,
} from "lucide-react";
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
    if (cycle === 1) return -55; // Izquierda
    if (cycle === 2) return 0; // Centro
    return 55; // Derecha
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
    if (viewMode !== "tree") return;
    const t = setTimeout(updateCoords, 100);
    window.addEventListener("resize", updateCoords);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateCoords);
    };
  }, [viewMode, updateCoords, sortedLevels.length]);

  return (
    <div className="space-y-6">
      {/* ── BARRA SUPERIOR DE HERRAMIENTAS / SEGMENTED CONTROL ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tracking-tight">
            Nivel actual: {currentLevel} de {sortedLevels.length}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {completedCount} completado{completedCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Toggle de vistas: Árbol vs Módulos */}
        <div className="inline-flex p-1 bg-muted/50 border border-border/50 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === "tree"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Ruta visual</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("modules")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === "modules"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Módulos</span>
          </button>
        </div>
      </div>

      {/* ── MODO 1: MAPA DE NIVELES VISUAL ── */}
      {viewMode === "tree" && (
        <div
          ref={containerRef}
          className="relative py-10 px-4 max-w-xl mx-auto rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden"
        >
          {/* Fondo sutil tipo cuadrícula técnica Notion */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.08]"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px",
            }}
          />

          {/* ── LÍNEAS CONECTORAS SVG SUAVES ENTRE NIVELES ── */}
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
                    {/* Riel base neutro */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity={0.12}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />

                    {/* Línea de progreso activa */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={
                        isPathCompleted
                          ? "rgb(16, 185, 129)"
                          : isPathActive
                          ? "hsl(var(--primary))"
                          : "currentColor"
                      }
                      strokeOpacity={isPathCompleted || isPathActive ? 0.8 : 0.15}
                      strokeWidth={isPathCompleted || isPathActive ? 3 : 2}
                      strokeDasharray={isPathCompleted ? undefined : "4 4"}
                      strokeLinecap="round"
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
                  {/* Badge de Nivel Activo */}
                  {isCurrent && (
                    <div className="mb-2 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/25 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-xs animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      <span>Nivel en curso</span>
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
                      "relative rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none",
                      isLocked &&
                        "w-14 h-14 md:w-16 md:h-16 bg-muted/60 text-muted-foreground border border-border/60 cursor-not-allowed opacity-60",
                      isCompleted &&
                        "w-14 h-14 md:w-16 md:h-16 bg-emerald-500 text-white shadow-sm hover:scale-105 active:scale-95",
                      isCurrent &&
                        "w-16 h-16 md:w-20 md:h-20 bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20 hover:scale-105 active:scale-95"
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground stroke-[2]" />
                    ) : isCompleted ? (
                      <Check className="w-6 h-6 stroke-[3]" />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-lg md:text-xl font-semibold leading-none">
                          {lvl.level}
                        </span>
                        <span className="text-[9px] uppercase font-medium tracking-wider mt-0.5 opacity-80">
                          Nivel
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Tarjeta de Información Compacta */}
                  <div
                    onClick={() => !isLocked && onSelectLevel(lvl)}
                    className={cn(
                      "mt-2.5 px-3 py-2 rounded-xl border bg-card/90 backdrop-blur-sm text-center max-w-[220px] transition-all",
                      !isLocked
                        ? "border-border/60 cursor-pointer hover:border-primary/40 hover:bg-muted/40 shadow-xs"
                        : "border-border/30 opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Nivel {lvl.level}
                      </span>
                      {isCompleted && (
                        <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                          ✓ Listo
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold block truncate text-foreground leading-tight">
                      {lvl.title}
                    </span>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      {lvl.summary}
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-1.5 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {lvl.estimatedMinutes || 25}m
                      </span>
                      <span>·</span>
                      <span>Guía & Test</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODO 2: LISTA DE MÓDULOS TIPO NOTION ── */}
      {viewMode === "modules" && (
        <div className="max-w-3xl mx-auto space-y-2.5">
          {sortedLevels.map((lvl) => {
            const isCompleted = lvl.completed;
            const isCurrent = lvl.unlocked && !lvl.completed;
            const isLocked = !lvl.unlocked;

            return (
              <div
                key={lvl.level}
                onClick={() => !isLocked && onSelectLevel(lvl)}
                className={cn(
                  "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5",
                  isCurrent
                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 cursor-pointer"
                    : isCompleted
                    ? "bg-card/70 border-border/60 hover:bg-muted/40 cursor-pointer"
                    : isLocked
                    ? "bg-muted/20 border-border/30 opacity-50 cursor-not-allowed"
                    : "bg-card/70 border-border/60 hover:bg-muted/40 cursor-pointer"
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-semibold text-sm",
                      isCompleted
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : isCurrent
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/60 text-muted-foreground border-border/50"
                    )}
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : isCompleted ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      lvl.level
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Nivel {lvl.level} de {sortedLevels.length}
                      </span>

                      {isCompleted && (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Completado
                        </span>
                      )}

                      {isCurrent && (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                          En curso
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {lvl.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {lvl.summary}
                    </p>

                    {lvl.keyTopics && lvl.keyTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {lvl.keyTopics.slice(0, 4).map((topic, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.2 rounded-md bg-muted/60 text-[10px] text-muted-foreground border border-border/40"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{lvl.estimatedMinutes || 25} min</span>
                  </div>

                  <button
                    disabled={isLocked}
                    onClick={() => onSelectLevel(lvl)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-xs",
                      isLocked
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                        : isCompleted
                        ? "bg-muted/70 hover:bg-muted text-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <span>{isCompleted ? "Repasar" : isCurrent ? "Continuar" : "Abrir"}</span>
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
