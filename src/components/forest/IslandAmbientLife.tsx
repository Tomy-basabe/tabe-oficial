import React, { useEffect, useRef, useState, useMemo } from "react";
import { ISLAND_EVENTS, IslandEventConfig } from "./islandEventsConfig";
import { IslandId } from "@/hooks/forestIslandsData";
import { BasePixelSprite, AmbientSpriteStyles } from "./IslandAmbientSprites";

interface ActiveEventState {
  config: IslandEventConfig;
  startTime: number;
  direction: 1 | -1;
  durationSeconds: number;
  pauseAtPct?: number;       // The percentage [0-100] where the tree is located
  pauseDurationSec?: number; // How long to pause
}

interface IslandAmbientLifeProps {
  activeIslandId: IslandId;
}

/**
 * MOTOR DE EVENTOS CINEMATOGRÁFICOS ALEATORIOS
 * 
 * - Selecciona un evento equiprobable de los 20 disponibles por isla.
 * - Soporta pausa interactiva con árboles usando DOM lookup.
 * - Atajo oculto para forzar evento: Ctrl + Ñ
 */
export const IslandAmbientLife: React.FC<IslandAmbientLifeProps> = ({ activeIslandId }) => {
  const [activeEvent, setActiveEvent] = useState<ActiveEventState | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number>(0); // 0.0 a 1.0

  const animFrameRef = useRef<number | null>(null);
  const nextEventTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTabVisibleRef = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Seleccionar eventos activos de la isla actual
  const eligibleEvents = useMemo(() => {
    return ISLAND_EVENTS[activeIslandId] || ISLAND_EVENTS.classic;
  }, [activeIslandId]);

  const dispatchEvent = () => {
    if (!isTabVisibleRef.current) return;

    // Equiprobable 1/20
    const randomIndex = Math.floor(Math.random() * eligibleEvents.length);
    const config = eligibleEvents[randomIndex];

    // Determinar dirección de spawn
    let direction: 1 | -1 = 1;
    if (config.spawnDirection === "left-to-right") direction = 1;
    else if (config.spawnDirection === "right-to-left") direction = -1;
    else direction = Math.random() > 0.5 ? 1 : -1;

    let pauseAtPct: number | undefined = undefined;
    let pauseDurationSec: number | undefined = undefined;

    // Interacción con árboles en el DOM
    if (config.interactsWithTree && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const treeNodes = Array.from(document.querySelectorAll(".island-tree-node"));
      
      if (treeNodes.length > 0) {
        const randomTree = treeNodes[Math.floor(Math.random() * treeNodes.length)];
        const treeRect = randomTree.getBoundingClientRect();
        
        // Calcular el porcentaje X del árbol relativo al contenedor
        const treeCenterX = treeRect.left + treeRect.width / 2;
        let pct = ((treeCenterX - containerRect.left) / containerRect.width) * 100;
        
        // Asegurarse de que esté en un rango visible
        pct = Math.max(10, Math.min(pct, 90));
        
        pauseAtPct = pct;
        pauseDurationSec = Math.floor(Math.random() * 3) + 2; // 2 a 4 segundos
      }
    }

    const baseDuration = config.speed === "run" ? 8 : config.speed === "walk" ? 14 : 20;
    const totalDuration = baseDuration + (pauseDurationSec || 0);

    setActiveEvent({
      config,
      startTime: Date.now(),
      direction,
      durationSeconds: totalDuration,
      pauseAtPct,
      pauseDurationSec,
    });
    setCurrentProgress(0);
  };

  const scheduleNextEvent = (delayMs: number) => {
    if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
    nextEventTimeoutRef.current = setTimeout(dispatchEvent, delayMs);
  };

  // Shortcut de teclado (Ctrl + Ñ) para forzar evento
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Ñ o Meta + Ñ
      if ((e.ctrlKey || e.metaKey) && (e.key === "ñ" || e.key === "Ñ")) {
        e.preventDefault();
        console.log("[IslandAmbientLife] Forzando evento aleatorio!");
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        dispatchEvent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [eligibleEvents]);

  // Manejo de visibilidad y reset de isla
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      isTabVisibleRef.current = isVisible;

      if (!isVisible) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
        setActiveEvent(null);
      } else {
        scheduleNextEvent(3000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Al cargar o cambiar isla
    setActiveEvent(null);
    setCurrentProgress(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    scheduleNextEvent(5000); // 5 segundos después de entrar a la isla

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (nextEventTimeoutRef.current) clearTimeout(nextEventTimeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeIslandId, eligibleEvents]);

  // Bucle de renderizado
  useEffect(() => {
    if (!activeEvent) return;

    const { durationSeconds, startTime, pauseAtPct, pauseDurationSec } = activeEvent;
    const totalDurationMs = durationSeconds * 1000;

    const loop = () => {
      if (!isTabVisibleRef.current) return;

      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / totalDurationMs, 1.0);
      let computedProgress = rawProgress;

      if (pauseAtPct && pauseDurationSec) {
        const pauseCenter = pauseAtPct / 100;
        const pauseRatio = (pauseDurationSec * 1000) / totalDurationMs;

        const walkPhase1Time = (pauseCenter / (1 - pauseRatio)) * (1 - pauseRatio);
        const pauseStartTime = walkPhase1Time;
        const pauseEndTime = pauseStartTime + pauseRatio;

        if (rawProgress < pauseStartTime) {
          computedProgress = (rawProgress / pauseStartTime) * pauseCenter;
        } else if (rawProgress >= pauseStartTime && rawProgress <= pauseEndTime) {
          computedProgress = pauseCenter;
        } else {
          const remainingProgress = (rawProgress - pauseEndTime) / (1 - pauseEndTime);
          computedProgress = pauseCenter + remainingProgress * (1 - pauseCenter);
        }
      }

      setCurrentProgress(computedProgress);

      if (rawProgress < 1.0) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        setActiveEvent(null);
        // Intervalo aleatorio 25 a 45 segs
        const nextDelay = Math.floor(Math.random() * (45000 - 25000 + 1)) + 25000;
        scheduleNextEvent(nextDelay);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeEvent]);

  if (!activeEvent) {
    return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;
  }

  const { config, direction, pauseAtPct } = activeEvent;
  const isMovingForward = direction === 1;

  // Está pausado si está muy cerca de la posición del árbol
  const isPausedInspecting =
    pauseAtPct !== undefined &&
    Math.abs(currentProgress * 100 - pauseAtPct) < 1.5;

  // Calculo de X de lado a lado
  const basePercent = isMovingForward
    ? -10 + currentProgress * 120
    : 110 - currentProgress * 120;

  return (
    <>
      <AmbientSpriteStyles />
      <div ref={containerRef} className="absolute inset-0 rounded-[38px] overflow-hidden pointer-events-none select-none z-30">
        <div
          style={{
            left: `${basePercent}%`,
            bottom: "20%", // A la altura visual de las bases de los árboles
            transform: "translate3d(0, 0, 0)",
          }}
          className="absolute transition-transform will-change-transform pointer-events-none flex flex-col items-center justify-end"
        >
          {/* Nombre/Título opcional flotante sutil (Opcional, pero da feedback de qué evento es) */}
          <div className="text-[8px] font-black uppercase text-white/60 mb-2 whitespace-nowrap opacity-0 transition-opacity duration-1000">
            {config.name}
          </div>

          <BasePixelSprite
            characterKey={config.spriteKey}
            isMoving={!isPausedInspecting}
            speed={config.speed}
            direction={direction}
            scale={2.5 * (config.scaleModifier || 1)}
            cssFilter={config.cssFilter}
          />
        </div>
      </div>
    </>
  );
};
