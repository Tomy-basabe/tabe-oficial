import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTabeGochi } from "@/hooks/useTabeGochi";
import { TabeGochiDevice, GOTCHI_MENU_OPTIONS, GotchiMenuOptionId } from "@/components/tabegochi/TabeGochiDevice";
import { PetAdoptModal } from "@/components/tabegochi/PetAdoptModal";
import { PetShopModal } from "@/components/tabegochi/PetShopModal";
import { PetMiniGamesModal } from "@/components/tabegochi/PetMiniGamesModal";
import { PetStatsModal } from "@/components/tabegochi/PetStatsModal";
import { PixelPetSprite } from "@/components/tabegochi/PixelPetSprite";
import { TabeGochiAudio } from "@/lib/tabegochiAudio";
import { Button } from "@/components/ui/button";
import { 
  Gamepad2, 
  Coins, 
  Plus, 
  Volume2, 
  VolumeX, 
  Store, 
  BarChart3, 
  ArrowLeft, 
  Sparkles,
  Heart,
  Utensils,
  Moon,
  Sun,
  ShowerHead,
  Stethoscope,
  Info,
  Zap,
  Trash2,
  RefreshCw,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TabeGochi() {
  const navigate = useNavigate();

  // Asegurar que el título de la pestaña del navegador figure exactamente como TABE-GOTCHI | TABE
  useEffect(() => {
    document.title = "TABE-GOTCHI | TABE";
  }, []);

  const {
    pets,
    activePet,
    coins,
    inventory,
    feedPet,
    petThePet,
    cleanPet,
    toggleSleep,
    healPet,
    adoptPet,
    switchPet,
    releasePet,
    buyItem,
    equipItem,
    recordMiniGame,
  } = useTabeGochi();

  // Sincronizar estado vital de la mascota a IndexedDB para recordatorios en segundo plano con app cerrada
  useEffect(() => {
    if (!activePet) return;
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        const request = indexedDB.open("tabe_alarms_db", 1);
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("alarms")) return;
          const tx = db.transaction("alarms", "readwrite");
          const store = tx.objectStore("alarms");
          store.put({
            id: "pet_reminder",
            petName: activePet.name,
            hunger: activePet.hunger,
            health: activePet.health,
            isSick: !!activePet.isSick,
            isDead: !!activePet.isDead,
            lastUpdated: activePet.lastUpdated,
            hour: 9,
            enabled: true,
            lastSentDate: null,
          });
        };
      }
    } catch (_) {}
  }, [activePet?.lastUpdated, activePet?.health, activePet?.hunger, activePet?.isDead, activePet?.isSick]);

  // Modals state
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showMiniGamesModal, setShowMiniGamesModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isMuted, setIsMuted] = useState(!TabeGochiAudio.isEnabled());

  // Interactive device state
  const [actionEffect, setActionEffect] = useState<"feed" | "clean" | "love" | "heal" | null>(null);
  const [activeMenuIcon, setActiveMenuIcon] = useState<GotchiMenuOptionId>("feed");

  const triggerEffect = (type: "feed" | "clean" | "love" | "heal") => {
    setActionEffect(type);
    setTimeout(() => setActionEffect(null), 1200);
  };

  const handleToggleSound = () => {
    const enabled = TabeGochiAudio.toggleSound();
    setIsMuted(!enabled);
    toast.info(enabled ? "Sonidos activados" : "Sonidos silenciados");
  };

  // Ejecuta una acción concreta
  const executeAction = (actionId: GotchiMenuOptionId) => {
    switch (actionId) {
      case "feed":
        feedPet("apple");
        triggerEffect("feed");
        break;
      case "love":
        petThePet();
        triggerEffect("love");
        break;
      case "clean":
        cleanPet();
        triggerEffect("clean");
        break;
      case "heal":
        healPet();
        triggerEffect("heal");
        break;
      case "play":
        setShowMiniGamesModal(true);
        break;
    }
  };

  // Abandonar mascota actual y abrir selector si era la última
  const handleAbandonCurrentPet = () => {
    if (!activePet) return;
    const isLast = pets.length <= 1;
    releasePet(activePet.id);
    if (isLast) {
      setTimeout(() => setShowAdoptModal(true), 150);
    }
  };

  // Seleccionar directamente desde el menú superior táctil
  const handleSelectOption = (optionId: GotchiMenuOptionId) => {
    TabeGochiAudio.playClick();
    setActiveMenuIcon(optionId);
    executeAction(optionId);
  };

  // Botón A: Siguiente opción en la tira superior
  const handleButtonA = () => {
    TabeGochiAudio.playClick();
    const currentIndex = GOTCHI_MENU_OPTIONS.findIndex(o => o.id === activeMenuIcon);
    const nextIndex = (currentIndex + 1) % GOTCHI_MENU_OPTIONS.length;
    setActiveMenuIcon(GOTCHI_MENU_OPTIONS[nextIndex].id);
  };

  // Botón B: Ejecutar la opción resaltada
  const handleButtonB = () => {
    executeAction(activeMenuIcon);
  };

  // Botón C: Alternar Luz
  const handleButtonC = () => {
    TabeGochiAudio.playClick();
    toggleSleep();
  };

  // D-Pad Izquierda / Derecha
  const handleDpadLeft = () => {
    TabeGochiAudio.playClick();
    const currentIndex = GOTCHI_MENU_OPTIONS.findIndex(o => o.id === activeMenuIcon);
    const prevIndex = (currentIndex - 1 + GOTCHI_MENU_OPTIONS.length) % GOTCHI_MENU_OPTIONS.length;
    setActiveMenuIcon(GOTCHI_MENU_OPTIONS[prevIndex].id);
  };

  const handleDpadRight = () => {
    handleButtonA();
  };

  // Cambiar mascota activa
  const handleSwitchPetCycle = () => {
    if (pets.length <= 1) return;
    const currentIndex = pets.findIndex(p => p.id === activePet?.id);
    const nextIndex = (currentIndex + 1) % pets.length;
    switchPet(pets[nextIndex].id);
  };

  if (!activePet) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 text-center select-none">
        <div className="p-8 bg-card border-4 border-black rounded-3xl shadow-[8px_8px_0px_#000] max-w-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE600] border-3 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000]">
            <Sparkles className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-2xl font-black uppercase font-mono">No tienes mascota activa</h2>
          <p className="text-xs text-muted-foreground font-bold">
            Puedes adoptar a tu nuevo compañero virtual 2D retro eligiendo entre 6 especies únicas.
          </p>
          <Button
            onClick={() => setShowAdoptModal(true)}
            className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase border-3 border-black shadow-[3px_3px_0px_#000] rounded-xl h-11 px-6 w-full"
          >
            Adoptar Mascota
          </Button>
          <PetAdoptModal
            open={showAdoptModal}
            onOpenChange={setShowAdoptModal}
            onAdopt={adoptPet}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6 space-y-6 pb-28 select-none">
      
      {/* Barra Superior con Controles y Monedas (Sin Emojis) */}
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Título y Botón Atrás */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="border-2 border-black rounded-xl font-black uppercase text-xs h-10 shadow-[2px_2px_0px_#000]"
          >
            <ArrowLeft className="w-4 h-4 mr-1 stroke-[3]" />
            Dashboard
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider font-mono">
                TABE GOTCHI
              </h1>
              <span className="text-[10px] bg-black text-[#FFE600] px-2 py-0.5 rounded font-black font-mono border border-black">
                RETRO 2D
              </span>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase font-mono">
              Consola Virtual de Bolsillo
            </p>
          </div>
        </div>

        {/* Monedas, Sonido y Adopción */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
          {/* Monedas sin emojis */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border-2 border-black shadow-[2px_2px_0px_#000] font-black text-xs font-mono">
            <div className="w-4 h-4 rounded-full bg-[#FFE600] border border-black flex items-center justify-center text-[10px] text-black font-black">
              $
            </div>
            <span>{coins} TABECOINS</span>
          </div>

          {/* Botón Silencio */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleSound}
            className="w-10 h-10 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000]"
            title={isMuted ? "Activar sonido" : "Silenciar sonido"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
          </Button>

          {/* Botón Adoptar */}
          <Button
            onClick={() => setShowAdoptModal(true)}
            className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] h-10 px-3.5 gap-1.5 font-mono"
          >
            <UserPlus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Adoptar Otra</span>
            <span className="sm:hidden">Adoptar</span>
          </Button>
        </div>
      </div>

      {/* Selector de Mascotas Activas si tiene más de 1 (Sin Emojis ni Scrollbar) */}
      {pets.length > 1 && (
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-2 py-1">
          {pets.map(p => {
            const isSelected = p.id === activePet.id;
            return (
              <button
                key={p.id}
                onClick={() => switchPet(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border-2 border-black font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_#000] font-mono",
                  isSelected ? "bg-[#FFE600] text-black scale-105" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <PixelPetSprite species={p.species} hat={p.hat} outfit={p.outfit} size={22} />
                </div>
                <span>{p.name}</span>
                <span className="text-[10px] opacity-75">NV.{p.level}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Contenedor Principal: Dispositivo Tamagotchi & Panel de Cuidado */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Columna Izquierda: El Dispositivo Tamagotchi */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <TabeGochiDevice
            pet={activePet}
            onPetClick={() => {
              petThePet();
              triggerEffect("love");
            }}
            onButtonA={handleButtonA}
            onButtonB={handleButtonB}
            onButtonC={handleButtonC}
            onDpadLeft={handleDpadLeft}
            onDpadRight={handleDpadRight}
            onDpadUp={handleSwitchPetCycle}
            onDpadDown={handleSwitchPetCycle}
            onSelectOption={handleSelectOption}
            onSwitchPet={handleSwitchPetCycle}
            onAbandonPet={handleAbandonCurrentPet}
            totalPets={pets.length}
            activeMenuIcon={activeMenuIcon}
            actionEffect={actionEffect}
          />
        </div>

        {/* Columna Derecha: Panel de Acciones Rápidas & Estado */}
        <div className="md:col-span-6 space-y-4">
          
          {/* Card Resumen de la Mascota */}
          <div className="p-5 rounded-3xl bg-card border-3 border-black shadow-[5px_5px_0px_#000] space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-3">
              <div>
                <h3 className="text-xl font-black uppercase text-foreground flex items-center gap-2 font-mono">
                  {activePet.name}
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#FFE600] text-black border border-black font-black">
                    NV.{activePet.level}
                  </span>
                </h3>
                <p className="text-xs font-bold text-muted-foreground uppercase font-mono">
                  {activePet.stage === "baby" ? "Etapa Cría Bebé" : activePet.stage === "child" ? "Etapa Joven" : activePet.stage === "adult" ? "Etapa Adulto" : "Etapa Mítico"}
                </p>
              </div>

              <div className="text-right text-xs font-bold">
                <span className="text-muted-foreground block text-[10px] font-mono">EXPERIENCIA</span>
                <span className="font-mono font-black">{activePet.xp % 100} / 100 XP</span>
              </div>
            </div>

            {/* Micro barras de estado sin emojis */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold font-mono">
              <div className="p-2 rounded-xl bg-muted/40 border border-black/30 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Utensils className="w-3.5 h-3.5 text-amber-500" />
                  <span>Saciedad:</span>
                </span>
                <span className={cn(activePet.hunger < 25 && "text-red-500 font-black")}>{activePet.hunger}%</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-black/30 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                  <span>Felicidad:</span>
                </span>
                <span className={cn(activePet.happiness < 25 && "text-red-500 font-black")}>{activePet.happiness}%</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-black/30 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500" />
                  <span>Energía:</span>
                </span>
                <span className={cn(activePet.energy < 25 && "text-amber-500 font-black")}>{activePet.energy}%</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-black/30 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShowerHead className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Higiene:</span>
                </span>
                <span className={cn(activePet.hygiene < 25 && "text-amber-500 font-black")}>{activePet.hygiene}%</span>
              </div>
            </div>
          </div>

          {/* Grilla de Acciones Rápidas (Sin Dormir duplicado, incluye Abandonar) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            
            {/* 1. Alimentar */}
            <Button
              onClick={() => {
                feedPet("apple");
                triggerEffect("feed");
              }}
              className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-14 flex flex-col items-center justify-center gap-1 font-mono"
            >
              <Utensils className="w-4 h-4 stroke-[2.5]" />
              <span>Alimentar</span>
            </Button>

            {/* 2. Jugar Minijuegos */}
            <Button
              onClick={() => setShowMiniGamesModal(true)}
              className="bg-[#FF2E93] hover:bg-pink-600 text-white font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-14 flex flex-col items-center justify-center gap-1 font-mono"
            >
              <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
              <span>Minijuegos</span>
            </Button>

            {/* 3. Bañar / Limpiar */}
            <Button
              onClick={() => {
                cleanPet();
                triggerEffect("clean");
              }}
              className="bg-[#00E5FF] hover:bg-cyan-400 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-14 flex flex-col items-center justify-center gap-1 font-mono"
            >
              <ShowerHead className="w-4 h-4 stroke-[2.5]" />
              <span>Bañar</span>
            </Button>

            {/* 4. Acariciar */}
            <Button
              onClick={() => {
                petThePet();
                triggerEffect("love");
              }}
              className="bg-[#FF70A6] hover:bg-pink-400 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-14 flex flex-col items-center justify-center gap-1 font-mono"
            >
              <Heart className="w-4 h-4 stroke-[2.5] fill-black" />
              <span>Acariciar</span>
            </Button>

            {/* 5. Curar si está enfermo */}
            <Button
              onClick={() => {
                healPet();
                triggerEffect("heal");
              }}
              className={cn(
                "font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-14 flex flex-col items-center justify-center gap-1 font-mono",
                activePet.isSick 
                  ? "bg-[#FF5C5C] text-white animate-bounce" 
                  : "bg-card text-foreground hover:bg-muted"
              )}
            >
              <Stethoscope className="w-4 h-4 stroke-[2.5]" />
              <span>{activePet.isSick ? "Curar Salud" : "Medicina"}</span>
            </Button>

            {/* 6. Abandonar Mascota */}
            <Button
              onClick={handleAbandonCurrentPet}
              className="bg-[#ef4444] hover:bg-red-600 text-white font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-14 flex flex-col items-center justify-center gap-1 font-mono"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>Abandonar</span>
            </Button>

          </div>

          {/* Botones secundarios: Tienda y Ficha */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              onClick={() => setShowShopModal(true)}
              className="bg-card hover:bg-muted text-foreground font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] h-11 gap-2 font-mono"
            >
              <Store className="w-4 h-4" />
              Boutique Retro
            </Button>

            <Button
              onClick={() => setShowStatsModal(true)}
              className="bg-card hover:bg-muted text-foreground font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] h-11 gap-2 font-mono"
            >
              <BarChart3 className="w-4 h-4" />
              Ficha & Gestión
            </Button>
          </div>
        </div>
      </div>

      {/* Modales del Sistema Tabe Gotchi */}
      <PetAdoptModal
        open={showAdoptModal}
        onOpenChange={setShowAdoptModal}
        onAdopt={adoptPet}
      />

      <PetShopModal
        open={showShopModal}
        onOpenChange={setShowShopModal}
        coins={coins}
        inventory={inventory}
        activePet={activePet}
        onBuyItem={buyItem}
        onEquipItem={equipItem}
        onFeedPet={feedPet}
      />

      <PetMiniGamesModal
        open={showMiniGamesModal}
        onOpenChange={setShowMiniGamesModal}
        pet={activePet}
        onRecordResult={recordMiniGame}
      />

      <PetStatsModal
        open={showStatsModal}
        onOpenChange={setShowStatsModal}
        pet={activePet}
        allPets={pets}
        onSwitchPet={switchPet}
        onReleasePet={releasePet}
        onAdoptNew={() => setShowAdoptModal(true)}
      />
    </div>
  );
}
