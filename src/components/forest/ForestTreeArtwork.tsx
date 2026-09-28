import { PLANT_TYPES } from "@/hooks/forestPlantsData";
import React from "react";
import { cn } from "@/lib/utils";

export type TreeStage = "seed" | "sprout" | "sapling" | "young" | "full" | "dead";

export function getTreeStage(growth: number, isAlive: boolean): TreeStage {
  if (!isAlive) return "dead";
  if (growth < 15) return "seed";
  if (growth < 35) return "sprout";
  if (growth < 65) return "sapling";
  if (growth < 90) return "young";
  return "full";
}

export function getStageLabel(stage: TreeStage): string {
  switch (stage) {
    case "seed":
      return "Semilla Mágica";
    case "sprout":
      return "Brote Tierno";
    case "sapling":
      return "Plántula Vigorosa";
    case "young":
      return "Árbol Joven";
    case "full":
      return "Árbol Majestuoso";
    case "dead":
      return "Árbol Seco";
  }
}

interface ForestTreeArtworkProps {
  species?: string;
  stage?: TreeStage;
  growth?: number;
  isAlive?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  animated?: boolean;
}

export const ForestTreeArtwork: React.FC<ForestTreeArtworkProps> = ({
  species = "oak",
  stage: stageProp,
  growth = 100,
  isAlive = true,
  className,
  size = "md",
  animated = true,
}) => {
  const stage = stageProp || getTreeStage(growth, isAlive);

  const sizeClasses = {
    sm: "w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14",
    md: "w-14 h-14 sm:w-16 sm:h-16",
    lg: "w-24 h-24",
    xl: "w-36 h-36",
    hero: "w-52 h-52 sm:w-64 sm:h-64",
  }[size];

  // 1. DEAD / WITHERED TREE
  if (stage === "dead") {
    return (
      <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soil Base */}
          <ellipse cx="60" cy="102" rx="42" ry="12" fill="#4B382A" stroke="#000" strokeWidth="3" />
          <ellipse cx="60" cy="100" rx="36" ry="8" fill="#6B4F3B" />
          <ellipse cx="60" cy="98" rx="20" ry="4" fill="#8B6950" />
          
          {/* Dead Dry Trunk */}
          <path
            d="M54 100 C54 85 50 68 44 54 C42 50 34 42 28 44 C26 44 26 41 29 39 C36 35 44 46 47 52 C51 44 55 32 52 20 C51 17 55 17 56 19 C60 28 58 40 56 50 C62 46 72 38 78 30 C80 27 83 29 81 32 C76 40 68 48 62 55 C65 65 67 85 68 100 Z"
            fill="#4A4E69"
            stroke="#000"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Trunk crack texture */}
          <path d="M56 70 L52 82 L55 92" stroke="#22223B" strokeWidth="2" strokeLinecap="round" />
          <path d="M60 62 L63 74 L60 80" stroke="#22223B" strokeWidth="2" strokeLinecap="round" />

          {/* Little Comic Skull */}
          <g transform="translate(68, 58) scale(0.7)">
            <ellipse cx="14" cy="14" rx="10" ry="9" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <circle cx="10" cy="13" r="2.2" fill="#000" />
            <circle cx="18" cy="13" r="2.2" fill="#000" />
            <path d="M12 20 L16 20" stroke="#000" strokeWidth="2" />
          </g>

          {/* Fallen dry leaf */}
          <path d="M35 102 C30 100 28 97 32 95 C36 93 39 96 35 102 Z" fill="#9A8C98" stroke="#000" strokeWidth="1.5" />
          <path d="M85 104 C90 102 93 99 89 97 C85 95 82 98 85 104 Z" fill="#9A8C98" stroke="#000" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // 2. SEED STAGE (0-14%)
  if (stage === "seed") {
    return (
      <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soil Mound */}
          <ellipse cx="60" cy="98" rx="44" ry="14" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
          <path d="M22 96 C26 80 44 72 60 72 C76 72 94 80 98 96 Z" fill="#784E38" stroke="#000" strokeWidth="3" />
          
          {/* Soil highlights */}
          <ellipse cx="60" cy="80" rx="24" ry="6" fill="#8D5B4C" />
          <circle cx="42" cy="88" r="3" fill="#3D261C" />
          <circle cx="78" cy="86" r="2.5" fill="#3D261C" />
          <circle cx="56" cy="92" r="2" fill="#3D261C" />

          {/* Glowing Golden Comic Seed */}
          <g className={animated ? "animate-bounce" : ""}>
            <ellipse cx="60" cy="62" rx="14" ry="18" fill="#FBBF24" stroke="#000" strokeWidth="3" transform="rotate(-15 60 62)" />
            <ellipse cx="58" cy="58" rx="5" ry="10" fill="#FEF08A" transform="rotate(-25 58 58)" />
            
            {/* Comic sparkle */}
            <path d="M60 38 L62 44 L68 46 L62 48 L60 54 L58 48 L52 46 L58 44 Z" fill="#FFF" stroke="#000" strokeWidth="1.5" />
            <path d="M78 52 L79 55 L82 56 L79 57 L78 60 L77 57 L74 56 L77 55 Z" fill="#FFE600" stroke="#000" strokeWidth="1" />
          </g>

          {/* Tiny Green Sprout Bud peeking out */}
          <path d="M60 48 C63 42 67 40 70 42 C72 45 68 49 63 49 Z" fill="#4ADE80" stroke="#000" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 3. SPROUT STAGE (15-34%)
  if (stage === "sprout") {
    return (
      <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soil Base */}
          <ellipse cx="60" cy="100" rx="42" ry="13" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
          <path d="M26 98 C30 84 46 76 60 76 C74 76 90 84 94 98 Z" fill="#784E38" stroke="#000" strokeWidth="3" />
          <ellipse cx="60" cy="84" rx="22" ry="5" fill="#8D5B4C" />

          {/* Sprout Stem */}
          <path d="M60 84 C60 70 58 58 60 48" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" />
          <path d="M60 84 C60 70 58 58 60 48" stroke="#000" strokeWidth="6" strokeLinecap="round" className="stroke-black [stroke-width:8px] -z-10" />

          {/* Left Leaf */}
          <g className={animated ? "animate-pulse" : ""}>
            <path
              d="M59 56 C50 50 36 52 32 62 C34 72 48 72 58 62 Z"
              fill="#4ADE80"
              stroke="#000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Leaf Vein */}
            <path d="M57 60 C48 58 40 60 36 63" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
            <circle cx="42" cy="58" r="2.5" fill="#BBF7D0" />
          </g>

          {/* Right Leaf */}
          <g className={animated ? "animate-pulse" : ""}>
            <path
              d="M61 52 C72 44 86 46 88 56 C86 66 72 66 61 58 Z"
              fill="#22C55E"
              stroke="#000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Leaf Vein */}
            <path d="M63 55 C72 52 80 54 84 57" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
            <circle cx="76" cy="52" r="2" fill="#86EFAC" />
          </g>

          {/* Dewdrop on leaf */}
          <circle cx="40" cy="56" r="3.5" fill="#00E5FF" stroke="#000" strokeWidth="1.5" />
          <circle cx="39" cy="55" r="1" fill="#FFF" />
        </svg>
      </div>
    );
  }

  // 4. SAPLING STAGE (35-64%)
  if (stage === "sapling") {
    return (
      <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soil Base */}
          <ellipse cx="60" cy="102" rx="44" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
          <ellipse cx="60" cy="98" rx="38" ry="8" fill="#784E38" />

          {/* Growing Trunk with Branches */}
          <path
            d="M55 100 C56 82 54 65 52 50 C46 44 38 42 32 44 C34 40 44 38 52 44 C54 36 56 28 58 20 C62 20 64 34 62 44 C70 40 78 42 84 46 C80 48 72 46 64 52 C64 68 66 82 65 100 Z"
            fill="#8B5A2B"
            stroke="#000"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Sapling Foliage Clusters */}
          {/* Center Crown */}
          <ellipse cx="58" cy="22" rx="18" ry="14" fill="#4ADE80" stroke="#000" strokeWidth="3" />
          <ellipse cx="56" cy="18" rx="10" ry="7" fill="#86EFAC" />

          {/* Left Cluster */}
          <ellipse cx="32" cy="42" rx="14" ry="11" fill="#22C55E" stroke="#000" strokeWidth="3" />
          <ellipse cx="30" cy="39" rx="7" ry="5" fill="#4ADE80" />

          {/* Right Cluster */}
          <ellipse cx="82" cy="44" rx="15" ry="12" fill="#16A34A" stroke="#000" strokeWidth="3" />
          <ellipse cx="80" cy="41" rx="8" ry="6" fill="#4ADE80" />
        </svg>
      </div>
    );
  }

  // 5. YOUNG TREE (65-89%)
  if (stage === "young") {
    return (
      <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soil Base */}
          <ellipse cx="60" cy="104" rx="46" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
          <ellipse cx="60" cy="100" rx="40" ry="8" fill="#784E38" />

          {/* Sturdy Wood Trunk */}
          <path
            d="M52 102 C54 82 52 64 48 52 C44 48 36 46 30 48 C32 44 42 42 50 48 C52 38 56 30 58 24 C62 24 64 36 62 48 C72 44 80 46 88 50 C84 52 74 50 64 56 C64 70 66 84 68 102 Z"
            fill="#854D0E"
            stroke="#000"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Foliage Puffs */}
          <ellipse cx="40" cy="48" rx="20" ry="16" fill="#22C55E" stroke="#000" strokeWidth="3" />
          <ellipse cx="80" cy="50" rx="20" ry="16" fill="#16A34A" stroke="#000" strokeWidth="3" />
          <ellipse cx="60" cy="34" rx="28" ry="22" fill="#4ADE80" stroke="#000" strokeWidth="3" />
          {/* Highlights */}
          <ellipse cx="54" cy="26" rx="14" ry="10" fill="#86EFAC" />
          <ellipse cx="36" cy="44" rx="10" ry="7" fill="#86EFAC" />
        </svg>
      </div>
    );
  }

  // Dynamic comic animations: EXCLUSIVE FOR LEVEL 6 LEGENDARIES!
  const getDynamicAnim = () => {
    if (!animated || !isAlive) return "";
    // Only Level 6 Legendaries come alive and animate!
    if (species === "tabe-legend" || species === "tabe-graduacion") {
      return "animate-tree-owl";
    }
    if (
      species === "joystick-god" ||
      species === "cupcake-palace" ||
      species === "pizza-buffet"
    ) {
      return "animate-tree-dance"; // Dancing!
    }
    if (species === "comic-creator") {
      return "animate-tree-fight"; // Sparring & fighting!
    }
    if (
      species === "soda-hyperdrive" ||
      species === "coffee-infinity" ||
      species === "rainbow"
    ) {
      return "animate-tree-play"; // Playing & levitating!
    }
    if (
      species === "yggdrasil" ||
      species === "celestial" ||
      species === "golden"
    ) {
      return "animate-tree-cosmic"; // Cosmic celestial breathing!
    }
    return "";
  };

  const dynamicAnim = getDynamicAnim();

  // 6. FULL MAJESTIC TREE (100% COMPLETION) - Tailored by Species & Archetypes!
  const plantDef = PLANT_TYPES.find((p) => p.id === species);
  const primaryColor = plantDef?.color;
  const accentColor = plantDef?.accentColor;

  let resolvedSpecies = species;
  const SUB_ARCHETYPES = [
    // Level 1: Humilde / Arbustos
    "maleza-vereda",
    "lata-aplastada",
    "arbusto-pelado",
    "papel-cupcake",
    "diente-leon",
    "cardo-espinoso",
    "dpad-roto",
    "vaso-cafe",
    "fanzine-humedo",
    "pizza-fria",
    // Level 2: Principiantes
    "cactus-lata",
    "girasol-enano",
    "trebol-comun",
    "arbusto-te",
    "carnivorous-baby",
    "gameboy-pixel",
    "soda-can",
    "cupcake-simple",
    "comic-strip",
    "bamboo-flaco",
    // Level 3: Buenos
    "oak",
    "apple",
    "cherry",
    "bonsai",
    "coffee",
    "willow",
    "joystick-arcade",
    "comic-pow",
    "pizza-slice",
    "soda-cola",
    // Level 4: Imponentes
    "baobab",
    "cyber",
    "joystick-fightstick",
    "pizza-hamburguesa",
    "comic-manga",
    "soda-energy",
    "cupcake-donut",
    "cactus-titan",
    "cupcake-fresa",
    "coffee-frappe",
    // Level 5: Épicos
    "fire",
    "crystal",
    "tabe-libros",
    "comic-villano",
    "coffee-moka",
    "carnivorous-giant",
    "soda-galaxica",
    "comic-superheroe",
    // Level 6: Titanes Legendarios
    "tabe-legend",
    "tabe-graduacion",
    "joystick-god",
    "pizza-buffet",
    "cupcake-palace",
    "coffee-infinity",
    "soda-hyperdrive",
    "golden",
    "rainbow",
    "yggdrasil",
    "celestial",
    "comic-creator",
  ];

  if (SUB_ARCHETYPES.includes(species)) {
    resolvedSpecies = species;
  } else if (species.startsWith("soda")) resolvedSpecies = "soda";
  else if (species.startsWith("joystick")) resolvedSpecies = "joystick";
  else if (species.startsWith("cupcake")) resolvedSpecies = "cupcake";
  else if (species.startsWith("comic")) resolvedSpecies = "comic";
  else if (species.startsWith("tabe")) resolvedSpecies = "tabe";
  else if (species.startsWith("pizza")) resolvedSpecies = "pizza";
  else if (species.startsWith("coffee")) resolvedSpecies = "coffee";

  switch (resolvedSpecies) {
    // ==========================================
    // --- NIVEL 1: PLANTAS DE MIERDA / HUMILDES ---
    // ==========================================
    case "maleza-vereda":
      // YUYO DE BALDOSA ROTA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="102" width="46" height="24" rx="3" fill="#64748B" stroke="#000" strokeWidth="3" />
            <rect x="72" y="102" width="46" height="24" rx="3" fill="#475569" stroke="#000" strokeWidth="3" />
            <line x1="68" y1="102" x2="72" y2="126" stroke="#000" strokeWidth="4" />
            <path d="M68 106 C62 82 56 68 46 54" stroke="#84CC16" strokeWidth="6" strokeLinecap="round" />
            <path d="M68 106 C62 82 56 68 46 54" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            <path d="M60 84 C74 76 84 80 92 78" stroke="#65A30D" strokeWidth="5" strokeLinecap="round" />
            <path d="M46 54 C34 50 30 62 38 68 C46 66 48 58 46 54 Z" fill="#A3E635" stroke="#000" strokeWidth="2.5" />
            <path d="M92 78 C98 70 102 78 96 84 C90 84 90 80 92 78 Z" fill="#84CC16" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
      );

    case "lata-aplastada":
      // LATA APLASTADA CON PASTITO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="46" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="115" rx="38" ry="7" fill="#784E38" />
            {/* Crumpled dented soda can on the ground */}
            <path d="M38 102 C38 88 56 94 72 88 C86 92 98 84 102 96 C102 110 82 108 70 112 C54 108 38 112 38 102 Z" fill="#94A3B8" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <ellipse cx="44" cy="98" rx="6" ry="10" fill="#CBD5E1" stroke="#000" strokeWidth="2" />
            <path d="M60 92 L84 94" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
            {/* Little blade of grass popping out of pull tab */}
            <path d="M72 88 C70 66 74 52 82 40" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" />
            <path d="M72 88 C70 66 74 52 82 40" stroke="#000" strokeWidth="9" strokeLinecap="round" className="-z-10" />
            <path d="M82 40 C72 38 72 48 80 48 Z" fill="#4ADE80" stroke="#000" strokeWidth="2" />
            <path d="M74 68 C84 62 88 68 82 72 Z" fill="#86EFAC" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
      );

    case "arbusto-pelado":
      // MATORRAL DESPEINADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="42" ry="10" fill="#451A03" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="117" rx="34" ry="6" fill="#78350F" />
            {/* Crooked thin trunk and scraggly bare twigs */}
            <path d="M68 116 L66 82 L50 64 L38 52" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
            <path d="M66 82 L78 60 L94 48" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M78 60 L72 40" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
            <path d="M68 116 L66 82 L50 64 L38 52" stroke="#000" strokeWidth="9" strokeLinecap="round" className="-z-10" />
            <path d="M66 82 L78 60 L94 48" stroke="#000" strokeWidth="8" strokeLinecap="round" className="-z-10" />
            <path d="M78 60 L72 40" stroke="#000" strokeWidth="8" strokeLinecap="round" className="-z-10" />
            {/* 3 Lonely Yellow-Green Leaves */}
            <ellipse cx="36" cy="50" rx="8" ry="5" fill="#A3E635" stroke="#000" strokeWidth="2" transform="rotate(-30 36 50)" />
            <ellipse cx="94" cy="46" rx="8" ry="5" fill="#FACC15" stroke="#000" strokeWidth="2" transform="rotate(25 94 46)" />
            <ellipse cx="72" cy="36" rx="7" ry="4" fill="#A3E635" stroke="#000" strokeWidth="2" transform="rotate(-15 72 36)" />
          </svg>
        </div>
      );

    case "papel-cupcake":
      // MOLDE DE CUPCAKE USADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="44" ry="11" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            {/* Wrinkled cupcake paper liner */}
            <polygon points="40,114 100,114 106,94 34,94" fill="#FCE7F3" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <line x1="48" y1="94" x2="50" y2="114" stroke="#F472B6" strokeWidth="2" />
            <line x1="62" y1="94" x2="62" y2="114" stroke="#F472B6" strokeWidth="2" />
            <line x1="78" y1="94" x2="76" y2="114" stroke="#F472B6" strokeWidth="2" />
            <line x1="92" y1="94" x2="90" y2="114" stroke="#F472B6" strokeWidth="2" />
            {/* Tiny daisy sprout */}
            <path d="M70 94 L70 66" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
            <circle cx="70" cy="58" r="6" fill="#FACC15" stroke="#000" strokeWidth="2" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse key={deg} cx={70 + 10 * Math.cos((deg * Math.PI) / 180)} cy={58 + 10 * Math.sin((deg * Math.PI) / 180)} rx="3.5" ry="5" fill="#FFF" stroke="#000" strokeWidth="1.2" transform={`rotate(${deg} ${70 + 10 * Math.cos((deg * Math.PI) / 180)} ${58 + 10 * Math.sin((deg * Math.PI) / 180)})`} />
            ))}
          </svg>
        </div>
      );

    case "diente-leon":
      // DIENTE DE LEÓN PELADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="40" ry="10" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            {/* Thin wiggly dandelion stalk */}
            <path d="M70 116 C68 90 74 65 68 46" stroke="#84CC16" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M70 116 C68 90 74 65 68 46" stroke="#000" strokeWidth="8.5" strokeLinecap="round" className="-z-10" />
            {/* Jagged base leaves */}
            <path d="M68 116 C52 108 42 112 36 116 C48 118 60 116 68 116 Z" fill="#65A30D" stroke="#000" strokeWidth="2" />
            <path d="M72 116 C88 108 98 112 104 116 C92 118 80 116 72 116 Z" fill="#65A30D" stroke="#000" strokeWidth="2" />
            {/* Bald receptacle center */}
            <circle cx="68" cy="44" r="7" fill="#CA8A04" stroke="#000" strokeWidth="2" />
            {/* One lonely seed left with parachute */}
            <line x1="68" y1="44" x2="62" y2="24" stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="62" cy="22" r="6" fill="#F8FAFC" stroke="#000" strokeWidth="1" />
          </svg>
        </div>
      );

    case "cardo-espinoso":
      // CARDO SOLITARIO DE BALDÍO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="42" ry="11" fill="#475569" stroke="#000" strokeWidth="3" />
            {/* Spiky gray-green stem */}
            <path d="M70 116 L70 56" stroke="#64748B" strokeWidth="7" strokeLinecap="round" />
            <path d="M70 116 L70 56" stroke="#000" strokeWidth="11" strokeLinecap="round" className="-z-10" />
            {/* Prickly needle leaves */}
            <polygon points="68,96 46,92 64,86" fill="#94A3B8" stroke="#000" strokeWidth="2" />
            <polygon points="72,84 94,80 76,74" fill="#94A3B8" stroke="#000" strokeWidth="2" />
            <polygon points="68,72 50,68 66,62" fill="#94A3B8" stroke="#000" strokeWidth="2" />
            {/* Dried purple pompoms */}
            <ellipse cx="70" cy="52" rx="14" ry="10" fill="#475569" stroke="#000" strokeWidth="2.5" />
            <path d="M58 48 C62 34 78 34 82 48 Z" fill="#C084FC" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
      );

    case "dpad-roto":
      // DPAD ROTO DE FAMILY GAME
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="46" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            {/* Mud-crusted plastic D-pad embedded in dirt */}
            <g transform="translate(46, 76)">
              <rect x="14" y="0" width="20" height="46" rx="4" fill="#27272A" stroke="#000" strokeWidth="3" />
              <rect x="0" y="14" width="48" height="18" rx="4" fill="#27272A" stroke="#000" strokeWidth="3" />
              <circle cx="24" cy="23" r="5" fill="#3F3F46" />
              {/* Crack in plastic */}
              <line x1="16" y1="6" x2="28" y2="18" stroke="#71717A" strokeWidth="1.5" />
            </g>
            {/* Single clover twig sprouting from dpad center */}
            <path d="M70 94 C72 74 68 62 70 48" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
            <path d="M70 94 C72 74 68 62 70 48" stroke="#000" strokeWidth="7" strokeLinecap="round" className="-z-10" />
            <ellipse cx="64" cy="42" rx="7" ry="5" fill="#4ADE80" stroke="#000" strokeWidth="1.8" />
            <ellipse cx="76" cy="42" rx="7" ry="5" fill="#4ADE80" stroke="#000" strokeWidth="1.8" />
            <ellipse cx="70" cy="34" rx="5" ry="7" fill="#22C55E" stroke="#000" strokeWidth="1.8" />
          </svg>
        </div>
      );

    case "vaso-cafe":
      // VASITO DESCARTABLE TIRADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="44" ry="11" fill="#451A03" stroke="#000" strokeWidth="3" />
            {/* Crumpled paper coffee cup lying down */}
            <g transform="translate(42, 86) rotate(15)">
              <polygon points="8,0 44,0 38,32 14,32" fill="#F1F5F9" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
              <ellipse cx="26" cy="0" rx="18" ry="4" fill="#E2E8F0" stroke="#000" strokeWidth="2" />
              <rect x="12" y="8" width="28" height="12" rx="2" fill="#78350F" />
            </g>
            {/* Little weed sprout coming out */}
            <path d="M58 86 C54 64 62 52 56 42" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
            <path d="M58 86 C54 64 62 52 56 42" stroke="#000" strokeWidth="7" strokeLinecap="round" className="-z-10" />
            <ellipse cx="50" cy="40" rx="7" ry="4" fill="#22C55E" stroke="#000" strokeWidth="1.8" />
            <ellipse cx="62" cy="38" rx="7" ry="4" fill="#4ADE80" stroke="#000" strokeWidth="1.8" />
          </svg>
        </div>
      );

    case "fanzine-humedo":
      // FOTOCOPIA DE APUNTE ARRUGADA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="46" ry="11" fill="#475569" stroke="#000" strokeWidth="3" />
            {/* Crumpled folded sheet of study notes */}
            <polygon points="40,116 98,114 92,94 48,96 36,106" fill="#FEF08A" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <line x1="48" y1="102" x2="86" y2="100" stroke="#000" strokeWidth="1.5" />
            <line x1="46" y1="108" x2="82" y2="106" stroke="#0284C7" strokeWidth="3" opacity="0.6" />
            {/* Stubby pencil with a green bud */}
            <g transform="translate(64, 46)">
              <polygon points="4,48 8,48 10,24 2,24" fill="#F59E0B" stroke="#000" strokeWidth="2" />
              <polygon points="2,24 10,24 6,14" fill="#FEF08A" stroke="#000" strokeWidth="1.5" />
              <polygon points="5,16 7,16 6,14" fill="#000" />
              {/* Sprout on pencil eraser */}
              <ellipse cx="6" cy="46" rx="6" ry="3" fill="#4ADE80" stroke="#000" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      );

    case "pizza-fria":
      // PORCIÓN FRÍA CON HONGUITO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2px_2px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="118" rx="44" ry="11" fill="#451A03" stroke="#000" strokeWidth="3" />
            {/* Stiff triangular pizza crust */}
            <polygon points="70,114 44,90 96,90" fill="#D97706" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <path d="M44 90 Q70 84 96 90" stroke="#B45309" strokeWidth="6" strokeLinecap="round" />
            <polygon points="68,110 48,92 92,92" fill="#FDE047" />
            <circle cx="66" cy="98" r="3.5" fill="#DC2626" />
            {/* Tiny polite brown mushroom growing on it */}
            <rect x="66" y="68" width="6" height="20" rx="2" fill="#F5F5F4" stroke="#000" strokeWidth="2" />
            <path d="M58 68 C58 52 80 52 80 68 Z" fill="#78350F" stroke="#000" strokeWidth="2.5" />
            <circle cx="65" cy="60" r="1.5" fill="#FFF" />
            <circle cx="74" cy="62" r="1.5" fill="#FFF" />
          </svg>
        </div>
      );

    // ==========================================
    // --- NIVEL 2: PLANTITAS Y MACETAS PRINCIPIANTES ---
    // ==========================================
    case "cactus-lata":
      // CACTUS EN LATA DE CONSERVA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="40" ry="10" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            {/* Recycled tin can pot */}
            <polygon points="50,118 90,118 92,84 48,84" fill="#94A3B8" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <rect x="46" y="80" width="48" height="6" rx="2" fill="#CBD5E1" stroke="#000" strokeWidth="2" />
            <line x1="50" y1="96" x2="90" y2="96" stroke="#64748B" strokeWidth="2" />
            {/* Cute round cactus */}
            <rect x="56" y="38" width="28" height="46" rx="14" fill="#10B981" stroke="#000" strokeWidth="3.5" />
            <line x1="62" y1="42" x2="62" y2="82" stroke="#059669" strokeWidth="2" />
            <line x1="78" y1="42" x2="78" y2="82" stroke="#34D399" strokeWidth="2" />
            <line x1="52" y1="56" x2="56" y2="56" stroke="#000" strokeWidth="1.5" />
            <line x1="84" y1="64" x2="88" y2="64" stroke="#000" strokeWidth="1.5" />
            {/* Little pink bloom on top */}
            <circle cx="70" cy="36" r="6" fill="#F43F5E" stroke="#000" strokeWidth="2" />
            <circle cx="70" cy="36" r="2.5" fill="#FDE047" />
          </svg>
        </div>
      );

    case "girasol-enano":
      // GIRASOL BEBÉ MAREADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="42" ry="11" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            <path d="M70 118 L70 64" stroke="#16A34A" strokeWidth="6" strokeLinecap="round" />
            <path d="M70 118 L70 64" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            <path d="M70 94 C54 88 50 96 54 100 C62 100 68 96 70 94 Z" fill="#22C55E" stroke="#000" strokeWidth="2" />
            {/* Sunflower head */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <ellipse key={deg} cx={70 + 18 * Math.cos((deg * Math.PI) / 180)} cy={54 + 18 * Math.sin((deg * Math.PI) / 180)} rx="5" ry="10" fill="#FACC15" stroke="#000" strokeWidth="1.8" transform={`rotate(${deg} ${70 + 18 * Math.cos((deg * Math.PI) / 180)} ${54 + 18 * Math.sin((deg * Math.PI) / 180)})`} />
            ))}
            <circle cx="70" cy="54" r="14" fill="#713F12" stroke="#000" strokeWidth="2.5" />
            {/* Cute dizzy face */}
            <circle cx="65" cy="52" r="2" fill="#FFF" />
            <circle cx="75" cy="52" r="2" fill="#FFF" />
            <circle cx="65" cy="52" r="1" fill="#000" />
            <circle cx="75" cy="52" r="1" fill="#000" />
            <path d="M67 58 Q70 61 73 58" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "trebol-comun":
      // TRÉBOL COMÚN DE TRES HOJAS
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="42" ry="11" fill="#14532D" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="116" rx="36" ry="7" fill="#16A34A" />
            <path d="M70 116 C68 96 72 82 70 66" stroke="#15803D" strokeWidth="6" strokeLinecap="round" />
            <path d="M70 116 C68 96 72 82 70 66" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            {/* Top Leaf */}
            <g transform="translate(70, 52)">
              <ellipse cx="-6" cy="-10" rx="10" ry="12" fill="#4ADE80" stroke="#000" strokeWidth="2.5" transform="rotate(-15 -6 -10)" />
              <ellipse cx="6" cy="-10" rx="10" ry="12" fill="#22C55E" stroke="#000" strokeWidth="2.5" transform="rotate(15 6 -10)" />
            </g>
            {/* Left Leaf */}
            <g transform="translate(54, 66)">
              <ellipse cx="-8" cy="-6" rx="12" ry="10" fill="#4ADE80" stroke="#000" strokeWidth="2.5" transform="rotate(-15 -8 -6)" />
              <ellipse cx="-8" cy="6" rx="12" ry="10" fill="#22C55E" stroke="#000" strokeWidth="2.5" transform="rotate(15 -8 6)" />
            </g>
            {/* Right Leaf */}
            <g transform="translate(86, 66)">
              <ellipse cx="8" cy="-6" rx="12" ry="10" fill="#22C55E" stroke="#000" strokeWidth="2.5" transform="rotate(15 8 -6)" />
              <ellipse cx="8" cy="6" rx="12" ry="10" fill="#16A34A" stroke="#000" strokeWidth="2.5" transform="rotate(-15 8 6)" />
            </g>
          </svg>
        </div>
      );

    case "arbusto-te":
      // ARBUSTITO DE MANZANILLA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="44" ry="11" fill="#14532D" stroke="#000" strokeWidth="3" />
            <path d="M70 118 L70 82" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
            {/* Little bush foliage */}
            <ellipse cx="70" cy="72" rx="34" ry="24" fill="#22C55E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="66" rx="28" ry="18" fill="#4ADE80" />
            {/* Tiny Chamomile Daisies */}
            {[
              { x: 54, y: 64 },
              { x: 74, y: 58 },
              { x: 88, y: 72 },
              { x: 62, y: 78 },
              { x: 72, y: 82 },
            ].map((d, i) => (
              <g key={i}>
                <circle cx={d.x} cy={d.y} r="5" fill="#FFF" stroke="#000" strokeWidth="1.2" />
                <circle cx={d.x} cy={d.y} r="2.2" fill="#FACC15" />
              </g>
            ))}
          </svg>
        </div>
      );

    case "carnivorous-baby":
      // CARNÍVORA CON DIENTES DE LECHE
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Small Terracotta Pot */}
            <polygon points="50,118 90,118 86,94 54,94" fill="#C2410C" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <rect x="50" y="90" width="40" height="6" rx="1.5" fill="#EA580C" stroke="#000" strokeWidth="2" />
            <path d="M70 92 C68 76 74 65 72 54" stroke="#65A30D" strokeWidth="6" strokeLinecap="round" />
            <path d="M70 92 C68 76 74 65 72 54" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            {/* Cute Little Jaws */}
            <g transform="translate(70, 48)">
              <ellipse cx="0" cy="0" rx="16" ry="12" fill="#84CC16" stroke="#000" strokeWidth="2.5" />
              <ellipse cx="0" cy="0" rx="12" ry="7" fill="#DC2626" />
              <polygon points="-8,-7 -6,-2 -4,-7" fill="#FFF" />
              <polygon points="4,-7 6,-2 8,-7" fill="#FFF" />
              <polygon points="-6,7 -4,2 -2,7" fill="#FFF" />
              <polygon points="2,7 4,2 6,7" fill="#FFF" />
            </g>
          </svg>
        </div>
      );

    case "gameboy-pixel":
      // CONSOLA PORTÁTIL RETRO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="44" ry="11" fill="#3F3F46" stroke="#000" strokeWidth="3" />
            {/* Classic Portable Body */}
            <rect x="42" y="32" width="56" height="84" rx="8" fill="#CBD5E1" stroke="#000" strokeWidth="3.5" />
            {/* Screen */}
            <rect x="50" y="40" width="40" height="32" rx="4" fill="#475569" stroke="#000" strokeWidth="2" />
            <rect x="54" y="44" width="32" height="24" rx="2" fill="#84CC16" />
            {/* Pixel Sprout Sprite */}
            <rect x="68" y="58" width="4" height="6" fill="#14532D" />
            <rect x="64" y="52" width="12" height="6" fill="#14532D" />
            <rect x="68" y="48" width="4" height="4" fill="#14532D" />
            {/* D-Pad & A/B Buttons */}
            <rect x="52" y="84" width="14" height="5" fill="#18181B" />
            <rect x="56" y="80" width="5" height="14" fill="#18181B" />
            <circle cx="82" cy="88" r="3.5" fill="#991B1B" />
            <circle cx="90" cy="82" r="3.5" fill="#991B1B" />
          </svg>
        </div>
      );

    case "soda-can":
      // LATA DE REFRESCO GAMER HELADA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="46" ry="11" fill="#15803D" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="116" rx="38" ry="7" fill="#22C55E" />
            {/* Upright Soda Can */}
            <rect x="54" y="46" width="32" height="66" rx="6" fill="#0284C7" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="46" rx="16" ry="5" fill="#E2E8F0" stroke="#000" strokeWidth="2" />
            <polygon points="72,60 66,74 71,74 68,86 76,72 71,72" fill="#FACC15" stroke="#000" strokeWidth="1.2" />
            <circle cx="60" cy="58" r="1.5" fill="#FFF" />
            <circle cx="80" cy="78" r="1.5" fill="#FFF" />
          </svg>
        </div>
      );

    case "cupcake-simple":
      // CUPCAKE CASERO DE VAINILLA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="42" ry="11" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            {/* Waffle Paper Liner */}
            <polygon points="52,116 88,116 84,78 56,78" fill="#FBBF24" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <line x1="56" y1="96" x2="84" y2="96" stroke="#D97706" strokeWidth="2" />
            {/* Pink Swirl Frosting */}
            <ellipse cx="70" cy="74" rx="28" ry="16" fill="#F472B6" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="60" rx="20" ry="12" fill="#FBCFE8" stroke="#000" strokeWidth="2.5" />
            <circle cx="70" cy="44" r="8" fill="#EF4444" stroke="#000" strokeWidth="2" />
            <circle cx="68" cy="42" r="2" fill="#FFF" />
          </svg>
        </div>
      );

    case "comic-strip":
      // TIRA CÓMICA EN PAPEL PERIÓDICO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="44" ry="11" fill="#14532D" stroke="#000" strokeWidth="3" />
            {/* Newsprint Page on a wooden stick */}
            <line x1="70" y1="116" x2="70" y2="36" stroke="#78350F" strokeWidth="6" strokeLinecap="round" />
            <rect x="36" y="38" width="68" height="66" rx="4" fill="#F8FAFC" stroke="#000" strokeWidth="3" />
            {/* 3 Panels */}
            <rect x="42" y="44" width="26" height="24" fill="#E2E8F0" stroke="#000" strokeWidth="1.5" />
            <rect x="72" y="44" width="26" height="24" fill="#E2E8F0" stroke="#000" strokeWidth="1.5" />
            <rect x="42" y="72" width="56" height="26" fill="#FEF08A" stroke="#000" strokeWidth="1.5" />
            <text x="70" y="88" fill="#000" fontSize="8" fontWeight="900" textAnchor="middle">TABE!</text>
          </svg>
        </div>
      );

    case "bamboo-flaco":
      // CAÑITA DE BAMBÚ SOLITARIA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="42" ry="11" fill="#14532D" stroke="#000" strokeWidth="3" />
            {/* Slender Bamboo Cane */}
            <rect x="66" y="84" width="8" height="34" rx="2" fill="#22C55E" stroke="#000" strokeWidth="2.5" />
            <rect x="66" y="52" width="8" height="30" rx="2" fill="#4ADE80" stroke="#000" strokeWidth="2.5" />
            <rect x="66" y="24" width="8" height="26" rx="2" fill="#86EFAC" stroke="#000" strokeWidth="2.5" />
            <line x1="64" y1="83" x2="76" y2="83" stroke="#000" strokeWidth="3" />
            <line x1="64" y1="51" x2="76" y2="51" stroke="#000" strokeWidth="3" />
            <path d="M74 52 C86 46 96 52 100 58 C92 58 82 56 74 52 Z" fill="#22C55E" stroke="#000" strokeWidth="1.8" />
            <path d="M66 36 C54 30 46 36 42 42 C50 42 60 40 66 36 Z" fill="#4ADE80" stroke="#000" strokeWidth="1.8" />
          </svg>
        </div>
      );

    
    // ==========================================
    // --- NIVEL 3 & 4: DISEÑOS COMPLETOS & IMPONENTES ---
    // ==========================================
    case "comic-pow":
      // NIVEL 3: EXPLOSIÓN POP-ART "POW!"
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="46" ry="12" fill="#1E1E24" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="116" rx="38" ry="7" fill="#FDE047" />
            {/* Trunk shaped like stacked comic frames */}
            <path d="M58 116 L62 76 L78 76 L82 116 Z" fill="#FB923C" stroke="#000" strokeWidth="3" />
            <line x1="60" y1="96" x2="80" y2="96" stroke="#000" strokeWidth="2.5" />
            {/* Action burst star */}
            <path
              d="M70 12 L79 42 L110 32 L92 58 L124 76 L92 84 L102 112 L74 96 L58 114 L56 86 L22 86 L44 64 L20 40 L52 46 Z"
              fill="#EF4444"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Inner yellow comic star */}
            <path
              d="M70 24 L76 46 L98 40 L84 60 L108 74 L84 80 L92 100 L72 88 L60 102 L58 80 L32 80 L50 62 L32 44 L56 50 Z"
              fill="#FACC15"
              stroke="#000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Comic sound bubble POW! */}
            <ellipse cx="70" cy="65" rx="26" ry="16" fill="#FFF" stroke="#000" strokeWidth="3" />
            <text x="70" y="71" textAnchor="middle" fill="#000" fontWeight="900" fontSize="16" fontFamily="Impact, sans-serif" letterSpacing="1">
              POW!
            </text>
            {/* Halftone dots effect */}
            <circle cx="95" cy="48" r="2.5" fill="#EF4444" />
            <circle cx="102" cy="54" r="2" fill="#EF4444" />
            <circle cx="42" cy="72" r="2.5" fill="#EF4444" />
          </svg>
        </div>
      );

    case "pizza-slice":
      // NIVEL 3: PORCIÓN GIGANTE CON QUESO DERRETIDO Y ALBAHACA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="38" ry="7" fill="#784E38" />
            {/* Trunk: Spatula metal handle & crust stem */}
            <rect x="64" y="86" width="12" height="32" rx="3" fill="#D97706" stroke="#000" strokeWidth="3" />
            <line x1="70" y1="90" x2="70" y2="114" stroke="#92400E" strokeWidth="2" />
            {/* Pizza Crust Arc */}
            <path d="M24 40 Q70 20 116 40 L112 50 Q70 30 28 50 Z" fill="#D97706" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Pizza Cheese Triangle Crown */}
            <path d="M28 48 Q70 28 112 48 L76 100 Q70 106 64 100 Z" fill="#FBBF24" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Tomato Sauce accents */}
            <path d="M34 52 Q70 36 106 52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
            {/* Pepperoni Slices */}
            <circle cx="52" cy="58" r="9" fill="#DC2626" stroke="#000" strokeWidth="2.5" />
            <circle cx="50" cy="56" r="2" fill="#EF4444" />
            <circle cx="86" cy="62" r="9.5" fill="#DC2626" stroke="#000" strokeWidth="2.5" />
            <circle cx="84" cy="60" r="2" fill="#EF4444" />
            <circle cx="70" cy="80" r="8" fill="#DC2626" stroke="#000" strokeWidth="2.5" />
            {/* Basil leaves */}
            <path d="M66 52 C60 48 62 42 68 44 C72 48 70 54 66 52 Z" fill="#16A34A" stroke="#000" strokeWidth="1.5" />
            <path d="M82 74 C78 72 80 66 84 68 C88 72 86 76 82 74 Z" fill="#16A34A" stroke="#000" strokeWidth="1.5" />
            {/* Dripping mozzarella cheese */}
            <path d="M68 96 C68 108 72 108 72 96" fill="#FDE047" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
      );

    case "comic-manga":
      // NIVEL 4: ÁRBOL MANGA SHONEN CON LÍNEAS DE VELOCIDAD Y ONOMATOPEYA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Speed line rays */}
            <line x1="70" y1="14" x2="70" y2="2" stroke="#000" strokeWidth="2.5" />
            <line x1="32" y1="26" x2="18" y2="16" stroke="#000" strokeWidth="2.5" />
            <line x1="108" y1="26" x2="122" y2="16" stroke="#000" strokeWidth="2.5" />
            <line x1="16" y1="65" x2="4" y2="65" stroke="#000" strokeWidth="2.5" />
            <line x1="124" y1="65" x2="136" y2="65" stroke="#000" strokeWidth="2.5" />
            {/* Ground base */}
            <ellipse cx="70" cy="120" rx="46" ry="12" fill="#0F172A" stroke="#000" strokeWidth="3" />
            {/* Dynamic Sumi-e Ink Trunk */}
            <path d="M54 118 C58 92 48 76 42 56 C50 62 60 60 64 48 C68 62 78 64 96 52 C88 74 80 92 84 118 Z" fill="#1E293B" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            {/* Stylized Manga Hair/Foliage Clusters with Ink Screentones */}
            <path d="M42 56 C26 44 28 26 46 24 C56 22 64 28 70 20 C76 28 84 22 94 24 C112 26 114 44 98 56 C110 70 94 84 80 80 C68 84 56 82 48 78 C32 82 24 66 42 56 Z" fill="#F8FAFC" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            {/* Manga shading screentone lines inside foliage */}
            <line x1="40" y1="36" x2="52" y2="48" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            <line x1="46" y1="32" x2="58" y2="44" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            <line x1="82" y1="32" x2="94" y2="44" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            <line x1="88" y1="36" x2="100" y2="48" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            {/* Japanese Manga Onomatopoeia: ゴゴゴ (Menacing / Rumble) */}
            <text x="70" y="60" textAnchor="middle" fill="#000" fontWeight="900" fontSize="18" fontFamily="Arial Black, sans-serif">
              ゴゴゴ
            </text>
          </svg>
        </div>
      );

    case "soda-energy":
      // NIVEL 4: LATA ENERGIZANTE NEÓN GAMER CON RAYOS ELÉCTRICOS
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="46" ry="12" fill="#09090B" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="116" rx="38" ry="7" fill="#22C55E" />
            {/* Sturdy Tech Battery Trunk */}
            <path d="M56 116 L60 84 L80 84 L84 116 Z" fill="#18181B" stroke="#000" strokeWidth="3" />
            {/* Monster Energy Canister Body */}
            <rect x="42" y="32" width="56" height="62" rx="10" fill="#09090B" stroke="#000" strokeWidth="3.5" />
            {/* Top Rim of Can */}
            <ellipse cx="70" cy="32" rx="28" ry="8" fill="#71717A" stroke="#000" strokeWidth="2.5" />
            <ellipse cx="70" cy="30" rx="22" ry="5" fill="#D4D4D8" />
            <circle cx="70" cy="30" r="3" fill="#22C55E" />
            {/* Glowing Neon Green Claw Lightning Mark */}
            <path d="M54 44 L60 62 L52 74" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M70 42 L74 60 L68 76" stroke="#4ADE80" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M86 44 L80 62 L88 74" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Sparks & Electric Voltage bolts */}
            <path d="M30 46 L38 52 L32 60 L42 66" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M110 46 L102 52 L108 60 L98 66" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <text x="70" y="88" textAnchor="middle" fill="#22C55E" fontWeight="900" fontSize="9" fontFamily="Impact">
              VOLT +9000
            </text>
          </svg>
        </div>
      );

    case "cactus-titan":
      // NIVEL 4: SAGUARO TITÁN MEXICANO GIGANTE
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Desert Sunset Ring */}
            <circle cx="70" cy="50" r="36" fill="#FDE047" opacity="0.3" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 4" />
            {/* Desert Ground dunes */}
            <ellipse cx="70" cy="122" rx="50" ry="12" fill="#D97706" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="42" ry="7" fill="#F59E0B" />
            {/* Giant Central Saguaro Stem */}
            <rect x="58" y="24" width="24" height="94" rx="12" fill="#15803D" stroke="#000" strokeWidth="4" />
            {/* Stem Ridge Highlights */}
            <line x1="64" y1="28" x2="64" y2="114" stroke="#22C55E" strokeWidth="2" />
            <line x1="70" y1="26" x2="70" y2="114" stroke="#4ADE80" strokeWidth="2.5" />
            <line x1="76" y1="28" x2="76" y2="114" stroke="#166534" strokeWidth="2" />
            {/* Left Colossal Arm */}
            <path d="M60 76 L36 76 C28 76 28 50 28 42" stroke="#15803D" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 76 L36 76 C28 76 28 50 28 42" stroke="#000" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" className="-z-10" />
            <circle cx="28" cy="42" r="8" fill="#15803D" stroke="#000" strokeWidth="3" />
            {/* Right Colossal Arm */}
            <path d="M80 64 L104 64 C112 64 112 40 112 34" stroke="#15803D" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="112" cy="34" r="8" fill="#15803D" stroke="#000" strokeWidth="3" />
            {/* Golden Prickly Spines */}
            <line x1="54" y1="46" x2="48" y2="44" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="54" y1="62" x2="48" y2="60" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="86" y1="46" x2="92" y2="44" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="86" y1="80" x2="92" y2="78" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
            {/* Yellow Bloom on top */}
            <path d="M62 24 C64 14 76 14 78 24 Z" fill="#FACC15" stroke="#000" strokeWidth="2" />
            <circle cx="70" cy="18" r="4" fill="#EF4444" />
          </svg>
        </div>
      );

    case "cupcake-fresa":
      // NIVEL 4: CUPCAKE FRESA DELUXE TRIPLE CREMA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[2.5px_2.5px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="38" ry="7" fill="#784E38" />
            {/* Chocolate Wafer Base / Wrapper */}
            <path d="M46 76 L52 118 L88 118 L94 76 Z" fill="#F43F5E" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <line x1="58" y1="78" x2="62" y2="116" stroke="#9F1239" strokeWidth="2.5" />
            <line x1="70" y1="78" x2="70" y2="116" stroke="#9F1239" strokeWidth="2.5" />
            <line x1="82" y1="78" x2="78" y2="116" stroke="#9F1239" strokeWidth="2.5" />
            {/* Tier 1 Fluffy Strawberry Cream */}
            <ellipse cx="70" cy="74" rx="36" ry="16" fill="#FDA4AF" stroke="#000" strokeWidth="3.5" />
            {/* Tier 2 Cream */}
            <ellipse cx="70" cy="56" rx="28" ry="14" fill="#FBCFE8" stroke="#000" strokeWidth="3.5" />
            {/* Tier 3 Swirl Peak */}
            <ellipse cx="70" cy="40" rx="18" ry="11" fill="#FFF1F2" stroke="#000" strokeWidth="3" />
            {/* Giant Strawberry on Top */}
            <path d="M70 20 C60 20 58 32 70 42 C82 32 80 20 70 20 Z" fill="#E11D48" stroke="#000" strokeWidth="2.5" />
            {/* Strawberry Seeds & Leaves */}
            <circle cx="68" cy="27" r="1" fill="#FACC15" />
            <circle cx="73" cy="29" r="1" fill="#FACC15" />
            <circle cx="69" cy="35" r="1" fill="#FACC15" />
            <path d="M66 18 C64 12 70 14 70 18 C70 14 76 12 74 18" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
            {/* Colorful Sprinkles */}
            <rect x="52" y="68" width="5" height="2" rx="1" fill="#3B82F6" stroke="#000" strokeWidth="1" transform="rotate(25 52 68)" />
            <rect x="85" y="70" width="5" height="2" rx="1" fill="#10B981" stroke="#000" strokeWidth="1" transform="rotate(-30 85 70)" />
            <rect x="62" y="52" width="5" height="2" rx="1" fill="#F59E0B" stroke="#000" strokeWidth="1" transform="rotate(45 62 52)" />
            <rect x="78" y="54" width="5" height="2" rx="1" fill="#8B5CF6" stroke="#000" strokeWidth="1" transform="rotate(-15 78 54)" />
          </svg>
        </div>
      );

    // ==========================================
    // --- NIVEL 5: TITANES ÉPICOS ---
    // ==========================================
    case "tabe-libros":
      // NIVEL 5: TORRE COLOSAL DE LIBROS Y BÚHO ERUDITO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#312E81" stroke="#000" strokeWidth="3" />
            {/* Book 1 (Bottom, Leather Red) */}
            <rect x="34" y="104" width="72" height="14" rx="2" fill="#991B1B" stroke="#000" strokeWidth="3" />
            <rect x="42" y="106" width="60" height="10" fill="#FEF3C7" stroke="#000" strokeWidth="1.5" />
            <line x1="36" y1="111" x2="42" y2="111" stroke="#FDE047" strokeWidth="2" />
            {/* Book 2 (Blue Navy) */}
            <rect x="40" y="90" width="62" height="14" rx="2" fill="#1E3A8A" stroke="#000" strokeWidth="3" />
            <rect x="46" y="92" width="52" height="10" fill="#FFFBEB" stroke="#000" strokeWidth="1.5" />
            {/* Book 3 (Emerald Green tilted) */}
            <g transform="rotate(-4 70 80)">
              <rect x="44" y="76" width="54" height="14" rx="2" fill="#065F46" stroke="#000" strokeWidth="3" />
              <rect x="50" y="78" width="44" height="10" fill="#FEF3C7" stroke="#000" strokeWidth="1.5" />
            </g>
            {/* Book 4 (Golden Yellow) */}
            <rect x="48" y="64" width="46" height="13" rx="2" fill="#D97706" stroke="#000" strokeWidth="3" />
            <rect x="52" y="66" width="38" height="9" fill="#FFFBEB" stroke="#000" strokeWidth="1.5" />
            {/* Academic Owl on Top */}
            <ellipse cx="70" cy="44" rx="16" ry="18" fill="#4338CA" stroke="#000" strokeWidth="3" />
            {/* Owl Belly */}
            <ellipse cx="70" cy="48" rx="10" ry="12" fill="#C7D2FE" />
            {/* Owl Eyes & Glasses */}
            <circle cx="64" cy="40" r="6" fill="#FFF" stroke="#000" strokeWidth="2" />
            <circle cx="64" cy="40" r="2.5" fill="#000" />
            <circle cx="76" cy="40" r="6" fill="#FFF" stroke="#000" strokeWidth="2" />
            <circle cx="76" cy="40" r="2.5" fill="#000" />
            <line x1="68" y1="40" x2="72" y2="40" stroke="#F59E0B" strokeWidth="2" />
            {/* Graduation Cap (Birrete) */}
            <polygon points="70,16 94,24 70,32 46,24" fill="#18181B" stroke="#000" strokeWidth="2.5" />
            <rect x="63" y="27" width="14" height="6" fill="#18181B" stroke="#000" strokeWidth="2" />
            <line x1="70" y1="24" x2="88" y2="30" stroke="#FACC15" strokeWidth="2" />
            <circle cx="88" cy="31" r="2" fill="#FACC15" />
          </svg>
        </div>
      );

    case "coffee-moka":
      // NIVEL 5: CAFETERA MOKA ITALIANA CON GÉISER DE ESPRESSO Y GRANOS FLOTANTES
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#3E2723" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="38" ry="7" fill="#5D4037" />
            {/* Lower boiler chamber (Faceted chrome metal) */}
            <polygon points="52,116 88,116 82,90 58,90" fill="#94A3B8" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Middle valve ring */}
            <rect x="56" y="86" width="28" height="6" fill="#CBD5E1" stroke="#000" strokeWidth="2.5" />
            <circle cx="62" cy="89" r="2" fill="#DC2626" />
            {/* Upper pot chamber (Faceted chrome) */}
            <polygon points="56,86 84,86 92,58 48,58" fill="#E2E8F0" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Handle on left */}
            <path d="M48 64 C36 64 36 82 54 84" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
            {/* Spout on right */}
            <polygon points="88,62 100,58 88,70" fill="#94A3B8" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
            {/* Geyser of rich dark espresso & golden crema cloud */}
            <path d="M64 58 C60 40 50 36 62 20 C70 10 74 12 78 22 C88 34 80 44 76 58 Z" fill="#78350F" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Golden Crema foam bursts */}
            <ellipse cx="70" cy="24" rx="20" ry="12" fill="#FDE68A" stroke="#000" strokeWidth="2.5" />
            <circle cx="58" cy="20" r="6" fill="#FEF3C7" stroke="#000" strokeWidth="2" />
            <circle cx="82" cy="22" r="7" fill="#FEF3C7" stroke="#000" strokeWidth="2" />
            {/* Floating roasted coffee beans */}
            <ellipse cx="44" cy="36" rx="6" ry="4" fill="#3E2723" stroke="#000" strokeWidth="1.5" transform="rotate(-25 44 36)" />
            <ellipse cx="96" cy="38" rx="6" ry="4" fill="#3E2723" stroke="#000" strokeWidth="1.5" transform="rotate(30 96 38)" />
          </svg>
        </div>
      );

    case "carnivorous-giant":
      // NIVEL 5: PLANTA CARNÍVORA TITÁNICA (AUDREY II) CON FAUCES DOBLES
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#14532D" stroke="#000" strokeWidth="3" />
            {/* Massive Thorny Vine Trunk */}
            <path d="M62 118 C58 96 74 86 64 68 C58 58 64 48 68 42" stroke="#15803D" strokeWidth="14" strokeLinecap="round" />
            <path d="M62 118 C58 96 74 86 64 68 C58 58 64 48 68 42" stroke="#000" strokeWidth="20" strokeLinecap="round" className="-z-10" />
            {/* Spikes on vine */}
            <polygon points="56,98 48,94 56,90" fill="#DC2626" stroke="#000" strokeWidth="2" />
            <polygon points="72,80 80,76 72,72" fill="#DC2626" stroke="#000" strokeWidth="2" />
            {/* Left secondary mini-mouth */}
            <g transform="translate(24, 52) scale(0.65)">
              <ellipse cx="20" cy="20" rx="18" ry="14" fill="#84CC16" stroke="#000" strokeWidth="3" />
              <path d="M4 20 Q20 30 36 20 Q20 14 4 20 Z" fill="#DC2626" stroke="#000" strokeWidth="2" />
            </g>
            {/* Main Giant Jaw (Upper) */}
            <path d="M50 44 C50 18 88 18 96 44 Z" fill="#65A30D" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Main Giant Jaw (Lower) */}
            <path d="M52 46 C52 74 94 74 98 46 Z" fill="#4D7C0F" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Deep mouth interior */}
            <ellipse cx="74" cy="45" rx="20" ry="10" fill="#991B1B" stroke="#000" strokeWidth="2" />
            {/* Monster Sharp White Teeth */}
            <polygon points="56,43 60,34 64,43" fill="#FFF" stroke="#000" strokeWidth="1.5" />
            <polygon points="66,43 70,32 74,43" fill="#FFF" stroke="#000" strokeWidth="1.5" />
            <polygon points="76,43 80,34 84,43" fill="#FFF" stroke="#000" strokeWidth="1.5" />
            <polygon points="60,47 64,56 68,47" fill="#FFF" stroke="#000" strokeWidth="1.5" />
            <polygon points="72,47 76,58 80,47" fill="#FFF" stroke="#000" strokeWidth="1.5" />
            {/* Toxic purple spots */}
            <circle cx="66" cy="28" r="3.5" fill="#A855F7" stroke="#000" strokeWidth="1" />
            <circle cx="82" cy="30" r="4" fill="#A855F7" stroke="#000" strokeWidth="1" />
            {/* Glowing drool drop */}
            <path d="M72 56 C72 66 74 66 74 56" stroke="#A3E635" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "soda-galaxica":
      // NIVEL 5: ÁRBOL REFRESCO CÓSMICO CON ANILLOS PLANETARIOS Y NEBULOSA
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#0B0F19" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="38" ry="7" fill="#3B0764" />
            {/* Cosmic Nebula Cloud Canopy */}
            <ellipse cx="70" cy="48" rx="42" ry="32" fill="#581C87" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="66" cy="44" rx="32" ry="24" fill="#7E22CE" />
            <ellipse cx="62" cy="40" rx="20" ry="15" fill="#C084FC" />
            {/* Saturn-like Soda Bubble Ring */}
            <ellipse cx="70" cy="50" rx="58" ry="14" fill="none" stroke="#06B6D4" strokeWidth="4" strokeDasharray="16 4" transform="rotate(-15 70 50)" />
            {/* Translucent Cosmic Bottle Trunk */}
            <path d="M60 118 L64 74 L76 74 L80 118 Z" fill="#3B82F6" stroke="#000" strokeWidth="3" />
            {/* Starlight sparkles & planetary bubbles */}
            <circle cx="48" cy="36" r="3" fill="#FFF" />
            <circle cx="88" cy="34" r="2.5" fill="#FFF" />
            <circle cx="92" cy="56" r="4" fill="#38BDF8" stroke="#000" strokeWidth="1.5" />
            <circle cx="40" cy="52" r="5" fill="#E879F9" stroke="#000" strokeWidth="1.5" />
            {/* 4-point star burst */}
            <path d="M70 20 L72 26 L78 28 L72 30 L70 36 L68 30 L62 28 L68 26 Z" fill="#FEF08A" stroke="#000" strokeWidth="1" />
          </svg>
        </div>
      );

    case "comic-superheroe":
      // NIVEL 5: ÁRBOL HÉROE CON CAPA ROJA FLAMEANTE Y ESCUDO DORADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#1E293B" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="38" ry="7" fill="#1D4ED8" />
            {/* Flowing Red Superhero Cape behind */}
            <path d="M50 44 C30 56 22 92 26 112 C40 108 48 104 56 108 C64 100 58 72 50 44 Z" fill="#DC2626" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M90 44 C110 56 118 92 114 112 C100 108 92 104 84 108 C76 100 82 72 90 44 Z" fill="#B91C1C" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Muscular Tree Trunk (Heroic Stance) */}
            <path d="M56 116 L62 76 L78 76 L84 116 Z" fill="#713F12" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="114" rx="14" ry="4" fill="#EAB308" stroke="#000" strokeWidth="2" />
            {/* Superhero Chest Emblem Crown */}
            <ellipse cx="70" cy="46" rx="28" ry="24" fill="#2563EB" stroke="#000" strokeWidth="3.5" />
            {/* Golden Shield Logo */}
            <polygon points="70,30 84,38 78,54 70,62 62,54 56,38" fill="#FACC15" stroke="#000" strokeWidth="2.5" />
            {/* 'T' for TABE Hero */}
            <text x="70" y="52" textAnchor="middle" fill="#DC2626" fontWeight="900" fontSize="16" fontFamily="Arial Black, sans-serif">
              T
            </text>
            {/* Hero Mask / Antifaz */}
            <path d="M54 34 C60 30 68 34 70 36 C72 34 80 30 86 34 C82 40 76 38 70 40 C64 38 58 40 54 34 Z" fill="#1E1B4B" stroke="#000" strokeWidth="2" />
            <circle cx="62" cy="35" r="2" fill="#FFF" />
            <circle cx="78" cy="35" r="2" fill="#FFF" />
          </svg>
        </div>
      );

    case "tabe-legend":
      // ÁRBOL BÚHO TABE DIVINO (Legendario 20h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="58" ry="14" fill="#000" stroke="#FFE600" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="52" ry="10" fill="#18181B" />
            <ellipse cx="70" cy="115" rx="38" ry="6" fill="#BFFF00" opacity="0.8" />
            {/* Sacred Golden Pedestal Trunk */}
            <path d="M52 116 C54 90 48 68 40 54 L100 54 C92 68 86 90 88 116 Z" fill="#D97706" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <path d="M62 66 L58 92 L64 114" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
            <path d="M78 66 L82 92 L76 114" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
            {/* Halo of Academic Stars */}
            <g className={animated ? "animate-spin-slow" : ""}>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <circle key={deg} cx={70 + 44 * Math.cos((deg * Math.PI) / 180)} cy={48 + 36 * Math.sin((deg * Math.PI) / 180)} r="3" fill="#FFE600" stroke="#000" strokeWidth="1" />
              ))}
            </g>
            {/* Divine Owl Body & Spread Golden Wings */}
            <path d="M38 68 C16 56 12 36 28 32 C38 42 46 54 48 66 Z" fill="#FACC15" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M102 68 C124 56 128 36 112 32 C102 42 94 54 92 66 Z" fill="#EAB308" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Owl Torso */}
            <ellipse cx="70" cy="56" rx="26" ry="30" fill="#FEF08A" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="62" rx="18" ry="20" fill="#FFF" stroke="#000" strokeWidth="2" />
            <path d="M64 56 Q70 60 76 56" stroke="#CA8A04" strokeWidth="2" fill="none" />
            <path d="M64 64 Q70 68 76 64" stroke="#CA8A04" strokeWidth="2" fill="none" />
            <path d="M64 72 Q70 76 76 72" stroke="#CA8A04" strokeWidth="2" fill="none" />
            {/* Owl Head & Feathers */}
            <circle cx="70" cy="34" r="22" fill="#FACC15" stroke="#000" strokeWidth="3.5" />
            <polygon points="52,20 58,10 64,22" fill="#EAB308" stroke="#000" strokeWidth="2.5" />
            <polygon points="88,20 82,10 76,22" fill="#EAB308" stroke="#000" strokeWidth="2.5" />
            {/* Big Divine Spectacles */}
            <circle cx="60" cy="34" r="9" fill="#00E5FF" fillOpacity="0.4" stroke="#000" strokeWidth="2.5" />
            <circle cx="80" cy="34" r="9" fill="#00E5FF" fillOpacity="0.4" stroke="#000" strokeWidth="2.5" />
            <line x1="69" y1="34" x2="71" y2="34" stroke="#000" strokeWidth="3" />
            <circle cx="60" cy="34" r="4.5" fill="#000" />
            <circle cx="80" cy="34" r="4.5" fill="#000" />
            <circle cx="58" cy="32" r="1.5" fill="#FFF" />
            <circle cx="78" cy="32" r="1.5" fill="#FFF" />
            {/* Golden Beak */}
            <polygon points="68,40 72,40 70,47" fill="#F97316" stroke="#000" strokeWidth="2" />
            {/* Floating TABE Spellbook */}
            <g transform="translate(56, 82)">
              <rect x="0" y="0" width="28" height="18" rx="3" fill="#2563EB" stroke="#000" strokeWidth="2.5" />
              <line x1="14" y1="0" x2="14" y2="18" stroke="#FFE600" strokeWidth="2" />
              <text x="14" y="13" fill="#FFF" fontSize="8" fontWeight="900" textAnchor="middle">TABE</text>
            </g>
          </svg>
        </div>
      );

    case "tabe-graduacion":
      // BÚHO DOCTORADO HONORIS CAUSA (Legendario 18h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#1E1B4B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="48" ry="10" fill="#312E81" />
            <path d="M54 116 C56 92 50 72 44 58 L96 58 C90 72 84 92 86 116 Z" fill="#1E1B4B" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            {/* Doctoral Robe Body */}
            <path d="M46 64 C40 80 44 110 52 116 L88 116 C96 110 100 80 94 64 Z" fill="#4C1D95" stroke="#000" strokeWidth="3.5" />
            <line x1="70" y1="64" x2="70" y2="116" stroke="#F59E0B" strokeWidth="3.5" />
            {/* Head with Mortarboard */}
            <circle cx="70" cy="42" r="20" fill="#78350F" stroke="#000" strokeWidth="3.5" />
            {/* Glasses */}
            <circle cx="62" cy="44" r="7.5" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <circle cx="78" cy="44" r="7.5" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <line x1="69" y1="44" x2="71" y2="44" stroke="#000" strokeWidth="2.5" />
            <circle cx="62" cy="44" r="3.5" fill="#000" />
            <circle cx="78" cy="44" r="3.5" fill="#000" />
            <polygon points="68,50 72,50 70,55" fill="#F97316" stroke="#000" strokeWidth="1.5" />
            {/* Mortarboard Hat (Birrete) */}
            <polygon points="70,12 108,24 70,36 32,24" fill="#0F172A" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="52,28 88,28 82,38 58,38" fill="#1E293B" stroke="#000" strokeWidth="2.5" />
            <circle cx="70" cy="24" r="3" fill="#F59E0B" />
            <path d="M70 24 C82 28 92 34 94 44" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="94" cy="44" r="2.5" fill="#F59E0B" />
            {/* Diploma Tied with Red Ribbon */}
            <g transform="translate(86, 78) rotate(-15)">
              <rect x="0" y="0" width="26" height="10" rx="3" fill="#FFFBEB" stroke="#000" strokeWidth="2" />
              <rect x="10" y="0" width="6" height="10" fill="#DC2626" stroke="#000" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      );

    case "joystick-god":
      // TRONO GAMING CUÁNTICO DIVINO (Legendario 16.6h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="124" rx="56" ry="14" fill="#18181B" stroke="#7C3AED" strokeWidth="3" />
            <ellipse cx="70" cy="120" rx="50" ry="10" fill="#3B0764" />
            <ellipse cx="70" cy="116" rx="36" ry="6" fill="#00E5FF" opacity="0.8" />
            {/* Quantum Throne Seat */}
            <path d="M38 108 L46 62 L94 62 L102 108 Z" fill="#27272A" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <rect x="42" y="32" width="56" height="52" rx="12" fill="#581C87" stroke="#000" strokeWidth="4" />
            <rect x="48" y="38" width="44" height="40" rx="8" fill="#7C3AED" />
            {/* Holographic Curved Display Arc */}
            <path d="M18 52 C26 24 114 24 122 52" stroke="#00E5FF" strokeWidth="6" strokeLinecap="round" />
            <path d="M18 52 C26 24 114 24 122 52" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            {/* Dual Golden Flight Sticks */}
            <g transform="translate(24, 68)">
              <rect x="0" y="10" width="18" height="24" rx="4" fill="#18181B" stroke="#000" strokeWidth="2.5" />
              <line x1="9" y1="10" x2="9" y2="0" stroke="#FACC15" strokeWidth="5" strokeLinecap="round" />
              <circle cx="9" cy="0" r="5" fill="#EF4444" stroke="#000" strokeWidth="2" />
            </g>
            <g transform="translate(98, 68)">
              <rect x="0" y="10" width="18" height="24" rx="4" fill="#18181B" stroke="#000" strokeWidth="2.5" />
              <line x1="9" y1="10" x2="9" y2="0" stroke="#FACC15" strokeWidth="5" strokeLinecap="round" />
              <circle cx="9" cy="0" r="5" fill="#3B82F6" stroke="#000" strokeWidth="2" />
            </g>
            {/* Crown Gaming Emblem */}
            <polygon points="56,22 62,32 70,20 78,32 84,22 82,34 58,34" fill="#FACC15" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Orbiting Quantum Holo Pixels */}
            <g className={animated ? "animate-spin-slow" : ""}>
              <rect x="14" y="28" width="8" height="8" fill="#00E5FF" stroke="#000" strokeWidth="1.5" />
              <rect x="118" y="28" width="8" height="8" fill="#F43F5E" stroke="#000" strokeWidth="1.5" />
              <rect x="66" y="8" width="8" height="8" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      );

    case "joystick-fightstick":
      // ARCADESTICK PRO (Lucha & Combos)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#18181B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#3F3F46" />
            <path d="M52 116 L56 78 L84 78 L88 116 Z" fill="#27272A" stroke="#000" strokeWidth="4" />
            {/* Heavy Arcade Panel Console */}
            <rect x="18" y="42" width="104" height="52" rx="8" fill="#18181B" stroke="#000" strokeWidth="4" />
            <rect x="22" y="46" width="96" height="44" rx="6" fill="#27272A" />
            {/* Big Sanwa Red Ball Joystick */}
            <circle cx="44" cy="68" r="14" fill="#3F3F46" stroke="#000" strokeWidth="2" />
            <line x1="44" y1="68" x2="44" y2="40" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
            <circle cx="44" cy="38" r="9" fill="#DC2626" stroke="#000" strokeWidth="2.5" />
            <circle cx="42" cy="35" r="2.5" fill="#FFF" />
            {/* 6 Convex Buttons Array */}
            <circle cx="72" cy="58" r="6" fill="#3B82F6" stroke="#000" strokeWidth="2" />
            <circle cx="88" cy="58" r="6" fill="#22C55E" stroke="#000" strokeWidth="2" />
            <circle cx="104" cy="58" r="6" fill="#FACC15" stroke="#000" strokeWidth="2" />
            <circle cx="72" cy="74" r="6" fill="#EF4444" stroke="#000" strokeWidth="2" />
            <circle cx="88" cy="74" r="6" fill="#A855F7" stroke="#000" strokeWidth="2" />
            <circle cx="104" cy="74" r="6" fill="#FFF" stroke="#000" strokeWidth="2" />
            {/* Combo Banner */}
            <g transform="translate(68, 16) rotate(-8)">
              <rect x="0" y="0" width="54" height="18" rx="4" fill="#FACC15" stroke="#000" strokeWidth="2.5" />
              <text x="27" y="13" fill="#000" fontSize="9" fontWeight="900" textAnchor="middle">KO! x99</text>
            </g>
          </svg>
        </div>
      );

    case "joystick-arcade":
      // MINI MÁQUINA ARCADE VINTAGE
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="52" ry="13" fill="#18181B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="46" ry="9" fill="#0284C7" />
            {/* Upright Arcade Cabinet Shape */}
            <polygon points="36,116 42,24 98,24 104,116" fill="#0F172A" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            {/* Marquee Header */}
            <rect x="44" y="26" width="52" height="18" rx="3" fill="#FACC15" stroke="#000" strokeWidth="2.5" />
            <text x="70" y="38" fill="#000" fontSize="8" fontWeight="900" textAnchor="middle">TABE ARCADE</text>
            {/* CRT Pixel Screen */}
            <rect x="46" y="48" width="48" height="34" rx="4" fill="#000" stroke="#38BDF8" strokeWidth="2.5" />
            <polygon points="70,54 64,66 76,66" fill="#4ADE80" />
            <circle cx="56" cy="58" r="2.5" fill="#EF4444" />
            <circle cx="84" cy="62" r="2" fill="#FACC15" />
            {/* Controls Deck */}
            <polygon points="40,86 100,86 104,100 36,100" fill="#334155" stroke="#000" strokeWidth="3" />
            <line x1="56" y1="94" x2="56" y2="86" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
            <circle cx="56" cy="85" r="4" fill="#EF4444" stroke="#000" strokeWidth="1.5" />
            <circle cx="76" cy="93" r="3.5" fill="#3B82F6" stroke="#000" strokeWidth="1.5" />
            <circle cx="88" cy="93" r="3.5" fill="#22C55E" stroke="#000" strokeWidth="1.5" />
            {/* Coin Door */}
            <rect x="62" y="104" width="16" height="12" rx="2" fill="#1E293B" stroke="#000" strokeWidth="2" />
            <line x1="70" y1="106" x2="70" y2="112" stroke="#FACC15" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case "cupcake-palace":
      // PALACIO DE AZÚCAR & DIAMANTES (Legendario 14.6h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="124" rx="56" ry="14" fill="#831843" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="120" rx="50" ry="10" fill="#BE185D" />
            {/* Royal Golden Waffle Base */}
            <polygon points="50,118 90,118 84,72 56,72" fill="#FBBF24" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <line x1="52" y1="102" x2="88" y2="102" stroke="#D97706" strokeWidth="2.5" />
            <line x1="55" y1="86" x2="85" y2="86" stroke="#D97706" strokeWidth="2.5" />
            {/* Tier 1 Frosting Cloud */}
            <ellipse cx="70" cy="72" rx="42" ry="18" fill="#F472B6" stroke="#000" strokeWidth="3.5" />
            {/* Tier 2 Castle Turrets */}
            <rect x="36" y="44" width="16" height="30" rx="3" fill="#FDE047" stroke="#000" strokeWidth="2.5" />
            <polygon points="44,28 32,44 56,44" fill="#EC4899" stroke="#000" strokeWidth="2.5" />
            <rect x="88" y="44" width="16" height="30" rx="3" fill="#FDE047" stroke="#000" strokeWidth="2.5" />
            <polygon points="96,28 84,44 108,44" fill="#EC4899" stroke="#000" strokeWidth="2.5" />
            {/* Center Royal Spire */}
            <ellipse cx="70" cy="48" rx="26" ry="16" fill="#FBCFE8" stroke="#000" strokeWidth="3" />
            <polygon points="70,18 56,48 84,48" fill="#A855F7" stroke="#000" strokeWidth="3" />
            {/* Sparkling Diamond Cherry */}
            <polygon points="70,8 77,16 70,24 63,16" fill="#38BDF8" stroke="#000" strokeWidth="2" />
            <polygon points="70,11 74,16 70,21 66,16" fill="#FFF" />
            {/* Sugar Gems */}
            <circle cx="50" cy="70" r="3.5" fill="#38BDF8" stroke="#000" strokeWidth="1" />
            <circle cx="70" cy="70" r="4" fill="#A855F7" stroke="#000" strokeWidth="1" />
            <circle cx="90" cy="70" r="3.5" fill="#22C55E" stroke="#000" strokeWidth="1" />
          </svg>
        </div>
      );

    case "cupcake-donut":
      // ÁRBOL MINI DONUT GLASEADO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="50" ry="13" fill="#78350F" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="44" ry="9" fill="#D97706" />
            <path d="M64 116 L64 36 L76 36 L76 116 Z" fill="#FBBF24" stroke="#000" strokeWidth="3.5" />
            {/* Bottom Giant Donut (Chocolate) */}
            <ellipse cx="70" cy="88" rx="36" ry="16" fill="#78350F" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="86" rx="34" ry="14" fill="#B45309" />
            <ellipse cx="70" cy="87" rx="10" ry="5" fill="#FBBF24" stroke="#000" strokeWidth="2" />
            {/* Middle Donut (Strawberry Pink with Sprinkles) */}
            <ellipse cx="70" cy="62" rx="30" ry="14" fill="#EC4899" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="60" rx="28" ry="12" fill="#F472B6" />
            <ellipse cx="70" cy="61" rx="8" ry="4" fill="#FBBF24" stroke="#000" strokeWidth="2" />
            {/* Rainbow Sprinkles on Pink Donut */}
            <line x1="52" y1="58" x2="56" y2="60" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />
            <line x1="82" y1="58" x2="86" y2="62" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <line x1="68" y1="54" x2="72" y2="54" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
            <line x1="62" y1="68" x2="66" y2="66" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            {/* Top Donut (Mint Cyan) */}
            <ellipse cx="70" cy="38" rx="24" ry="12" fill="#06B6D4" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="37" rx="22" ry="10" fill="#22D3EE" />
            <ellipse cx="70" cy="38" rx="6" ry="3" fill="#FBBF24" stroke="#000" strokeWidth="1.8" />
            {/* Top Cherry */}
            <circle cx="70" cy="20" r="7" fill="#DC2626" stroke="#000" strokeWidth="2" />
            <path d="M72 14 C76 8 82 8 86 10" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "comic-creator":
      // PLUMA DE AUTOR MAESTRO MANGA (Legendario 16h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#09090B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="48" ry="10" fill="#27272A" />
            {/* Ink Bottle Well Base */}
            <polygon points="46,116 94,116 98,90 42,90" fill="#3B0764" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="52" y="82" width="36" height="10" rx="3" fill="#7C3AED" stroke="#000" strokeWidth="2.5" />
            <text x="70" y="108" fill="#FACC15" fontSize="8" fontWeight="900" textAnchor="middle">INK ∞</text>
            {/* Giant Golden G-Pen Nib Shaft */}
            <polygon points="64,82 76,82 74,34 66,34" fill="#18181B" stroke="#000" strokeWidth="3" />
            <polygon points="62,36 78,36 74,12 70,4 66,12" fill="#FACC15" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <line x1="70" y1="4" x2="70" y2="24" stroke="#000" strokeWidth="2" />
            <circle cx="70" cy="24" r="2.5" fill="#3B0764" />
            {/* Dynamic Swirling Brush Arcs */}
            <path d="M22 64 C20 34 50 18 64 12" stroke="#7C3AED" strokeWidth="5" strokeLinecap="round" />
            <path d="M22 64 C20 34 50 18 64 12" stroke="#000" strokeWidth="9" strokeLinecap="round" className="-z-10" />
            <path d="M118 64 C120 34 90 18 76 12" stroke="#FACC15" strokeWidth="5" strokeLinecap="round" />
            <path d="M118 64 C120 34 90 18 76 12" stroke="#000" strokeWidth="9" strokeLinecap="round" className="-z-10" />
            {/* Floating Manuscript Panels */}
            <g transform="translate(18, 56) rotate(-20)">
              <rect x="0" y="0" width="26" height="34" rx="2" fill="#FFF" stroke="#000" strokeWidth="2" />
              <line x1="4" y1="8" x2="22" y2="8" stroke="#000" strokeWidth="1.5" />
              <line x1="4" y1="16" x2="16" y2="16" stroke="#000" strokeWidth="1.5" />
            </g>
            <g transform="translate(98, 54) rotate(20)">
              <rect x="0" y="0" width="26" height="34" rx="2" fill="#FFF" stroke="#000" strokeWidth="2" />
              <circle cx="13" cy="14" r="6" fill="#FDE047" stroke="#000" strokeWidth="1.2" />
              <line x1="4" y1="26" x2="22" y2="26" stroke="#000" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      );

    case "comic-villano":
      // CÓMIC ARCHI-VILLANO NOIR
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#09090B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="48" ry="10" fill="#3B0764" />
            {/* Dark Spiky Trunk */}
            <path d="M54 116 L58 60 L82 60 L86 116 Z" fill="#18181B" stroke="#000" strokeWidth="4" />
            {/* Sinister Cloak Shape */}
            <polygon points="70,16 26,78 48,110 92,110 114,78" fill="#18181B" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <polygon points="70,22 34,76 52,104 88,104 106,76" fill="#4A044E" />
            {/* Glowing Sinister Magenta Eyes */}
            <ellipse cx="60" cy="52" rx="7" ry="3" fill="#F43F5E" stroke="#000" strokeWidth="1.5" transform="rotate(-15 60 52)" />
            <ellipse cx="80" cy="52" rx="7" ry="3" fill="#F43F5E" stroke="#000" strokeWidth="1.5" transform="rotate(15 80 52)" />
            <circle cx="61" cy="52" r="1.5" fill="#FFF" />
            <circle cx="79" cy="52" r="1.5" fill="#FFF" />
            {/* Crackling Purple Lightning Arcs */}
            <polygon points="32,24 24,42 30,42 22,62 36,44 28,44" fill="#D946EF" stroke="#000" strokeWidth="1.5" />
            <polygon points="108,24 116,42 110,42 118,62 104,44 112,44" fill="#D946EF" stroke="#000" strokeWidth="1.5" />
            <g transform="translate(48, 88)">
              <rect x="0" y="0" width="44" height="16" rx="4" fill="#DC2626" stroke="#000" strokeWidth="2" />
              <text x="22" y="12" fill="#FFF" fontSize="8" fontWeight="900" textAnchor="middle">MUAHAHA</text>
            </g>
          </svg>
        </div>
      );

    case "soda-hyperdrive":
      // REACTOR LÍQUIDO HYPERDRIVE (Legendario 15h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="124" rx="55" ry="14" fill="#083344" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="120" rx="48" ry="10" fill="#0E7490" />
            {/* Dual Sci-Fi Booster Struts */}
            <rect x="36" y="70" width="14" height="48" rx="4" fill="#334155" stroke="#000" strokeWidth="3" />
            <rect x="90" y="70" width="14" height="48" rx="4" fill="#334155" stroke="#000" strokeWidth="3" />
            {/* Glowing Coolant Plasma Cylinder */}
            <rect x="48" y="24" width="44" height="78" rx="10" fill="#0284C7" stroke="#000" strokeWidth="4" />
            <rect x="52" y="28" width="36" height="70" rx="8" fill="#00E5FF" />
            {/* Plasma bubbles */}
            <circle cx="62" cy="46" r="4" fill="#FFF" />
            <circle cx="76" cy="62" r="5" fill="#FFF" />
            <circle cx="64" cy="78" r="3.5" fill="#FFF" />
            {/* Reactor Top Cap with Danger Stripes */}
            <rect x="44" y="16" width="52" height="12" rx="4" fill="#FACC15" stroke="#000" strokeWidth="3" />
            <line x1="52" y1="16" x2="48" y2="28" stroke="#000" strokeWidth="2.5" />
            <line x1="64" y1="16" x2="60" y2="28" stroke="#000" strokeWidth="2.5" />
            <line x1="76" y1="16" x2="72" y2="28" stroke="#000" strokeWidth="2.5" />
            <line x1="88" y1="16" x2="84" y2="28" stroke="#000" strokeWidth="2.5" />
            {/* Analog Gauge */}
            <circle cx="70" cy="50" r="10" fill="#FFF" stroke="#000" strokeWidth="2" />
            <line x1="70" y1="50" x2="76" y2="44" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <text x="70" y="94" fill="#000" fontSize="7" fontWeight="900" textAnchor="middle">HYPER</text>
          </svg>
        </div>
      );

    case "soda-cola":
      // BOTELLA DE COLA VINTAGE
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#450A0A" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="42" ry="8" fill="#DC2626" />
            {/* Wooden Crate / Stem */}
            <rect x="52" y="98" width="36" height="22" rx="3" fill="#78350F" stroke="#000" strokeWidth="3" />
            <line x1="52" y1="108" x2="88" y2="108" stroke="#B45309" strokeWidth="2" />
            {/* Contoured Glass Cola Bottle */}
            <path
              d="M58 98 C54 84 52 70 56 56 C58 48 64 36 64 22 L76 22 C76 36 82 48 84 56 C88 70 86 84 82 98 Z"
              fill="#18181B"
              stroke="#000"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Red Script Brand Label */}
            <rect x="54" y="60" width="32" height="18" rx="2" fill="#DC2626" stroke="#000" strokeWidth="1.5" />
            <text x="70" y="72" fill="#FFF" fontSize="8" fontWeight="900" fontStyle="italic" textAnchor="middle">Cola</text>
            {/* Metal Crown Bottle Cap */}
            <rect x="62" y="16" width="16" height="7" rx="1.5" fill="#E2E8F0" stroke="#000" strokeWidth="2" />
            {/* Fizz Bubbles */}
            <circle cx="68" cy="12" r="3" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
            <circle cx="76" cy="6" r="2.5" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
            <circle cx="62" cy="4" r="2" fill="#BAE6FD" stroke="#000" strokeWidth="1" />
          </svg>
        </div>
      );

    case "pizza-buffet":
      // BUFFET LEGENDARIO SIN LÍMITES (Legendario 14h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="124" rx="58" ry="14" fill="#713F12" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="120" rx="52" ry="10" fill="#FACC15" />
            {/* Golden Imperial Banquet Table Pedestal */}
            <polygon points="46,118 94,118 84,78 56,78" fill="#D97706" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Grand Golden Platter */}
            <ellipse cx="70" cy="78" rx="52" ry="16" fill="#FDE047" stroke="#000" strokeWidth="4" />
            <ellipse cx="70" cy="76" rx="46" ry="12" fill="#FEF08A" />
            {/* Whole Pizza on Left */}
            <circle cx="50" cy="66" r="20" fill="#F59E0B" stroke="#000" strokeWidth="2.5" />
            <circle cx="50" cy="66" r="16" fill="#FDE047" />
            <circle cx="44" cy="62" r="3.5" fill="#DC2626" />
            <circle cx="56" cy="62" r="3.5" fill="#DC2626" />
            <circle cx="50" cy="72" r="3.5" fill="#DC2626" />
            {/* French Fries Carton on Right */}
            <polygon points="82,76 100,76 98,54 84,54" fill="#DC2626" stroke="#000" strokeWidth="2" />
            <line x1="86" y1="54" x2="84" y2="40" stroke="#FACC15" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="90" y1="54" x2="90" y2="36" stroke="#FACC15" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="94" y1="54" x2="96" y2="38" stroke="#FACC15" strokeWidth="3.5" strokeLinecap="round" />
            {/* Towering Double Burger on Top Center */}
            <ellipse cx="70" cy="48" rx="14" ry="5" fill="#78350F" stroke="#000" strokeWidth="2" />
            <rect x="58" y="42" width="24" height="4" rx="2" fill="#22C55E" />
            <rect x="56" y="38" width="28" height="5" rx="2.5" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
            <path d="M56 38 C56 26 84 26 84 38 Z" fill="#D97706" stroke="#000" strokeWidth="2.5" />
            <circle cx="64" cy="32" r="0.8" fill="#FEF08A" />
            <circle cx="70" cy="30" r="0.8" fill="#FEF08A" />
            <circle cx="76" cy="32" r="0.8" fill="#FEF08A" />
          </svg>
        </div>
      );

    case "pizza-hamburguesa":
      // HAMBURGUESA GAMER TOWER
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="50" ry="12" fill="#713F12" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="44" ry="8" fill="#D97706" />
            {/* Bottom Bun */}
            <path d="M42 108 C42 116 98 116 98 108 L94 100 L46 100 Z" fill="#D97706" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Patty 1 */}
            <rect x="40" y="92" width="60" height="10" rx="4" fill="#451A03" stroke="#000" strokeWidth="3" />
            {/* Melted Cheddar Sheet */}
            <polygon points="38,92 102,92 98,98 88,96 82,102 70,95 62,102 54,95 44,98" fill="#FACC15" stroke="#000" strokeWidth="2" />
            {/* Lettuce Layer */}
            <path d="M36 84 Q44 90 52 84 Q60 90 68 84 Q76 90 84 84 Q92 90 104 84" stroke="#22C55E" strokeWidth="7" strokeLinecap="round" />
            {/* Patty 2 */}
            <rect x="40" y="70" width="60" height="10" rx="4" fill="#451A03" stroke="#000" strokeWidth="3" />
            {/* Tomato Slices */}
            <rect x="46" y="64" width="22" height="6" rx="3" fill="#DC2626" stroke="#000" strokeWidth="2" />
            <rect x="72" y="64" width="22" height="6" rx="3" fill="#DC2626" stroke="#000" strokeWidth="2" />
            {/* Top Sesame Bun Dome */}
            <path d="M40 64 C40 34 100 34 100 64 Z" fill="#D97706" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <ellipse cx="70" cy="46" rx="24" ry="10" fill="#F59E0B" />
            {/* Sesame Seeds */}
            <circle cx="56" cy="48" r="1.5" fill="#FEF08A" />
            <circle cx="68" cy="42" r="1.5" fill="#FEF08A" />
            <circle cx="80" cy="46" r="1.5" fill="#FEF08A" />
            <circle cx="62" cy="54" r="1.5" fill="#FEF08A" />
            <circle cx="76" cy="54" r="1.5" fill="#FEF08A" />
            {/* Little Flag Toothpick on Top */}
            <line x1="70" y1="36" x2="70" y2="18" stroke="#000" strokeWidth="2" />
            <polygon points="70,18 86,24 70,30" fill="#DC2626" stroke="#000" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case "coffee-infinity":
      // CAFÉ INFINITO DE LOS DIOSES (Legendario 15.8h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="124" rx="55" ry="14" fill="#1C1917" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="120" rx="48" ry="10" fill="#451A03" />
            {/* Ancient Obsidian Chalice Stem */}
            <path d="M56 118 L64 78 L76 78 L84 118 Z" fill="#18181B" stroke="#000" strokeWidth="4" />
            <ellipse cx="70" cy="78" rx="20" ry="6" fill="#F59E0B" stroke="#000" strokeWidth="2" />
            {/* Sacred Chalice Cup */}
            <path d="M38 46 C38 78 102 78 102 46 Z" fill="#1C1917" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <ellipse cx="70" cy="46" rx="32" ry="12" fill="#78350F" stroke="#000" strokeWidth="3" />
            {/* Swirling Golden Espresso Nebula */}
            <ellipse cx="70" cy="46" rx="26" ry="9" fill="#D97706" />
            <ellipse cx="70" cy="46" rx="16" ry="5" fill="#FDE047" />
            <path d="M62 46 Q70 42 78 46" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            {/* Golden Arcane Rune Glyphs on Cup */}
            <circle cx="56" cy="62" r="3" fill="#F59E0B" />
            <circle cx="70" cy="66" r="3.5" fill="#F59E0B" />
            <circle cx="84" cy="62" r="3" fill="#F59E0B" />
            {/* Rising Golden Spiral Steam & Beans */}
            <g className={animated ? "animate-pulse" : ""}>
              <path d="M60 36 C56 26 66 18 62 8" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M74 34 C78 24 68 16 74 6" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" fill="none" />
              <ellipse cx="44" cy="24" rx="4" ry="2.5" fill="#78350F" stroke="#000" strokeWidth="1.2" transform="rotate(-30 44 24)" />
              <ellipse cx="96" cy="22" rx="4" ry="2.5" fill="#78350F" stroke="#000" strokeWidth="1.2" transform="rotate(30 96 22)" />
            </g>
          </svg>
        </div>
      );

    case "coffee-frappe":
      // FRAPPUCCINO TALL GLASS
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#78350F" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="42" ry="8" fill="#B45309" />
            {/* Clear Cup Shape */}
            <polygon points="50,116 90,116 98,54 42,54" fill="#FFF7ED" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Layered Coffee & Milk */}
            <polygon points="51,114 89,114 92,92 48,92" fill="#78350F" />
            <polygon points="48,92 92,92 95,70 45,70" fill="#D97706" />
            <polygon points="45,70 95,70 97,56 43,56" fill="#FED7AA" />
            {/* Whipped Cream Mountain Dome */}
            <ellipse cx="70" cy="54" rx="28" ry="12" fill="#FFF" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="42" rx="22" ry="12" fill="#FFF" stroke="#000" strokeWidth="3" />
            <circle cx="70" cy="30" r="10" fill="#FFF" stroke="#000" strokeWidth="3" />
            {/* Caramel Drizzle */}
            <path d="M54 44 Q70 38 86 44" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M58 52 Q70 46 82 52" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
            {/* Green Straw */}
            <line x1="78" y1="46" x2="88" y2="10" stroke="#15803D" strokeWidth="5" strokeLinecap="round" />
            <line x1="78" y1="46" x2="88" y2="10" stroke="#000" strokeWidth="9" strokeLinecap="round" className="-z-10" />
          </svg>
        </div>
      );

    case "golden":
      // ÁRBOL DE ORO IMPERIAL (Legendario 16.6h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#713F12" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#FACC15" />
            {/* Solid Gold Bullion Trunk */}
            <path d="M58 116 C60 92 56 74 48 58 L92 58 C84 74 80 92 82 116 Z" fill="#EAB308" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <path d="M66 70 L64 114" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" />
            <path d="M74 65 L76 114" stroke="#CA8A04" strokeWidth="3" strokeLinecap="round" />
            {/* Gold Cloud Canopy */}
            <ellipse cx="36" cy="54" rx="26" ry="20" fill="#CA8A04" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="58" rx="26" ry="20" fill="#CA8A04" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="34" rx="30" ry="24" fill="#EAB308" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="36" rx="30" ry="24" fill="#EAB308" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="24" rx="34" ry="26" fill="#FACC15" stroke="#000" strokeWidth="4" />
            <ellipse cx="68" cy="18" rx="20" ry="12" fill="#FEF08A" />
            {/* Shimmering Gold Coins Hanging */}
            {[
              { x: 38, y: 52 },
              { x: 60, y: 36 },
              { x: 84, y: 34 },
              { x: 104, y: 56 },
              { x: 50, y: 66 },
              { x: 84, y: 64 },
            ].map((coin, i) => (
              <g key={i}>
                <circle cx={coin.x} cy={coin.y} r="7" fill="#FACC15" stroke="#000" strokeWidth="2" />
                <circle cx={coin.x} cy={coin.y} r="5" fill="#FEF08A" />
                <text x={coin.x} y={coin.y + 2.5} fill="#713F12" fontSize="6" fontWeight="900" textAnchor="middle">★</text>
              </g>
            ))}
          </svg>
        </div>
      );

    case "rainbow":
      // ÁRBOL PRISMA ARCOÍRIS (Legendario 18h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#312E81" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#38BDF8" />
            {/* Crystal Prism Trunk */}
            <polygon points="56,116 84,116 76,64 64,64" fill="#F8FAFC" stroke="#000" strokeWidth="3.5" />
            <line x1="70" y1="64" x2="70" y2="116" stroke="#94A3B8" strokeWidth="2" />
            {/* 7 Arched Rainbow Bands */}
            <path d="M24 72 A 46 46 0 0 1 116 72" stroke="#EF4444" strokeWidth="6" fill="none" />
            <path d="M28 72 A 42 42 0 0 1 112 72" stroke="#F97316" strokeWidth="6" fill="none" />
            <path d="M32 72 A 38 38 0 0 1 108 72" stroke="#FACC15" strokeWidth="6" fill="none" />
            <path d="M36 72 A 34 34 0 0 1 104 72" stroke="#22C55E" strokeWidth="6" fill="none" />
            <path d="M40 72 A 30 30 0 0 1 100 72" stroke="#06B6D4" strokeWidth="6" fill="none" />
            <path d="M44 72 A 26 26 0 0 1 96 72" stroke="#3B82F6" strokeWidth="6" fill="none" />
            <path d="M48 72 A 22 22 0 0 1 92 72" stroke="#A855F7" strokeWidth="6" fill="none" />
            {/* Fluffy Pastel Clouds at the base of rainbow */}
            <ellipse cx="32" cy="72" rx="16" ry="10" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <ellipse cx="108" cy="72" rx="16" ry="10" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            {/* Prism Star at apex */}
            <polygon points="70,14 74,22 82,24 76,28 78,36 70,32 62,36 64,28 58,24 66,22" fill="#FFF" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
      );

    case "celestial":
      // SAUCE CELESTIAL DE ESTRELLAS (Legendario 19h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, dynamicAnim, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#030712" stroke="#38BDF8" strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="48" ry="10" fill="#0C4A6E" />
            {/* Midnight Trunk */}
            <path d="M58 116 C60 92 56 74 48 58 L92 58 C84 74 80 92 82 116 Z" fill="#0F172A" stroke="#000" strokeWidth="4" />
            <path d="M66 75 L64 114" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            {/* Luminous Weeping Willow Tendrils with Constellations */}
            <ellipse cx="70" cy="40" rx="46" ry="26" fill="#0284C7" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="34" rx="36" ry="18" fill="#38BDF8" />
            {/* Hanging Star Strands */}
            <path d="M28 44 C26 66 30 86 28 106" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            <path d="M42 48 C40 72 44 94 42 110" stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M54 50 C52 75 56 96 54 112" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
            <path d="M86 50 C88 75 84 96 86 112" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
            <path d="M98 48 C100 72 96 94 98 110" stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M112 44 C114 66 110 86 112 106" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            {/* Star Constellations */}
            <circle cx="28" cy="106" r="3" fill="#FFF" stroke="#000" strokeWidth="1" />
            <circle cx="42" cy="110" r="3.5" fill="#FFF" stroke="#000" strokeWidth="1" />
            <circle cx="54" cy="112" r="3" fill="#FFF" stroke="#000" strokeWidth="1" />
            <circle cx="86" cy="112" r="3" fill="#FFF" stroke="#000" strokeWidth="1" />
            <circle cx="98" cy="110" r="3.5" fill="#FFF" stroke="#000" strokeWidth="1" />
            <circle cx="112" cy="106" r="3" fill="#FFF" stroke="#000" strokeWidth="1" />
            {/* Crescent Moon Crest on Canopy */}
            <path d="M66 14 A 12 12 0 0 0 78 28 A 10 10 0 0 1 66 14" fill="#FDE047" stroke="#000" strokeWidth="1.8" />
          </svg>
        </div>
      );

    case "mushroom":
      // CHAMPIÑÓN DE FOCO (Express 20m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#3F2E23" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="42" ry="8" fill="#15803D" />
            <path d="M42 118 L46 110 L50 118" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M92 118 L96 112 L100 118" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d="M56 116 C54 90 56 68 60 56 L80 56 C84 68 86 90 84 116 Z"
              fill="#F5F5F4"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M64 70 L64 105" stroke="#E7E5E4" strokeWidth="3" strokeLinecap="round" />
            <path d="M76 72 L76 100" stroke="#E7E5E4" strokeWidth="3" strokeLinecap="round" />
            <circle cx="65" cy="85" r="2.5" fill="#1C1917" />
            <circle cx="75" cy="85" r="2.5" fill="#1C1917" />
            <circle cx="64" cy="84" r="0.8" fill="#FFF" />
            <circle cx="74" cy="84" r="0.8" fill="#FFF" />
            <ellipse cx="61" cy="89" rx="2" ry="1.2" fill="#F472B6" />
            <ellipse cx="79" cy="89" rx="2" ry="1.2" fill="#F472B6" />
            <path d="M68 90 Q70 93 72 90" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />
            <path
              d="M24 64 C24 28 44 18 70 18 C96 18 116 28 116 64 C100 68 85 64 70 65 C55 64 40 68 24 64 Z"
              fill="#EF4444"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <ellipse cx="70" cy="64" rx="46" ry="10" fill="#DC2626" stroke="#000" strokeWidth="3" />
            <circle cx="48" cy="40" r="10" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <circle cx="92" cy="42" r="9" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <circle cx="70" cy="30" r="12" fill="#FFF" stroke="#000" strokeWidth="2.5" />
            <circle cx="32" cy="54" r="6" fill="#FFF" stroke="#000" strokeWidth="2" />
            <circle cx="108" cy="54" r="6" fill="#FFF" stroke="#000" strokeWidth="2" />
            <g className={animated ? "animate-pulse" : ""}>
              <polygon points="26,28 28,32 32,34 28,36 26,40 24,36 20,34 24,32" fill="#FDE047" stroke="#000" strokeWidth="1.2" />
              <polygon points="114,24 116,28 120,30 116,32 114,36 112,32 108,30 112,28" fill="#FDE047" stroke="#000" strokeWidth="1.2" />
            </g>
          </svg>
        </div>
      );

    case "bamboo":
      // BROTE DE BAMBÚ (Express 25m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#14532D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="42" ry="8" fill="#15803D" />
            <g>
              <rect x="44" y="85" width="10" height="32" rx="2" fill="#22C55E" stroke="#000" strokeWidth="3" />
              <rect x="44" y="55" width="10" height="28" rx="2" fill="#4ADE80" stroke="#000" strokeWidth="3" />
              <rect x="44" y="28" width="10" height="25" rx="2" fill="#86EFAC" stroke="#000" strokeWidth="3" />
              <line x1="41" y1="84" x2="57" y2="84" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="41" y1="54" x2="57" y2="54" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="41" y1="27" x2="57" y2="27" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            <g>
              <rect x="64" y="80" width="13" height="38" rx="2" fill="#16A34A" stroke="#000" strokeWidth="3.5" />
              <rect x="64" y="46" width="13" height="32" rx="2" fill="#22C55E" stroke="#000" strokeWidth="3.5" />
              <rect x="64" y="16" width="13" height="28" rx="2" fill="#4ADE80" stroke="#000" strokeWidth="3.5" />
              <line x1="61" y1="79" x2="80" y2="79" stroke="#000" strokeWidth="4" strokeLinecap="round" />
              <line x1="61" y1="45" x2="80" y2="45" stroke="#000" strokeWidth="4" strokeLinecap="round" />
              <line x1="61" y1="15" x2="80" y2="15" stroke="#000" strokeWidth="4" strokeLinecap="round" />
            </g>
            <g>
              <rect x="86" y="75" width="9" height="42" rx="2" fill="#15803D" stroke="#000" strokeWidth="3" />
              <rect x="86" y="42" width="9" height="31" rx="2" fill="#16A34A" stroke="#000" strokeWidth="3" />
              <rect x="86" y="18" width="9" height="22" rx="2" fill="#22C55E" stroke="#000" strokeWidth="3" />
              <line x1="83" y1="74" x2="98" y2="74" stroke="#000" strokeWidth="3" strokeLinecap="round" />
              <line x1="83" y1="41" x2="98" y2="41" stroke="#000" strokeWidth="3" strokeLinecap="round" />
              <line x1="83" y1="17" x2="98" y2="17" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            </g>
            <path d="M44 54 C30 50 20 60 16 68 C24 66 36 62 44 58 Z" fill="#16A34A" stroke="#000" strokeWidth="2.5" />
            <path d="M44 32 C28 26 18 36 12 44 C22 42 34 38 44 35 Z" fill="#22C55E" stroke="#000" strokeWidth="2.5" />
            <path d="M77 46 C92 40 106 48 114 56 C102 56 88 52 77 48 Z" fill="#4ADE80" stroke="#000" strokeWidth="2.5" />
            <path d="M70 16 C62 4 74 2 82 2 C80 8 76 14 70 16 Z" fill="#86EFAC" stroke="#000" strokeWidth="2.5" />
            <path d="M95 42 C108 34 122 38 128 46 C118 46 106 44 95 43 Z" fill="#22C55E" stroke="#000" strokeWidth="2.5" />
            <path d="M30 114 Q70 110 110 114" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      );

    case "cupcake":
      // ÁRBOL CUPCAKE DULCE (Express 25m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#78350F" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="42" ry="8" fill={primaryColor || "#F472B6"} />
            <polygon points="56,118 84,118 78,65 62,65" fill="#FBBF24" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <line x1="58" y1="100" x2="82" y2="100" stroke="#D97706" strokeWidth="2.5" />
            <line x1="60" y1="82" x2="80" y2="82" stroke="#D97706" strokeWidth="2.5" />
            <line x1="66" y1="65" x2="74" y2="118" stroke="#D97706" strokeWidth="2" />
            <path
              d="M32 68 C22 54 36 38 52 44 C50 30 70 20 84 28 C96 18 116 32 110 48 C122 58 116 76 102 74 C90 78 80 72 70 74 C60 72 44 78 32 68 Z"
              fill={primaryColor || "#F472B6"}
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <ellipse cx="70" cy="46" rx="28" ry="16" fill={accentColor || "#FBCFE8"} stroke="#000" strokeWidth="3" />
            <path d="M52 48 Q70 38 88 48" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
            <rect x="44" y="55" width="8" height="3" rx="1.5" fill="#38BDF8" stroke="#000" strokeWidth="1" transform="rotate(25 44 55)" />
            <rect x="88" y="52" width="8" height="3" rx="1.5" fill="#FDE047" stroke="#000" strokeWidth="1" transform="rotate(-30 88 52)" />
            <rect x="64" y="38" width="7" height="3" rx="1.5" fill="#4ADE80" stroke="#000" strokeWidth="1" transform="rotate(45 64 38)" />
            <rect x="76" y="58" width="8" height="3" rx="1.5" fill="#A855F7" stroke="#000" strokeWidth="1" transform="rotate(-15 76 58)" />
            <rect x="98" y="62" width="7" height="3" rx="1.5" fill="#EF4444" stroke="#000" strokeWidth="1" transform="rotate(20 98 62)" />
            <circle cx="70" cy="22" r="10" fill={accentColor || "#EF4444"} stroke="#000" strokeWidth="2.5" />
            <path d="M72 14 C76 8 84 6 90 8" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="67" cy="19" r="2.5" fill="#FFF" />
          </svg>
        </div>
      );

    case "soda":
      // ÁRBOL REFRESCO GAMER (Fácil 45m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="48" ry="12" fill="#0891B2" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="42" ry="8" fill={primaryColor || "#06B6D4"} />
            <path
              d="M58 118 L62 70 L78 70 L82 118 Z"
              fill="#94A3B8"
              stroke="#000"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path d="M68 70 L66 118" stroke="#E2E8F0" strokeWidth="3" />
            <path d="M62 85 C45 80 35 65 30 55" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />
            <path d="M62 85 C45 80 35 65 30 55" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            <path d="M78 80 C95 75 105 60 110 50" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />
            <path d="M78 80 C95 75 105 60 110 50" stroke="#000" strokeWidth="10" strokeLinecap="round" className="-z-10" />
            <g transform="translate(56, 25)">
              <rect x="0" y="4" width="28" height="44" rx="4" fill={primaryColor || "#0284C7"} stroke="#000" strokeWidth="3" />
              <ellipse cx="14" cy="4" rx="14" ry="4" fill="#E2E8F0" stroke="#000" strokeWidth="2.5" />
              <ellipse cx="14" cy="48" rx="14" ry="4" fill="#0369A1" stroke="#000" strokeWidth="2" />
              <polygon points="16,14 10,26 15,26 12,38 20,24 15,24" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
            </g>
            <g transform="translate(18, 38) rotate(-15)">
              <rect x="0" y="4" width="22" height="34" rx="3" fill={accentColor || "#DC2626"} stroke="#000" strokeWidth="2.5" />
              <ellipse cx="11" cy="4" rx="11" ry="3.5" fill="#E2E8F0" stroke="#000" strokeWidth="2" />
              <path d="M6 18 Q11 24 16 18" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g transform="translate(98, 34) rotate(15)">
              <rect x="0" y="4" width="22" height="34" rx="3" fill="#84CC16" stroke="#000" strokeWidth="2.5" />
              <ellipse cx="11" cy="4" rx="11" ry="3.5" fill="#E2E8F0" stroke="#000" strokeWidth="2" />
              <circle cx="11" cy="20" r="5" fill="#FACC15" stroke="#000" strokeWidth="1.2" />
            </g>
            <g className={animated ? "animate-pulse" : ""}>
              <circle cx="68" cy="18" r="3.5" fill="#E0F2FE" stroke="#000" strokeWidth="1.2" />
              <circle cx="75" cy="12" r="2.5" fill="#E0F2FE" stroke="#000" strokeWidth="1" />
              <circle cx="62" cy="10" r="2" fill="#E0F2FE" stroke="#000" strokeWidth="1" />
              <circle cx="32" cy="30" r="2.5" fill="#E0F2FE" stroke="#000" strokeWidth="1" />
              <circle cx="108" cy="24" r="2.5" fill="#E0F2FE" stroke="#000" strokeWidth="1" />
            </g>
          </svg>
        </div>
      );

    case "clover":
      // TRÉBOL DE LA SUERTE (4 Hojas)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#14532D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="40" ry="8" fill="#16A34A" />
            {/* Curved Green Stem */}
            <path d="M70 118 C68 96 66 76 70 58" stroke="#15803D" strokeWidth="7" strokeLinecap="round" />
            <path d="M70 118 C68 96 66 76 70 58" stroke="#000" strokeWidth="11" strokeLinecap="round" className="-z-10" />
            {/* 4 Clover Leaves (Heart-shaped clusters) */}
            {/* Top Leaf */}
            <g transform="translate(70, 42)">
              <ellipse cx="-8" cy="-14" rx="14" ry="16" fill="#4ADE80" stroke="#000" strokeWidth="3" transform="rotate(-15 -8 -14)" />
              <ellipse cx="8" cy="-14" rx="14" ry="16" fill="#22C55E" stroke="#000" strokeWidth="3" transform="rotate(15 8 -14)" />
              <ellipse cx="-5" cy="-16" rx="6" ry="9" fill="#BBF7D0" />
            </g>
            {/* Bottom Leaf */}
            <g transform="translate(70, 72)">
              <ellipse cx="-8" cy="10" rx="14" ry="16" fill="#22C55E" stroke="#000" strokeWidth="3" transform="rotate(15 -8 10)" />
              <ellipse cx="8" cy="10" rx="14" ry="16" fill="#16A34A" stroke="#000" strokeWidth="3" transform="rotate(-15 8 10)" />
              <ellipse cx="-5" cy="8" rx="6" ry="9" fill="#86EFAC" />
            </g>
            {/* Left Leaf */}
            <g transform="translate(44, 58)">
              <ellipse cx="-12" cy="-8" rx="16" ry="14" fill="#4ADE80" stroke="#000" strokeWidth="3" transform="rotate(-15 -12 -8)" />
              <ellipse cx="-12" cy="8" rx="16" ry="14" fill="#22C55E" stroke="#000" strokeWidth="3" transform="rotate(15 -12 8)" />
              <ellipse cx="-14" cy="-5" rx="9" ry="6" fill="#BBF7D0" />
            </g>
            {/* Right Leaf */}
            <g transform="translate(96, 58)">
              <ellipse cx="12" cy="-8" rx="16" ry="14" fill="#22C55E" stroke="#000" strokeWidth="3" transform="rotate(15 12 -8)" />
              <ellipse cx="12" cy="8" rx="16" ry="14" fill="#16A34A" stroke="#000" strokeWidth="3" transform="rotate(-15 12 8)" />
              <ellipse cx="14" cy="-5" rx="9" ry="6" fill="#86EFAC" />
            </g>
            {/* Golden Sparkles */}
            <g className={animated ? "animate-pulse" : ""}>
              <polygon points="106,30 108,34 112,36 108,38 106,42 104,38 100,36 104,34" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
              <polygon points="34,44 35,47 38,48 35,49 34,52 33,49 30,48 33,47" fill="#FACC15" stroke="#000" strokeWidth="1" />
            </g>
          </svg>
        </div>
      );

    case "sunflower":
      // GIRASOL DE FOCO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="46" ry="12" fill="#5C3D2E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="40" ry="8" fill="#784E38" />
            {/* Thick Green Stem with Leaf */}
            <path d="M70 118 L70 56" stroke="#16A34A" strokeWidth="8" strokeLinecap="round" />
            <path d="M70 118 L70 56" stroke="#000" strokeWidth="12" strokeLinecap="round" className="-z-10" />
            <path d="M70 88 C50 82 40 92 46 100 C58 102 68 94 70 88 Z" fill="#22C55E" stroke="#000" strokeWidth="2.5" />
            <path d="M70 78 C90 72 100 82 94 90 C82 92 72 84 70 78 Z" fill="#4ADE80" stroke="#000" strokeWidth="2.5" />
            {/* Golden Petals Ring */}
            <g transform="translate(70, 50)" className={animated ? "animate-spin-slow" : ""}>
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <ellipse key={deg} cx="0" cy="-32" rx="9" ry="18" fill="#FACC15" stroke="#000" strokeWidth="2" transform={`rotate(${deg})`} />
              ))}
            </g>
            {/* Big Rich Seed Center */}
            <circle cx="70" cy="50" r="22" fill="#713F12" stroke="#000" strokeWidth="3.5" />
            <circle cx="70" cy="50" r="18" fill="#451A03" />
            {/* Face/Seeds Pattern */}
            <circle cx="64" cy="46" r="3" fill="#000" />
            <circle cx="76" cy="46" r="3" fill="#000" />
            <circle cx="63" cy="45" r="1" fill="#FFF" />
            <circle cx="75" cy="45" r="1" fill="#FFF" />
            <path d="M66 54 Q70 58 74 54" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "cactus":
      // CACTUS GUARDIÁN
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Terracotta Pot */}
            <polygon points="46,104 94,104 88,126 52,126" fill="#C2410C" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <rect x="42" y="98" width="56" height="8" rx="2" fill="#EA580C" stroke="#000" strokeWidth="3" />
            {/* Main Center Cactus Body */}
            <rect x="58" y="38" width="24" height="64" rx="12" fill="#10B981" stroke="#000" strokeWidth="3.5" />
            <path d="M64 42 L64 96" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M76 42 L76 96" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left Arm */}
            <path d="M60 74 L42 74 C36 74 34 68 34 62 L34 52" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 74 L42 74 C36 74 34 68 34 62 L34 52" stroke="#000" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="-z-10" />
            {/* Right Arm */}
            <path d="M78 66 L98 66 C104 66 106 60 106 54 L106 44" stroke="#10B981" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M78 66 L98 66 C104 66 106 60 106 54 L106 44" stroke="#000" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="-z-10" />
            {/* Spines needles */}
            <path d="M54 50 L50 48" stroke="#000" strokeWidth="2" />
            <path d="M54 62 L50 60" stroke="#000" strokeWidth="2" />
            <path d="M86 52 L90 50" stroke="#000" strokeWidth="2" />
            <path d="M86 78 L90 80" stroke="#000" strokeWidth="2" />
            {/* Blooming Pink Flower on top */}
            <circle cx="70" cy="36" r="8" fill="#F43F5E" stroke="#000" strokeWidth="2" />
            <circle cx="70" cy="36" r="4" fill="#FDE047" />
          </svg>
        </div>
      );

    case "carnivorous":
      // PLANTA ANTI-DISTRACCIÓN (Fácil 50m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="46,106 94,106 88,126 52,126" fill="#1E293B" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <rect x="42" y="100" width="56" height="8" rx="2" fill="#334155" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="100" rx="24" ry="4" fill="#65A30D" />
            <path d="M70 100 C74 85 64 75 66 60 C68 45 62 38 58 35" stroke="#4D7C0F" strokeWidth="9" strokeLinecap="round" />
            <path d="M70 100 C74 85 64 75 66 60 C68 45 62 38 58 35" stroke="#000" strokeWidth="15" strokeLinecap="round" className="-z-10" />
            <path d="M62 75 L54 70" stroke="#84CC16" strokeWidth="3" strokeLinecap="round" />
            <path d="M72 65 L80 62" stroke="#84CC16" strokeWidth="3" strokeLinecap="round" />
            <path d="M64 85 C46 80 40 92 48 98 C58 98 65 92 68 85 Z" fill="#65A30D" stroke="#000" strokeWidth="2.5" />
            <g transform="translate(68, 38)">
              <path
                d="M-15 -18 C10 -30 35 -16 38 4 C24 8 0 4 -15 -18 Z"
                fill="#84CC16"
                stroke="#000"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M-15 -14 C6 2 24 10 38 4 C28 24 6 24 -15 -8 Z"
                fill="#65A30D"
                stroke="#000"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <ellipse cx="14" cy="-3" rx="18" ry="8" fill="#DC2626" />
              <polygon points="5,-14 8,-6 11,-13" fill="#FFF" stroke="#000" strokeWidth="1.2" />
              <polygon points="15,-13 18,-4 21,-12" fill="#FFF" stroke="#000" strokeWidth="1.2" />
              <polygon points="25,-10 27,-2 30,-8" fill="#FFF" stroke="#000" strokeWidth="1.2" />
              <polygon points="8,4 11,-2 14,5" fill="#FFF" stroke="#000" strokeWidth="1.2" />
              <polygon points="18,6 21,0 24,7" fill="#FFF" stroke="#000" strokeWidth="1.2" />
              <circle cx="5" cy="-20" r="2.5" fill="#BE185D" />
              <circle cx="20" cy="-16" r="3" fill="#BE185D" />
              <circle cx="16" cy="14" r="2.5" fill="#BE185D" />
            </g>
            <g className={animated ? "animate-bounce" : ""}>
              <rect x="94" y="16" width="18" height="18" rx="4" fill="#EF4444" stroke="#000" strokeWidth="2" />
              <path d="M98 25 L108 25" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M103 20 L103 30" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" transform="rotate(45 103 25)" />
            </g>
          </svg>
        </div>
      );

    case "crystal":
      // ÁRBOL DE CRISTAL CÓSMICO
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="52" ry="13" fill="#4A044E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="46" ry="9" fill="#701A75" />
            {/* Crystalline Prismatic Trunk */}
            <polygon points="70,116 54,78 62,56 78,56 86,78" fill="#A21CAF" stroke="#000" strokeWidth="3.5" />
            <polygon points="70,116 64,74 70,56 76,74" fill="#C026D3" stroke="#000" strokeWidth="2" />
            {/* Crystal Gemstone Clusters */}
            <polygon points="70,14 54,46 70,42 86,46" fill="#F0ABFC" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="34,36 22,62 38,58 50,44" fill="#E879F9" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="106,36 118,62 102,58 90,44" fill="#D946EF" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="50,44 70,42 70,68 44,66" fill="#C026D3" stroke="#000" strokeWidth="2.5" />
            <polygon points="90,44 70,42 70,68 96,66" fill="#E879F9" stroke="#000" strokeWidth="2.5" />
            {/* Highlights and Glints */}
            <polygon points="68,18 64,38 70,36" fill="#FFF" opacity="0.9" />
            <polygon points="36,40 30,56 38,52" fill="#FFF" opacity="0.8" />
            {/* Magic Aura Orbs */}
            <g className={animated ? "animate-ping" : ""}>
              <circle cx="28" cy="28" r="3" fill="#F0ABFC" />
              <circle cx="112" cy="26" r="3.5" fill="#E879F9" />
              <circle cx="70" cy="8" r="2.5" fill="#FFF" />
            </g>
          </svg>
        </div>
      );

    case "cherry":
      // CEREZO SAKURA (Cherry Blossom)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grassy Island Base */}
            <ellipse cx="70" cy="120" rx="55" ry="14" fill="#365314" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="116" rx="50" ry="10" fill="#65A30D" />
            <ellipse cx="70" cy="113" rx="35" ry="6" fill="#84CC16" />

            {/* Fallen Sakura Petals */}
            <circle cx="45" cy="116" r="3" fill="#F472B6" stroke="#000" strokeWidth="1" />
            <circle cx="88" cy="118" r="2.5" fill="#FB7185" stroke="#000" strokeWidth="1" />
            <circle cx="98" cy="115" r="3" fill="#F472B6" stroke="#000" strokeWidth="1" />
            <circle cx="35" cy="118" r="2" fill="#FBCFE8" stroke="#000" strokeWidth="1" />

            {/* Gnarled Zen Trunk */}
            <path
              d="M62 116 C63 95 58 78 50 64 C42 58 30 55 24 57 C26 52 38 49 48 58 C52 46 58 38 64 30 C69 30 72 44 68 58 C78 52 92 56 102 60 C96 64 84 62 72 70 C72 86 76 100 78 116 Z"
              fill="#422006"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Trunk Shading */}
            <path d="M66 85 C66 95 68 108 72 116" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" />

            {/* Sakura Blossom Clouds */}
            <ellipse cx="36" cy="58" rx="26" ry="20" fill="#F472B6" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="62" rx="26" ry="20" fill="#FB7185" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="38" rx="30" ry="24" fill="#F472B6" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="40" rx="30" ry="24" fill="#FDA4AF" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="28" rx="34" ry="26" fill="#FBCFE8" stroke="#000" strokeWidth="3.5" />

            {/* Highlighted Sakura Puffs */}
            <ellipse cx="66" cy="22" rx="18" ry="12" fill="#FFF1F2" />
            <ellipse cx="44" cy="34" rx="14" ry="10" fill="#FFF1F2" />
            <ellipse cx="92" cy="36" rx="14" ry="10" fill="#FFF1F2" />

            {/* Floating Petals */}
            <g className={animated ? "animate-pulse" : ""}>
              <path d="M22 42 C18 40 18 36 22 36 C26 36 26 40 22 42 Z" fill="#F472B6" stroke="#000" strokeWidth="1" />
              <path d="M118 46 C114 44 114 40 118 40 C122 40 122 44 118 46 Z" fill="#FDA4AF" stroke="#000" strokeWidth="1" />
              <path d="M112 82 C108 80 108 76 112 76 C116 76 116 80 112 82 Z" fill="#F472B6" stroke="#000" strokeWidth="1" />
            </g>
          </svg>
        </div>
      );

    case "apple":
      // MANZANO DE NEWTON (Normal 140m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="120" rx="55" ry="14" fill="#14532D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="116" rx="50" ry="10" fill="#16A34A" />
            <ellipse cx="70" cy="113" rx="35" ry="6" fill="#4ADE80" />
            <path
              d="M58 116 C60 92 56 74 48 60 C40 54 28 52 22 54 C24 48 36 46 46 54 C48 42 54 34 62 26 C68 26 72 40 68 54 C78 48 94 52 104 56 C98 60 84 58 72 66 C74 82 78 98 82 116 Z"
              fill="#78350F"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <ellipse cx="36" cy="56" rx="26" ry="20" fill="#15803D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="60" rx="26" ry="20" fill="#166534" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="36" rx="30" ry="24" fill="#22C55E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="38" rx="30" ry="24" fill="#16A34A" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="26" rx="34" ry="26" fill="#4ADE80" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="66" cy="20" rx="18" ry="12" fill="#86EFAC" />
            {[
              { x: 38, y: 52 },
              { x: 62, y: 38 },
              { x: 88, y: 34 },
              { x: 102, y: 58 },
              { x: 50, y: 68 },
              { x: 82, y: 62 },
            ].map((apple, i) => (
              <g key={i}>
                <circle cx={apple.x} cy={apple.y} r="6.5" fill="#EF4444" stroke="#000" strokeWidth="2" />
                <path d={`M${apple.x} ${apple.y - 6.5} C${apple.x - 1} ${apple.y - 10} ${apple.x + 3} ${apple.y - 10} ${apple.x + 2} ${apple.y - 6.5}`} stroke="#451A03" strokeWidth="1.5" />
                <circle cx={apple.x - 2} cy={apple.y - 2} r="1.5" fill="#FCA5A5" />
              </g>
            ))}
            <g>
              <circle cx="48" cy="116" r="5.5" fill="#EF4444" stroke="#000" strokeWidth="1.8" />
              <circle cx="46" cy="114" r="1.2" fill="#FCA5A5" />
            </g>
          </svg>
        </div>
      );

    case "joystick":
      // ÁRBOL ARCADE & GAMEPADS (Normal 130m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="52" ry="13" fill="#3B0764" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="46" ry="9" fill={primaryColor || "#581C87"} />
            <path
              d="M58 116 C60 90 54 75 48 58 L92 58 C86 75 80 90 82 116 Z"
              fill="#18181B"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M64 65 L64 116" stroke={accentColor || "#A855F7"} strokeWidth="3" strokeLinecap="round" />
            <path d="M76 65 L76 116" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(32, 24)">
              <rect x="0" y="8" width="76" height="42" rx="16" fill="#27272A" stroke="#000" strokeWidth="3.5" />
              <rect x="4" y="12" width="68" height="34" rx="12" fill="#3F3F46" />
              <rect x="12" y="24" width="16" height="6" rx="1.5" fill="#18181B" stroke="#000" strokeWidth="1.5" />
              <rect x="17" y="19" width="6" height="16" rx="1.5" fill="#18181B" stroke="#000" strokeWidth="1.5" />
              <circle cx="20" cy="27" r="1.5" fill="#71717A" />
              <circle cx="56" cy="22" r="3.5" fill="#EF4444" stroke="#000" strokeWidth="1.5" />
              <circle cx="64" cy="29" r="3.5" fill="#3B82F6" stroke="#000" strokeWidth="1.5" />
              <circle cx="48" cy="29" r="3.5" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
              <circle cx="56" cy="36" r="3.5" fill="#22C55E" stroke="#000" strokeWidth="1.5" />
              <rect x="32" y="32" width="5" height="2" rx="1" fill="#18181B" transform="rotate(-25 32 32)" />
              <rect x="40" y="32" width="5" height="2" rx="1" fill="#18181B" transform="rotate(-25 40 32)" />
            </g>
            <line x1="70" y1="24" x2="70" y2="8" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
            <circle cx="70" cy="8" r="8" fill={accentColor || "#EF4444"} stroke="#000" strokeWidth="2.5" />
            <circle cx="68" cy="6" r="2" fill="#FFF" />
            <g className={animated ? "animate-pulse" : ""}>
              <polygon points="24,18 26,22 30,24 26,26 24,30 22,26 18,24 22,22" fill="#FACC15" stroke="#000" strokeWidth="1.2" />
              <polygon points="116,22 118,26 122,28 118,30 116,34 114,30 110,28 114,26" fill="#00E5FF" stroke="#000" strokeWidth="1.2" />
            </g>
          </svg>
        </div>
      );

    case "coffee":
      // ÁRBOL CAFÉ BARISTA (Normal 160m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="52" ry="13" fill="#451A03" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="46" ry="9" fill={primaryColor || "#78350F"} />
            <ellipse cx="44" cy="118" rx="5" ry="3" fill="#291205" stroke="#000" strokeWidth="1.2" transform="rotate(-20 44 118)" />
            <ellipse cx="96" cy="119" rx="5" ry="3" fill="#291205" stroke="#000" strokeWidth="1.2" transform="rotate(25 96 119)" />
            <path
              d="M58 116 C60 92 56 74 50 60 L90 60 C84 74 80 92 82 116 Z"
              fill="#54280E"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <g transform="translate(42, 30)">
              <path d="M52 14 C66 14 66 36 52 36" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
              <path d="M52 14 C66 14 66 36 52 36" stroke="#000" strokeWidth="13" strokeLinecap="round" className="-z-10" />
              <rect x="0" y="6" width="56" height="40" rx="10" fill="#F8FAFC" stroke="#000" strokeWidth="3.5" />
              <rect x="6" y="16" width="44" height="26" rx="4" fill={accentColor || "#B45309"} stroke="#000" strokeWidth="2" />
              <ellipse cx="28" cy="6" rx="28" ry="8" fill="#451A03" stroke="#000" strokeWidth="3" />
              <ellipse cx="28" cy="6" rx="22" ry="5.5" fill="#78350F" />
              <path d="M28 6 C25 2 20 4 22 7 C24 9 28 11 28 11 C28 11 32 9 34 7 C36 4 31 2 28 6 Z" fill="#FEF3C7" stroke="#B45309" strokeWidth="1" />
            </g>
            <g className={animated ? "animate-pulse" : ""}>
              <path d="M60 28 C56 20 64 14 58 6" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              <path d="M72 26 C76 18 68 12 74 4" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <path d="M82 28 C86 22 80 16 84 8" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            </g>
          </svg>
        </div>
      );

    case "pine":
      // PINO GUARDIAN (Nordic Pine)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grassy Island Base */}
            <ellipse cx="70" cy="122" rx="52" ry="13" fill="#14532D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="46" ry="9" fill="#15803D" />

            {/* Sturdy Straight Trunk */}
            <rect x="63" y="70" width="14" height="50" rx="3" fill="#713F12" stroke="#000" strokeWidth="3.5" />
            <path d="M67 78 L67 114" stroke="#A16207" strokeWidth="2.5" strokeLinecap="round" />

            {/* Bottom Tier Pine Needles */}
            <polygon points="70,55 18,92 42,92 24,106 116,106 98,92 122,92" fill="#047857" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Middle Tier */}
            <polygon points="70,36 28,68 46,68 32,80 108,80 94,68 112,68" fill="#059669" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Top Tier */}
            <polygon points="70,14 40,46 54,46 44,56 96,56 86,46 100,46" fill="#10B981" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />

            {/* Snow / Light Highlights */}
            <polygon points="70,16 60,34 80,34" fill="#6EE7B7" opacity="0.9" />
            <path d="M46 66 L70 56 L94 66" stroke="#6EE7B7" strokeWidth="3" strokeLinecap="round" />
            <path d="M38 90 L70 78 L102 90" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />

            {/* Cute Pinecone */}
            <ellipse cx="48" cy="98" rx="4" ry="6" fill="#78350F" stroke="#000" strokeWidth="1.5" />
            <ellipse cx="90" cy="99" rx="4" ry="6" fill="#78350F" stroke="#000" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case "palm":
      // PALMERA RELAX (Tropical Palm)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Sandy Island Base with Water Wave */}
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#D97706" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#F59E0B" />
            <ellipse cx="70" cy="115" rx="36" ry="6" fill="#FDE68A" />

            {/* Curved Segmented Trunk */}
            <path
              d="M74 116 C76 96 66 74 58 54 C54 44 56 36 60 30 C64 30 65 38 68 48 C76 68 86 92 84 116 Z"
              fill="#92400E"
              stroke="#000"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Trunk Rings */}
            <path d="M72 102 C76 100 82 101 84 102" stroke="#B45309" strokeWidth="2.5" />
            <path d="M68 86 C72 84 78 85 80 86" stroke="#B45309" strokeWidth="2.5" />
            <path d="M64 70 C68 68 74 69 76 70" stroke="#B45309" strokeWidth="2.5" />
            <path d="M60 54 C64 52 68 53 70 54" stroke="#B45309" strokeWidth="2.5" />

            {/* Palm Fronds (Vibrant sweeping leaves) */}
            {/* Left Top Frond */}
            <path d="M60 32 C44 24 24 28 14 42 C24 44 42 42 58 36" fill="#15803D" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Left Bottom Frond */}
            <path d="M58 36 C40 38 22 48 16 64 C28 60 46 54 58 40" fill="#16A34A" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Top Center Frond */}
            <path d="M60 30 C58 14 66 6 72 4 C76 12 76 22 66 32" fill="#4ADE80" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Right Top Frond */}
            <path d="M66 32 C82 22 104 22 118 34 C108 38 90 38 68 36" fill="#22C55E" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
            {/* Right Bottom Frond */}
            <path d="M68 36 C86 38 108 46 118 60 C106 58 88 52 68 40" fill="#15803D" stroke="#000" strokeWidth="3" strokeLinejoin="round" />

            {/* Delicious Coconuts */}
            <circle cx="56" cy="38" r="6" fill="#78350F" stroke="#000" strokeWidth="2" />
            <circle cx="67" cy="40" r="5.5" fill="#92400E" stroke="#000" strokeWidth="2" />
            <circle cx="61" cy="45" r="5" fill="#78350F" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
      );

    case "maple":
      // ARCE DORADO (Golden Maple)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grassy Island Base */}
            <ellipse cx="70" cy="120" rx="55" ry="14" fill="#7C2D12" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="116" rx="50" ry="10" fill="#9A3412" />
            <ellipse cx="70" cy="113" rx="35" ry="6" fill="#C2410C" />

            {/* Fallen Autumn Leaves */}
            <circle cx="42" cy="116" r="3" fill="#EA580C" stroke="#000" strokeWidth="1" />
            <circle cx="94" cy="117" r="2.5" fill="#F59E0B" stroke="#000" strokeWidth="1" />

            {/* Maple Trunk */}
            <path
              d="M62 116 C63 94 60 76 52 62 C44 56 32 54 26 56 C28 50 40 48 50 56 C52 44 58 36 64 28 C69 28 72 42 68 56 C78 50 92 54 102 58 C96 62 84 60 72 68 C72 84 76 98 78 116 Z"
              fill="#571E0B"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Fiery Autumn Foliage Puffs */}
            <ellipse cx="36" cy="56" rx="26" ry="20" fill="#C2410C" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="60" rx="26" ry="20" fill="#EA580C" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="36" rx="30" ry="24" fill="#F97316" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="38" rx="30" ry="24" fill="#FB923C" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="26" rx="34" ry="26" fill="#FBBF24" stroke="#000" strokeWidth="3.5" />

            {/* Golden Core Highlights */}
            <ellipse cx="66" cy="20" rx="16" ry="10" fill="#FEF08A" />
            <ellipse cx="44" cy="32" rx="12" ry="8" fill="#FDE047" />
            <ellipse cx="92" cy="34" rx="12" ry="8" fill="#FDE047" />
          </svg>
        </div>
      );

    case "baobab":
      // BAOBAB DE LA MEMORIA (Difícil 330m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="56" ry="14" fill="#78350F" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#B45309" />
            <ellipse cx="70" cy="115" rx="36" ry="6" fill="#D97706" />
            <path
              d="M40 118 C38 92 44 68 50 54 L90 54 C96 68 102 92 100 118 Z"
              fill="#92400E"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M54 62 L52 114" stroke="#713F12" strokeWidth="3" strokeLinecap="round" />
            <path d="M68 58 L68 116" stroke="#713F12" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M82 62 L84 114" stroke="#713F12" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="70" cy="85" rx="5" ry="8" fill="#451A03" stroke="#000" strokeWidth="2" />
            <path d="M50 54 C34 44 22 40 14 36" stroke="#92400E" strokeWidth="8" strokeLinecap="round" />
            <path d="M50 54 C34 44 22 40 14 36" stroke="#000" strokeWidth="12" strokeLinecap="round" className="-z-10" />
            <path d="M90 54 C106 44 118 40 126 36" stroke="#92400E" strokeWidth="8" strokeLinecap="round" />
            <path d="M90 54 C106 44 118 40 126 36" stroke="#000" strokeWidth="12" strokeLinecap="round" className="-z-10" />
            <ellipse cx="18" cy="34" rx="18" ry="9" fill="#65A30D" stroke="#000" strokeWidth="3" />
            <ellipse cx="122" cy="34" rx="18" ry="9" fill="#65A30D" stroke="#000" strokeWidth="3" />
            <ellipse cx="44" cy="28" rx="22" ry="11" fill="#84CC16" stroke="#000" strokeWidth="3" />
            <ellipse cx="96" cy="28" rx="22" ry="11" fill="#84CC16" stroke="#000" strokeWidth="3" />
            <ellipse cx="70" cy="24" rx="28" ry="13" fill="#A3E635" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="68" cy="21" rx="16" ry="6" fill="#BEF264" />
          </svg>
        </div>
      );

    case "bonsai":
      // BONSAI ANCESTRAL
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Ceramic Bonsai Pot */}
            <ellipse cx="70" cy="120" rx="50" ry="12" fill="#1E293B" stroke="#000" strokeWidth="3.5" />
            <path d="M26 106 L114 106 L106 122 L34 122 Z" fill="#334155" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <ellipse cx="70" cy="106" rx="44" ry="9" fill="#14532D" stroke="#000" strokeWidth="2.5" />
            <ellipse cx="70" cy="104" rx="36" ry="5" fill="#22C55E" />

            {/* Elegant Twisted Bonsai Trunk */}
            <path
              d="M62 106 C58 92 68 84 76 76 C84 68 88 56 82 46 C74 48 70 54 62 60 C54 66 44 68 36 64 C42 60 52 56 60 48 C66 40 70 32 72 24 C76 24 78 30 76 38 C84 36 94 40 98 48 C96 56 88 64 80 72 C72 80 72 94 72 106 Z"
              fill="#522504"
              stroke="#000"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Zen Cloud Foliage Cushions */}
            <ellipse cx="36" cy="58" rx="20" ry="12" fill="#15803D" stroke="#000" strokeWidth="3" />
            <ellipse cx="34" cy="55" rx="12" ry="6" fill="#4ADE80" />

            <ellipse cx="98" cy="44" rx="22" ry="13" fill="#16A34A" stroke="#000" strokeWidth="3" />
            <ellipse cx="96" cy="41" rx="13" ry="6" fill="#86EFAC" />

            <ellipse cx="72" cy="22" rx="26" ry="15" fill="#22C55E" stroke="#000" strokeWidth="3" />
            <ellipse cx="68" cy="18" rx="16" ry="8" fill="#BBF7D0" />
          </svg>
        </div>
      );

    case "comic":
      // ÁRBOL MANGA & CÓMIC (Difícil 320m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#18181B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill={accentColor || "#3F3F46"} />
            <path
              d="M58 116 C60 92 56 74 48 58 L92 58 C84 74 80 92 82 116 Z"
              fill="#F4F4F5"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <line x1="64" y1="75" x2="68" y2="114" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <line x1="74" y1="70" x2="76" y2="116" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(18, 30) rotate(-15)">
              <rect x="0" y="0" width="38" height="46" rx="3" fill="#FFF" stroke="#000" strokeWidth="3" />
              <rect x="4" y="4" width="30" height="20" fill="#E4E4E7" stroke="#000" strokeWidth="1.5" />
              <line x1="4" y1="28" x2="34" y2="28" stroke="#000" strokeWidth="2" />
              <line x1="4" y1="34" x2="26" y2="34" stroke="#000" strokeWidth="2" />
            </g>
            <g transform="translate(86, 26) rotate(18)">
              <rect x="0" y="0" width="38" height="46" rx="3" fill="#FFF" stroke="#000" strokeWidth="3" />
              <rect x="4" y="4" width="30" height="24" fill="#FDE047" stroke="#000" strokeWidth="1.5" />
              <line x1="4" y1="32" x2="34" y2="32" stroke="#000" strokeWidth="2" />
            </g>
            <g transform="translate(42, 14)">
              <polygon
                points="28,2 36,14 50,10 46,24 60,30 46,38 52,52 38,46 30,60 22,46 8,50 14,36 0,30 14,24 10,10 24,14"
                fill={primaryColor || "#FFE600"}
                stroke="#000"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <text x="28" y="36" fill="#000" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
                POW!
              </text>
            </g>
            <g transform="translate(85, 68)">
              <ellipse cx="16" cy="10" rx="14" ry="9" fill="#FFF" stroke="#000" strokeWidth="2" />
              <polygon points="12,18 8,24 16,18" fill="#FFF" stroke="#000" strokeWidth="1.5" />
              <text x="16" y="13" fill="#000" fontSize="8" fontWeight="900" textAnchor="middle">100%</text>
            </g>
          </svg>
        </div>
      );

    case "pizza":
      // ÁRBOL PIZZA SNACK (Difícil 280m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="52" ry="13" fill="#7C2D12" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="46" ry="9" fill="#C2410C" />
            <path
              d="M58 116 C60 92 56 74 50 60 L90 60 C84 74 80 92 82 116 Z"
              fill="#D97706"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M50 75 C35 70 28 62 22 55" stroke="#B45309" strokeWidth="6" strokeLinecap="round" />
            <path d="M90 75 C105 70 112 62 118 55" stroke="#B45309" strokeWidth="6" strokeLinecap="round" />
            <polygon points="70,14 26,68 114,68" fill={primaryColor || "#FACC15"} stroke="#000" strokeWidth="4" strokeLinejoin="round" />
            <path d="M26 68 Q70 76 114 68" stroke="#B45309" strokeWidth="10" strokeLinecap="round" />
            <path d="M26 68 Q70 76 114 68" stroke="#000" strokeWidth="15" strokeLinecap="round" className="-z-10" />
            <path d="M45 68 Q50 78 55 68" fill="#FDE047" stroke="#000" strokeWidth="2" />
            <path d="M75 68 Q80 82 85 68" fill="#FDE047" stroke="#000" strokeWidth="2" />
            <circle cx="56" cy="46" r="8" fill={accentColor || "#DC2626"} stroke="#000" strokeWidth="2" />
            <circle cx="84" cy="48" r="8" fill="#DC2626" stroke="#000" strokeWidth="2" />
            <circle cx="70" cy="32" r="7" fill="#DC2626" stroke="#000" strokeWidth="2" />
            <circle cx="48" cy="58" r="6" fill="#DC2626" stroke="#000" strokeWidth="1.8" />
            <circle cx="92" cy="58" r="6" fill="#DC2626" stroke="#000" strokeWidth="1.8" />
            <circle cx="64" cy="40" r="1.5" fill="#15803D" />
            <circle cx="76" cy="44" r="1.5" fill="#15803D" />
            <circle cx="68" cy="55" r="1.5" fill="#15803D" />
          </svg>
        </div>
      );

    case "cyber":
      // ARBOL CYBER GLITCH
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cyber Circuit Island Base */}
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#1E1B4B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#312E81" />
            <ellipse cx="70" cy="115" rx="35" ry="6" fill="#00E5FF" opacity="0.6" />

            {/* Circuit Lines on Ground */}
            <path d="M40 118 L55 116 L65 118" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
            <path d="M78 116 L90 118 L100 116" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />

            {/* Cyber Glitch Trunk with Neon Lines */}
            <path
              d="M62 116 C63 94 60 76 52 62 C44 56 32 54 26 56 C28 50 40 48 50 56 C52 44 58 36 64 28 C69 28 72 42 68 56 C78 50 92 54 102 58 C96 62 84 60 72 68 C72 84 76 98 78 116 Z"
              fill="#2E1065"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Neon Data Traces */}
            <path d="M68 110 L66 85 L72 75 L70 55" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M60 95 L56 75 L48 64" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />

            {/* Isometric Digital Cube Foliage */}
            <ellipse cx="36" cy="56" rx="24" ry="18" fill="#7C3AED" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="60" rx="24" ry="18" fill="#4338CA" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="36" rx="28" ry="22" fill="#9333EA" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="38" rx="28" ry="22" fill="#A855F7" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="26" rx="32" ry="24" fill="#C084FC" stroke="#000" strokeWidth="3.5" />

            {/* Neon Glitch Glow */}
            <ellipse cx="66" cy="20" rx="16" ry="10" fill="#00E5FF" />
            <ellipse cx="44" cy="32" rx="12" ry="8" fill="#F43F5E" />
            <ellipse cx="92" cy="34" rx="12" ry="8" fill="#F43F5E" />

            {/* Floating Cyber Hologram Pixels */}
            <g className={animated ? "animate-spin-slow" : ""}>
              <rect x="22" y="32" width="6" height="6" fill="#00E5FF" stroke="#000" strokeWidth="1.5" />
              <rect x="114" y="36" width="5" height="5" fill="#F43F5E" stroke="#000" strokeWidth="1.5" />
              <rect x="68" y="6" width="6" height="6" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      );

    case "willow":
      // SAUCE MISTICO (Weeping Willow)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grassy Island Base */}
            <ellipse cx="70" cy="120" rx="55" ry="14" fill="#064E3B" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="116" rx="50" ry="10" fill="#047857" />
            <ellipse cx="70" cy="113" rx="35" ry="6" fill="#10B981" />

            {/* Trunk */}
            <path
              d="M62 116 C63 94 60 76 52 62 C44 56 32 54 26 56 C28 50 40 48 50 56 C52 44 58 36 64 28 C69 28 72 42 68 56 C78 50 92 54 102 58 C96 62 84 60 72 68 C72 84 76 98 78 116 Z"
              fill="#292524"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Main Canopy Dome */}
            <ellipse cx="70" cy="40" rx="46" ry="28" fill="#0D9488" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="34" rx="38" ry="20" fill="#14B8A6" />
            <ellipse cx="70" cy="28" rx="26" ry="12" fill="#2DD4BF" />

            {/* Hanging Weeping Tendrils */}
            <path d="M26 44 C24 64 28 84 25 102" stroke="#0F766E" strokeWidth="4" strokeLinecap="round" />
            <path d="M38 48 C36 72 40 92 38 106" stroke="#14B8A6" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M52 50 C50 75 52 95 50 108" stroke="#2DD4BF" strokeWidth="4" strokeLinecap="round" />
            <path d="M88 50 C90 75 88 95 90 108" stroke="#2DD4BF" strokeWidth="4" strokeLinecap="round" />
            <path d="M102 48 C104 72 100 92 102 106" stroke="#14B8A6" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M114 44 C116 64 112 84 115 102" stroke="#0F766E" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "fire":
      // ÁRBOL FÉNIX ÍGNEO (Épico 540m)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="55" ry="14" fill="#450A0A" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="118" rx="50" ry="10" fill="#7F1D1D" />
            <ellipse cx="70" cy="115" rx="35" ry="6" fill="#EA580C" />
            <path
              d="M58 116 C60 92 56 74 48 60 C40 54 28 52 22 54 C24 48 36 46 46 54 C48 42 54 34 62 26 C68 26 72 40 68 54 C78 48 94 52 104 56 C98 60 84 58 72 66 C74 82 78 98 82 116 Z"
              fill="#18181B"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M64 80 L62 98 L66 112" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M72 74 L74 92 L72 108" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="36" cy="56" rx="26" ry="20" fill="#DC2626" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="60" rx="26" ry="20" fill="#B91C1C" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="36" rx="30" ry="24" fill="#EA580C" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="38" rx="30" ry="24" fill="#F97316" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="24" rx="34" ry="26" fill="#FBBF24" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="68" cy="18" rx="18" ry="14" fill="#FEF08A" stroke="#000" strokeWidth="2" />
            <circle cx="68" cy="16" r="8" fill="#FFF" />
            <g className={animated ? "animate-pulse" : ""}>
              <circle cx="24" cy="32" r="3" fill="#F97316" stroke="#000" strokeWidth="1" />
              <circle cx="118" cy="36" r="3.5" fill="#FBBF24" stroke="#000" strokeWidth="1" />
              <polygon points="70,2 73,8 79,9 74,13 75,19 70,16 65,19 66,13 61,9 67,8" fill="#FEF08A" stroke="#000" strokeWidth="1.2" />
            </g>
          </svg>
        </div>
      );

    case "yggdrasil":
      // YGGDRASIL ANCESTRAL (Legendario 1440m - 24 horas)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="58" ry="15" fill="#09090B" stroke="#000" strokeWidth="4" />
            <ellipse cx="70" cy="118" rx="52" ry="11" fill="#1E1B4B" />
            <ellipse cx="70" cy="115" rx="38" ry="7" fill="#6366F1" />
            <path d="M50 114 C40 118 28 122 18 126" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            <path d="M90 114 C100 118 112 122 122 126" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M52 116 C54 88 48 66 38 52 C30 46 18 44 12 46 C16 40 28 38 40 46 C44 32 52 24 64 16 C72 16 78 30 74 46 C84 40 102 44 114 48 C108 52 94 50 82 58 C84 76 88 94 92 116 Z"
              fill="#312E81"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M64 78 L60 92 L66 106" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M72 70 L76 88 L72 102" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="68" cy="85" r="3" fill="#67E8F9" />
            <ellipse cx="32" cy="50" rx="28" ry="22" fill="#4338CA" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="108" cy="54" rx="28" ry="22" fill="#3730A3" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="48" cy="30" rx="32" ry="24" fill="#6366F1" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="92" cy="32" rx="32" ry="24" fill="#4F46E5" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="18" rx="36" ry="26" fill="#818CF8" stroke="#000" strokeWidth="4" />
            <ellipse cx="68" cy="12" rx="20" ry="12" fill="#FDE047" />
            <ellipse cx="68" cy="10" rx="12" ry="7" fill="#FFF" />
            <g className={animated ? "animate-spin-slow" : ""}>
              <polygon points="70,-2 72,4 78,5 73,9 75,15 70,12 65,15 67,9 62,5 68,4" fill="#FACC15" stroke="#000" strokeWidth="1.5" />
              <circle cx="16" cy="22" r="3.5" fill="#38BDF8" stroke="#000" strokeWidth="1.5" />
              <circle cx="124" cy="26" r="3.5" fill="#F472B6" stroke="#000" strokeWidth="1.5" />
              <circle cx="34" cy="74" r="2.5" fill="#FDE047" stroke="#000" strokeWidth="1" />
              <circle cx="106" cy="78" r="2.5" fill="#67E8F9" stroke="#000" strokeWidth="1" />
            </g>
          </svg>
        </div>
      );

    case "tabe":
      // ÁRBOL SAGRADO TABE (Legendario 1200m - 20h)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[4px_4px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="70" cy="122" rx="58" ry="14" fill="#000" stroke={primaryColor || "#BFFF00"} strokeWidth="3" />
            <ellipse cx="70" cy="118" rx="52" ry="10" fill="#18181B" />
            <ellipse cx="70" cy="115" rx="38" ry="6" fill={primaryColor || "#BFFF00"} opacity="0.8" />
            <path
              d="M54 116 C56 88 50 64 42 50 L98 50 C90 64 84 88 86 116 Z"
              fill="#09090B"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M64 68 L60 90 L66 114" stroke="#BFFF00" strokeWidth="3" strokeLinecap="round" />
            <path d="M76 68 L80 92 L74 114" stroke="#FFE600" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(60, 78)">
              <rect x="0" y="0" width="20" height="18" rx="4" fill="#BFFF00" stroke="#000" strokeWidth="2" />
              <text x="10" y="13" fill="#000" fontSize="8" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
                TABE
              </text>
            </g>
            <ellipse cx="36" cy="52" rx="26" ry="20" fill="#15803D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="54" rx="26" ry="20" fill="#15803D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="48" cy="32" rx="30" ry="24" fill="#22C55E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="92" cy="34" rx="30" ry="24" fill="#22C55E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="22" rx="34" ry="26" fill={primaryColor || "#BFFF00"} stroke="#000" strokeWidth="4" />
            <circle cx="70" cy="18" r="14" fill={accentColor || "#FFE600"} stroke="#000" strokeWidth="2.5" />
            <circle cx="68" cy="15" r="5" fill="#FFF" />
            <g className={animated ? "animate-bounce" : ""}>
              <g transform="translate(14, 24) rotate(-20)">
                <rect x="0" y="0" width="18" height="14" rx="2" fill="#3B82F6" stroke="#000" strokeWidth="1.8" />
                <line x1="9" y1="0" x2="9" y2="14" stroke="#000" strokeWidth="1.2" />
              </g>
              <g transform="translate(108, 20) rotate(25)">
                <rect x="0" y="0" width="18" height="14" rx="2" fill="#EC4899" stroke="#000" strokeWidth="1.8" />
                <line x1="9" y1="0" x2="9" y2="14" stroke="#000" strokeWidth="1.2" />
              </g>
            </g>
            <g className={animated ? "animate-pulse" : ""}>
              <polygon points="70,-2 72,4 78,5 73,9 75,15 70,12 65,15 67,9 62,5 68,4" fill="#FFE600" stroke="#000" strokeWidth="1.5" />
              <circle cx="28" cy="12" r="3" fill="#BFFF00" stroke="#000" strokeWidth="1.2" />
              <circle cx="112" cy="14" r="3" fill="#BFFF00" stroke="#000" strokeWidth="1.2" />
            </g>
          </svg>
        </div>
      );

    case "oak":
    default:
      // ROBLE TITAN (Default Mighty Oak)
      return (
        <div className={cn("relative flex items-center justify-center select-none", sizeClasses, className)}>
          <svg viewBox="0 0 140 140" className="w-full h-full drop-shadow-[3px_3px_0_#000]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grassy Island Base */}
            <ellipse cx="70" cy="120" rx="55" ry="14" fill="#1E3A1A" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="116" rx="50" ry="10" fill="#4D7C0F" />
            <ellipse cx="70" cy="113" rx="35" ry="6" fill="#84CC16" />

            {/* Massive Mighty Oak Trunk */}
            <path
              d="M58 116 C60 92 56 74 48 60 C40 54 28 52 22 54 C24 48 36 46 46 54 C48 42 54 34 62 26 C68 26 72 40 68 54 C78 48 94 52 104 56 C98 60 84 58 72 66 C74 82 78 98 82 116 Z"
              fill="#78350F"
              stroke="#000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Bark Texture Lines */}
            <path d="M64 80 L62 98 L66 112" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M72 74 L74 92 L72 108" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />

            {/* Cloud Foliage Puffs */}
            <ellipse cx="36" cy="56" rx="26" ry="20" fill="#15803D" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="104" cy="60" rx="26" ry="20" fill="#166534" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="50" cy="36" rx="30" ry="24" fill="#22C55E" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="88" cy="38" rx="30" ry="24" fill="#16A34A" stroke="#000" strokeWidth="3.5" />
            <ellipse cx="70" cy="26" rx="34" ry="26" fill="#4ADE80" stroke="#000" strokeWidth="3.5" />

            {/* Highlighted Canopy Dome */}
            <ellipse cx="66" cy="20" rx="18" ry="12" fill="#86EFAC" />
            <ellipse cx="44" cy="32" rx="14" ry="10" fill="#86EFAC" />
            <ellipse cx="92" cy="34" rx="14" ry="10" fill="#86EFAC" />

            {/* Golden Acorn */}
            <ellipse cx="48" cy="58" rx="3.5" ry="5" fill="#CA8A04" stroke="#000" strokeWidth="1.5" />
            <ellipse cx="92" cy="62" rx="3.5" ry="5" fill="#CA8A04" stroke="#000" strokeWidth="1.5" />
          </svg>
        </div>
      );
  }
};
