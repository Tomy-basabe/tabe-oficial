export interface DefaultQuestion {
  id: string;
  pregunta: string;
  explicacion: string;
  options: {
    id: string;
    texto: string;
    es_correcta: boolean;
  }[];
}

export const DEFAULT_GAME_QUESTIONS: DefaultQuestion[] = [
  {
    id: "def_q1",
    pregunta: "¿Cuál es la técnica Pomodoro estándar para sesiones de estudio?",
    explicacion: "La técnica Pomodoro tradicional consta de 25 minutos de enfoque y 5 minutos de descanso.",
    options: [
      { id: "o1", texto: "25 min de enfoque y 5 min de descanso", es_correcta: true },
      { id: "o2", texto: "45 min de enfoque y 15 min de descanso", es_correcta: false },
      { id: "o3", texto: "60 min continuos sin descanso", es_correcta: false },
      { id: "o4", texto: "10 min de enfoque y 20 min de descanso", es_correcta: false },
    ],
  },
  {
    id: "def_q2",
    pregunta: "¿Qué método de estudio se basa en poner a prueba activamente la memoria en lugar de releer?",
    explicacion: "Active Recall (recuperación activa) consiste en forzar a la mente a recordar la información sin mirar los apuntes.",
    options: [
      { id: "o1", texto: "Active Recall (Recuperación Activa)", es_correcta: true },
      { id: "o2", texto: "Lectura pasiva rápida", es_correcta: false },
      { id: "o3", texto: "Subrayado multicolor", es_correcta: false },
      { id: "o4", texto: "Copia textual de apuntes", es_correcta: false },
    ],
  },
  {
    id: "def_q3",
    pregunta: "¿Qué principio explica cómo se desvanece el recuerdo con el tiempo sin repetición?",
    explicacion: "Hermann Ebbinghaus formuló la Curva del Olvido, que demuestra la pérdida exponencial de retención si no hay repaso espaciado.",
    options: [
      { id: "o1", texto: "La Curva del Olvido de Ebbinghaus", es_correcta: true },
      { id: "o2", texto: "La Ley de Parkinson", es_correcta: false },
      { id: "o3", texto: "El Principio de Pareto", es_correcta: false },
      { id: "o4", texto: "La Navaja de Ockham", es_correcta: false },
    ],
  },
  {
    id: "def_q4",
    pregunta: "¿Qué técnica de estudio consiste en explicar un tema complejo con palabras tan simples como para un niño?",
    explicacion: "La técnica Feynman propone enseñar el concepto con tus propias palabras y simplificar al máximo para detectar lagunas.",
    options: [
      { id: "o1", texto: "Técnica Feynman", es_correcta: true },
      { id: "o2", texto: "Método Cornell", es_correcta: false },
      { id: "o3", texto: "Método Leitner", es_correcta: false },
      { id: "o4", texto: "Mapa Conceptual de Novak", es_correcta: false },
    ],
  },
  {
    id: "def_q5",
    pregunta: "¿Cuál es la unidad básica funcional de los seres vivos?",
    explicacion: "La célula es la estructura fundamental de todos los organismos vivientes.",
    options: [
      { id: "o1", texto: "La célula", es_correcta: true },
      { id: "o2", texto: "El átomo", es_correcta: false },
      { id: "o3", texto: "La proteína", es_correcta: false },
      { id: "o4", texto: "El tejido", es_correcta: false },
    ],
  },
  {
    id: "def_q6",
    pregunta: "¿Cuál es el planeta más grande del sistema solar?",
    explicacion: "Júpiter es el mayor planeta del sistema solar, con una masa más del doble que todos los demás planetas juntos.",
    options: [
      { id: "o1", texto: "Júpiter", es_correcta: true },
      { id: "o2", texto: "Saturno", es_correcta: false },
      { id: "o3", texto: "Neptuno", es_correcta: false },
      { id: "o4", texto: "Urano", es_correcta: false },
    ],
  },
  {
    id: "def_q7",
    pregunta: "¿Qué órgano humano consume aproximadamente el 20% de la energía del cuerpo?",
    explicacion: "El cerebro humano, a pesar de representar solo ~2% del peso corporal, consume cerca del 20% de la glucosa y oxígeno.",
    options: [
      { id: "o1", texto: "El cerebro", es_correcta: true },
      { id: "o2", texto: "El corazón", es_correcta: false },
      { id: "o3", texto: "El hígado", es_correcta: false },
      { id: "o4", texto: "Los pulmones", es_correcta: false },
    ],
  },
  {
    id: "def_q8",
    pregunta: "¿En qué año llegó el ser humano por primera vez a la Luna en la misión Apolo 11?",
    explicacion: "Neil Armstrong y Buzz Aldrin caminaron sobre la Luna el 20 de julio de 1969.",
    options: [
      { id: "o1", texto: "1969", es_correcta: true },
      { id: "o2", texto: "1959", es_correcta: false },
      { id: "o3", texto: "1975", es_correcta: false },
      { id: "o4", texto: "1965", es_correcta: false },
    ],
  },
  {
    id: "def_q9",
    pregunta: "¿Cuál es el elemento químico más abundante en el universo?",
    explicacion: "El hidrógeno constituye aproximadamente el 75% de la masa bariónica del universo.",
    options: [
      { id: "o1", texto: "Hidrógeno", es_correcta: true },
      { id: "o2", texto: "Oxígeno", es_correcta: false },
      { id: "o3", texto: "Helio", es_correcta: false },
      { id: "o4", texto: "Carbono", es_correcta: false },
    ],
  },
  {
    id: "def_q10",
    pregunta: "¿Qué significa la sigla 'IA' en computación?",
    explicacion: "IA significa Inteligencia Artificial, el desarrollo de sistemas capaces de realizar tareas cognitivas complejas.",
    options: [
      { id: "o1", texto: "Inteligencia Artificial", es_correcta: true },
      { id: "o2", texto: "Información Automatizada", es_correcta: false },
      { id: "o3", texto: "Interfaz Avanzada", es_correcta: false },
      { id: "o4", texto: "Interconexión Abierta", es_correcta: false },
    ],
  },
  {
    id: "def_q11",
    pregunta: "¿Cuál es el metal más ligero de la tabla periódica?",
    explicacion: "El litio (Li, número atómico 3) es el elemento sólido y metal más liviano conocido.",
    options: [
      { id: "o1", texto: "Litio", es_correcta: true },
      { id: "o2", texto: "Aluminio", es_correcta: false },
      { id: "o3", texto: "Magnesio", es_correcta: false },
      { id: "o4", texto: "Sodio", es_correcta: false },
    ],
  },
  {
    id: "def_q12",
    pregunta: "¿Qué estructura cerebral está fuertemente vinculada a la consolidación de la memoria a largo plazo?",
    explicacion: "El hipocampo es fundamental en la transferencia de recuerdos desde la memoria a corto plazo hacia la memoria a largo plazo.",
    options: [
      { id: "o1", texto: "El hipocampo", es_correcta: true },
      { id: "o2", texto: "La amígdala", es_correcta: false },
      { id: "o3", texto: "El bulbo raquídeo", es_correcta: false },
      { id: "o4", texto: "El cerebelo", es_correcta: false },
    ],
  },
  {
    id: "def_q13",
    pregunta: "¿Qué matemático propuso que en un triángulo rectángulo a² + b² = c²?",
    explicacion: "El teorema de Pitágoras relaciona la suma de los cuadrados de los catetos con el cuadrado de la hipotenusa.",
    options: [
      { id: "o1", texto: "Pitágoras", es_correcta: true },
      { id: "o2", texto: "Euclides", es_correcta: false },
      { id: "o3", texto: "Arquímedes", es_correcta: false },
      { id: "o4", texto: "Descartes", es_correcta: false },
    ],
  },
  {
    id: "def_q14",
    pregunta: "¿Cómo se llama el proceso por el cual las plantas convierten luz solar en glucosa y oxígeno?",
    explicacion: "La fotosíntesis es el proceso bioquímico vital que transforma energía lumínica en energía química.",
    options: [
      { id: "o1", texto: "Fotosíntesis", es_correcta: true },
      { id: "o2", texto: "Respiración celular", es_correcta: false },
      { id: "o3", texto: "Fermentación", es_correcta: false },
      { id: "o4", texto: "Quimiosíntesis", es_correcta: false },
    ],
  },
  {
    id: "def_q15",
    pregunta: "¿Cuál es el océano más extenso del planeta Tierra?",
    explicacion: "El océano Pacífico cubre más de 165 millones de kilómetros cuadrados, casi un tercio de la superficie terrestre.",
    options: [
      { id: "o1", texto: "Océano Pacífico", es_correcta: true },
      { id: "o2", texto: "Océano Atlántico", es_correcta: false },
      { id: "o3", texto: "Océano Índico", es_correcta: false },
      { id: "o4", texto: "Océano Ártico", es_correcta: false },
    ],
  }
];

export function getRandomDefaultQuestion(usedIds?: Set<string>): DefaultQuestion {
  const available = DEFAULT_GAME_QUESTIONS.filter(q => !usedIds?.has(q.id));
  const pool = available.length > 0 ? available : DEFAULT_GAME_QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}
