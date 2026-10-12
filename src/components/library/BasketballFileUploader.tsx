import { useRef, useState } from "react";
import { animate, motion, useAnimationControls, useMotionValue } from "framer-motion";
import { FileText, Folder, Check, FolderUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Se llama cuando se encesta un archivo individual */
  onFile?: (file: File) => void | Promise<void>;
  /** Se llama cuando se encesta una lista de archivos (ej. carpeta) */
  onFolderFiles?: (files: FileList | File[]) => void | Promise<void>;
  accept?: string;
  disabled?: boolean;
}

// Coordenadas relativas de reposo de la bola (bottom: 14px -> Y=0, X=0)
// Aro ubicado en el centro X=0, y a Y ~ -240px de la bola
const RIM_TARGET_X = 0;
const RIM_TARGET_Y = -238;
const RIM_TOLERANCE_X = 75; // Tolerancia amplia y amigable para encestar fácilmente

export default function BasketballFileUploader({
  onFile,
  onFolderFiles,
  accept = ".pdf,image/*",
  disabled,
}: Props) {
  const [uploadMode, setUploadMode] = useState<"file" | "folder">("file");
  const [pendingItem, setPendingItem] = useState<{
    name: string;
    file?: File;
    files?: FileList | File[];
  } | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [isAiming, setIsAiming] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const [behindRim, setBehindRim] = useState(false);
  const [burst, setBurst] = useState(0);
  const [missedFeedback, setMissedFeedback] = useState(false);

  // Puntos del arco proyectado (para renderizar la trayectoria SVG)
  const [trajectoryPoints, setTrajectoryPoints] = useState<{ x: number; y: number }[]>([]);
  const [isAimingOnTarget, setIsAimingOnTarget] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Motion values para el proyectil (balón/carpeta)
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const motionScale = useMotionValue(1);
  const motionOpacity = useMotionValue(1);
  const motionRotate = useMotionValue(0);
  const netControls = useAnimationControls();

  // FÍSICAS ULTRA-RESPONSIVAS:
  // Con tirar apenas unos píxeles hacia abajo (desde 8px), ya se proyecta y encesta.
  const calculateTrajectory = (dragX: number, dragY: number) => {
    // Si apenas se movió, no proyectar aún
    if (dragY < 6) {
      return { points: [], apexX: 0, apexY: 0, landingX: 0, landingY: 0, isTarget: false };
    }

    // Progresión sensible: con 15px-35px de arrastre ya tiene la fuerza óptima
    // Clampeamos el arrastre eficaz entre 10 y 60px
    const effectivePullY = Math.max(10, Math.min(dragY, 65));
    
    // Fuerza vertical que escala rápidamente al aro
    const pullRatio = effectivePullY / 28; // a ~28px da impulso perfecto (ratio 1.0)
    const impulseY = RIM_TARGET_Y * Math.min(pullRatio, 1.15);
    
    // El desvío lateral se amplifica suavemente para permitir apuntar
    const impulseX = -dragX * 2.2;

    const startX = dragX;
    const startY = dragY;

    // Apogeo elegante de básquetbol por encima del aro
    const apexY = impulseY - 55;
    const apexX = startX + impulseX * 0.5;

    // Punto de aterrizaje a la altura del aro
    const landingY = RIM_TARGET_Y;
    const landingX = startX + impulseX;

    // Generar muestras continuas a lo largo de la curva cuadrática
    const pts: { x: number; y: number }[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * apexX + Math.pow(t, 2) * landingX;
      const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * (apexY - 25) + Math.pow(t, 2) * landingY;
      pts.push({ x, y });
    }

    // Enceste generoso: si la trayectoria pasa cerca del centro del aro y tuvo mínimo 12px de arrastre
    const hitsRimX = Math.abs(landingX - RIM_TARGET_X) <= RIM_TOLERANCE_X;
    const isTarget = hitsRimX && dragY >= 10;

    return { points: pts, apexX, apexY, landingX, landingY, isTarget };
  };

  // Drag en tiempo real
  const handleDrag = (_: any, info: any) => {
    if (isShooting || disabled) return;
    setIsAiming(true);
    const { points, isTarget } = calculateTrajectory(info.offset.x, info.offset.y);
    setTrajectoryPoints(points);
    setIsAimingOnTarget(isTarget);
  };

  // Al soltar el resorte
  const handleDragEnd = async (_: any, info: any) => {
    if (isShooting || disabled) return;
    setIsAiming(false);
    setTrajectoryPoints([]);

    const dragX = info.offset.x;
    const dragY = info.offset.y;

    // Click o toque mínimo (< 7px) -> abre explorador de archivos directamente
    if (Math.hypot(dragX, dragY) < 7) {
      if (uploadMode === "file") fileInputRef.current?.click();
      else folderInputRef.current?.click();
      return;
    }

    // Con apenas 10px de arrastre hacia abajo -> ejecuta el tiro
    if (dragY >= 10) {
      const { apexX, apexY, landingX, landingY, isTarget } = calculateTrajectory(dragX, dragY);
      await executeShot(dragX, dragY, apexX, apexY, landingX, landingY, isTarget);
    } else {
      // Regreso instantáneo y elástico
      animate(motionX, 0, { type: "spring", stiffness: 400, damping: 25 });
      animate(motionY, 0, { type: "spring", stiffness: 400, damping: 25 });
    }
  };

  // Animación física del tiro y enceste / rebote
  const executeShot = async (
    startX: number,
    startY: number,
    apexX: number,
    apexY: number,
    landingX: number,
    landingY: number,
    isBasket: boolean
  ) => {
    setIsShooting(true);
    setBehindRim(false);
    setMissedFeedback(false);

    const currentItem = pendingItem || {
      name: uploadMode === "file" ? "Archivo" : "Carpeta",
    };

    // Vuelo de básquetbol con aceleración y gravedad
    await Promise.all([
      animate(motionX, [startX, apexX, landingX], {
        duration: 0.58,
        times: [0, 0.45, 1],
        ease: ["easeOut", "easeIn"],
      }),
      animate(motionY, [startY, apexY - 25, landingY], {
        duration: 0.58,
        times: [0, 0.45, 1],
        ease: ["easeOut", "easeIn"],
      }),
      animate(motionScale, [1, 0.88, 0.72], { duration: 0.58 }),
      animate(motionRotate, [0, -180, -360], { duration: 0.58 }),
    ]);

    if (isBasket) {
      // --- ¡CANASTA LIMPIA! ---
      setBehindRim(true);

      // Red sacudiéndose con física elástica
      netControls.start({
        scaleY: [1, 1.5, 0.75, 1.25, 0.9, 1],
        transition: { duration: 0.5, ease: "easeInOut" },
      });

      setBurst((b) => b + 1);

      // Notificar al componente padre
      if (currentItem.file && onFile) {
        onFile(currentItem.file);
      } else if (currentItem.files && onFolderFiles) {
        onFolderFiles(currentItem.files);
      } else if (!pendingItem) {
        if (uploadMode === "file") fileInputRef.current?.click();
        else folderInputRef.current?.click();
      }

      // Atraviesa la red y cae
      await Promise.all([
        animate(motionY, landingY + 70, { duration: 0.32, ease: "easeIn" }),
        animate(motionScale, 0.4, { duration: 0.32 }),
        animate(motionOpacity, 0, { duration: 0.32, delay: 0.08 }),
      ]);
    } else {
      // --- REBOTE EN EL ARO ---
      setMissedFeedback(true);
      const bounceX = landingX + (landingX >= 0 ? 60 : -60);
      const bounceY = landingY + 50;

      await Promise.all([
        animate(motionX, bounceX, { duration: 0.35, ease: "easeOut" }),
        animate(motionY, [landingY, bounceY - 25, bounceY + 30], {
          duration: 0.45,
          times: [0, 0.4, 1],
          ease: "easeOut",
        }),
        animate(motionRotate, -500, { duration: 0.45 }),
        animate(motionScale, 0.6, { duration: 0.45 }),
      ]);

      await animate(motionOpacity, 0, { duration: 0.22 });
    }

    // Reinicio de valores para el siguiente tiro
    motionX.set(0);
    motionY.set(0);
    motionScale.set(1);
    motionOpacity.set(1);
    motionRotate.set(0);
    setPendingItem(null);
    setBehindRim(false);
    setIsShooting(false);
    setTimeout(() => setMissedFeedback(false), 900);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadMode("file");
      setPendingItem({ name: file.name, file });
    }
    e.target.value = "";
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadMode("folder");
      const folderName = files[0].webkitRelativePath?.split("/")[0] || "Carpeta";
      setPendingItem({ name: `${folderName} (${files.length} archivos)`, files });
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const isFolder = items.some((item) => {
        const entry = (item as any).webkitGetAsEntry?.();
        return entry && entry.isDirectory;
      });

      if (isFolder && e.dataTransfer.files) {
        setUploadMode("folder");
        setPendingItem({
          name: `Carpeta (${e.dataTransfer.files.length} archivos)`,
          files: e.dataTransfer.files,
        });
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadMode("file");
      setPendingItem({ name: file.name, file });
    }
  };

  return (
    <div
      className={cn(
        "relative w-full h-[430px] overflow-hidden rounded-2xl border-[3px] border-dashed border-foreground bg-[#fffaf0] select-none shadow-[4px_4px_0_0_#000] flex flex-col justify-between",
        isOver && "ring-4 ring-[#805ad5]/50 bg-[#fff5ea]",
        disabled && "opacity-60 pointer-events-none"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      {/* Inputs nativos ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        onChange={handleFolderChange}
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
      />

      {/* Selector superior: Subir Archivo vs Subir Carpeta */}
      <div className="relative z-30 pt-4 px-4 flex flex-col items-center">
        <div className="flex items-center gap-2 bg-background p-1.5 rounded-2xl border-[3px] border-foreground shadow-[3px_3px_0_0_#000]">
          <button
            type="button"
            onClick={() => setUploadMode("file")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              uploadMode === "file"
                ? "bg-[#fb923c] text-white shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                : "text-foreground hover:bg-muted"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Subir Archivo</span>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode("folder")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              uploadMode === "folder"
                ? "bg-[#1475e5] text-white shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                : "text-foreground hover:bg-muted"
            )}
          >
            <Folder className="w-4 h-4" />
            <span>Subir Carpeta</span>
          </button>
        </div>

        {/* Guía legible */}
        <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mt-2 text-center">
          {pendingItem ? (
            <span className="text-emerald-600 font-extrabold">Listo: {pendingItem.name}</span>
          ) : uploadMode === "file" ? (
            "Arrastra un archivo o pulsa abajo para lanzar"
          ) : (
            "Arrastra una carpeta o pulsa abajo para lanzar"
          )}
        </p>
      </div>

      {/* Tablero de Básquet con el logo PNG de TABE (limpio, sin recuadro rojo) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[110px] w-48 h-28 rounded-2xl border-[3px] border-foreground bg-white flex items-center justify-center shadow-[4px_4px_0_0_#000] z-[1]">
        <img
          src="/images/tabe-logo.png"
          alt="TABE Logo"
          className="relative max-w-[130px] max-h-[80px] object-contain pointer-events-none drop-shadow-sm"
          draggable={false}
        />
      </div>

      {/* Aro y Red SVG estilizados */}
      <svg
        viewBox="0 0 120 90"
        className="absolute left-1/2 -translate-x-1/2 top-[204px] w-[130px] h-[95px] pointer-events-none overflow-visible"
        style={{ zIndex: behindRim ? 2 : 4 }}
      >
        {/* Red con animación física elástica */}
        <motion.g animate={netControls} style={{ originX: "60px", originY: "18px" }}>
          <path
            d="M24 18 L40 76 M42 18 L48 78 M60 18 L60 80 M78 18 L72 78 M96 18 L80 76 M30 42 H90 M36 60 H84"
            stroke="#4b5563"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>
        {/* Aro circular naranja */}
        <ellipse cx="60" cy="18" rx="42" ry="7.5" fill="none" stroke="#e2554a" strokeWidth="5.5" />
      </svg>

      {/* Canvas SVG de Trayectoria Previsualizada (Slingshot Arc) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20"
        style={{ opacity: isAiming && trajectoryPoints.length > 0 ? 1 : 0 }}
      >
        {trajectoryPoints.length > 1 && (
          <g>
            <path
              d={trajectoryPoints.reduce(
                (acc, p, idx) =>
                  idx === 0
                    ? `M 50% 395 m ${p.x} ${p.y}`
                    : `${acc} L calc(50% + ${p.x}px) ${395 + p.y}`,
                ""
              )}
              fill="none"
              stroke={isAimingOnTarget ? "#10b981" : "#ef4444"}
              strokeWidth="2.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
            {trajectoryPoints.map((pt, i) => (
              <circle
                key={i}
                cx={`calc(50% + ${pt.x}px)`}
                cy={395 + pt.y}
                r={i === trajectoryPoints.length - 1 ? 5 : i % 2 === 0 ? 3 : 2}
                fill={isAimingOnTarget ? "#10b981" : "#ef4444"}
                className={i === trajectoryPoints.length - 1 ? "animate-pulse" : ""}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Explosión de Micro-partículas al Encestar */}
      {burst > 0 && (
        <div key={burst} className="absolute left-1/2 top-[230px] z-30 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 55 + (i % 3) * 20;
            return (
              <motion.span
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{
                  background: i % 2 === 0 ? "#10b981" : i % 3 === 0 ? "#fb923c" : "#805ad5",
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: 0,
                  scale: 0.3,
                }}
                transition={{ duration: 0.65, ease: "easeOut" }}
              />
            );
          })}
          <motion.div
            className="absolute -left-5 -top-10 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center border-[3px] border-foreground shadow-[2px_2px_0_0_#000]"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.25, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, times: [0, 0.4, 1] }}
          >
            <Check className="w-6 h-6 stroke-[3]" />
          </motion.div>
        </div>
      )}

      {/* Feedback de Rebote */}
      {missedFeedback && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[180px] z-30 pointer-events-none">
          <span className="px-3 py-1 rounded-lg bg-red-500 text-white font-black text-xs uppercase tracking-widest border-[2px] border-foreground shadow-[2px_2px_0_0_#000] animate-bounce">
            ¡Rebote! Ajusta tu tiro
          </span>
        </div>
      )}

      {/* ZONA INFERIOR: Archivo o Carpeta abajo del todo */}
      <div className="relative w-full pb-4 flex flex-col items-center justify-end z-25">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 select-none pointer-events-none">
          {isAiming
            ? isAimingOnTarget
              ? "🎯 ¡Alineado! Suelta para encestar"
              : "Apunta hacia el centro"
            : "Tira apenas hacia abajo y suelta · Click para elegir"}
        </p>

        <div className="h-14" />

        {/* OBJETO LANZABLE: Balón (Archivo) o Carpeta */}
        <motion.div
          drag={!isShooting}
          dragSnapToOrigin
          dragElastic={0.65}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{
            x: motionX,
            y: motionY,
            scale: motionScale,
            opacity: motionOpacity,
            rotate: motionRotate,
            zIndex: behindRim ? 1 : 25,
          }}
          className={cn(
            "absolute bottom-3 left-1/2 -ml-7 w-14 h-14 border-[3px] border-foreground flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[3px_3px_0_0_#000] transition-colors select-none",
            uploadMode === "file"
              ? "bg-[#fb923c] rounded-full hover:bg-[#f97316]"
              : "bg-[#1475e5] rounded-2xl hover:bg-[#0284c7]",
            isAiming && isAimingOnTarget && "ring-4 ring-emerald-500 scale-105"
          )}
          title="Arrastra apenas hacia abajo como resorte y suelta para encestar"
        >
          {uploadMode === "file" ? (
            <FileText className="w-7 h-7 text-white stroke-[2.5]" />
          ) : (
            <FolderUp className="w-7 h-7 text-white stroke-[2.5]" />
          )}

          {pendingItem && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-foreground rounded-full flex items-center justify-center text-[8px] text-white font-black">
              ✓
            </span>
          )}
        </motion.div>
      </div>
    </div>
  );
}
