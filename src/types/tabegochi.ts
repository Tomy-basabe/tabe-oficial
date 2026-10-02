export type PetSpecies = "cat" | "dog" | "dragon" | "penguin" | "bunny" | "axolotl";

export type PetStage = "egg" | "baby" | "child" | "adult" | "legendary";

export interface PetSpeciesInfo {
  id: PetSpecies;
  name: string;
  subtitle: string;
  description: string;
  avatar: string;
  baseColor: string;
  accentColor: string;
  favoriteFood: string;
  element: string;
  specialSkill: string;
}

export interface TabeGochiPet {
  id: string;
  name: string;
  species: PetSpecies;
  stage: PetStage;
  level: number;
  xp: number;
  ageDays: number;
  
  // Vital stats 0 - 100
  hunger: number;     // 100 = full, 0 = starving
  happiness: number;  // 100 = ecstatic, 0 = depressed
  energy: number;     // 100 = fully rested, 0 = exhausted
  hygiene: number;    // 100 = sparkling clean, 0 = dirty
  health: number;     // 100 = healthy, < 50 = sick

  // Transient state & Customization
  isSleeping: boolean;
  isSick: boolean;
  poopCount: number;  // 0 to 4 poops on screen
  hat?: string;
  outfit?: string;
  heldItem?: string;
  aura?: string;
  colorSkin?: string;
  background?: string;

  // Timestamps
  createdAt: number;
  lastUpdated: number;
}

export interface FoodItem {
  id: string;
  name: string;
  iconName: string; // Icon identifier for pixel art / lucide renderer
  hungerBoost: number;
  happinessBoost: number;
  cost: number;
  description: string;
  category: "snack" | "meal" | "magic" | "tech";
}

