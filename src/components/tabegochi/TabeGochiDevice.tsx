import React, { useState } from "react";
import { TabeGochiPet, PET_SPECIES_LIST } from "@/types/tabegochi";
import { PixelPetSprite } from "@/components/tabegochi/PixelPetSprite";
import { Moon, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const GOTCHI_MENU_OPTIONS = [
  { id: "feed", label: "[COMER]" },
  { id: "love", label: "[MIMAR]" },
  { id: "clean", label: "[BAÑAR]" },
  { id: "heal", label: "[CURAR]" },
  { id: "play", label: "[JUGAR]" },
] as const;

export type GotchiMenuOptionId = typeof GOTCHI_MENU_OPTIONS[number]["id"];

interface TabeGochiDeviceProps {
  pet: TabeGochiPet;
  onPetClick: () => void;
  onButtonA: () => void;
  onButtonB: () => void;
  onButtonC: () => void;
  onDpadLeft?: () => void;
  onDpadRight?: () => void;
  onDpadUp?: () => void;
  onDpadDown?: () => void;
  onSelectOption?: (optionId: GotchiMenuOptionId) => void;
  onSwitchPet?: () => void;
  onAbandonPet?: () => void;
  totalPets?: number;
  activeMenuIcon?: string;
  isActionInProgress?: boolean;
  actionEffect?: "feed" | "clean" | "love" | "heal" | null;
  onToggleForest?: () => void;
}

export function TabeGochiDevice({
  pet,
  onPetClick,
  onButtonA,
  onButtonB,
  onButtonC,
  onDpadLeft,
  onDpadRight,
  onDpadUp,
  onDpadDown,
  onSelectOption,
  onSwitchPet,
  onAbandonPet,
  totalPets,
  activeMenuIcon = "feed",
  actionEffect,
  onToggleForest,
}: TabeGochiDeviceProps) {
  const speciesInfo = PET_SPECIES_LIST.find(s => s.id === pet.species) || PET_SPECIES_LIST[0];
  const [heartsFloating, setHeartsFloating] = useState<{ id: number; x: number; y: number }[]>([]);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  // Click on pet to trigger tactile hearts
  const handlePetDirectClick = (e: React.MouseEvent) => {
    onPetClick();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setHeartsFloating(prev => [...prev.slice(-4), { id, x, y }]);
    setTimeout(() => {
      setHeartsFloating(prev => prev.filter(h => h.id !== id));
    }, 1200);
  };

  // Background styling inside the LCD screen
  const getLcdBackground = () => {
    if (pet.isSleeping) {
      return "bg-[#0b1021] text-[#93c5fd] border-[#1e293b]";
    }
    switch (pet.background) {
      case "park":
        return "bg-gradient-to-b from-[#86efac] via-[#bbf7d0] to-[#4ade80] text-[#14532d]";
      case "space":
        return "bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-[#e0e7ff]";
      case "beach":
        return "bg-gradient-to-b from-[#38bdf8] via-[#bae6fd] to-[#fde047] text-[#0369a1]";
      case "dungeon":
        return "bg-gradient-to-b from-[#334155] via-[#475569] to-[#1e293b] text-[#f8fafc]";
      case "bedroom":
        return "bg-gradient-to-b from-[#fed7aa] via-[#ffedd5] to-[#fbcfe8] text-[#431407]";
      default:
        // Classic Tamagotchi dot-matrix greenish tint
        return "bg-[#9bbc0f] text-[#0f380f]";
    }
  };

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Estilos CSS nativos para animaciones de Tamagotchi */}
      <style>{`
        @keyframes floatHeart {
          0% { transform: scale(0.6) translateY(0); opacity: 1; }
          100% { transform: scale(1.4) translateY(-40px); opacity: 0; }
        }
        @keyframes pixelShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        .animate-shake { animation: pixelShake 0.3s ease-in-out 3; }
        .lcd-dotmatrix {
          background-image: radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px);
          background-size: 4px 4px;
        }
      `}</style>

      {/* Consola Retro Verde Esmeralda Estilo Game Boy / Dashboard */}
      <div className="relative w-full max-w-[360px] sm:max-w-[380px] bg-emerald-500 border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_#000] flex flex-col items-center overflow-hidden select-none">
        
        {/* Título de la carcasa retro */}
        <div className="w-full flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-black shadow-inner" />
            <span className="text-[10px] font-black uppercase tracking-wider font-mono text-black/80">BATTERY</span>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-black font-mono">
            ★ TABE-GOTCHI ★
          </span>
          <div className="flex items-center gap-2">
            {onToggleForest && (
              <button 
                type="button"
                onClick={onToggleForest}
                className="text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded bg-white text-black border border-black hover:bg-yellow-300 shadow-[1px_1px_0_#000] cursor-pointer"
                title="Ver Bosque"
              >
                Bosque
              </button>
            )}
            <div className="flex gap-1.5 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
            </div>
          </div>
        </div>

        {/* Marco de Pantalla LCD Biselado */}
        <div className="w-full bg-[#1e293b]/10 border-3 border-black rounded-2xl p-2.5 shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)] flex flex-col items-center relative overflow-hidden">
          
          {/* Pantalla LCD Verde Pixelada con textura dot-matrix (sin barras de desplazamiento) */}
          <div className={cn(
            "w-full h-56 sm:h-60 rounded-xl border-3 border-black p-2.5 flex flex-col justify-between relative overflow-hidden transition-colors duration-500 lcd-dotmatrix font-mono",
            getLcdBackground()
          )}>
            
            {/* Tira de Menú Superior Retro (5 botones sin scrollbars) */}
            <div className="flex items-center justify-between px-0.5 border-b-2 border-black/25 pb-1 text-[10px] font-mono font-black opacity-95 select-none overflow-hidden gap-0.5">
              {GOTCHI_MENU_OPTIONS.map((opt) => {
                const isSelected = activeMenuIcon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingAbandon(false);
                      onSelectOption?.(opt.id);
                    }}
                    className={cn(
                      "transition-all px-1 sm:px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap",
                      isSelected 
                        ? "bg-black text-[#FFE600] shadow-[1px_1px_0px_#000]" 
                        : "text-black hover:bg-black/15 active:scale-95"
                    )}
                    title={`Opción ${opt.label}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Centro de la Pantalla: Mascota 2D Retro o Confirmación de Abandono */}
            {confirmingAbandon ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-2 z-30">
                <p className="text-xs font-black uppercase text-black bg-[#FFE600] px-2 py-0.5 rounded border-2 border-black shadow-[2px_2px_0_#000]">
                  ¿ABANDONAR A {pet.name}?
                </p>
                <p className="text-[10px] font-bold leading-tight opacity-90 max-w-[220px]">
                  Liberarás a esta mascota y podrás adoptar una nueva.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingAbandon(false);
                      onAbandonPet?.();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#ef4444] hover:bg-red-600 text-white border-2 border-black shadow-[2px_2px_0_#000] text-[10px] font-black uppercase cursor-pointer"
                  >
                    [SÍ, ABANDONAR]
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingAbandon(false)}
                    className="px-2.5 py-1 rounded-lg bg-black text-[#FFE600] hover:bg-slate-800 border-2 border-black shadow-[2px_2px_0_#000] text-[10px] font-black uppercase cursor-pointer"
                  >
                    [CANCELAR]
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={handlePetDirectClick}
                className="flex-1 flex flex-col items-center justify-center relative cursor-pointer group overflow-hidden"
                title="¡Haz clic sobre tu Tabe Gotchi para acariciarlo!"
              >
                
                {/* Caquitas pixel art si hay suciedad */}
                {pet.poopCount > 0 && !pet.isSleeping && (
                  <div className="absolute bottom-2 right-3 flex items-center gap-1 animate-bounce z-20">
                    {Array.from({ length: pet.poopCount }).map((_, i) => (
                      <svg key={i} viewBox="0 0 16 16" width="22" height="22" style={{ shapeRendering: "crispEdges" }}>
                        <path d="M7 2 h2 v2 h-2 z M5 4 h6 v3 h-6 z M3 7 h10 v4 h-10 z M2 11 h12 v3 h-12 z" fill="#78350F" />
                        <rect x="6" y="8" width="1" height="1" fill="#FFFFFF" />
                        <rect x="9" y="8" width="1" height="1" fill="#FFFFFF" />
                      </svg>
                    ))}
                  </div>
                )}

                {/* Efectos de acción en tiempo real */}
                {actionEffect === "clean" && (
                  <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-xs text-blue-900 bg-cyan-200/50 rounded-lg animate-pulse pointer-events-none z-30 uppercase border border-blue-500">
                    LIMPIEZA TOTAL
                  </div>
                )}
                {actionEffect === "heal" && (
                  <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-xs text-emerald-950 bg-emerald-200/50 rounded-lg animate-bounce pointer-events-none z-30 uppercase border border-emerald-600">
                    MEDICINA APLICADA
                  </div>
                )}
                {actionEffect === "love" && (
                  <div className="absolute top-2 text-xs font-mono font-black bg-pink-500 text-white px-2 py-0.5 rounded border border-black animate-ping pointer-events-none z-30">
                    CARICIAS
                  </div>
                )}

                {/* Corazones flotantes táctiles en SVG */}
                {heartsFloating.map(h => (
                  <div 
                    key={h.id} 
                    className="absolute pointer-events-none select-none z-40"
                    style={{ 
                      left: `${h.x}px`, 
                      top: `${h.y}px`, 
                      animation: "floatHeart 1s forwards ease-out" 
                    }}
                  >
                    <svg viewBox="0 0 16 16" width="20" height="20" style={{ shapeRendering: "crispEdges" }}>
                      <path d="M8 4 C 8 2, 5 2, 4 4 C 3 6, 8 12, 8 12 C 8 12, 13 6, 12 4 C 11 2, 8 2, 8 4 Z" fill="#FF2E93" />
                    </svg>
                  </div>
                ))}

                {/* SPRITE 2D RETRO PIXEL ART DE LA MASCOTA CON TODAS SUS CAPAS Y OFFSETS */}
                <PixelPetSprite
                  species={pet.species}
                  stage={pet.stage}
                  hat={pet.hat}
                  outfit={pet.outfit}
                  heldItem={pet.heldItem}
                  aura={pet.aura}
                  colorSkin={pet.colorSkin}
                  isSleeping={pet.isSleeping}
                  isSick={pet.isSick}
                  isDead={pet.isDead}
                  isEating={actionEffect === "feed"}
                  isHappy={actionEffect === "love" || pet.happiness > 75}
                  foodId={actionEffect === "feed" ? "nano_banana" : undefined}
                  size={128}
                />

                {/* Diálogo / Estado emocional estilo retro arcade */}
                <div className="text-[10px] font-black uppercase tracking-wider text-black bg-black/10 px-2 py-0.5 rounded border border-black/20 mt-0.5 font-mono text-center">
                  {pet.isDead
                    ? "ESTADO: FALLECIDO 🪦 / D.E.P."
                    : pet.isSleeping 
                    ? "MODO: REPOSO ZZZ" 
                    : pet.isSick 
                    ? "ESTADO: ENFERMO / DAR MEDICINA" 
                    : pet.health <= 20
                    ? "ESTADO: CRÍTICO 🚨 / ¡ALIMENTAR YA!"
                    : pet.hunger < 30 
                    ? "ESTADO: HAMBRIENTO / ALIMENTAR" 
                    : pet.happiness < 40 
                    ? "ESTADO: DESANIMADO / JUGAR" 
                    : "ESTADO: FELIZ Y SALUDABLE"}
                </div>

                {pet.isDead && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOption?.("heal");
                    }}
                    className="mt-1 px-3 py-1 rounded-lg bg-[#00FF9D] hover:bg-[#00E58D] text-black font-black uppercase text-[10px] border-2 border-black shadow-[2px_2px_0_#000] cursor-pointer animate-pulse"
                  >
                    ✨ [REVIVIR MASCOTA]
                  </button>
                )}
              </div>
            )}

            {/* Barra Inferior LCD: Nombre, Nivel y Vitales */}
            <div className="flex items-center justify-between px-1.5 text-[10px] font-black font-mono border-t-2 border-black/25 pt-1 overflow-hidden">
              <div 
                onClick={onSwitchPet}
                className={cn(
                  "flex items-center gap-1 select-none",
                  totalPets && totalPets > 1 && "cursor-pointer hover:bg-black/10 px-1 rounded transition-colors"
                )}
                title={totalPets && totalPets > 1 ? "Haz clic para alternar mascota" : undefined}
              >
                {totalPets && totalPets > 1 && <span className="text-[9px] opacity-60">◀</span>}
                <span className="truncate max-w-[85px] uppercase">{pet.name}</span>
                {totalPets && totalPets > 1 && <span className="text-[9px] opacity-60">▶</span>}
              </div>
              <span className="bg-black/15 px-1 rounded">
                NV.{pet.level} {pet.stage === "baby" ? "BEBÉ" : pet.stage === "child" ? "JOVEN" : pet.stage === "adult" ? "ADULTO" : "MÍTICO"}
              </span>
              <span>ANIMO: {pet.happiness}% | ENERGIA: {pet.energy}%</span>
            </div>

          </div>
        </div>

        {/* Panel Inferior de Controles Físicos: Cruceta D-Pad, Botones Centrales (Luz / Abandonar) y Botones Arcade B / A */}
        <div className="w-full flex items-center justify-between px-2 mt-5 mb-1">
          
          {/* Cruceta D-Pad Negra Retro (Idéntica al Dashboard) */}
          <div className="relative w-16 h-16 shrink-0">
            {/* Barra Horizontal */}
            <div className="absolute top-1/2 left-0 right-0 h-6 bg-black -translate-y-1/2 rounded-sm shadow-[inset_1px_1px_0_rgba(255,255,255,0.4),_2px_2px_0_#000] flex justify-between overflow-hidden">
              <button 
                type="button"
                onClick={onDpadLeft || onButtonA} 
                className="w-5 h-full hover:bg-white/20 active:bg-white/40 cursor-pointer"
                title="D-Pad Izquierda: Opción anterior"
                aria-label="Izquierda"
              />
              <button 
                type="button"
                onClick={onDpadRight || onButtonA} 
                className="w-5 h-full hover:bg-white/20 active:bg-white/40 cursor-pointer"
                title="D-Pad Derecha: Opción siguiente"
                aria-label="Derecha"
              />
            </div>
            {/* Barra Vertical */}
            <div className="absolute left-1/2 top-0 bottom-0 w-6 bg-black -translate-x-1/2 rounded-sm shadow-[inset_1px_1px_0_rgba(255,255,255,0.4),_2px_2px_0_#000] flex flex-col justify-between pointer-events-none overflow-hidden">
              <button 
                type="button"
                onClick={onDpadUp || onSwitchPet} 
                className="w-full h-5 hover:bg-white/20 active:bg-white/40 pointer-events-auto cursor-pointer"
                title="D-Pad Arriba: Cambiar mascota"
                aria-label="Arriba"
              />
              <button 
                type="button"
                onClick={onDpadDown || onSwitchPet} 
                className="w-full h-5 hover:bg-white/20 active:bg-white/40 pointer-events-auto cursor-pointer"
                title="D-Pad Abajo: Cambiar mascota"
                aria-label="Abajo"
              />
            </div>
            {/* Núcleo Central de la Cruceta */}
            <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-black -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Botones Centrales Select / Start: Luz (Dormir) y Abandonar */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={onButtonC}
                className="w-11 h-5 rounded-full bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 border-2 border-black shadow-[2px_2px_0_#000] -rotate-12 flex items-center justify-center text-white cursor-pointer"
                title="Botón Luz / Dormir"
                aria-label="Luz"
              >
                {pet.isSleeping ? <Sun className="w-3 h-3 stroke-[2.5] text-yellow-300" /> : <Moon className="w-3 h-3 stroke-[2.5]" />}
              </button>
              <span className="text-[8px] font-black font-mono tracking-wider text-black mt-1">
                {pet.isSleeping ? "LUZ ON" : "LUZ OFF"}
              </span>
            </div>

            {onAbandonPet && (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setConfirmingAbandon(prev => !prev)}
                  className="w-11 h-5 rounded-full bg-red-600 hover:bg-red-700 active:translate-y-0.5 border-2 border-black shadow-[2px_2px_0_#000] -rotate-12 flex items-center justify-center text-white cursor-pointer"
                  title="Abandonar mascota actual"
                  aria-label="Abandonar"
                >
                  <Trash2 className="w-3 h-3 stroke-[2.5]" />
                </button>
                <span className="text-[8px] font-black font-mono tracking-wider text-black mt-1">
                  ABANDONAR
                </span>
              </div>
            )}
          </div>

          {/* Botones B y A en Ángulo Inclinado (Game Boy Style) */}
          <div className="flex items-center gap-3 rotate-[-18deg] translate-y-[-4px]">
            {/* Botón B: Ejecutar Acción */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={onButtonB}
                className="w-11 h-11 rounded-full bg-[#ef4444] hover:bg-red-600 active:translate-y-1 active:shadow-none border-3 border-black shadow-[3px_3px_0_#000] flex items-center justify-center font-black text-white text-base transition-transform font-mono cursor-pointer"
                title="Botón B: Ejecutar acción seleccionada"
                aria-label="Botón B"
              >
                B
              </button>
              <span className="text-[9px] font-black font-mono tracking-wider text-black">
                ACCIÓN
              </span>
            </div>

            {/* Botón A: Cambiar Opción de Menú */}
            <div className="flex flex-col items-center gap-1 -translate-y-2">
              <button
                type="button"
                onClick={onButtonA}
                className="w-11 h-11 rounded-full bg-[#FFE600] hover:bg-yellow-400 active:translate-y-1 active:shadow-none border-3 border-black shadow-[3px_3px_0_#000] flex items-center justify-center font-black text-black text-base transition-transform font-mono cursor-pointer"
                title="Botón A: Seleccionar opción"
                aria-label="Botón A"
              >
                A
              </button>
              <span className="text-[9px] font-black font-mono tracking-wider text-black">
                OPCIÓN
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
