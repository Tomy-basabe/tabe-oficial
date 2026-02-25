import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard, Calendar, Layers, Bot, Settings, Gamepad2, Users, FileText, CheckCircle, BarChart3, Store, Trophy, BookOpen, Map, Timer } from "lucide-react";

const slides = [
    {
        id: 1,
        title: "Tablero Principal",
        description: "Visualiza tu progreso, métricas clave y próximos exámenes de un vistazo.",
        icon: LayoutDashboard,
        color: "from-neon-cyan to-blue-500",
        image: "/screenshots/dashboard.png"
    },
    {
        id: 2,
        title: "Plan de Carrera",
        description: "Gestiona tus correlativas y promedios con un mapa visual e intuitivo.",
        icon: Map,
        color: "from-yellow-500 to-amber-600",
        image: "/screenshots/plan.png"
    },
    {
        id: 3,
        title: "Tus Apuntes (Notion)",
        description: "Un espacio de trabajo completo estilo Notion para tomar tus apuntes integrados.",
        icon: BookOpen,
        color: "from-slate-300 to-slate-500",
        image: "/screenshots/notion.png"
    },
    {
        id: 4,
        title: "Sistema de Flashcards",
        description: "Repasa con inteligencia a través del algoritmo de repetición espaciada nativo.",
        icon: Layers,
        color: "from-pink-500 to-rose-500",
        image: "/screenshots/flashcards.png"
    },
    {
        id: 5,
        title: "Cuestionarios Automáticos",
        description: "Crea exámenes de opción múltiple con IA y pon a prueba tus conocimientos antes del gran día.",
        icon: CheckCircle,
        color: "from-indigo-400 to-indigo-600",
        image: "/screenshots/cuestionarios.png"
    },
    {
        id: 6,
        title: "Marketplace de Comunidad",
        description: "Adquiere mazos de estudio, temas y pócimas gastando tus XP ganados.",
        icon: Store,
        color: "from-orange-500 to-red-500",
        image: "/screenshots/marketplace.png"
    },
    {
        id: 7,
        title: "Biblioteca Personalizada",
        description: "Sube, organiza y filtra tus apuntes, resúmenes y ejercicios por materia y año.",
        icon: FileText,
        color: "from-neon-purple to-pink-500",
        image: "/screenshots/library.png"
    },
    {
        id: 8,
        title: "Calendario Universitario",
        description: "Lleva el control de todos tus parciales, finales y entregas en un solo lugar sincronizado.",
        icon: Calendar,
        color: "from-purple-500 to-indigo-500",
        image: "/screenshots/calendar.png"
    },
    {
        id: 9,
        title: "Pomodoro Global",
        description: "Mantén el control de tus tiempos de estudio y descansos sin importar en qué parte de la app te encuentres.",
        icon: Timer,
        color: "from-purple-500 to-fuchsia-600",
        image: "/screenshots/pomodoro.png"
    },
    {
        id: 10,
        title: "Métricas y Rendimiento",
        description: "Analiza a fondo cuánto y cómo estudias con gráficos detallados diarios.",
        icon: BarChart3,
        color: "from-purple-400 to-purple-700",
        image: "/screenshots/metricas.png"
    },
    {
        id: 11,
        title: "Bosque de Estudios",
        description: "Gamifica tu aprendizaje plantando y cultivando árboles con cada sesión de estudio.",
        icon: Gamepad2,
        color: "from-neon-green to-emerald-500",
        image: "/screenshots/forest.png"
    },
    {
        id: 12,
        title: "Integración Comunitaria",
        description: "Estudia junto a otros estudiantes, comparte voz y pantalla en salas de estudio en vivo.",
        icon: Users,
        color: "from-[#5865F2] to-blue-600",
        image: "/screenshots/discord.png"
    },
    {
        id: 13,
        title: "Logros e Insignias",
        description: "Desbloquea logros académicos y demuestra tu nivel en la plataforma.",
        icon: Trophy,
        color: "from-yellow-400 to-yellow-600",
        image: "/screenshots/logros.png"
    },
    {
        id: 14,
        title: "Comunidad y Amigos",
        description: "Añade amigos, compara XP semanal y motivaciónate en equipo.",
        icon: Users,
        color: "from-neon-gold to-yellow-500",
        image: "/screenshots/friends.png"
    },
    {
        id: 15,
        title: "T.A.B.E. IA",
        description: "Un tutor inteligente disponible 24/7 para resolver tus dudas exactas y diagramar planes.",
        icon: Bot,
        color: "from-neon-cyan to-blue-500",
        image: "/screenshots/ai.png"
    },
    {
        id: 16,
        title: "Personalización Total",
        description: "Ajusta temas de color, tiempos del Pomodoro y notificaciones a tu propio ritmo.",
        icon: Settings,
        color: "from-slate-400 to-slate-600",
        image: "/screenshots/config.png"
    }
];

