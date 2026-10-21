import React from "react";
import { IslandId } from "@/hooks/forestIslandsData";
import { Sparkles, Feather, Radio, Diamond } from "lucide-react";

interface SceneryProps {
  islandId: IslandId;
  isNightMode?: boolean;
}

export const ForestIslandScenery: React.FC<SceneryProps> = ({
  islandId,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-visible z-0">
      <style>{`
        @keyframes sceneryFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1.5deg); }
        }
        @keyframes steamRise {
          0% { transform: translateY(0) scaleX(0.8); opacity: 0; }
          40% { opacity: 0.8; }
          100% { transform: translateY(-16px) scaleX(1.3); opacity: 0; }
        }
        @keyframes neonPulseGlow {
          0%, 100% { filter: drop-shadow(0 0 5px #00E5FF) drop-shadow(0 0 12px #00E5FF); opacity: 0.85; }
          50% { filter: drop-shadow(0 0 10px #00E5FF) drop-shadow(0 0 24px #00E5FF); opacity: 1; }
        }
        @keyframes crystalSpin {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(6deg); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) rotate(-1deg); }
          50% { transform: scale(1.1, 0.95) rotate(2deg); }
        }
        .anim-scenery-float { animation: sceneryFloat 4.2s ease-in-out infinite; }
        .anim-steam { animation: steamRise 2.4s ease-out infinite; }
        .anim-neon-glow { animation: neonPulseGlow 2.2s ease-in-out infinite; }
        .anim-crystal-spin { animation: crystalSpin 3.6s ease-in-out infinite; }
      `}</style>

      {/* ========================================================
          1. ISLA PIZZA (GASTRONÓMICA)
         ======================================================== */}
      {islandId === "pizza" && (
        <>
          {/* Esquina superior izquierda: Pala de madera rústica */}
          <div className="absolute -top-5 left-4 sm:left-8 anim-scenery-float z-20 hidden xs:flex items-center gap-1.5">
            <div className="relative">
              <div className="w-12 h-10 bg-[#B45309] border-2 border-stone-800 rounded-lg shadow-sm flex items-center justify-center -rotate-12 relative overflow-hidden">
                <div className="w-full h-1 bg-[#D97706] absolute top-1" />
                <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 22h20L12 2z" />
                  <circle cx="12" cy="14" r="1.5" fill="#EF4444" />
                  <circle cx="9" cy="18" r="1.2" fill="#EF4444" />
                  <circle cx="15" cy="17" r="1.2" fill="#EF4444" />
                </svg>
              </div>
              <div className="w-2.5 h-10 bg-[#78350F] border border-stone-800 rounded-full absolute -top-8 left-1/2 -translate-x-1/2 -rotate-12 shadow-sm" />
              <div className="absolute -top-3 left-4 w-1.5 h-3 bg-white/70 rounded-full blur-[0.5px] anim-steam" />
            </div>
            <div className="px-2 py-0.5 bg-zinc-900 text-amber-300 font-semibold text-[9px] uppercase border border-amber-400/60 rounded-md shadow-xs -rotate-6">
              Horno Rústico
            </div>
          </div>

          {/* Esquina superior derecha: Molinillo y lata vintage */}
          <div className="absolute -top-5 right-4 sm:right-8 anim-scenery-float z-20 hidden sm:flex items-center gap-2">
            <div className="w-8 h-11 bg-[#DC2626] border-2 border-stone-800 rounded-md shadow-sm flex flex-col items-center justify-center p-0.5 relative rotate-6">
              <div className="w-6 h-4 bg-white border border-stone-800 rounded-xs flex items-center justify-center text-[7px] font-bold text-red-600 leading-none">
                SAN MARZANO
              </div>
              <div className="w-3 h-3 rounded-full bg-red-500 border border-red-700 mt-1" />
            </div>
            <div className="w-6 h-9 bg-amber-100 border border-stone-800 rounded-full shadow-sm flex items-center justify-center -rotate-6">
              <div className="w-3 h-4 bg-emerald-600 rounded-full" />
            </div>
          </div>

          {/* Gran charco de salsa de tomate cocida en el borde izquierdo */}
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-8 h-16 bg-[#DC2626] border border-stone-800 rounded-full shadow-sm opacity-90 hidden sm:block">
            <div className="w-3 h-3 bg-[#EF4444] rounded-full absolute top-2 left-2" />
          </div>

          {/* Aceituna negra con brillo en borde derecho */}
          <div className="absolute bottom-6 right-6 w-7 h-7 rounded-full bg-stone-900 border border-stone-800 shadow-sm flex items-center justify-center rotate-12 z-10 hidden xs:flex">
            <div className="w-2 h-2 rounded-full bg-stone-700 absolute top-1.5 left-1.5" />
            <div className="w-1.5 h-1.5 bg-white/70 rounded-full absolute top-1 left-2" />
          </div>

          {/* Hojita de albahaca fresca en borde inferior izquierdo */}
          <div className="absolute bottom-6 left-12 select-none rotate-45 z-10">
            <div className="w-7 h-4 bg-[#16A34A] border border-stone-800 rounded-full shadow-sm flex items-center justify-center relative">
              <div className="w-5 h-0.5 bg-[#4ADE80] rounded-full" />
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          2. ISLA CLÁSICA (SANTUARIO VERDE)
         ======================================================== */}
      {islandId === "classic" && (
        <>
          {/* Esquina superior izquierda: Casita de pájaros de madera */}
          <div className="absolute -top-6 left-4 sm:left-8 anim-scenery-float z-20 flex items-center gap-1.5">
            <div className="relative">
              <div className="w-2.5 h-9 bg-[#78350F] border border-stone-800 rounded-xs absolute top-6 left-1/2 -translate-x-1/2" />
              <div className="w-10 h-9 bg-[#B45309] border-2 border-stone-800 rounded-md shadow-sm flex items-center justify-center relative z-10 [clip-path:polygon(50%_0%,100%_35%,100%_100%,0%_100%,0%_35%)]">
                <div className="w-3.5 h-3.5 rounded-full bg-stone-900 mt-2" />
              </div>
              <div className="absolute -top-2 right-0 w-3 h-2 bg-amber-400 rounded-full border border-stone-800" />
            </div>
            <div className="px-2 py-0.5 bg-zinc-900 text-emerald-300 font-semibold text-[9px] uppercase border border-emerald-400/60 rounded-md shadow-xs -rotate-3 hidden sm:block">
              Santuario Verde
            </div>
          </div>

          {/* Esquina superior derecha: Pila de leña */}
          <div className="absolute -top-5 right-4 sm:right-8 anim-scenery-float z-20 hidden xs:flex items-center gap-2">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-7 h-2.5 bg-amber-800 border border-stone-800 rounded-full" />
              <div className="w-8 h-2.5 bg-amber-900 border border-stone-800 rounded-full" />
              <div className="w-8 h-2 bg-black/30 rounded-full blur-[1px] -mt-1" />
            </div>
          </div>

          {/* Mini Islote flotante satélite a la izquierda con brote */}
          <div className="absolute top-1/2 -left-7 -translate-y-1/2 w-10 h-8 anim-scenery-float z-10 hidden md:flex flex-col items-center">
            <div className="w-9 h-5 bg-[#65A30D] border border-stone-800 rounded-t-lg shadow-sm flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-300" />
            </div>
            <div className="w-7 h-4 bg-[#78350F] border-x border-b border-stone-800 rounded-b-md shadow-sm [clip-path:polygon(0%_0%,100%_0%,50%_100%)]" />
          </div>

          {/* Mini Islote flotante satélite a la derecha con roca */}
          <div className="absolute top-1/3 -right-7 w-10 h-8 anim-scenery-float z-10 hidden md:flex flex-col items-center" style={{ animationDelay: "-2s" }}>
            <div className="w-9 h-5 bg-[#65A30D] border border-stone-800 rounded-t-lg shadow-sm flex items-center justify-center">
              <div className="w-2.5 h-2 bg-stone-300 rounded-xs" />
            </div>
            <div className="w-7 h-4 bg-[#78350F] border-x border-b border-stone-800 rounded-b-md shadow-sm [clip-path:polygon(0%_0%,100%_0%,50%_100%)]" />
          </div>

          {/* Cerca rústica de troncos en borde inferior */}
          <div className="absolute bottom-5 right-6 flex items-end gap-1 z-10 hidden sm:flex">
            <div className="w-2 h-6 bg-[#A16207] border border-stone-800 rounded-t-xs shadow-xs" />
            <div className="w-7 h-1.5 bg-[#A16207] border border-stone-800 -mb-2 shadow-xs" />
            <div className="w-2 h-7 bg-[#A16207] border border-stone-800 rounded-t-xs shadow-xs" />
            <div className="w-7 h-1.5 bg-[#A16207] border border-stone-800 -mb-2 shadow-xs" />
            <div className="w-2 h-5 bg-[#A16207] border border-stone-800 rounded-t-xs shadow-xs" />
          </div>
        </>
      )}

      {/* ========================================================
          3. ISLA GAMING (DIGITAL)
         ======================================================== */}
      {islandId === "gaming" && (
        <>
          {/* Esquina superior izquierda: Mini Gabinete Arcade Bartop */}
          <div className="absolute -top-7 left-4 sm:left-8 anim-scenery-float z-20 flex items-center gap-2">
            <div className="w-12 h-14 bg-[#1E1B4B] border-2 border-stone-800 rounded-lg shadow-sm flex flex-col justify-between p-1 relative overflow-hidden -rotate-6">
              <div className="w-full h-3 bg-[#00E5FF] border border-stone-800 rounded-xs flex items-center justify-center text-[7px] font-bold text-black">
                TABE ARCADE
              </div>
              <div className="w-full h-5 bg-[#090D16] border border-stone-800 rounded-xs flex items-center justify-center relative overflow-hidden">
                <div className="w-3 h-3 bg-cyan-400 rounded-xs animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 to-transparent pointer-events-none" />
              </div>
              <div className="w-full h-3 bg-[#EC4899] border border-stone-800 rounded-xs flex items-center justify-around px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 border border-stone-800" />
                <div className="w-1 h-1 rounded-full bg-yellow-400" />
                <div className="w-1 h-1 rounded-full bg-blue-400" />
              </div>
            </div>
            <div className="px-2 py-0.5 bg-zinc-900 text-cyan-300 font-semibold text-[9px] uppercase border border-cyan-400/60 rounded-md shadow-xs hidden sm:block">
              Alta Frecuencia
            </div>
          </div>

          {/* Esquina superior derecha: Gema de poder flotante */}
          <div className="absolute -top-6 right-4 sm:right-8 anim-crystal-spin z-20 flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-[#00E5FF] to-[#A855F7] border-2 border-stone-800 rounded-xl shadow-md flex items-center justify-center rotate-45 anim-neon-glow">
              <Diamond className="w-4 h-4 text-white -rotate-45" />
            </div>
          </div>

          {/* Plataforma flotante lateral con Bloque "?" de 8 bits */}
          <div className="absolute top-1/2 -left-7 -translate-y-1/2 w-10 h-10 anim-scenery-float z-10 hidden md:flex flex-col items-center">
            <div className="w-8 h-8 bg-[#F59E0B] border-2 border-stone-800 rounded-md shadow-sm flex items-center justify-center font-bold text-sm text-black">
              ?
            </div>
          </div>

          {/* Moneda flotante giratoria dorada en esquina inferior */}
          <div className="absolute bottom-6 right-8 anim-crystal-spin z-10 hidden xs:flex">
            <div className="w-7 h-7 rounded-full bg-[#FFE600] border border-stone-800 shadow-sm flex items-center justify-center font-bold text-xs text-black">
              ★
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          4. ISLA ESTUDIO (ACADÉMICA)
         ======================================================== */}
      {islandId === "study" && (
        <>
          {/* Esquina superior izquierda: Pila de libros encuadernados */}
          <div className="absolute -top-6 left-4 sm:left-8 anim-scenery-float z-20 flex items-center gap-2">
            <div className="flex flex-col items-center -space-y-1 rotate-3">
              <div className="w-14 h-4 bg-[#7F1D1D] border border-stone-800 rounded-xs shadow-xs flex items-center justify-between px-1">
                <div className="w-2 h-0.5 bg-[#F59E0B]" />
                <span className="text-[7px] font-bold text-amber-200">TOMO III</span>
              </div>
              <div className="w-13 h-4 bg-[#1E3A8A] border border-stone-800 rounded-xs shadow-xs flex items-center justify-between px-1">
                <div className="w-2 h-0.5 bg-[#F59E0B]" />
                <span className="text-[7px] font-bold text-blue-200">ÁLGEBRA</span>
              </div>
              <div className="w-15 h-4 bg-[#065F46] border border-stone-800 rounded-xs shadow-xs flex items-center justify-between px-1">
                <div className="w-2 h-0.5 bg-[#F59E0B]" />
                <span className="text-[7px] font-bold text-emerald-200">HISTORIA</span>
              </div>
            </div>
            <div className="px-2 py-0.5 bg-zinc-900 text-amber-300 font-semibold text-[9px] uppercase border border-amber-400/60 rounded-md shadow-xs hidden sm:block">
              Biblioteca
            </div>
          </div>

          {/* Esquina superior derecha: Lámpara banquera verde encendida y café humeante */}
          <div className="absolute -top-7 right-4 sm:right-8 anim-scenery-float z-20 flex items-center gap-2.5">
            <div className="relative">
              <div className="w-11 h-6 bg-[#047857] border-2 border-stone-800 rounded-full shadow-sm flex items-center justify-center relative overflow-hidden">
                <div className="w-full h-1 bg-[#10B981] absolute top-1" />
                <div className="w-4 h-4 rounded-full bg-amber-200/50 blur-[2px]" />
              </div>
              <div className="w-2 h-5 bg-[#B45309] border border-stone-800 mx-auto shadow-xs" />
              <div className="w-6 h-2 bg-[#78350F] border border-stone-800 rounded-full mx-auto shadow-xs" />
            </div>

            <div className="relative hidden xs:block">
              <div className="w-8 h-7 bg-white border border-stone-800 rounded-b-lg shadow-sm flex items-center justify-center relative">
                <div className="w-5 h-2 bg-[#78350F] rounded-full absolute top-1" />
                <div className="w-3 h-4 border border-stone-800 rounded-r-full absolute -right-2 top-1" />
              </div>
              <div className="w-1.5 h-3 bg-stone-400/60 rounded-full blur-[0.5px] absolute -top-3 left-3 anim-steam" />
            </div>
          </div>

          {/* Frasco de tinta china y pluma dorada en esquina inferior */}
          <div className="absolute bottom-6 right-8 flex items-center gap-1.5 z-10 hidden sm:flex">
            <div className="w-6 h-7 bg-stone-900 border border-stone-800 rounded-md shadow-xs flex items-center justify-center text-[8px] font-bold text-amber-200">
              INK
            </div>
            <Feather className="w-4 h-4 text-amber-400 -rotate-45" />
          </div>
        </>
      )}

      {/* ========================================================
          5. ISLA CÓSMICA
         ======================================================== */}
      {islandId === "cosmic" && (
        <>
          {/* Esquina superior izquierda: Antena de radar espacial parabólica */}
          <div className="absolute -top-7 left-4 sm:left-8 anim-scenery-float z-20 flex items-center gap-2">
            <div className="relative">
              <div className="w-12 h-8 bg-slate-300 border-2 border-stone-800 rounded-t-full shadow-sm flex items-center justify-center -rotate-12">
                <div className="w-1.5 h-4 bg-red-600 border border-stone-800 rounded-full -mt-2 animate-pulse" />
              </div>
              <div className="w-2.5 h-6 bg-slate-600 border border-stone-800 mx-auto" />
            </div>
            <div className="px-2 py-0.5 bg-zinc-900 text-purple-300 font-semibold text-[9px] uppercase border border-purple-400/60 rounded-md shadow-xs hidden sm:block">
              Base Orbital
            </div>
          </div>

          {/* Esquina superior derecha: Cristal gigante de antimateria */}
          <div className="absolute -top-8 right-4 sm:right-8 anim-crystal-spin z-20 flex items-center gap-2">
            <div className="w-9 h-13 bg-gradient-to-t from-[#A855F7] via-[#C084FC] to-[#38BDF8] border-2 border-stone-800 shadow-md [clip-path:polygon(50%_0%,100%_35%,80%_100%,20%_100%,0%_35%)] flex items-center justify-center">
              <div className="w-2 h-6 bg-white/70 rounded-full" />
            </div>
            <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
          </div>

          {/* Mini Rover espacial en esquina inferior */}
          <div className="absolute bottom-6 right-8 flex items-center gap-1 z-10 hidden xs:flex">
            <div className="w-9 h-6 bg-amber-400 border border-stone-800 rounded-md shadow-xs flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 text-stone-900" />
            </div>
            <div className="flex flex-col -space-y-1">
              <div className="w-3 h-3 rounded-full bg-slate-800 border border-stone-800" />
              <div className="w-3 h-3 rounded-full bg-slate-800 border border-stone-800" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
