import { lazy, Suspense, useEffect, useState } from "react";

// Precarga: el chunk de three.js empieza a descargarse al cargar Friends, no al abrir la pestaña
const loadLanyard = () => import("@/components/Lanyard/Lanyard.jsx");
loadLanyard();
const Lanyard = lazy(loadLanyard);

const W = 800;
const H = 1125;
const LOGO = "/tabe-brand/card-logo.png";
const ACCENTS = ["#FF7A00", "#5CB800", "#0A5CFF", "#FFD000"];

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

const accentBar = (ctx: CanvasRenderingContext2D, y: number, h: number) => {
  const w = W / ACCENTS.length;
  ACCENTS.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * w, y, w, h);
  });
};

// Frente: fondo oscuro, logo a color, nombre y número de ID
const paintFront = (logo: HTMLImageElement | null, name: string, id: string) => {
  const canvas = mk();
  const ctx = canvas.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1b1b22");
  bg.addColorStop(1, "#08080b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // brillo suave
  const glow = ctx.createRadialGradient(W / 2, 420, 20, W / 2, 420, 420);
  glow.addColorStop(0, "rgba(255,255,255,0.10)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  accentBar(ctx, 0, 14);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 28px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("T A B E   ·   P A S E   D E   E S T U D I A N T E", W / 2, 215);

  drawLogo(ctx, logo, W / 2, 440, 340);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(110, 670, W - 220, 2);

  let size = 84;
  const label = name.toUpperCase();
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${size}px 'Segoe UI', Arial, sans-serif`;
  while (ctx.measureText(label).width > W - 140 && size > 32) {
    size -= 4;
    ctx.font = `800 ${size}px 'Segoe UI', Arial, sans-serif`;
  }
  ctx.fillText(label, W / 2, 775);

  // pill con el ID
  const pillW = 300;
  ctx.fillStyle = "#BFFF00";
  ctx.beginPath();
  ctx.roundRect(W / 2 - pillW / 2, 825, pillW, 90, 45);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "800 48px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`ID  #${id}`, W / 2, 887);

  accentBar(ctx, H - 14, 14);
  return canvas.toDataURL("image/png");
};

// Reverso: blanco limpio con logo a color
const paintBack = (logo: HTMLImageElement | null) => {
  const canvas = mk();
  const ctx = canvas.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#ececf1");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  accentBar(ctx, 0, 14);
  drawLogo(ctx, logo, W / 2, H / 2 - 40, 520);
  ctx.textAlign = "center";
  ctx.fillStyle = "#111";
  ctx.font = "800 64px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("TABE", W / 2, H / 2 + 330);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.font = "600 26px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("ESTUDIA · JUEGA · CRECE", W / 2, H / 2 + 380);
  accentBar(ctx, H - 14, 14);
  return canvas.toDataURL("image/png");
};

const UserInfoCard = ({ name, id }: { name: string; id: string }) => {
  const [faces, setFaces] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadImg(LOGO).then(logo => {
      if (alive) setFaces([paintFront(logo, name, id), paintBack(logo)]);
    });
    return () => {
      alive = false;
    };
  }, [name, id]);

  return (
    <div className="relative w-full h-[600px] bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden">
      {!faces && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase text-muted-foreground animate-pulse">
          Cargando tarjeta...
        </div>
      )}
      {faces && (
        <Suspense fallback={null}>
          <Lanyard
            frontImage={faces[0]}
            backImage={faces[1]}
            cardColor="#14141a"
            finish="glossy"
            cornerRadius={0.35}
            size={0.66}
            gravity={2}
            strapColor="#0e0e12"
            metal="graphite"
            className="relative"
          />
        </Suspense>
      )}
    </div>
  );
};

export default UserInfoCard;
