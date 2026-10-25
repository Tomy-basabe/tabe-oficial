import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2, Move } from "lucide-react";

// Precarga: el chunk de three.js empieza a descargarse al cargar Friends, no al abrir la pestaña
const loadLanyard = () => import("@/components/Lanyard/Lanyard.jsx");
loadLanyard();
const Lanyard = lazy(loadLanyard);

const W = 800;
const H = 1125;
const LOGO = "/tabe-brand/card-logo.png";

const loadImg = (src: string) =>
  new Promise<HTMLImageElement | null>(res => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

const mk = () => {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
};

const drawLogo = (ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, cx: number, cy: number, max: number) => {
  if (!logo) return;
  const s = Math.min(max / logo.width, max / logo.height);
  ctx.drawImage(logo, cx - (logo.width * s) / 2, cy - (logo.height * s) / 2, logo.width * s, logo.height * s);
};

// Dibuja el chip EMV metálico dorado de alta fidelidad
const drawChip = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#f7d57a");
  grad.addColorStop(0.3, "#e3b04b");
  grad.addColorStop(0.7, "#c8942b");
  grad.addColorStop(1, "#8a6114");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();

  ctx.strokeStyle = "rgba(40, 24, 6, 0.75)";
  ctx.lineWidth = 2.5;

  // Trazas del circuito integrado
  ctx.beginPath();
  ctx.moveTo(x + w * 0.35, y);
  ctx.lineTo(x + w * 0.35, y + h);
  ctx.moveTo(x + w * 0.65, y);
  ctx.lineTo(x + w * 0.65, y + h);
  ctx.moveTo(x, y + h * 0.5);
  ctx.lineTo(x + w, y + h * 0.5);
  ctx.stroke();

  // Núcleo central
  ctx.fillStyle = "rgba(50, 30, 8, 0.18)";
  ctx.beginPath();
  ctx.roundRect(x + w * 0.32, y + h * 0.28, w * 0.36, h * 0.44, 4);
  ctx.fill();
  ctx.stroke();
};

// Dibuja ondas de tecnología Contactless / NFC
const drawNFC = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  for (let r = 12; r <= 28; r += 8) {
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
  }
};

// Dibuja código de barras estilizado de seguridad
const drawBarcode = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  let curX = x;
  const bars = [3, 1, 4, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 1, 3, 4, 2, 1, 3, 1, 2, 4, 2, 3, 1, 4];
  for (const b of bars) {
    ctx.fillRect(curX, y, b * 2, h);
    curX += b * 2 + 3.5;
    if (curX > x + w) break;
  }
};

// Dibuja patrón matricial QR estilizado para el reverso
const drawQRPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 16);
  ctx.fill();

  const drawCorner = (cx: number, cy: number) => {
    ctx.fillStyle = "#090a0f";
    ctx.fillRect(cx, cy, 52, 52);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx + 8, cy + 8, 36, 36);
    ctx.fillStyle = "#090a0f";
    ctx.fillRect(cx + 16, cy + 16, 20, 20);
  };

  drawCorner(x + 14, y + 14);
  drawCorner(x + size - 66, y + 14);
  drawCorner(x + 14, y + size - 66);

  ctx.fillStyle = "#090a0f";
  const step = 8;
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
      if ((r * 7 + c * 13 + (r ^ c)) % 3 === 0) {
        ctx.fillRect(x + 18 + c * step, y + 18 + r * step, step - 1.5, step - 1.5);
      }
    }
  }
};

