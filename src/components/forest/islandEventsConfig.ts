export type SpawnDirection = "left-to-right" | "right-to-left" | "random";

export interface IslandEventConfig {
  id: string;
  name: string;
  islandId: string;
  spriteKey: string;     // Refers to the PixelSpritesData key
  speed: "walk" | "run" | "float";
  spawnDirection: SpawnDirection;
  interactsWithTree: boolean;
  scaleModifier?: number; // Adjust scale for some variants
  cssFilter?: string;     // Use hue-rotate or brightness to reuse sprites for variants
}

export const ISLAND_EVENTS: Record<string, IslandEventConfig[]> = {
  // A. ISLA CLÁSICA (Bosque / Naturaleza)
  classic: [
    { id: "c1", name: "Explorador con mochila", islandId: "classic", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: true },
    { id: "c2", name: "Jardinero botánico", islandId: "classic", spriteKey: "explorer", speed: "walk", spawnDirection: "left-to-right", interactsWithTree: true, cssFilter: "hue-rotate(90deg)" },
    { id: "c3", name: "Duende travieso", islandId: "classic", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(180deg) brightness(1.2)" },
    { id: "c4", name: "Zorro rojo de perfil", islandId: "classic", spriteKey: "fox", speed: "run", spawnDirection: "random", interactsWithTree: false },
    { id: "c5", name: "Pájaro carpintero", islandId: "classic", spriteKey: "fox", speed: "float", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(240deg) scale(0.5)" },
    { id: "c6", name: "Guardabosques con linterna", islandId: "classic", spriteKey: "explorer", speed: "walk", spawnDirection: "right-to-left", interactsWithTree: false, cssFilter: "brightness(0.8)" },
    { id: "c7", name: "Conejo blanco", islandId: "classic", spriteKey: "fox", speed: "run", spawnDirection: "random", interactsWithTree: true, cssFilter: "brightness(200%) grayscale(100%) scale(0.6)" },
    { id: "c8", name: "Oso pardo bebé", islandId: "classic", spriteKey: "fox", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(1) hue-rotate(330deg) saturate(2) brightness(0.7) scale(1.2)" },
    { id: "c9", name: "Mariposa gigante", islandId: "classic", spriteKey: "pizza_slice", speed: "float", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(300deg) scale(0.5)" },
    { id: "c10", name: "Leñador zen", islandId: "classic", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "saturate(0.5)" },
    { id: "c11", name: "Búho volador", islandId: "classic", spriteKey: "fox", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(1) brightness(0.6)" },
    { id: "c12", name: "Oruga veloz", islandId: "classic", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(90deg) scale(0.5)" },
    { id: "c13", name: "Cazamariposas novato", islandId: "classic", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(45deg)" },
    { id: "c14", name: "Árbol viviente (Treant)", islandId: "classic", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(1) hue-rotate(60deg) scale(1.5)" },
    { id: "c15", name: "Científico de campo", islandId: "classic", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: true },
    { id: "c16", name: "Lobo solitario", islandId: "classic", spriteKey: "fox", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(1) brightness(0.8)" },
    { id: "c17", name: "Ciervo elegante", islandId: "classic", spriteKey: "fox", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.8) scale(1.3)" },
    { id: "c18", name: "Ardilla recolectora", islandId: "classic", spriteKey: "fox", speed: "run", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(1) scale(0.6)" },
    { id: "c19", name: "Dueto de hadas", islandId: "classic", spriteKey: "pizza_slice", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(2) hue-rotate(180deg) scale(0.3)" },
    { id: "c20", name: "Espíritu del bosque", islandId: "classic", spriteKey: "explorer", speed: "float", spawnDirection: "random", interactsWithTree: true, cssFilter: "brightness(1.5) opacity(0.6) hue-rotate(120deg)" },
  ],

  // B. ISLA PIZZA (Comida / Fast Food)
  pizza: [
    { id: "p1", name: "Chef pizzero", islandId: "pizza", spriteKey: "chef", speed: "run", spawnDirection: "random", interactsWithTree: false },
    { id: "p2", name: "Delivery retro", islandId: "pizza", spriteKey: "hurried_student", speed: "run", spawnDirection: "right-to-left", interactsWithTree: false, cssFilter: "hue-rotate(330deg)" },
    { id: "p3", name: "Rebanada de pizza viviente", islandId: "pizza", spriteKey: "pizza_slice", speed: "run", spawnDirection: "random", interactsWithTree: false },
    { id: "p4", name: "Hamburguesa con patas", islandId: "pizza", spriteKey: "pizza_slice", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.8) hue-rotate(20deg) scale(1.1)" },
    { id: "p5", name: "Botella de kétchup", islandId: "pizza", spriteKey: "pizza_slice", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(320deg) saturate(2)" },
    { id: "p6", name: "Mozo de restaurante", islandId: "pizza", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "grayscale(0.8)" },
    { id: "p7", name: "Perro salchicha pancho", islandId: "pizza", spriteKey: "fox", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.5) hue-rotate(15deg)" },
    { id: "p8", name: "Crítico gastronómico", islandId: "pizza", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(200deg)" },
    { id: "p9", name: "Panceta crujiente", islandId: "pizza", spriteKey: "pizza_slice", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "saturate(0.5) hue-rotate(10deg)" },
    { id: "p10", name: "Chef pastelero", islandId: "pizza", spriteKey: "chef", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(280deg)" },
    { id: "p11", name: "Cubiertos gigantes", islandId: "pizza", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(1) brightness(1.5)" },
    { id: "p12", name: "Caja de papas fritas", islandId: "pizza", spriteKey: "pizza_slice", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(40deg)" },
    { id: "p13", name: "Cazador de ofertas", islandId: "pizza", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: true },
    { id: "p14", name: "Donut rodante", islandId: "pizza", spriteKey: "pizza_slice", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(290deg) saturate(1.5)" },
    { id: "p15", name: "Barista apurado", islandId: "pizza", spriteKey: "coffee_scholar", speed: "run", spawnDirection: "random", interactsWithTree: false },
    { id: "p16", name: "Monstruo de queso", islandId: "pizza", spriteKey: "pizza_slice", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(1) saturate(3) hue-rotate(40deg) scale(1.4)" },
    { id: "p17", name: "Máquina expendedora", islandId: "pizza", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(340deg) scale(1.5)" },
    { id: "p18", name: "Cortador de pizza", islandId: "pizza", spriteKey: "mini_droid", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(1)" },
    { id: "p19", name: "Ladrón de rodajas", islandId: "pizza", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(0.4)" },
    { id: "p20", name: "Rey de la Mozzarella", islandId: "pizza", spriteKey: "chef", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(45deg) saturate(2)" },
  ],

  // C. ISLA GAMING (Arcade / Retro)
  gaming: [
    { id: "g1", name: "Spartan (Master Chief)", islandId: "gaming", spriteKey: "master_chief", speed: "run", spawnDirection: "random", interactsWithTree: false },
    { id: "g2", name: "Grunt alienígena", islandId: "gaming", spriteKey: "grunt", speed: "run", spawnDirection: "random", interactsWithTree: false },
    { id: "g3", name: "Soldado de combate", islandId: "gaming", spriteKey: "master_chief", speed: "run", spawnDirection: "left-to-right", interactsWithTree: false, cssFilter: "hue-rotate(200deg)" },
    { id: "g4", name: "Plomero retro", islandId: "gaming", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(330deg)" },
    { id: "g5", name: "Ninja sigiloso", islandId: "gaming", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(1) brightness(0.2)" },
    { id: "g6", name: "Fantasmita arcade", islandId: "gaming", spriteKey: "pizza_slice", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(240deg) brightness(1.5)" },
    { id: "g7", name: "Slime gelatinoso", islandId: "gaming", spriteKey: "grunt", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(100deg) scale(0.8)" },
    { id: "g8", name: "Mago de 8 bits", islandId: "gaming", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(270deg)" },
    { id: "g9", name: "Nave espacial mini", islandId: "gaming", spriteKey: "mini_droid", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(180deg)" },
    { id: "g10", name: "Espadachín RPG", islandId: "gaming", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(45deg)" },
    { id: "g11", name: "Robot retro", islandId: "gaming", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: true },
    { id: "g12", name: "Caza-recompensas", islandId: "gaming", spriteKey: "astronaut", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(150deg)" },
    { id: "g13", name: "Personaje glitch", islandId: "gaming", spriteKey: "hurried_student", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "invert(1) contrast(2)" },
    { id: "g14", name: "Guerrero pixel", islandId: "gaming", spriteKey: "master_chief", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(0.8) brightness(1.2)" },
    { id: "g15", name: "Cazador de tesoros", islandId: "gaming", spriteKey: "explorer", speed: "run", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(300deg)" },
    { id: "g16", name: "Zombi pixel", islandId: "gaming", spriteKey: "hurried_student", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(90deg) brightness(0.6)" },
    { id: "g17", name: "Monstruo ojo", islandId: "gaming", spriteKey: "pizza_slice", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(1) hue-rotate(300deg)" },
    { id: "g18", name: "Tanque diminuto", islandId: "gaming", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.5) hue-rotate(60deg)" },
    { id: "g19", name: "Jinete de ave", islandId: "gaming", spriteKey: "fox", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(50deg) scale(1.3)" },
    { id: "g20", name: "Jefe final", islandId: "gaming", spriteKey: "astronaut", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(0.3) scale(1.5)" },
  ],

  // D. ISLA ESTUDIO (Universidad / Biblioteca)
  study: [
    { id: "s1", name: "Estudiante trasnochado", islandId: "study", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(0.8) grayscale(0.3)" },
    { id: "s2", name: "Alumno estrella", islandId: "study", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "saturate(1.5)" },
    { id: "s3", name: "Profesor apurado", islandId: "study", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(200deg)" },
    { id: "s4", name: "Carrito de biblioteca", islandId: "study", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.5) hue-rotate(15deg)" },
    { id: "s5", name: "Estudiante en bici", islandId: "study", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(45deg)" },
    { id: "s6", name: "Lápiz viviente", islandId: "study", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(1) hue-rotate(40deg) saturate(2)" },
    { id: "s7", name: "El 'Aprobado'", islandId: "study", spriteKey: "hurried_student", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(280deg)" },
    { id: "s8", name: "Estudiante con mate", islandId: "study", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(90deg)" },
    { id: "s9", name: "Chico fotocopias", islandId: "study", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(1.2)" },
    { id: "s10", name: "Grupo de estudio", islandId: "study", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(330deg)" },
    { id: "s11", name: "Cafetera sobre ruedas", islandId: "study", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.8)" },
    { id: "s12", name: "Calculadora andante", islandId: "study", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "grayscale(1) brightness(1.2)" },
    { id: "s13", name: "Estudiante lo-fi", islandId: "study", spriteKey: "hurried_student", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(180deg) saturate(0.8)" },
    { id: "s14", name: "Mochila sobrecargada", islandId: "study", spriteKey: "grunt", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(250deg)" },
    { id: "s15", name: "El graduado", islandId: "study", spriteKey: "coffee_scholar", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "grayscale(0.5) brightness(0.7)" },
    { id: "s16", name: "Alumno al aula", islandId: "study", spriteKey: "hurried_student", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(30deg) saturate(1.5)" },
    { id: "s17", name: "Proyector móvil", islandId: "study", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(2)" },
    { id: "s18", name: "Drone de biblioteca", islandId: "study", spriteKey: "astronaut", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(0.8) hue-rotate(20deg) scale(0.6)" },
    { id: "s19", name: "Resaltador andante", islandId: "study", spriteKey: "explorer", speed: "run", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(1) saturate(5) hue-rotate(60deg) brightness(1.5)" },
    { id: "s20", name: "Duende de tesis", islandId: "study", spriteKey: "grunt", speed: "run", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(150deg) scale(0.8)" },
  ],

  // E. ISLA CÓSMICA (Espacio / Gravedad Cero)
  cosmic: [
    { id: "u1", name: "Astronauta en flotación", islandId: "cosmic", spriteKey: "astronaut", speed: "float", spawnDirection: "random", interactsWithTree: true },
    { id: "u2", name: "Marcianito en OVNI", islandId: "cosmic", spriteKey: "mini_droid", speed: "float", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(90deg) saturate(2)" },
    { id: "u3", name: "Rover lunar", islandId: "cosmic", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: true },
    { id: "u4", name: "Perro cosmonauta", islandId: "cosmic", spriteKey: "fox", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(0.5)" },
    { id: "u5", name: "Asteroide rodante", islandId: "cosmic", spriteKey: "pizza_slice", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "grayscale(1) brightness(0.6) scale(1.2)" },
    { id: "u6", name: "Droide mantenimiento", islandId: "cosmic", spriteKey: "mini_droid", speed: "float", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(200deg)" },
    { id: "u7", name: "Alienígena pulpo", islandId: "cosmic", spriteKey: "grunt", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(280deg) saturate(1.5)" },
    { id: "u8", name: "Turista galáctico", islandId: "cosmic", spriteKey: "explorer", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(180deg) brightness(1.2)" },
    { id: "u9", name: "Cometa rasante", islandId: "cosmic", spriteKey: "pizza_slice", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(220deg) brightness(2) scale(0.8)" },
    { id: "u10", name: "Minero espacial", islandId: "cosmic", spriteKey: "astronaut", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "sepia(0.8) hue-rotate(30deg)" },
    { id: "u11", name: "Planta alienígena", islandId: "cosmic", spriteKey: "grunt", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(120deg) brightness(1.5)" },
    { id: "u12", name: "Sonda histórica", islandId: "cosmic", spriteKey: "mini_droid", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "sepia(1)" },
    { id: "u13", name: "Agujero negro miniatura", islandId: "cosmic", spriteKey: "pizza_slice", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "invert(1) grayscale(1) contrast(2)" },
    { id: "u14", name: "Paracaidista orbital", islandId: "cosmic", spriteKey: "astronaut", speed: "run", spawnDirection: "random", interactsWithTree: false, cssFilter: "hue-rotate(45deg)" },
    { id: "u15", name: "Monolito flotante", islandId: "cosmic", spriteKey: "coffee_scholar", speed: "float", spawnDirection: "random", interactsWithTree: false, cssFilter: "brightness(0) scale(1.2)" },
    { id: "u16", name: "Gato cósmico", islandId: "cosmic", spriteKey: "fox", speed: "float", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(250deg) brightness(1.2)" },
    { id: "u17", name: "Recolector polvo", islandId: "cosmic", spriteKey: "astronaut", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(320deg)" },
    { id: "u18", name: "Extraterrestre pacífico", islandId: "cosmic", spriteKey: "grunt", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(60deg) saturate(2)" },
    { id: "u19", name: "Baliza holográfica", islandId: "cosmic", spriteKey: "mini_droid", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "brightness(2) hue-rotate(180deg) opacity(0.8)" },
    { id: "u20", name: "Viajero del tiempo", islandId: "cosmic", spriteKey: "master_chief", speed: "walk", spawnDirection: "random", interactsWithTree: true, cssFilter: "hue-rotate(270deg) contrast(1.5)" },
  ],
};