export interface AccessoryItem {
  id: string;
  name: string;
  iconName: string;
  type: "hat" | "outfit" | "held" | "aura" | "skin" | "bg";
  cost: number;
  description: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export const PET_SPECIES_LIST: PetSpeciesInfo[] = [
  {
    id: "cat",
    name: "Michi",
    subtitle: "Gato Cósmico Pixel",
    description: "Ronronea con cariño, ama dormir siestas largas y saltar cajas vacías.",
    avatar: "cat",
    baseColor: "#ffb703",
    accentColor: "#fb8500",
    favoriteFood: "fish",
    element: "Estelar",
    specialSkill: "Ronroneo Curativo",
  },
  {
    id: "dog",
    name: "Shiba",
    subtitle: "Perrito Leal Pixel",
    description: "Siempre alegre y juguetón. Mueve la colita y te espera con ansias.",
    avatar: "dog",
    baseColor: "#e07a5f",
    accentColor: "#f4a261",
    favoriteFood: "bone",
    element: "Tierra",
    specialSkill: "Super Salto",
  },
  {
    id: "dragon",
    name: "Draco",
    subtitle: "Dragoncito Fuego Pixel",
    description: "Glotón y cariñoso. Cuando está feliz escupe pequeñas chispitas de colores.",
    avatar: "dragon",
    baseColor: "#e63946",
    accentColor: "#ffd166",
    favoriteFood: "pizza",
    element: "Fuego",
    specialSkill: "Llamarada Cálida",
  },
  {
    id: "penguin",
    name: "Pingu",
    subtitle: "Pingüino Polar Pixel",
    description: "Le encanta deslizarse sobre su pancita y bailar tap al compás de la música.",
    avatar: "penguin",
    baseColor: "#1d3557",
    accentColor: "#457b9d",
    favoriteFood: "fish",
    element: "Hielo",
    specialSkill: "Deslizamiento Rápido",
  },
  {
    id: "bunny",
    name: "Bunny",
    subtitle: "Conejito Saltarín Pixel",
    description: "Tierno y veloz. Mueve su naricita sin parar y adora las caricias suaves.",
    avatar: "bunny",
    baseColor: "#ffcad4",
    accentColor: "#b5e2fa",
    favoriteFood: "apple",
    element: "Naturaleza",
    specialSkill: "Orejitas Radar",
  },
  {
    id: "axolotl",
    name: "Axol",
    subtitle: "Ajolote Mágico Pixel",
    description: "Flota graciosamente en burbujas transparentes y cambia su brillo según su humor.",
    avatar: "axolotl",
    baseColor: "#f472b6",
    accentColor: "#38bdf8",
    favoriteFood: "nano_banana",
    element: "Agua Mística",
    specialSkill: "Burbuja de Felicidad",
  },
];

export const FOOD_MENU: FoodItem[] = [
  { id: "nano_banana", name: "Nano Banana Cuántica", iconName: "banana", hungerBoost: 60, happinessBoost: 50, cost: 25, description: "Fruta biónica ultranutritiva con electrolitos y sabor dulce legendario.", category: "tech" },
  { id: "apple", name: "Manzana Crujiente", iconName: "apple", hungerBoost: 20, happinessBoost: 5, cost: 0, description: "Snack fresco y dulce recogido del huerto retro.", category: "snack" },
  { id: "pizza", name: "Porción de Pizza", iconName: "pizza", hungerBoost: 35, happinessBoost: 15, cost: 12, description: "Cargada de queso fundido y rodajas de pepperoni.", category: "meal" },
  { id: "burger", name: "Hamburguesa Pixel", iconName: "burger", hungerBoost: 45, happinessBoost: 20, cost: 16, description: "Carne jugosa con queso cheddar y pan de sésamo.", category: "meal" },
  { id: "ramen", name: "Tazón de Ramen", iconName: "ramen", hungerBoost: 50, happinessBoost: 25, cost: 20, description: "Caldo hirviendo con fideos caseros y huevo de oro.", category: "meal" },
  { id: "cookie", name: "Galleta con Chispas", iconName: "cookie", hungerBoost: 15, happinessBoost: 20, cost: 5, description: "Receta horneada con chispas de chocolate retro.", category: "snack" },
  { id: "donut", name: "Donut con Confites", iconName: "donut", hungerBoost: 25, happinessBoost: 30, cost: 18, description: "Glaseado rosa de fresa con chispas de arcoíris.", category: "snack" },
  { id: "sushi", name: "Nigiri de Salmón", iconName: "sushi", hungerBoost: 30, happinessBoost: 25, cost: 18, description: "Arroz avinagrado con pescado fresco del día.", category: "meal" },
  { id: "potion", name: "Elixir Restaurador", iconName: "potion", hungerBoost: 40, happinessBoost: 50, cost: 35, description: "Restaura salud, cura cansancio y maximiza el humor.", category: "magic" },
  { id: "taco", name: "Taco Supremo", iconName: "taco", hungerBoost: 40, happinessBoost: 22, cost: 17, description: "Tortilla crujiente con guacamole y especias.", category: "meal" },
  { id: "icecream", name: "Copa Helada Arcade", iconName: "icecream", hungerBoost: 20, happinessBoost: 35, cost: 14, description: "Tres bolas de helado artesanal con barquillo.", category: "snack" },
  { id: "coffee", name: "Espresso Doble", iconName: "coffee", hungerBoost: 10, happinessBoost: 30, cost: 10, description: "Café humeante que sube la energía al 100%.", category: "snack" },
];

export const ACCESSORIES_SHOP: AccessoryItem[] = [
  // ==========================================
  // SOMBREROS (HATS)
  // ==========================================
  { id: "cap", name: "Gorra Roja Retro", iconName: "cap", type: "hat", cost: 20, description: "Clásica gorra de béisbol con visera y estilo 90s.", rarity: "common" },
  { id: "crown", name: "Corona Imperial de Oro", iconName: "crown", type: "hat", cost: 75, description: "Confeccionada con oro puro y rubí resplandeciente.", rarity: "legendary" },
  { id: "wizard", name: "Gorro de Mago Arcano", iconName: "wizard", type: "hat", cost: 50, description: "Sombrero cónico estrellado para lanzar hechizos.", rarity: "epic" },
  { id: "sunglasses", name: "Lentes 8-bit Thug", iconName: "sunglasses", type: "hat", cost: 30, description: "Gafas de sol negras pixeladas con puro flow retro.", rarity: "rare" },
  { id: "bow", name: "Moño Rojo Kawaii", iconName: "bow", type: "hat", cost: 15, description: "Moñito coqueto que se ajusta a la orejita.", rarity: "common" },
  { id: "tophat", name: "Galera Victoriana", iconName: "tophat", type: "hat", cost: 40, description: "Sombrero de copa alta con cinta de terciopelo.", rarity: "rare" },
  { id: "headphones", name: "Auriculares Gamer", iconName: "headphones", type: "hat", cost: 45, description: "Headset circumaural con almohadillas neón.", rarity: "rare" },
  { id: "bandana", name: "Bandana Ninja Roja", iconName: "bandana", type: "hat", cost: 35, description: "Cinta de combate que ondea con el viento.", rarity: "rare" },
  { id: "viking", name: "Casco Vikingo", iconName: "viking", type: "hat", cost: 55, description: "Casco de hierro con cuernos para batallas épicas.", rarity: "epic" },
  { id: "pirate", name: "Tricornio Pirata", iconName: "pirate", type: "hat", cost: 50, description: "Sombrero de corsario con emblema de calavera.", rarity: "epic" },
  { id: "halo", name: "Halo Celestial", iconName: "halo", type: "hat", cost: 80, description: "Aro dorado brillante que flota sobre la cabeza.", rarity: "legendary" },
  { id: "horns", name: "Cuernos de Dragón", iconName: "horns", type: "hat", cost: 60, description: "Par de cuernos carmesí con aura ardiente.", rarity: "epic" },
  { id: "chef", name: "Gorro de Chef Gourmand", iconName: "chef", type: "hat", cost: 25, description: "Toque blanco esponjoso de maestro cocinero.", rarity: "common" },
  { id: "party", name: "Bonete de Fiesta", iconName: "party", type: "hat", cost: 18, description: "Cono festivo multicolor con borla de confeti.", rarity: "common" },
  { id: "astronaut", name: "Casco de Astronauta", iconName: "astronaut", type: "hat", cost: 90, description: "Visor dorado hermético para caminatas lunares.", rarity: "legendary" },
  { id: "flower", name: "Flor Hawaiana", iconName: "flower", type: "hat", cost: 15, description: "Hibisco tropical rosado colocado en la oreja.", rarity: "common" },

  // ==========================================
  // TRAJES Y ROPA (OUTFITS)
  // ==========================================
  { id: "cape", name: "Capa de Superhéroe", iconName: "cape", type: "outfit", cost: 55, description: "Capa escarlata ondeante atada al cuello.", rarity: "epic" },
  { id: "scarf", name: "Bufanda Tejida Rayas", iconName: "scarf", type: "outfit", cost: 25, description: "Bufanda abrigada a rayas rojas y blancas de lana.", rarity: "common" },
  { id: "tie", name: "Moño Corbatín de Gala", iconName: "tie", type: "outfit", cost: 30, description: "Para ocasiones de etiqueta y grandes fiestas.", rarity: "rare" },
  { id: "hoodie", name: "Chaleco Deportivo", iconName: "hoodie", type: "outfit", cost: 40, description: "Chaleco urbano con cremallera frontal.", rarity: "rare" },
  { id: "armor", name: "Peto de Caballero", iconName: "armor", type: "outfit", cost: 65, description: "Placa metálica forjada en la herrería medieval.", rarity: "epic" },
  { id: "medal", name: "Medalla de Campeón", iconName: "medal", type: "outfit", cost: 35, description: "Medalla dorada con cinta tricolor ganada con honor.", rarity: "rare" },
  { id: "kimono", name: "Kimono Tradicional", iconName: "kimono", type: "outfit", cost: 60, description: "Túnica oriental de seda con faja obi dorada.", rarity: "epic" },
  { id: "spacesuit", name: "Traje Espacial Biónico", iconName: "spacesuit", type: "outfit", cost: 95, description: "Mono presurizado con soporte vital y parches.", rarity: "legendary" },
  { id: "ninja", name: "Disfraz Ninja Táctico", iconName: "ninja", type: "outfit", cost: 50, description: "Ropa ligera oscura para moverse en las sombras.", rarity: "rare" },
  { id: "tuxedo", name: "Esmoquin de Agente 007", iconName: "tuxedo", type: "outfit", cost: 70, description: "Chaqueta negra de etiqueta y camisa almidonada.", rarity: "epic" },
  { id: "doctor", name: "Bata de Científico", iconName: "doctor", type: "outfit", cost: 45, description: "Bata blanca de laboratorio con estetoscopio.", rarity: "rare" },
  { id: "sweater", name: "Suéter Navideño", iconName: "sweater", type: "outfit", cost: 30, description: "Tejido cálido verde con patrones de pinos.", rarity: "common" },

  // ==========================================
  // OBJETOS EN MANO (HELD ITEMS)
  // ==========================================
  { id: "banana_nanotech", name: "Nano Banana Gadget", iconName: "banana_held", type: "held", cost: 45, description: "Dispositivo cyberpunk en forma de banana con luces neón.", rarity: "legendary" },
  { id: "sword", name: "Espada de Píxeles", iconName: "sword", type: "held", cost: 50, description: "Hoja de acero templado para aventureros valientes.", rarity: "epic" },
  { id: "wand", name: "Varita de Hadas", iconName: "wand", type: "held", cost: 40, description: "Báculo mágico que emite destellos de luz.", rarity: "rare" },
  { id: "shield", name: "Escudo con Emblema", iconName: "shield", type: "held", cost: 45, description: "Escudo de madera con refuerzos de bronce.", rarity: "rare" },
  { id: "balloon", name: "Globo Flotante", iconName: "balloon", type: "held", cost: 20, description: "Globo rojo de helio atado con un cordel.", rarity: "common" },
  { id: "gameboy", name: "Mini Consola Portátil", iconName: "gameboy", type: "held", cost: 60, description: "Dispositivo de videojuegos 8 bits para jugar juntos.", rarity: "epic" },
  { id: "fish_pole", name: "Caña de Pescar", iconName: "fish_pole", type: "held", cost: 35, description: "Caña con anzuelo y un pequeño pececito picando.", rarity: "common" },

  // ==========================================
  // AURAS Y EFECTOS VISUALES (AURAS)
  // ==========================================
  { id: "fire", name: "Aura de Fuego Vivo", iconName: "aura_fire", type: "aura", cost: 70, description: "Llamas ardientes que rodean a tu mascota.", rarity: "legendary" },
  { id: "stars", name: "Polvo de Estrellas", iconName: "aura_stars", type: "aura", cost: 55, description: "Constelaciones y brillos estelares flotantes.", rarity: "epic" },
  { id: "electric", name: "Chispas de Rayo", iconName: "aura_electric", type: "aura", cost: 65, description: "Descargas eléctricas azul cian palpitantes.", rarity: "legendary" },
  { id: "hearts", name: "Remolino de Amor", iconName: "aura_hearts", type: "aura", cost: 40, description: "Corazoncitos dulces girando en el aire.", rarity: "rare" },
  { id: "bubbles", name: "Burbujas Iridiscentes", iconName: "aura_bubbles", type: "aura", cost: 35, description: "Burbujas transparentes que reflejan la luz.", rarity: "common" },

  // ==========================================
  // TINTES DE PELO / SKINS (SKINS)
  // ==========================================
  { id: "skin_gold", name: "Tinte Dorado Real", iconName: "skin_gold", type: "skin", cost: 100, description: "Brillo metálico dorado puro de mascota de oro.", rarity: "legendary" },
  { id: "skin_shadow", name: "Tinte Sombra Negra", iconName: "skin_shadow", type: "skin", cost: 60, description: "Pigmento azabache oscuro y sigiloso.", rarity: "epic" },
  { id: "skin_snow", name: "Tinte Blanco Nieve", iconName: "skin_snow", type: "skin", cost: 50, description: "Pelaje inmaculado como la nieve polar.", rarity: "rare" },
  { id: "skin_neon", name: "Tinte Neón Cyberpunk", iconName: "skin_neon", type: "skin", cost: 75, description: "Cian bioluminiscente de alta tecnología.", rarity: "legendary" },

  // ==========================================
  // FONDOS LCD TEMÁTICOS (BACKGROUNDS)
  // ==========================================
  { id: "room", name: "LCD Tamagotchi 1996", iconName: "bg_room", type: "bg", cost: 0, description: "Pantalla verde de cristal líquido con matriz de puntos retro.", rarity: "common" },
  { id: "bedroom", name: "Dormitorio Pixel 90s", iconName: "bg_bedroom", type: "bg", cost: 30, description: "Habitación acogedora con alfombra gamer y ventana.", rarity: "common" },
  { id: "park", name: "Parque Soleado", iconName: "bg_park", type: "bg", cost: 35, description: "Césped esmeralda, árboles pixel y cielo azul.", rarity: "common" },
  { id: "space", name: "Galaxia Cósmica", iconName: "bg_space", type: "bg", cost: 60, description: "El vacío estelar con nebulosas moradas y cometas.", rarity: "epic" },
  { id: "dungeon", name: "Castillo Medieval", iconName: "bg_dungeon", type: "bg", cost: 50, description: "Paredes de piedra antigua y antorchas encendidas.", rarity: "rare" },
  { id: "beach", name: "Playa Arcade", iconName: "bg_beach", type: "bg", cost: 45, description: "Olas marinas, arena dorada y sol brillante.", rarity: "rare" },
  { id: "cyberpunk", name: "Ciudad Cyberpunk", iconName: "bg_cyberpunk", type: "bg", cost: 75, description: "Rascacielos iluminados con anuncios neón holográficos.", rarity: "legendary" },
  { id: "volcano", name: "Cueva Volcánica", iconName: "bg_volcano", type: "bg", cost: 65, description: "Ríos de magma caliente y piedras incandescentes.", rarity: "epic" },
];
