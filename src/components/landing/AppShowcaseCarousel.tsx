import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Layers
} from 'lucide-react';
import { CircularCarousel, CircularCarouselHandle, CarouselItem } from '@/components/ui/CircularCarousel';

export interface TabeShowcaseItem extends CarouselItem {
  category: string;
  tag: string;
  description: string;
}

export const TABE_MODULES: TabeShowcaseItem[] = [
  {
    src: '/caps/tabe-cap-01.png',
    alt: 'Dashboard principal con TabeGochi y Progreso Global',
    title: 'Dashboard & TabeGochi',
    subtitle: 'Progreso y Mascota Virtual',
    category: 'Dashboard',
    tag: 'XP & Tamagotchi',
    description: 'Tu centro de comando académico con seguimiento de materias cursables, progreso anual en tiempo real, horas de estudio y tu mascota virtual interactiva TabeGochi.',
  },
  {
    src: '/caps/tabe-cap-02.png',
    alt: 'Gamificación RPG con Nivel de Estudiante y Asistencia',
    title: 'Gamificación RPG & Exámenes',
    subtitle: 'Nivel 716 e Historial',
    category: 'RPG',
    tag: 'Gamificación',
    description: 'Sistema de progresión RPG con experiencia, atributos (INT, FOC), recompensas al subir de nivel, tarjeta de sellos semanal y cuenta regresiva a exámenes.',
  },
  {
    src: '/caps/tabe-cap-03.png',
    alt: 'TABE AI con Asistente y Voz en Vivo',
    title: 'TABE AI Tutor',
    subtitle: 'Tutoría Inteligente con Voz',
    category: 'IA',
    tag: 'Voz en Vivo',
    description: 'Asistente inteligente multimodal con soporte para preguntas sobre tus apuntes, navegación web, razonamiento profundo y modo de voz bidireccional en tiempo real.',
  },
  {
    src: '/caps/tabe-cap-04.png',
    alt: 'Motor de Rutas de Estudio con IA',
    title: 'Motor de Rutas con IA',
    subtitle: 'Generador de Niveles',
    category: 'IA',
    tag: 'Rutas de Estudio',
    description: 'Convierte automáticamente cientos de miles de caracteres de tus apuntes en árboles estructurados de aprendizaje paso a paso para tus parciales.',
  },
  {
    src: '/caps/tabe-cap-05.png',
    alt: 'Árbol de Aprendizaje interactivo con podcasts y guías',
    title: 'Árbol de Aprendizaje',
    subtitle: 'Ruta Gamificada y Podcasts',
    category: 'Rutas',
    tag: 'Estilo Duolingo',
    description: 'Avanza por nodos temáticos completando guías teóricas, escuchando podcasts generados con IA, practicando orales interactivos y dominando flashcards.',
  },
  {
    src: '/caps/tabe-cap-06.png',
    alt: 'Gestor de Apuntes Neobrutalista',
    title: 'Gestor de Apuntes',
    subtitle: 'Organización Neobrutalista',
    category: 'Apuntes',
    tag: 'Notion Universitario',
    description: 'Panel centralizado de tus apuntes personales, compartidos y de amigos, clasificados por materia, año de cursada y con búsqueda instantánea.',
  },
  {
    src: '/caps/tabe-cap-07.png',
    alt: 'Editor de Apuntes Pro con diagramas Mermaid y Magia AI',
    title: 'Editor de Apuntes Pro',
    subtitle: 'Mermaid, LaTeX & Magia AI',
    category: 'Apuntes',
    tag: 'Editor Enriquecido',
    description: 'Editor enriquecido de alto rendimiento con diagramas de flujo interactivos Mermaid, fórmulas LaTeX, exportación a PDF profesional y asistencia con IA.',
  },
  {
    src: '/caps/tabe-cap-08.png',
    alt: 'Mazo de Flashcards con barajado interactivo',
    title: 'Mazo de Flashcards',
    subtitle: 'Repaso Espaciado Activo',
    category: 'Flashcards',
    tag: 'Barajado 3D',
    description: 'Simulador de tarjetas de estudio con animación de barajado físico, algoritmo de repetición espaciada y priorización inteligente de conceptos difíciles.',
  },
  {
    src: '/caps/tabe-cap-09.png',
    alt: 'Simulador de Parciales con preguntas interactivas',
    title: 'Simulador de Parciales',
    subtitle: 'Tests y Validación Instantánea',
    category: 'Exámenes',
    tag: 'Práctica Real',
    description: 'Banco de preguntas verdadero/falso y opción múltiple para ponerte a prueba bajo condiciones reales de examen con feedback y justificación inmediata.',
  },
  {
    src: '/caps/tabe-cap-10.png',
    alt: 'Pomodoro Global sincronizado con ventana flotante',
    title: 'Pomodoro Global',
    subtitle: 'Enfoque y Ventana Flotante',
    category: 'Enfoque',
    tag: 'Temporizador',
    description: 'Técnica Pomodoro sincronizada en la nube con intervalos de trabajo y descanso, vinculación a materias específicas y modo de ventana flotante (Picture-in-Picture).',
  },
  {
    src: '/caps/tabe-cap-11.png',
    alt: 'Calendario Académico con integración Google y Moodle',
    title: 'Calendario Académico',
    subtitle: 'Sincronización Moodle & Google',
    category: 'Calendario',
    tag: 'Google & Moodle',
    description: 'Agenda integral con fechas de parciales, entregas de trabajos prácticos, recordatorios y sincronización automática con Google Calendar y Moodle.',
  },
  {
    src: '/caps/tabe-cap-12.png',
    alt: 'Archipiélago de Estudio con 5 Islas Temáticas',
    title: 'Archipiélago de Estudio',
    subtitle: 'Gamificación de 5 Islas',
    category: 'Bosque',
    tag: '5 Mundos',
    description: 'Estudia concentrado para plantar árboles y desbloquear 5 islas temáticas (Clásica, Pizza, Gaming, Estudio y Cósmica) con diferentes niveles de dificultad.',
  },
  {
    src: '/caps/tabe-cap-13.png',
    alt: 'Métricas y Rendimiento con Predictor de Graduación',
    title: 'Métricas & Rendimiento',
    subtitle: 'Predictor de Graduación',
    category: 'Analíticas',
    tag: 'Predicción Real',
    description: 'Estadísticas detalladas de horas de estudio por materia y por día, efectividad en flashcards, seguimiento del sueño y predictor inteligente de graduación.',
  },
  {
    src: '/caps/tabe-cap-14.png',
    alt: 'Comunidad y Pase de Estudiante 3D con ranking',
    title: 'Comunidad & Amigos',
    subtitle: 'Pase 3D y Chat en Vivo',
    category: 'Comunidad',
    tag: 'Pase 3D',
    description: 'Credencial estudiantil interactiva con efecto 3D, chat en tiempo real con compañeros de cursada, salas de voz TabeTalk y ranking de rendimiento.',
  },
  {
    src: '/caps/tabe-cap-15.png',
    alt: 'Marketplace Colaborativo con recursos compartidos',
    title: 'Marketplace Colaborativo',
    subtitle: 'Mazos, Quizzes y Apuntes',
    category: 'Marketplace',
    tag: 'Recursos Libres',
    description: 'Biblioteca comunitaria abierta para descubrir, calificar e importar mazos de flashcards, cuestionarios y apuntes creados y validados por otros estudiantes.',
  },
];

