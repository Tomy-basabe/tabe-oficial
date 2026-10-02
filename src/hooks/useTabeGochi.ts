import { useState, useEffect, useCallback, useRef } from "react";
import { 
  TabeGochiPet, 
  PetSpecies, 
  FOOD_MENU, 
  ACCESSORIES_SHOP,
  PET_SPECIES_LIST 
} from "@/types/tabegochi";
import { TabeGochiAudio } from "@/lib/tabegochiAudio";
import { toast } from "sonner";

const STORAGE_KEY_PETS = "tabe_gochi_pets_v1";
const STORAGE_KEY_ACTIVE = "tabe_gochi_active_pet_id_v1";
const STORAGE_KEY_COINS = "tabe_gochi_coins_v1";
const STORAGE_KEY_INVENTORY = "tabe_gochi_inventory_v1";

function createDefaultPet(name: string, species: PetSpecies): TabeGochiPet {
  return {
    id: `pet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Michi",
    species,
    stage: "baby",
    level: 1,
    xp: 0,
    ageDays: 1,
    hunger: 80,
    happiness: 85,
    energy: 90,
    hygiene: 95,
    health: 100,
    isSleeping: false,
    isSick: false,
    poopCount: 0,
    hat: undefined,
    background: "room",
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };
}

export function useTabeGochi() {
  const [pets, setPets] = useState<TabeGochiPet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PETS);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default starter pet
    return [createDefaultPet("Michi", "cat")];
  });

  const [activePetId, setActivePetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (saved) return saved;
    } catch {}
    return pets[0]?.id || "";
  });

  const [coins, setCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COINS);
      if (saved) return Number(saved);
    } catch {}
    return 50; // Starter coins
  });

  const [inventory, setInventory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["apple", "room"];
  });

  // Ensure active pet id is valid
  useEffect(() => {
    if (!pets.some(p => p.id === activePetId) && pets.length > 0) {
      setActivePetId(pets[0].id);
    }
  }, [pets, activePetId]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PETS, JSON.stringify(pets));
    } catch {}
  }, [pets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activePetId);
    } catch {}
  }, [activePetId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COINS, String(coins));
    } catch {}
  }, [coins]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
    } catch {}
  }, [inventory]);

  const activePet = pets.find(p => p.id === activePetId) || pets[0] || null;

  // Helper to update active pet
  const updateActivePet = useCallback((updater: (prev: TabeGochiPet) => TabeGochiPet) => {
    if (!activePetId) return;
    setPets(prevPets =>
      prevPets.map(p => {
        if (p.id !== activePetId) return p;
        const updated = updater(p);
        updated.lastUpdated = Date.now();
        return updated;
      })
    );
  }, [activePetId]);

  // Natural passive stat decay & age ticker every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPets(prevPets =>
        prevPets.map(pet => {
          let { hunger, happiness, energy, hygiene, health, poopCount, isSleeping, isSick, xp, level, stage } = pet;

          if (isSleeping) {
            // While sleeping: energy regenerates, hunger drops slowly
            energy = Math.min(100, energy + 8);
            hunger = Math.max(0, hunger - 1);
            if (energy >= 100) {
              isSleeping = false; // Wake up when fully refreshed!
            }
          } else {
            // While awake: natural slow decay
            hunger = Math.max(0, hunger - 2);
            happiness = Math.max(0, happiness - 2);
            energy = Math.max(0, energy - 1.5);
            hygiene = Math.max(0, hygiene - 1.5);
          }

          // Random chance of poop if full & awake
          if (!isSleeping && hunger > 30 && Math.random() < 0.15 && poopCount < 4) {
            poopCount = Math.min(4, poopCount + 1);
            hygiene = Math.max(0, hygiene - 15);
          }

          // Health check: poor hygiene or extreme hunger can cause sickness
          if ((hygiene < 20 || hunger < 15 || poopCount >= 3) && !isSick && Math.random() < 0.25) {
            isSick = true;
          }

          if (isSick) {
            health = Math.max(10, health - 5);
            happiness = Math.max(0, happiness - 5);
          } else {
            health = Math.min(100, health + 2);
          }

          // Evolution check based on level
          if (level >= 10 && stage !== "legendary") stage = "legendary";
          else if (level >= 6 && stage !== "adult" && stage !== "legendary") stage = "adult";
          else if (level >= 3 && stage === "baby") stage = "child";

          return {
            ...pet,
            hunger: Math.round(hunger),
            happiness: Math.round(happiness),
            energy: Math.round(energy),
            hygiene: Math.round(hygiene),
            health: Math.round(health),
            poopCount,
            isSleeping,
            isSick,
            stage,
            lastUpdated: Date.now(),
          };
        })
      );
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Ref para cooldowns anti-spam por acción en memoria/sesión
  const lastActionTimes = useRef<Record<string, number>>({});

  const checkActionCooldown = (actionKey: string, cooldownMs: number = 700): boolean => {
    const now = Date.now();
    const last = lastActionTimes.current[actionKey] || 0;
    if (now - last < cooldownMs) {
      return false;
    }
    lastActionTimes.current[actionKey] = now;
    return true;
  };

  // Action: Feed (Alimentar)
  const feedPet = (foodId: string) => {
    if (!activePet) return;
    if (!checkActionCooldown("feed", 700)) return;

    if (activePet.isSleeping) {
      toast.error(`¡${activePet.name} está durmiendo! Despiértalo primero.`);
      return;
    }

    const food = FOOD_MENU.find(f => f.id === foodId);
    if (!food) return;

    if (activePet.hunger >= 100) {
      toast.info(`¡${activePet.name} ya está al 100% de saciedad! (+0 Monedas)`);
      TabeGochiAudio.playClick();
      return;
    }

    TabeGochiAudio.playEat();

    // Regla estricta: Solo otorga monedas y XP si el hambre estaba por debajo del 95%
    const neededFeeding = activePet.hunger < 95;
    const coinsReward = neededFeeding ? 2 : 0;
    const xpReward = neededFeeding ? 10 : 0;

    updateActivePet(p => {
      const newHunger = Math.min(100, p.hunger + food.hungerBoost);
      const newHappiness = Math.min(100, p.happiness + food.happinessBoost);
      const newXp = p.xp + xpReward;
      let newLevel = p.level;
      let newStage = p.stage;

      // Level up formula: cada 100 XP
      if (newXp >= p.level * 100 && xpReward > 0) {
        newLevel += 1;
        TabeGochiAudio.playLevelUp();
        toast.success(`🎉 ¡${p.name} subió al Nivel ${newLevel}!`);
      }

      if (newLevel >= 10 && newStage !== "legendary") newStage = "legendary";
      else if (newLevel >= 6 && newStage !== "adult" && newStage !== "legendary") newStage = "adult";
      else if (newLevel >= 3 && newStage === "baby") newStage = "child";

      return {
        ...p,
        hunger: newHunger,
        happiness: newHappiness,
        xp: newXp,
        level: newLevel,
        stage: newStage,
      };
    });

    if (coinsReward > 0) {
      setCoins(c => c + coinsReward);
      toast.success(`Le diste ${food.name} a ${activePet.name} (+${food.hungerBoost}% Saciedad, +${coinsReward} Monedas)`);
    } else {
      toast.info(`Le diste un bocadillo a ${activePet.name}. Como ya estaba satisfecho, no genera monedas extra (+0 Monedas)`);
    }
  };

  // Action: Pet (Acariciar / Mimar)
  const petThePet = () => {
    if (!activePet) return;
    if (!checkActionCooldown("pet", 500)) return;

    if (activePet.isSleeping) {
      toast.info(`¡${activePet.name} duerme plácidamente!`);
      return;
    }

    TabeGochiAudio.playHappy();

    // Solo da XP si el ánimo/felicidad requería atención real (< 95%)
    const neededHappiness = activePet.happiness < 95;
    const xpReward = neededHappiness ? 5 : 0;

    updateActivePet(p => {
      const newHappiness = Math.min(100, p.happiness + 12);
      const newXp = p.xp + xpReward;
      let newLevel = p.level;
      if (newXp >= p.level * 100 && xpReward > 0) {
        newLevel += 1;
        TabeGochiAudio.playLevelUp();
      }
      return {
        ...p,
        happiness: newHappiness,
        xp: newXp,
        level: newLevel,
      };
    });
  };

  // Action: Clean (Bañar y limpiar caquitas)
  const cleanPet = () => {
    if (!activePet) return;
    if (!checkActionCooldown("clean", 700)) return;

    TabeGochiAudio.playClean();

    // Regla estricta: Solo otorga monedas si la higiene estaba baja (< 95%) o había caquitas reales
    const neededCleaning = activePet.hygiene < 95 || activePet.poopCount > 0;
    const coinsReward = neededCleaning ? 5 : 0;
    const xpReward = neededCleaning ? 15 : 0;

    updateActivePet(p => {
      const newXp = p.xp + xpReward;
      let newLevel = p.level;
      if (newXp >= p.level * 100 && xpReward > 0) {
        newLevel += 1;
        TabeGochiAudio.playLevelUp();
      }
      return {
        ...p,
        hygiene: 100,
        poopCount: 0,
        happiness: Math.min(100, p.happiness + (neededCleaning ? 15 : 2)),
        xp: newXp,
        level: newLevel,
      };
    });

    if (coinsReward > 0) {
      setCoins(c => c + coinsReward);
      toast.success(`¡Dejaste a ${activePet.name} reluciente y sin suciedad! (+${coinsReward} Monedas, +${xpReward} XP)`);
    } else {
      toast.info(`¡${activePet.name} ya estaba reluciente de limpio! (+0 Monedas)`);
    }
  };

  // Action: Toggle Sleep (Dormir / Despertar)
  const toggleSleep = () => {
    if (!activePet) return;
    if (!checkActionCooldown("sleep", 700)) return;

    const willSleep = !activePet.isSleeping;

    if (willSleep) {
      TabeGochiAudio.playSleep();
      toast.info(`Apagaste la luz. ${activePet.name} se fue a dormir...`);
    } else {
      TabeGochiAudio.playHappy();
      toast.success(`¡Encendiste la luz! ${activePet.name} se despertó.`);
    }

    updateActivePet(p => ({
      ...p,
      isSleeping: willSleep,
      energy: willSleep ? p.energy : Math.max(p.energy, 40),
    }));
  };

  // Action: Heal (Medicar si está enfermo)
  const healPet = () => {
    if (!activePet) return;
    if (!checkActionCooldown("heal", 700)) return;

    if (!activePet.isSick) {
      toast.info(`¡${activePet.name} está en perfecto estado de salud! (+0 Monedas)`);
      TabeGochiAudio.playClick();
      return;
    }

    TabeGochiAudio.playHeal();
    const xpReward = 20;
    const coinsReward = 5;

    setCoins(c => c + coinsReward);

    updateActivePet(p => {
      const newXp = p.xp + xpReward;
      let newLevel = p.level;
      if (newXp >= p.level * 100) {
        newLevel += 1;
        TabeGochiAudio.playLevelUp();
      }
      return {
        ...p,
        isSick: false,
        health: 100,
        happiness: Math.min(100, p.happiness + 20),
        xp: newXp,
        level: newLevel,
      };
    });

    toast.success(`Le diste su medicina a ${activePet.name}. ¡Completamente curado! (+5 Monedas, +20 XP)`);
  };

  // Action: Adopt new pet
  const adoptPet = (name: string, species: PetSpecies) => {
    const newPet = createDefaultPet(name, species);
    setPets(prev => [...prev, newPet]);
    setActivePetId(newPet.id);
    TabeGochiAudio.playLevelUp();
    toast.success(`🥚 ¡Adoptaste a ${newPet.name}! Cuídalo para verlo crecer.`);
    return newPet;
  };

  // Action: Switch active pet
  const switchPet = (petId: string) => {
    if (pets.some(p => p.id === petId)) {
      setActivePetId(petId);
      TabeGochiAudio.playClick();
      const target = pets.find(p => p.id === petId);
      if (target) {
        toast.info(`Ahora estás cuidando a ${target.name}.`);
      }
    }
  };

  // Action: Release / Abandon pet (permite abandonar incluso la única mascota para adoptar otra)
  const releasePet = (petId: string) => {
    const toRemove = pets.find(p => p.id === petId);
    const remaining = pets.filter(p => p.id !== petId);
    setPets(remaining);
    if (activePetId === petId) {
      setActivePetId(remaining.length > 0 ? remaining[0].id : "");
    }
    TabeGochiAudio.playClick();
    toast.info(`Liberaste a ${toRemove?.name || "tu mascota"}. Puedes adoptar una nueva en cualquier momento.`);
  };

  // Action: Buy item
  const buyItem = (item: { id: string; cost: number; name: string }) => {
    if (inventory.includes(item.id)) {
      toast.info(`Ya tienes ${item.name} en tu inventario.`);
      return false;
    }
    if (coins < item.cost) {
      toast.error(`Monedas insuficientes. Necesitas ${item.cost} TabeCoins.`);
      return false;
    }

    setCoins(c => c - item.cost);
    setInventory(inv => [...inv, item.id]);
    TabeGochiAudio.playCoin();
    toast.success(`¡Compraste ${item.name}!`);
    return true;
  };

  // Action: Equip hat / outfit / held / aura / skin / background
  const equipItem = (type: "hat" | "outfit" | "held" | "aura" | "skin" | "bg", itemId?: string) => {
    if (!activePet) return;
    TabeGochiAudio.playClick();

    updateActivePet(p => {
      switch (type) {
        case "hat":
          return { ...p, hat: p.hat === itemId ? undefined : itemId };
        case "outfit":
          return { ...p, outfit: p.outfit === itemId ? undefined : itemId };
        case "held":
          return { ...p, heldItem: p.heldItem === itemId ? undefined : itemId };
        case "aura":
          return { ...p, aura: p.aura === itemId ? undefined : itemId };
        case "skin":
          return { ...p, colorSkin: p.colorSkin === itemId ? undefined : itemId };
        case "bg":
        default:
          return { ...p, background: itemId || "room" };
      }
    });

    toast.success(itemId ? "¡Personalización equipada!" : "Prenda desequipada.");
  };

  // Action: Record minigame outcome
  const recordMiniGame = (won: boolean, coinsReward: number, xpReward: number) => {
    if (!activePet) return;

    if (won) {
      TabeGochiAudio.playHappy();
      setCoins(c => c + coinsReward);
    } else {
      TabeGochiAudio.playClick();
      setCoins(c => c + Math.floor(coinsReward / 2));
    }

    updateActivePet(p => {
      const newHappiness = Math.min(100, p.happiness + (won ? 25 : 10));
      const newEnergy = Math.max(0, p.energy - 8);
      const newXp = p.xp + xpReward;
      let newLevel = p.level;
      if (newXp >= p.level * 100) {
        newLevel += 1;
        TabeGochiAudio.playLevelUp();
      }

      return {
        ...p,
        happiness: newHappiness,
        energy: newEnergy,
        xp: newXp,
        level: newLevel,
      };
    });
  };

  return {
    pets,
    activePet,
    coins,
    inventory,
    feedPet,
    petThePet,
    petPet: petThePet,
    cleanPet,
    cleanPoop: cleanPet,
    toggleSleep,
    healPet,
    adoptPet,
    switchPet,
    releasePet,
    buyItem,
    equipItem,
    recordMiniGame,
  };
}
