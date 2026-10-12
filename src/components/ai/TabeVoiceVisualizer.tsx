import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export type VisualizerState = "idle" | "listening" | "closing";

export interface TabeVoiceVisualizerProps {
  state: VisualizerState;
  className?: string;
  isAiSpeaking?: boolean;
  audioStream?: MediaStream | null;
  onClosedAnimationComplete?: () => void;
}

// Paleta de colores de la marca TABE (Segmentos y Ondas)
const BRAND_COLORS = [
  { name: "black", hex: "#18181B", rgb: "24, 24, 27" },       // Segmento Negro (zinc-900)
  { name: "orange", hex: "#F97316", rgb: "249, 115, 22" },    // Segmento Naranja (orange-500)
  { name: "green", hex: "#22C55E", rgb: "34, 197, 94" },      // Segmento Verde (green-500)
  { name: "blue", hex: "#3B82F6", rgb: "59, 130, 246" },      // Segmento Azul (blue-500)
  { name: "yellow", hex: "#EAB308", rgb: "234, 179, 8" },     // Segmento Amarillo (yellow-500)
];

// Puntos de los 5 segmentos del anillo exterior en SVG (ángulos centrados)
const RING_SEGMENTS = [
  { color: "#18181B", startAngle: -90, endAngle: -18 },   // Superior
  { color: "#F97316", startAngle: -18, endAngle: 54 },    // Superior Derecho
  { color: "#22C55E", startAngle: 54, endAngle: 126 },    // Inferior Derecho
  { color: "#3B82F6", startAngle: 126, endAngle: 198 },   // Inferior Izquierdo
  { color: "#EAB308", startAngle: 198, endAngle: 270 },   // Superior Izquierdo
];

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, arcSweep, 0, end.x, end.y,
  ].join(" ");
}