export function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const dragStartX = useRef(0);
    const dragStartTime = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-advance
    useEffect(() => {
        if (isHovered || isDragging) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isHovered, isDragging]);

    const nextSlide = useCallback(() => setCurrent((p) => (p + 1) % slides.length), []);
    const prevSlide = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % slides.length), []);

    // Pointer/Touch handlers for swipe
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        setIsDragging(true);
        dragStartX.current = e.clientX;
        dragStartTime.current = Date.now();
        setDragOffset(0);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) return;
        const diff = e.clientX - dragStartX.current;
        setDragOffset(diff);
    }, [isDragging]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);

        const diff = e.clientX - dragStartX.current;
        const elapsed = Date.now() - dragStartTime.current;
        const velocity = Math.abs(diff) / elapsed;
        const threshold = velocity > 0.5 ? 30 : 80; // Lower threshold for fast swipes

        if (Math.abs(diff) > threshold) {
            if (diff < 0) nextSlide();
            else prevSlide();
        }

        setDragOffset(0);
    }, [isDragging, nextSlide, prevSlide]);

    // Calculate visual offset for drag feedback
    const getSlideStyle = (index: number) => {
        const isActive = index === current;
        const dragPercent = containerRef.current ? (dragOffset / containerRef.current.clientWidth) * 100 : 0;

        return {
            opacity: isActive ? 1 : 0,
            transform: isActive ? `translateX(${dragPercent * 0.3}px)` : 'translateX(0)',
            transition: isDragging ? 'none' : 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: isActive ? 10 : 0,
        };
    };

    return (
        <div
            className="w-full flex flex-col gap-6"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Browser Frame Window */}
            <div
                ref={containerRef}
                className="relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[16/9] flex flex-col group cursor-grab active:cursor-grabbing select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'pan-y' }}
            >
                {/* Traffic Lights Header */}
                <div className="h-10 bg-secondary/80 border-b border-border/50 flex items-center px-4 gap-2 z-20 pointer-events-none">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="ml-4 h-5 hidden sm:flex flex-1 max-w-[200px] bg-background/50 rounded-md border border-border/50 items-center justify-center px-3">
                        <span className="text-[10px] text-muted-foreground font-mono">tabe-oficial.com/app</span>
                    </div>
                </div>

                {/* Carousel Viewport */}
                <div className="relative flex-1 overflow-hidden bg-background/50">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className="absolute inset-0 flex flex-col items-center justify-center"
                            style={getSlideStyle(index)}
                        >
                            {/* Gradient bg */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-[0.03]`} />

                            {/* Fallback */}
                            <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center flex-col text-center p-6 border-b border-transparent">
                                <slide.icon className={`w-24 h-24 mb-6 opacity-20 bg-gradient-to-br ${slide.color} rounded-3xl p-4`} />
                                <div className="text-xl font-bold opacity-30">Pega aquí tu captura de pantalla</div>
                                <div className="text-sm font-mono text-muted-foreground mt-2 opacity-50">public{slide.image}</div>
                            </div>

                            {/* actual image */}
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-opacity duration-300 z-20 pointer-events-none"
                                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                draggable={false}
                            />
                        </div>
                    ))}
                </div>

                {/* Left/Right Controls */}
                <button
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-background/90 border border-border/50 text-foreground backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-secondary hover:scale-110 active:scale-95 pointer-events-auto"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-background/90 border border-border/50 text-foreground backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-secondary hover:scale-110 active:scale-95 pointer-events-auto"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                {/* Swipe hint on mobile */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 md:hidden flex items-center gap-2 text-xs text-muted-foreground/60 animate-pulse">
                    <ChevronLeft className="w-3 h-3" />
                    <span>Desliza</span>
                    <ChevronRight className="w-3 h-3" />
                </div>
            </div>

            {/* Slide Info & Navigation Dots */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 w-full md:w-auto flex-wrap justify-center">
                    {slides.map((slide, index) => (
                        <button
                            key={slide.id}
                            onClick={() => setCurrent(index)}
                            className={`h-2 rounded-full transition-all duration-500 ${index === current ? "w-8 bg-gradient-to-r from-neon-cyan to-neon-purple" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                }`}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-1 text-center md:text-right justify-center md:justify-end min-h-[48px]">
                    <div className="hidden sm:block">
                        <div className="text-sm font-bold text-foreground transition-all duration-300" key={current}>
                            {slides[current].title}
                        </div>
                        <div className="text-xs text-muted-foreground max-w-[280px] transition-all duration-300">
                            {slides[current].description}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
