import React from "react";
import { IslandId } from "@/hooks/forestIslandsData";
import { cn } from "@/lib/utils";

interface IslandDetailsProps {
  islandId: IslandId;
  isNightMode?: boolean;
}

/**
 * Detalles colgantes por debajo de la plataforma de la isla (Underhang).
 * Incluye queso derretido para Pizza, raíces para Clásica, cables y píxeles para Gaming,
 * pergaminos para Estudio, y meteoritos y cristales para Cósmica.
 */
export const IslandUnderhang: React.FC<IslandDetailsProps> = ({
  islandId,
  isNightMode = false,
}) => {
  return (
    <div className="absolute -bottom-10 sm:-bottom-14 inset-x-2 sm:inset-x-6 h-20 sm:h-24 pointer-events-none z-20">
      <style>{`
        @keyframes cheeseDripSway {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(5px) scaleY(1.12); }
        }
        @keyframes vineSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes cablePulse {
          0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 4px #00E5FF); }
          50% { opacity: 1; filter: drop-shadow(0 0 12px #00E5FF); }
        }
        @keyframes cosmicCrystalFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(5deg); }
        }
        .anim-cheese-drip-1 { animation: cheeseDripSway 3.2s ease-in-out infinite; }
        .anim-cheese-drip-2 { animation: cheeseDripSway 4.1s ease-in-out infinite 0.7s; }
        .anim-cheese-drip-3 { animation: cheeseDripSway 3.6s ease-in-out infinite 1.4s; }
        .anim-vine-sway-1 { animation: vineSway 4.5s ease-in-out infinite; transform-origin: top center; }
        .anim-vine-sway-2 { animation: vineSway 5.2s ease-in-out infinite 1s; transform-origin: top center; }
        .anim-cable-pulse { animation: cablePulse 2s ease-in-out infinite; }
        .anim-cosmic-crystal { animation: cosmicCrystalFloat 3.8s ease-in-out infinite; }
      `}</style>

      {/* 1. ISLA PIZZA: GRAN CASCADA DE QUESO MOZZARELLA DERRETIDO COLGANDO */}
      {islandId === "pizza" && (
        <div className="relative w-full h-full flex items-start justify-between px-2 sm:px-6">
          {/* Gota de queso izquierda grande */}
          <div className="relative anim-cheese-drip-1 -mt-1">
            <svg width="60" height="65" viewBox="0 0 60 65" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M6 0 C6 22 14 34 26 34 C38 34 42 50 32 58 C22 66 16 54 16 42 C16 30 8 18 6 0 Z"
                fill="#FBBF24"
                stroke="#000"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {/* Capa de salsa de tomate asomando */}
              <path d="M12 0 C12 14 16 22 22 22 C28 22 30 32 26 38" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
              {/* Brillo cómic blanco sobre el queso */}
              <path d="M18 10 C20 20 24 26 26 32" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
              {/* Gotas cayendo en suspensión */}
              <circle cx="31" cy="62" r="4.5" fill="#FBBF24" stroke="#000" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Salsa de tomate y queso derretido en el primer tercio */}
          <div className="relative anim-cheese-drip-2 -mt-1 hidden xs:block">
            <svg width="50" height="52" viewBox="0 0 50 52" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M4 0 C4 18 12 26 22 26 C32 26 38 38 32 46 C26 52 20 42 20 30 C20 16 10 10 4 0 Z"
                fill="#EF4444"
                stroke="#000"
                strokeWidth="2.5"
              />
              <path
                d="M12 0 C12 14 20 22 28 22 C36 22 40 32 36 40 C32 46 28 38 28 28 C28 16 18 10 12 0 Z"
                fill="#FBBF24"
                stroke="#000"
                strokeWidth="2.5"
              />
              <circle cx="35" cy="48" r="3.5" fill="#FBBF24" stroke="#000" strokeWidth="2" />
            </svg>
          </div>

          {/* Estalactita central masiva de mozzarella elástica */}
          <div className="relative anim-cheese-drip-3 -mt-1">
            <svg width="78" height="74" viewBox="0 0 78 74" fill="none" className="overflow-visible drop-shadow-[4px_4px_0_#000]">
              <path
                d="M6 0 C8 28 22 38 38 38 C54 38 60 56 50 66 C40 75 30 64 30 48 C30 32 16 22 6 0 Z"
                fill="#F59E0B"
                stroke="#000"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M14 0 C18 20 28 30 38 30 C50 30 56 46 48 54 C40 62 32 52 32 38"
                fill="#FDE68A"
                stroke="#000"
                strokeWidth="2.5"
              />
              <path d="M26 8 C28 18 34 24 38 26" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
              {/* Cadena de gotas goteando */}
              <circle cx="48" cy="70" r="4.5" fill="#F59E0B" stroke="#000" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Rodaja de Pepperoni asomando doblada en el borde */}
          <div className="relative -mt-3 -rotate-12 select-none">
            <div className="w-10 h-10 rounded-full bg-[#B91C1C] border-3 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center relative overflow-hidden">
              <div className="w-2 h-2 rounded-full bg-[#FCA5A5] absolute top-2 left-2 border border-black/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FCA5A5] absolute bottom-2 right-2 border border-black/40" />
              <div className="w-2 h-2 rounded-full bg-[#7F1D1D] absolute top-4 right-2" />
              <div className="w-7 h-2 rounded-full border-t-2 border-white/70 absolute top-1" />
            </div>
          </div>

          {/* Gota de queso derecha con queso estirado */}
          <div className="relative anim-cheese-drip-1 -mt-1">
            <svg width="55" height="60" viewBox="0 0 55 60" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M44 0 C44 18 36 28 26 28 C16 28 12 42 20 50 C26 56 34 50 34 36 C34 22 42 14 44 0 Z"
                fill="#FBBF24"
                stroke="#000"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <circle cx="21" cy="56" r="4" fill="#FBBF24" stroke="#000" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      )}

      {/* 2. ISLA CLÁSICA: RAÍCES RETORCIDAS, LIANAS Y PEÑASCOS FLOTANTES */}
      {islandId === "classic" && (
        <div className="relative w-full h-full flex items-start justify-between px-3 sm:px-10">
          {/* Raíz leñosa izquierda */}
          <div className="relative anim-vine-sway-1 -mt-1">
            <svg width="60" height="65" viewBox="0 0 60 65" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M10 0 C14 18 24 24 24 38 C24 50 36 56 34 62 C28 60 20 48 20 36 C20 24 8 16 10 0 Z"
                fill="#78350F"
                stroke="#000"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M22 26 C30 32 34 42 38 46" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
              <path d="M12 34 C16 42 18 50 20 54" stroke="#5B210B" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Liana verde con hojitas */}
          <div className="relative anim-vine-sway-2 -mt-1 hidden xs:block">
            <svg width="48" height="66" viewBox="0 0 48 66" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M14 0 C18 18 10 30 20 44 C26 54 22 62 22 66"
                stroke="#4D7C0F"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Hojas verdes grandes */}
              <ellipse cx="8" cy="24" rx="6" ry="3.5" fill="#84CC16" stroke="#000" strokeWidth="2" transform="rotate(-30 8 24)" />
              <ellipse cx="28" cy="40" rx="6.5" ry="3.5" fill="#84CC16" stroke="#000" strokeWidth="2" transform="rotate(25 28 40)" />
              <ellipse cx="18" cy="62" rx="5" ry="3" fill="#A3E635" stroke="#000" strokeWidth="2" transform="rotate(-15 18 62)" />
            </svg>
          </div>

          {/* Peñasco de tierra suspendido flotante */}
          <div className="relative anim-cosmic-crystal mt-3">
            <div className="w-9 h-7 rounded-md bg-[#78350F] border-2 border-black shadow-[3px_3px_0_0_#000] flex flex-col items-center">
              <div className="w-full h-2.5 bg-[#65A30D] rounded-t-sm border-b-2 border-black" />
              <div className="w-3 h-1.5 bg-black/40 mt-0.5 rounded-full" />
            </div>
          </div>

          {/* Raíz grande derecha */}
          <div className="relative anim-vine-sway-1 -mt-1">
            <svg width="65" height="68" viewBox="0 0 65 68" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M48 0 C44 20 32 30 32 44 C32 56 22 62 24 68 C30 64 40 52 40 38 C40 26 50 18 48 0 Z"
                fill="#78350F"
                stroke="#000"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M36 32 C26 38 24 48 18 54" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {/* 3. ISLA GAMING: CABLES NEÓN, CONECTORES TERMINALES Y PÍXELES VÓXEL */}
      {islandId === "gaming" && (
        <div className="relative w-full h-full flex items-start justify-between px-3 sm:px-10">
          {/* Cable Neón Cian en bucle con LED terminal */}
          <div className="relative -mt-1">
            <svg width="65" height="60" viewBox="0 0 65 60" fill="none" className="overflow-visible">
              <path
                d="M10 0 C14 26 34 36 34 48 C34 54 28 58 24 58"
                stroke="#000"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M10 0 C14 26 34 36 34 48 C34 54 28 58 24 58"
                stroke="#00E5FF"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* LED indicador grande */}
              <circle cx="24" cy="58" r="4.5" fill="#00E5FF" stroke="#000" strokeWidth="2" className="anim-cable-pulse" />
            </svg>
          </div>

          {/* Bloque de píxel retro flotante (Cubo de gema) */}
          <div className="relative anim-cosmic-crystal mt-3 hidden xs:flex flex-col items-center">
            <div className="w-7 h-7 bg-[#A855F7] border-3 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center">
              <div className="w-3 h-3 bg-[#00E5FF] border border-black" />
            </div>
          </div>

          {/* Cable Magenta Neón en bucle central */}
          <div className="relative -mt-1">
            <svg width="60" height="58" viewBox="0 0 60 58" fill="none" className="overflow-visible">
              <path
                d="M44 0 C40 22 22 30 22 44 C22 50 28 54 32 54"
                stroke="#000"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M44 0 C40 22 22 30 22 44 C22 50 28 54 32 54"
                stroke="#EC4899"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="32" cy="54" r="4" fill="#EC4899" stroke="#000" strokeWidth="2" className="anim-cable-pulse" />
            </svg>
          </div>

          {/* Cubo amarillo retro 16-bit flotante */}
          <div className="relative anim-cosmic-crystal mt-4 select-none">
            <div className="w-6 h-6 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center font-black text-xs text-black">
              ?
            </div>
          </div>
        </div>
      )}

      {/* 4. ISLA ESTUDIO: CINTAS DE MARCAPÁGINAS, PERGAMINOS Y MÉNSULAS DE ROBLE */}
      {islandId === "study" && (
        <div className="relative w-full h-full flex items-start justify-between px-4 sm:px-12">
          {/* Cinta marcapáginas de terciopelo carmesí larga */}
          <div className="relative anim-vine-sway-1 -mt-1">
            <div className="w-6 h-14 bg-[#991B1B] border-2 border-black shadow-[3px_3px_0_0_#000] flex flex-col justify-between items-center relative">
              <div className="w-full h-1.5 bg-[#F59E0B] border-b border-black" />
              {/* Terminación en V recortada */}
              <div className="absolute -bottom-3 inset-x-0 h-3 flex justify-center">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[10px] border-t-[#991B1B]" />
              </div>
            </div>
          </div>

          {/* Pergamino enrollado colgando */}
          <div className="relative anim-vine-sway-2 -mt-1 hidden xs:block">
            <svg width="48" height="55" viewBox="0 0 48 55" fill="none" className="overflow-visible drop-shadow-[3px_3px_0_#000]">
              <path
                d="M8 0 C8 18 16 32 22 38 C28 44 36 46 36 52 C30 52 24 46 18 42 C12 34 6 18 6 0 Z"
                fill="#FEF3C7"
                stroke="#000"
                strokeWidth="2.5"
              />
              <line x1="12" y1="14" x2="20" y2="14" stroke="#78350F" strokeWidth="2" />
              <line x1="14" y1="22" x2="22" y2="22" stroke="#78350F" strokeWidth="2" />
              <circle cx="34" cy="48" r="4" fill="#DC2626" stroke="#000" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Hoja de apunte suspendida con un 10 */}
          <div className="relative anim-cosmic-crystal mt-3 select-none">
            <div className="w-8 h-9 bg-white border-2 border-black rounded-sm shadow-[3px_3px_0_0_#000] flex flex-col items-center justify-center p-1 -rotate-6">
              <span className="text-[9px] font-black text-rose-600 leading-none">10</span>
              <div className="w-4.5 h-0.5 bg-slate-300 mt-1.5" />
              <div className="w-3 h-0.5 bg-slate-300 mt-1" />
            </div>
          </div>

          {/* Cinta dorada de biblioteca */}
          <div className="relative anim-vine-sway-1 -mt-1">
            <div className="w-5 h-12 bg-[#F59E0B] border-2 border-black shadow-[2px_2px_0_0_#000] flex flex-col justify-end items-center relative">
              <div className="w-3 h-3 rounded-full bg-[#B45309] border border-black mb-1.5" />
            </div>
          </div>
        </div>
      )}

      {/* 5. ISLA CÓSMICA: METEORITOS ORBITANTES Y CRISTALES DE GRAVEDAD CERO */}
      {islandId === "cosmic" && (
        <div className="relative w-full h-full flex items-start justify-between px-4 sm:px-12">
          {/* Meteorito izquierdo con cráteres */}
          <div className="relative anim-cosmic-crystal mt-1">
            <div className="w-10 h-8 rounded-lg bg-[#334155] border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center relative rotate-12">
              <div className="w-2.5 h-2.5 rounded-full bg-black/40 absolute top-1.5 left-1.5" />
              <div className="w-2 h-2 rounded-full bg-black/40 absolute bottom-1.5 right-2.5" />
            </div>
          </div>

          {/* Cristal de energía cósmica púrpura */}
          <div className="relative anim-cosmic-crystal mt-3 hidden xs:block">
            <div className="w-7 h-10 bg-[#C084FC] border-2 border-black shadow-[0_0_12px_#C084FC,3px_3px_0_0_#000] [clip-path:polygon(50%_0%,100%_40%,75%_100%,25%_100%,0%_40%)] flex items-center justify-center">
              <div className="w-2 h-4 bg-white/70 rounded-full" />
            </div>
          </div>

          {/* Fragmento lunar con cristal cian */}
          <div className="relative anim-cosmic-crystal mt-1">
            <div className="w-8 h-8 rounded-md bg-[#1E293B] border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center relative -rotate-6">
              <div className="w-3 h-3 bg-[#38BDF8] border border-black rotate-45 shadow-[0_0_8px_#38BDF8]" />
            </div>
          </div>

          {/* Polvo estelar / Asteroide derecho */}
          <div className="relative anim-cosmic-crystal mt-4 select-none">
            <div className="w-5 h-5 rounded-full bg-[#64748B] border-2 border-black shadow-[2px_2px_0_0_#000]" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Textura y relieves en la superficie de la isla (Toppings, briznas de césped, circuitos, vetas de madera, etc.)
 */
export const IslandSurfaceDetails: React.FC<IslandDetailsProps> = ({
  islandId,
  isNightMode = false,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[36px] select-none z-0">
      {/* 1. SUPERFICIE ISLA PIZZA: Rodajas de pepperoni, burbujas doradas de queso y orégano */}
      {islandId === "pizza" && (
        <>
          {/* Pepperoni 1 (Arriba izquierda) */}
          <div className="absolute top-5 left-12 w-9 h-9 rounded-full bg-[#B91C1C] border-2 border-black shadow-[2px_2px_0_0_#000] rotate-6 hidden sm:flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#FCA5A5] absolute top-2 left-2 border border-black/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FCA5A5] absolute bottom-2 right-2 border border-black/30" />
            <div className="w-6 h-2 rounded-full border-t border-white/50 absolute top-1" />
          </div>

          {/* Pepperoni 2 (Abajo derecha) */}
          <div className="absolute bottom-6 right-16 w-8 h-8 rounded-full bg-[#B91C1C] border-2 border-black shadow-[2px_2px_0_0_#000] -rotate-12 hidden md:flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FCA5A5] absolute top-1.5 left-2 border border-black/30" />
            <div className="w-1 h-1 rounded-full bg-[#7F1D1D] absolute bottom-2 right-2" />
          </div>

          {/* Pepperoni 3 (Arriba derecha) */}
          <div className="absolute top-7 right-28 w-7 h-7 rounded-full bg-[#991B1B] border-2 border-black shadow-[2px_2px_0_0_#000] rotate-45 hidden lg:flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FCA5A5] absolute top-1 left-2 border border-black/30" />
          </div>

          {/* Mancha de queso derretido gratinado (Burbuja dorada) */}
          <div className="absolute top-14 left-1/3 w-16 h-8 rounded-full bg-[#F59E0B]/60 border border-black/30 -rotate-3" />
          <div className="absolute bottom-10 left-1/4 w-12 h-6 rounded-full bg-[#FEF08A]/70 border border-black/20 rotate-12" />
          <div className="absolute top-12 right-1/4 w-14 h-7 rounded-full bg-[#F59E0B]/50 border border-black/30 rotate-6" />

          {/* Hojitas de orégano/albahaca dispersas */}
          <div className="absolute top-8 left-1/2 w-3 h-1.5 rounded-full bg-[#15803D] border border-black -rotate-45" />
          <div className="absolute bottom-12 right-1/3 w-3 h-1.5 rounded-full bg-[#15803D] border border-black rotate-30" />
        </>
      )}

      {/* 2. SUPERFICIE ISLA CLÁSICA: Briznas de pasto cómic, flores y motas de tierra */}
      {islandId === "classic" && (
        <>
          {/* Briznas de césped entintadas */}
          <div className="absolute top-6 left-16 flex items-end gap-0.5 opacity-70">
            <div className="w-1 h-3 bg-[#A3E635] border-t border-l border-black -rotate-12 rounded-t-sm" />
            <div className="w-1 h-4 bg-[#84CC16] border-t border-x border-black rounded-t-sm" />
            <div className="w-1 h-2.5 bg-[#A3E635] border-t border-r border-black rotate-12 rounded-t-sm" />
          </div>

          <div className="absolute bottom-8 right-24 flex items-end gap-0.5 opacity-70 hidden sm:flex">
            <div className="w-1 h-3.5 bg-[#84CC16] border-t border-l border-black -rotate-6 rounded-t-sm" />
            <div className="w-1 h-4.5 bg-[#A3E635] border-t border-x border-black rounded-t-sm" />
            <div className="w-1 h-3 bg-[#84CC16] border-t border-r border-black rotate-12 rounded-t-sm" />
          </div>

          {/* Pequeña flor silvestre */}
          <div className="absolute top-10 right-20 flex items-center justify-center opacity-80 hidden md:flex">
            <div className="w-3 h-3 rounded-full bg-white border border-black flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
            </div>
          </div>
        </>
      )}

      {/* 3. SUPERFICIE ISLA GAMING: Pistas de circuito PCB y grilla arcade */}
      {islandId === "gaming" && (
        <>
          {/* Pista de circuito cian */}
          <div className="absolute top-6 left-12 w-24 h-1 bg-[#00E5FF]/40 border-t border-b border-black">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] border border-black absolute -top-1 -right-1" />
          </div>

          {/* Pista de circuito magenta */}
          <div className="absolute bottom-8 right-16 w-32 h-1 bg-[#EC4899]/40 border-t border-b border-black hidden sm:block">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EC4899] border border-black absolute -top-1 -left-1" />
          </div>

          {/* Nodos de circuito retro */}
          <div className="absolute top-12 right-1/3 w-3 h-3 rounded-full bg-[#FFE600] border border-black opacity-60" />
          <div className="absolute bottom-12 left-1/4 w-2 h-2 rounded-full bg-[#00E5FF] border border-black opacity-60" />
        </>
      )}

      {/* 4. SUPERFICIE ISLA ESTUDIO: Vetas de roble y esquineros de latón */}
      {islandId === "study" && (
        <>
          {/* Vetas de madera estilizadas */}
          <div className="absolute inset-x-8 top-8 h-px bg-black/25" />
          <div className="absolute inset-x-12 bottom-10 h-px bg-black/25" />
          <div className="absolute top-1/2 inset-x-16 h-px bg-black/15" />

          {/* Mancha de tinta china cómic */}
          <div className="absolute top-6 left-20 w-5 h-4 rounded-full bg-black/50 border border-black/80 rotate-12 hidden sm:block">
            <div className="w-1.5 h-1.5 rounded-full bg-black/50 absolute -right-1.5 top-1" />
          </div>
        </>
      )}

      {/* 5. SUPERFICIE ISLA CÓSMICA: Cráteres lunares 2.5D y polvo estelar */}
      {islandId === "cosmic" && (
        <>
          {/* Cráter lunar 1 */}
          <div className="absolute top-6 left-14 w-10 h-7 rounded-full bg-black/35 border-2 border-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center hidden sm:flex">
            <div className="w-6 h-3 rounded-full bg-black/20" />
          </div>

          {/* Cráter lunar 2 */}
          <div className="absolute bottom-8 right-20 w-8 h-5 rounded-full bg-black/35 border-2 border-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] hidden md:block" />

          {/* Destellos de antimateria */}
          <div className="absolute top-12 right-1/3 w-1.5 h-1.5 bg-[#C084FC] rounded-full shadow-[0_0_6px_#C084FC]" />
          <div className="absolute bottom-10 left-1/3 w-1 h-1 bg-[#38BDF8] rounded-full shadow-[0_0_4px_#38BDF8]" />
        </>
      )}
    </div>
  );
};