export function AppShowcaseCarousel() {
  const carouselRef = useRef<CircularCarouselHandle | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TabeShowcaseItem | null>(null);

  const activeModule = TABE_MODULES[activeIndex] || TABE_MODULES[0];

  const handleSelectChip = (index: number) => {
    setActiveIndex(index);
    carouselRef.current?.focusIndex(index);
  };

  const handleStep = (delta: number) => {
    carouselRef.current?.stepBy(delta);
  };

  return (
    <div className="w-full relative select-none">
      {/* Controles flotantes Neobrutalistas para avanzar o retroceder */}
      <div className="relative w-full">
        {/* Botón flecha izquierda */}
        <button
          type="button"
          onClick={() => handleStep(-1)}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white hover:bg-[#00E5FF] text-black border-3 sm:border-4 border-black shadow-[4px_4px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] flex items-center justify-center transition-all duration-150 active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          title="Ver anterior"
          aria-label="Pantalla anterior"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Botón flecha derecha */}
        <button
          type="button"
          onClick={() => handleStep(1)}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white hover:bg-[#00E5FF] text-black border-3 sm:border-4 border-black shadow-[4px_4px_0_0_#000] sm:shadow-[6px_6px_0_0_#000] flex items-center justify-center transition-all duration-150 active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          title="Ver siguiente"
          aria-label="Pantalla siguiente"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Escenario 3D limpio y ultra amplio con rotación 360 visible */}
        <div className="relative w-full h-[580px] sm:h-[660px] md:h-[720px] overflow-visible">
          <CircularCarousel
            ref={carouselRef}
            items={TABE_MODULES}
            preset="cylinder"
            intro="rise"
            cardWidth={560}
            aspectRatio={16 / 9}
            gap={22}
            curve={0}
            fitToFrontCard={true}
            tilt={-11}
            speed={3.5}
            pauseOnHover={true}
            focusOnClick={true}
            captions={true}
            fadeColor="#ff9415"
            depthFade={0.22}
            innerShade={0.85}
            cornerRadius={18}
            onChange={(idx) => setActiveIndex(idx)}
            onItemClick={(item) => setSelectedItem(item as TabeShowcaseItem)}
            className="text-black"
          />
        </div>
      </div>

      {/* Barra Informativa Neobrutalista centrada */}
      <div className="mt-4 sm:mt-6 max-w-3xl mx-auto text-center space-y-3">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-lg bg-black text-[#00E5FF] font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_#000]">
            {activeModule.category}
          </span>
          <span className="px-3 py-1 rounded-lg bg-white text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_#000]">
            {activeModule.tag}
          </span>
          <button
            type="button"
            onClick={() => setSelectedItem(activeModule)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFE600] hover:bg-white text-black font-black text-xs uppercase tracking-wider rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Ampliar en HD
          </button>
        </div>
        <p className="text-black font-bold text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {activeModule.description}
        </p>
      </div>

      {/* Chips de Selección Rápida en Estilo Neobrutalista */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-5xl mx-auto px-2">
        {TABE_MODULES.map((item, idx) => {
          const isCurrent = idx === activeIndex;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => handleSelectChip(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-150 border-2 border-black cursor-pointer ${
                isCurrent
                  ? 'bg-black text-[#FFE600] shadow-[3px_3px_0_0_#000] -translate-y-0.5 scale-105'
                  : 'bg-white hover:bg-[#00E5FF] text-black shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5'
              }`}
            >
              {item.title.split('&')[0].trim()}
            </button>
          );
        })}
      </div>

      {/* Modal / Lightbox de Zoom de Alta Definición */}
      <AnimatePresence>
        {selectedItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-white border-4 sm:border-6 border-black rounded-3xl shadow-[12px_12px_0_0_#000] sm:shadow-[16px_16px_0_0_#000] overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header del Lightbox */}
              <div className="bg-[#FFE600] border-b-3 sm:border-b-4 border-black p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-black text-[#FFE600] font-black text-xs uppercase tracking-wider border-2 border-black">
                    {selectedItem.category}
                  </span>
                  <div>
                    <h4 className="text-black font-black text-lg sm:text-2xl leading-tight">
                      {selectedItem.title}
                    </h4>
                    <p className="text-black/80 text-xs sm:text-sm font-bold">
                      {selectedItem.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-black hover:text-white text-black border-3 border-black transition-colors cursor-pointer shadow-[3px_3px_0_0_#000]"
                  aria-label="Cerrar vista previa"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Imagen en Alta Definición */}
              <div className="flex-1 overflow-auto bg-zinc-100 flex items-center justify-center p-3 sm:p-6">
                <img
                  src={selectedItem.src}
                  alt={selectedItem.alt}
                  className="w-full h-auto max-h-[66vh] object-contain rounded-xl border-3 border-black shadow-[6px_6px_0_0_#000]"
                />
              </div>

              {/* Pie con descripción del módulo */}
              <div className="bg-white border-t-3 sm:border-t-4 border-black p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-black font-bold text-xs sm:text-sm max-w-2xl leading-relaxed">
                  {selectedItem.description}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2.5 bg-[#00E5FF] hover:bg-black hover:text-white text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] self-end sm:self-auto cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AppShowcaseCarousel;
