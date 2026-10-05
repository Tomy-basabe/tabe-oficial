import React, { useEffect, useRef } from "react";

interface ComicConfettiProps {
  active: boolean;
  onDone?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  shape: "rect" | "circle" | "star" | "ribbon";
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  decay: number;
}

const COLORS = [
  "#FFE600", // Amarillo neón
  "#BFFF00", // Lima eléctrica
  "#00E5FF", // Cian ciberpunk
  "#FF3366", // Fucsia arcade
  "#9D00FF", // Púrpura cósmico
  "#FFFFFF", // Blanco puro
  "#FF9100", // Naranja fuego
];

export const ComicConfetti: React.FC<ComicConfettiProps> = ({ active, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Ajustar resolución retina para que se vea ultra nítido
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    window.addEventListener("resize", handleResize);

    // Origen de la explosión festiva (centro de la pantalla)
    const originX = (window.innerWidth / 2) * dpr;
    const originY = (window.innerHeight * 0.45) * dpr;

    // Generar 120 partículas de alto rendimiento
    const particlesCount = 120;
    const particles: Particle[] = [];

    const shapes: Array<"rect" | "circle" | "star" | "ribbon"> = [
      "rect",
      "circle",
      "star",
      "ribbon",
    ];

    for (let i = 0; i < particlesCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 28 * dpr + 8 * dpr;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseSize = (Math.random() * 10 + 8) * dpr;

      particles.push({
        x: originX + (Math.random() - 0.5) * 80 * dpr,
        y: originY + (Math.random() - 0.5) * 40 * dpr,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 18 + 6) * dpr, // Impulso hacia arriba
        width: baseSize,
        height: shape === "ribbon" ? baseSize * 2.4 : baseSize,
        color,
        shape,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.12 + 0.05,
        opacity: 1,
        decay: Math.random() * 0.003 + 0.004,
      });
    }

    let animationFrameId: number;
    let isRunning = true;
    const gravity = 0.55 * dpr;
    const drag = 0.985;

    const drawStar = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outerRadius: number,
      innerRadius: number
    ) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      context.beginPath();
      context.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
      }
      context.lineTo(cx, cy - outerRadius);
      context.closePath();
      context.fill();
      context.stroke();
    };

    const render = () => {
      if (!isRunning) return;

      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.opacity <= 0.02 || p.y > height + 50) continue;

        aliveCount++;

        // Actualizar físicas fluidas
        p.vx *= drag;
        p.vy *= drag;
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;

        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.opacity = Math.max(0, p.opacity - p.decay);

        // Renderizar partícula con estética Neobrutalista cómic (relleno vivo + contorno negro sutil)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        const wobbleScale = Math.cos(p.wobble);
        ctx.scale(wobbleScale, 1);

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5 * dpr;

        if (p.shape === "rect" || p.shape === "ribbon") {
          ctx.beginPath();
          ctx.rect(-p.width / 2, -p.height / 2, p.width, p.height);
          ctx.fill();
          ctx.stroke();
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (p.shape === "star") {
          drawStar(ctx, 0, 0, 5, p.width, p.width * 0.45);
        }

        ctx.restore();
      }

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        isRunning = false;
        ctx.clearRect(0, 0, width, height);
        if (onDone) onDone();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const safetyTimeout = setTimeout(() => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      if (ctx) ctx.clearRect(0, 0, width, height);
      if (onDone) onDone();
    }, 3600);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(safetyTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[120]"
      style={{ touchAction: "none" }}
    />
  );
};