export const TabeVoiceVisualizer: React.FC<TabeVoiceVisualizerProps> = ({
  state,
  className,
  isAiSpeaking = false,
  audioStream = null,
  onClosedAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio Context y Analyser
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Estados visuales internos de transición
  const [svgOpacity, setSvgOpacity] = useState(1);
  const [svgScale, setSvgScale] = useState(1);
  const [collapseProgress, setCollapseProgress] = useState(0); // 0 = abierto/ondas, 1 = colapsado a anillo

  // Referencias mutables para el bucle de renderizado 60FPS
  const phaseRef = useRef(0);
  const currentVolumeRef = useRef(0.2); // Amplitud base suave

  // 1. Inicialización o conexión de AudioContext con el micrófono
  useEffect(() => {
    if (!audioStream) {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.disconnect(); } catch (_) {}
        sourceNodeRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;

      const source = ctx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      console.warn("[TabeVoiceVisualizer] No se pudo inicializar AudioContext:", err);
    }

    return () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.disconnect(); } catch (_) {}
      }
    };
  }, [audioStream]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 2. Control de Transiciones de Estado ('idle' -> 'listening' -> 'closing')
  useEffect(() => {
    if (state === "listening") {
      // Entrada fluida: Anillo exterior se escala y disuelve a opacity 0 en 300ms
      setSvgScale(1.25);
      setSvgOpacity(0);
      setCollapseProgress(0);
    } else if (state === "closing") {
      // Cierre: Colapso animado en 400ms hacia las coordenadas del anillo
      setCollapseProgress(1);
      const timer = setTimeout(() => {
        setSvgScale(1);
        setSvgOpacity(1);
        if (onClosedAnimationComplete) {
          onClosedAnimationComplete();
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // Idle
      setSvgScale(1);
      setSvgOpacity(1);
      setCollapseProgress(0);
    }
  }, [state, onClosedAnimationComplete]);

  // 3. Renderizado Matemático de Ondas Sinusoidales Compuestas (Canvas 2D)
  const drawWaves = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Calcular volumen de voz o modulación armónica orgánica
    let volume = 0.15;
    if (analyserRef.current && dataArrayRef.current && state === "listening") {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0;
      const count = Math.min(32, dataArrayRef.current.length);
      for (let i = 0; i < count; i++) {
        sum += dataArrayRef.current[i];
      }
      const rawVol = sum / (count * 255);
      volume = Math.max(0.12, Math.min(1.0, rawVol * 2.2));
    } else if (isAiSpeaking) {
      // Pulsación cadenciosa y orgánica mientras TABE AI habla
      volume = 0.45 + Math.sin(phaseRef.current * 1.5) * 0.2;
    } else {
      // Idle armónico suave para que nunca sea estático
      volume = 0.18 + Math.sin(phaseRef.current * 0.8) * 0.08;
    }

    // Suavizado inercial del volumen (lerp)
    currentVolumeRef.current += (volume - currentVolumeRef.current) * 0.12;
    const activeVolume = currentVolumeRef.current;

    // Si está en transición 'closing', colapsar amplitud proporcionalmente
    const transitionAmp = state === "closing" ? Math.max(0, 1 - collapseProgress) : (state === "listening" ? 1 : 0.2);

    phaseRef.current += 0.04;
    const phase = phaseRef.current;
    const baseline = height / 2;

    // Configuración de las 5 ondas sinusoidales compuestas (una por color)
    const waveConfigs = [
      { color: BRAND_COLORS[0], freq: 0.012, subFreq: 0.007, ampMultiplier: 42, offset: 0 },       // Negro
      { color: BRAND_COLORS[1], freq: 0.015, subFreq: 0.009, ampMultiplier: 56, offset: 0.6 },     // Naranja
      { color: BRAND_COLORS[2], freq: 0.018, subFreq: 0.006, ampMultiplier: 48, offset: 1.2 },     // Verde
      { color: BRAND_COLORS[3], freq: 0.014, subFreq: 0.011, ampMultiplier: 62, offset: 1.8 },     // Azul
      { color: BRAND_COLORS[4], freq: 0.016, subFreq: 0.008, ampMultiplier: 50, offset: 2.4 },     // Amarillo
    ];

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    // Si está en 'closing', dibujar también 5 micropartículas circulares convergiendo al anillo
    if (state === "closing") {
      const radius = 64 * collapseProgress;
      RING_SEGMENTS.forEach((seg, idx) => {
        const rad = (((seg.startAngle + seg.endAngle) / 2 - 90) * Math.PI) / 180;
        const px = width / 2 + Math.cos(rad) * radius;
        const py = height / 2 + Math.sin(rad) * radius;

        ctx.beginPath();
        ctx.arc(px, py, 4 * (1 - collapseProgress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = seg.color;
        ctx.globalAlpha = 0.8 * collapseProgress;
        ctx.fill();
      });
    }

    // Dibujar cada onda fluida
    waveConfigs.forEach((cfg) => {
      const amp = cfg.ampMultiplier * activeVolume * transitionAmp;
      if (amp <= 0.5) return;

      ctx.beginPath();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = cfg.color.hex;
      ctx.globalAlpha = Math.min(0.85, 0.45 + activeVolume * 0.4);

      // Trazo continuo de la curva sinusoidal compuesta
      for (let x = 0; x <= width; x += 3) {
        // Fórmula requerida: y(x) = baseline + sin(x * freq + phase) * amp * sin(x * subFreq + phase * 0.5)
        const wave =
          Math.sin(x * cfg.freq + phase + cfg.offset) *
          amp *
          Math.sin(x * cfg.subFreq + phase * 0.5 + cfg.offset * 0.5);

        // Modulación radial de campana para que los extremos atenúen suavemente
        const envelope = Math.sin((x / width) * Math.PI);
        const y = baseline + wave * envelope;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Relleno sutil con gradiente debajo de las ondas principales
      if (activeVolume > 0.3) {
        ctx.lineTo(width, baseline);
        ctx.lineTo(0, baseline);
        ctx.closePath();
        ctx.fillStyle = `rgba(${cfg.color.rgb}, ${0.05 * activeVolume * transitionAmp})`;
        ctx.fill();
      }
    });

    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(drawWaves);
  }, [state, isAiSpeaking, collapseProgress]);

  // Arrancar el ciclo de animación del canvas
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawWaves);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawWaves]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none w-72 h-72 sm:w-80 sm:h-80",
        className
      )}
    >
      {/* ── CAPA SVG: Geometría de Isotipo TABE (Estrella central + 5 arcos) ── */}
      <div
        className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center transition-all duration-300 ease-out pointer-events-none"
        style={{
          opacity: svgOpacity,
          transform: `scale(${svgScale})`,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
        >
          {/* Anillo de 5 Segmentos Circulares de la Marca */}
          {RING_SEGMENTS.map((seg, idx) => (
            <path
              key={idx}
              d={describeArc(100, 100, 68, seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth="9"
              strokeLinecap="round"
              className="transition-transform duration-300"
            />
          ))}

          {/* Estrella central de cuatro puntas (Isotipo) */}
          <path
            d="M 100,64 Q 100,100 64,100 Q 100,100 100,136 Q 100,100 136,100 Q 100,100 100,64 Z"
            fill="currentColor"
            className="text-zinc-900 dark:text-zinc-100 transition-colors"
          />

          {/* Micro-núcleo central brillante */}
          <circle cx="100" cy="100" r="3.5" fill="#3B82F6" opacity="0.9" />
        </svg>
      </div>

      {/* ── CAPA CANVAS: Ondas Sinusoidales Fluidas Orgánicas ── */}
      <canvas
        ref={canvasRef}
        width={360}
        height={360}
        className={cn(
          "absolute inset-0 w-full h-full pointer-events-none z-20 transition-opacity duration-300",
          state === "idle" ? "opacity-30" : "opacity-100"
        )}
      />

      {/* Halo ambiental sutil de fondo */}
      <div
        className={cn(
          "absolute inset-8 rounded-full blur-3xl pointer-events-none transition-all duration-500 -z-10",
          state === "listening"
            ? "bg-gradient-to-tr from-orange-500/15 via-blue-500/20 to-green-500/15 opacity-80 scale-110"
            : "bg-zinc-400/10 dark:bg-zinc-700/10 opacity-30"
        )}
      />
    </div>
  );
};

export default TabeVoiceVisualizer;