// Frente de la Credencial: fondo obsidiana profundo, chip EMV, NFC, logotipo central y badge de ID
const paintFront = (logo: HTMLImageElement | null, name: string, id: string) => {
  const canvas = mk();
  const ctx = canvas.getContext("2d")!;

  // 1. Fondo obsidiana con gradiente radial y satinado
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#151722");
  bg.addColorStop(0.4, "#0f1017");
  bg.addColorStop(1, "#08090d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Micro-trama de puntos tecnológicos sutiles
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let x = 30; x < W - 30; x += 24) {
    for (let y = 30; y < H - 30; y += 24) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // Brillo radial superior e inferior
  const topGlow = ctx.createRadialGradient(W / 2, 430, 30, W / 2, 430, 380);
  topGlow.addColorStop(0, "rgba(59, 130, 246, 0.12)");
  topGlow.addColorStop(0.5, "rgba(139, 92, 246, 0.06)");
  topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  // 2. Ribete decorativo superior con gradiente tecnológico
  const topRibbon = ctx.createLinearGradient(0, 0, W, 0);
  topRibbon.addColorStop(0, "#3b82f6");
  topRibbon.addColorStop(0.35, "#8b5cf6");
  topRibbon.addColorStop(0.7, "#10b981");
  topRibbon.addColorStop(1, "#f59e0b");
  ctx.fillStyle = topRibbon;
  ctx.fillRect(0, 0, W, 8);

  // 3. Encabezado institucional
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "600 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("T A B E   ·   U N I V E R S I D A D   D I G I T A L", W / 2, 160);

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "500 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("P A S E   O F I C I A L   D E   E S T U D I A N T E", W / 2, 192);

  // 4. Chip EMV dorado y símbolo Contactless
  drawChip(ctx, 110, 240, 96, 76);
  drawNFC(ctx, 238, 278);

  // 5. Logotipo TABE a color en el centro
  drawLogo(ctx, logo, W / 2, 470, 340);

  // 6. Línea divisoria con degradado sutil
  const divGrad = ctx.createLinearGradient(120, 680, W - 120, 680);
  divGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  divGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
  divGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = divGrad;
  ctx.fillRect(120, 680, W - 240, 2);

  // 7. Nombre del Estudiante
  let size = 68;
  const label = name.toUpperCase();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  while (ctx.measureText(label).width > W - 160 && size > 32) {
    size -= 4;
    ctx.font = `800 ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }
  ctx.fillText(label, W / 2, 755);

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "600 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("ESTUDIANTE REGULAR VERIFICADO", W / 2, 792);

  // 8. Badge de ID moderno con píldora de vidrio y acento esmeralda
  const pillW = 320;
  const pillH = 72;
  const pillY = 825;
  const pillX = W / 2 - pillW / 2;

  // Fondo de la píldora
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  // Borde sutil esmeralda
  ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();

  // Punto verde de verificación en la píldora
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(pillX + 38, pillY + pillH / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  // Texto del ID
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 32px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`ID  #${id}`, W / 2 + 10, pillY + 48);

  // 9. Código de barras decorativo inferior
  drawBarcode(ctx, 160, 960, W - 320, 38);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "500 13px monospace";
  ctx.fillText(`SEC-AUTH-PASS · ${id.padStart(6, "0")} · CICLO 2026`, W / 2, 1025);

  // 10. Ribete decorativo inferior
  ctx.fillStyle = topRibbon;
  ctx.fillRect(0, H - 8, W, 8);

  return canvas.toDataURL("image/png");
};

// Reverso de la Credencial: satinado oscuro con banda magnética, código QR y sello de autenticidad
const paintBack = (logo: HTMLImageElement | null, id: string) => {
  const canvas = mk();
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#13141c");
  bg.addColorStop(0.6, "#0d0e14");
  bg.addColorStop(1, "#07080b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Banda magnética oscura en la parte superior
  const magGrad = ctx.createLinearGradient(0, 90, 0, 200);
  magGrad.addColorStop(0, "#050608");
  magGrad.addColorStop(0.5, "#181a24");
  magGrad.addColorStop(1, "#050608");
  ctx.fillStyle = magGrad;
  ctx.fillRect(0, 90, W, 110);

  // Código QR decorativo central
  drawQRPattern(ctx, W / 2 - 100, 270, 200);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "600 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("ESCANEA PARA CONECTAR EN TABE", W / 2, 510);

  // Logotipo en el reverso
  drawLogo(ctx, logo, W / 2, 640, 220);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("T A B E", W / 2, 770);

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("ESTUDIA · COMPITE · APRENDE", W / 2, 805);

  // Microtexto institucional
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "400 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Credencial académica emitida para acceso a salas de estudio,", W / 2, 870);
  ctx.fillText("apuntes colaborativos y desafíos en tiempo real.", W / 2, 892);
  ctx.fillText(`AUTENTICACIÓN DIGITAL: SHA256-${id}-TABE-NET`, W / 2, 940);

  // Ribete inferior
  const topRibbon = ctx.createLinearGradient(0, 0, W, 0);
  topRibbon.addColorStop(0, "#3b82f6");
  topRibbon.addColorStop(0.5, "#8b5cf6");
  topRibbon.addColorStop(1, "#10b981");
  ctx.fillStyle = topRibbon;
  ctx.fillRect(0, H - 8, W, 8);

  return canvas.toDataURL("image/png");
};

const UserInfoCard = ({ name, id }: { name: string; id: string }) => {
  const [faces, setFaces] = useState<string[] | null>(null);
  const [finish, setFinish] = useState<"matte" | "glossy">("matte");

  useEffect(() => {
    let alive = true;
    loadImg(LOGO).then(logo => {
      if (alive) setFaces([paintFront(logo, name, id), paintBack(logo, id)]);
    });
    return () => {
      alive = false;
    };
  }, [name, id]);

  return (
    <div className="relative w-full h-[600px] sm:h-[640px] rounded-3xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-zinc-950 shadow-xl select-none group">
      {/* Luces atmosféricas de fondo (Mesh Gradient Glow) */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-600/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 w-[420px] h-80 rounded-full bg-emerald-500/15 blur-[110px] pointer-events-none" />

      {/* Trama de micro-puntos reflectivos */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0f_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Viñeta radial oscura para dar profundidad */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/85 pointer-events-none" />

      {/* Barra HUD superior flotante */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/10 backdrop-blur-md shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-zinc-200 uppercase">
            Pase Oficial TABE
          </span>
        </div>
      </div>

      {/* Indicador inferior flotante de interacción física */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/70 border border-white/10 backdrop-blur-md text-[11px] font-medium text-zinc-300 shadow-lg">
          <Move className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
          <span>Arrastra o gira con el cursor para mover la credencial 3D</span>
        </div>
      </div>

      {!faces && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-xs font-medium text-zinc-400 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <span>Generando credencial digital de estudiante...</span>
        </div>
      )}

      {faces && (
        <Suspense fallback={null}>
          <Lanyard
            frontImage={faces[0]}
            backImage={faces[1]}
            cardColor="#101117"
            finish={finish}
            cornerRadius={0.35}
            size={0.68}
            gravity={2}
            strapColor="#0b0c10"
            metal="graphite"
            className="relative"
          />
        </Suspense>
      )}
    </div>
  );
};

export default UserInfoCard;
