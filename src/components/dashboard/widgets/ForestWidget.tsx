import { useState } from "react";
import { useTabeGochi } from "@/hooks/useTabeGochi";
import { useForest } from "@/hooks/useForest";
import { 
  TabeGochiDevice, 
  GOTCHI_MENU_OPTIONS, 
  GotchiMenuOptionId 
} from "@/components/tabegochi/TabeGochiDevice";
import { PetAdoptModal } from "@/components/tabegochi/PetAdoptModal";
import { useNavigate, Link } from "react-router-dom";
import { TabeGochiAudio } from "@/lib/tabegochiAudio";
import { TreePine, Sprout, Droplet, ArrowLeft, Sparkles } from "lucide-react";

export function ForestWidget() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pet" | "forest">("pet");
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const { currentPlant, plantNewTree, plantTypes, studyActivity } = useForest();
  const {
    pets,
    activePet,
    feedPet,
    petThePet,
    cleanPet,
    toggleSleep,
    healPet,
    switchPet,
    releasePet,
    adoptPet,
  } = useTabeGochi();

  const [activeMenuIcon, setActiveMenuIcon] = useState<GotchiMenuOptionId>("feed");
  const [actionEffect, setActionEffect] = useState<"feed" | "clean" | "love" | "heal" | null>(null);
  const [selectedSeed] = useState("oak");

  const triggerEffect = (type: "feed" | "clean" | "love" | "heal") => {
    setActionEffect(type);
    setTimeout(() => setActionEffect(null), 1200);
  };

  // Si abandonó su última mascota, mostrar pantalla retro de adopción en el mismo widget
  if (!activePet) {
    return (
      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-[360px] sm:max-w-[380px] bg-emerald-500 border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_#000] flex flex-col items-center overflow-hidden select-none font-mono">
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-black" />
              <span className="text-[10px] font-black uppercase tracking-wider text-black/80">BATTERY</span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-black">
              ★ TABE-GOTCHI ★
            </span>
            <div className="flex gap-1.5 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
            </div>
          </div>

          <div className="w-full bg-[#1e293b]/10 border-3 border-black rounded-2xl p-2.5 shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)]">
            <div className="w-full h-56 rounded-xl border-3 border-black p-4 bg-[#9bbc0f] text-[#0f380f] flex flex-col items-center justify-center text-center gap-3">
              <Sparkles className="w-10 h-10 text-black" />
              <div>
                <p className="font-black text-xs uppercase text-black">SIN MASCOTA ACTIVA</p>
                <p className="text-[10px] font-bold opacity-85 mt-1">
                  Elige una nueva mascota virtual para criar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdoptModal(true)}
                className="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0_#000] text-xs font-black uppercase cursor-pointer"
              >
                [ADOPTAR MASCOTA]
              </button>
            </div>
          </div>

          <PetAdoptModal
            open={showAdoptModal}
            onOpenChange={setShowAdoptModal}
            onAdopt={adoptPet}
          />
        </div>
      </div>
    );
  }

  // Ejecuta una acción concreta del Tabe-Gotchi
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
        TabeGochiAudio.playClick();
        navigate("/tabegochi");
        break;
    }
  };

  // Al tocar directamente un botón del menú superior
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

  // Botón C: Alternar Luz / Dormir
  const handleButtonC = () => {
    TabeGochiAudio.playClick();
    toggleSleep();
  };

  // D-Pad Izquierda: Opción anterior
  const handleDpadLeft = () => {
    TabeGochiAudio.playClick();
    const currentIndex = GOTCHI_MENU_OPTIONS.findIndex(o => o.id === activeMenuIcon);
    const prevIndex = (currentIndex - 1 + GOTCHI_MENU_OPTIONS.length) % GOTCHI_MENU_OPTIONS.length;
    setActiveMenuIcon(GOTCHI_MENU_OPTIONS[prevIndex].id);
  };

  // D-Pad Derecha: Opción siguiente
  const handleDpadRight = () => {
    handleButtonA();
  };

  // D-Pad Arriba / Abajo o clic en nombre: Alternar mascota activa si tiene más de 1
  const handleSwitchPet = () => {
    if (pets.length <= 1) {
      petThePet();
      triggerEffect("love");
      return;
    }
    const currentIndex = pets.findIndex(p => p.id === activePet.id);
    const nextIndex = (currentIndex + 1) % pets.length;
    switchPet(pets[nextIndex].id);
  };

  // Abandonar mascota actual
  const handleAbandonPet = () => {
    const isLast = pets.length <= 1;
    releasePet(activePet.id);
    if (isLast) {
      setTimeout(() => setShowAdoptModal(true), 150);
    }
  };

  if (activeTab === "forest") {
    const plantInfo = currentPlant ? plantTypes.find(p => p.id === currentPlant.plant_type) : null;
    const isGrowing = currentPlant && studyActivity.hasStudiedToday;

    return (
      <div className="relative w-full max-w-[380px] mx-auto bg-emerald-600 border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_#000] flex flex-col items-center select-none font-mono">
        <div className="w-full flex items-center justify-between mb-3 px-1 text-black font-black text-xs uppercase">
          <button
            onClick={() => setActiveTab("pet")}
            className="flex items-center gap-1 bg-white hover:bg-yellow-300 text-black px-2 py-0.5 rounded-lg border-2 border-black shadow-[2px_2px_0_#000] text-[10px] cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3 stroke-[3]" />
            Mascota
          </button>
          <span>★ BOSQUE ESTUDIO ★</span>
          <Link
            to="/bosque"
            className="bg-[#FFE600] text-black px-2 py-0.5 rounded-lg border-2 border-black shadow-[2px_2px_0_#000] text-[10px]"
          >
            Ver Isla
          </Link>
        </div>

        <div className="w-full bg-[#1e293b]/10 border-3 border-black rounded-2xl p-2.5 shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)]">
          <div className="w-full h-56 rounded-xl border-3 border-black p-3 bg-[#9bbc0f] text-[#0f380f] flex flex-col justify-between font-mono lcd-dotmatrix relative">
            <div className="flex justify-between items-start">
              <span className="font-black text-xs uppercase">Árbol en Crecimiento</span>
              {currentPlant && (
                <span className="font-black text-xs">{currentPlant.growth_percentage}%</span>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {!currentPlant ? (
                <div className="text-center animate-bounce">
                  <Sprout className="w-12 h-12 mx-auto text-[#0f380f] mb-1" />
                  <p className="font-black text-xs uppercase">Selecciona Semilla</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-1 flex items-center justify-center">
                    {currentPlant.growth_percentage < 25 ? (
                      <Sprout className="w-10 h-10 text-emerald-900" />
                    ) : (
                      <TreePine className="w-12 h-12 text-emerald-950" />
                    )}
                  </div>
                  <p className="font-black text-xs uppercase">{plantInfo?.name || "Brote"}</p>
                  {isGrowing && (
                    <div className="flex items-center justify-center gap-1 text-[10px] font-black text-blue-900 mt-1">
                      <Droplet className="w-3 h-3 fill-current" />
                      <span>Regado hoy</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t-2 border-black/25 pt-1 flex justify-between items-center text-[10px] font-black uppercase">
              <span>{currentPlant ? 'Creciendo con estudio' : 'Listo para plantar'}</span>
              <span>{studyActivity.studyMinutesToday} MIN HOY</span>
            </div>
          </div>
        </div>

        <div className="w-full flex items-center justify-between mt-4 px-2">
          {!currentPlant ? (
            <button
              onClick={() => plantNewTree(selectedSeed)}
              className="bg-[#ef4444] text-white border-2 border-black rounded-xl px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0_#000] w-full cursor-pointer"
            >
              Plantar Semilla
            </button>
          ) : (
            <Link
              to="/bosque"
              className="bg-white hover:bg-yellow-300 text-black border-2 border-black rounded-xl px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0_#000] text-center w-full"
            >
              Ir al Bosque Completo
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
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
        onDpadUp={handleSwitchPet}
        onDpadDown={handleSwitchPet}
        onSelectOption={handleSelectOption}
        onSwitchPet={handleSwitchPet}
        onAbandonPet={handleAbandonPet}
        totalPets={pets.length}
        activeMenuIcon={activeMenuIcon}
        actionEffect={actionEffect}
        onToggleForest={() => setActiveTab("forest")}
      />
      <PetAdoptModal
        open={showAdoptModal}
        onOpenChange={setShowAdoptModal}
        onAdopt={adoptPet}
      />
    </div>
  );
}
