import { useState, useEffect } from "react";
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
        title: "Bosque de Estudios",
        description: "Gamifica tu aprendizaje plantando y cultivando árboles con cada sesión de estudio.",
        icon: Gamepad2,
        color: "from-neon-green to-emerald-500",
        image: "/screenshots/forest.png"
    },
    {
        id: 5,
        title: "Biblioteca Personalizada",
        description: "Sube, organiza y filtra tus apuntes, resúmenes y ejercicios por materia y año.",
        icon: FileText,
        color: "from-neon-purple to-pink-500",
        image: "/screenshots/library.png"
    },
    {
        id: 6,
        title: "Métricas y Rendimiento",
        description: "Analiza a fondo cuánto y cómo estudias con gráficos detallados diarios.",
        icon: BarChart3,
        color: "from-purple-400 to-purple-700",
        image: "/screenshots/metricas.png"
    },
    {
        id: 7,
        title: "Marketplace de Comunidad",
        description: "Adquiere mazos de estudio, temas y pócimas gastando tus XP ganados.",
        icon: Store,
        color: "from-orange-500 to-red-500",
        image: "/screenshots/marketplace.png"
    },
    {
        id: 8,
        title: "Logros e Insignias",
        description: "Desbloquea logros académicos y demuestra tu nivel en la plataforma.",
        icon: Trophy,
        color: "from-yellow-400 to-yellow-600",
        image: "/screenshots/logros.png"
    },
    {
        id: 9,
        title: "Comunidad y Competencia",
        description: "Añade amigos, compara XP semanal y motivaciónate en equipo.",
        icon: Users,
        color: "from-neon-gold to-yellow-500",
        image: "/screenshots/friends.png"
    },
    {
        id: 10,
        title: "T.A.B.E. IA",
        description: "Un tutor inteligente disponible 24/7 para resolver tus dudas exactas y diagramar planes.",
        icon: Bot,
        color: "from-neon-cyan to-blue-500",
        image: "/screenshots/ai.png"
    },
    {
        id: 11,
        title: "Calendario Universitario",
        description: "Lleva el control de todos tus parciales, finales y entregas en un solo lugar sincronizado.",
        icon: Calendar,
        color: "from-purple-500 to-indigo-500",
        image: "/screenshots/calendar.png"
    },
    {
        id: 12,
        title: "Cuestionarios Automáticos",
        description: "Crea exámenes de opción múltiple con IA y pon a prueba tus conocimientos antes del gran día.",
        icon: CheckCircle,
        color: "from-indigo-400 to-indigo-600",
        image: "/screenshots/cuestionarios.png"
    },
    {
        id: 13,
        title: "Sistema de Flashcards",
        description: "Repasa con inteligencia a través del algoritmo de repetición espaciada nativo.",
        icon: Layers,
        color: "from-pink-500 to-rose-500",
        image: "/screenshots/flashcards.png"
    },
    {
        id: 14,
        title: "Integración Comunitaria",
        description: "Estudia junto a otros estudiantes, comparte voz y pantalla en salas de estudio en vivo.",
        icon: Users,
        color: "from-[#5865F2] to-blue-600",
        image: "/screenshots/discord.png"
    },
    {
        id: 15,
        title: "Personalización Total",
        description: "Ajusta temas de color, tiempos del Pomodoro y notificaciones a tu propio ritmo.",
        icon: Settings,
        color: "from-slate-400 to-slate-600",
        image: "/screenshots/config.png"
    },
    {
        id: 16,
        title: "Pomodoro Global",
        description: "Mantén el control de tus tiempos de estudio y descansos sin importar en qué parte de la app te encuentres.",
        icon: Timer,
        color: "from-purple-500 to-fuchsia-600",
        image: "/screenshots/pomodoro.png"
    }
];

export function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-advance
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isHovered]);

    const nextSlide = () => setCurrent((p) => (p + 1) % slides.length);
    const prevSlide = () => setCurrent((p) => (p - 1 + slides.length) % slides.length);

    return (
        <div
            className="w-full flex flex-col gap-6"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Browser Frame Window */}
            <div className="relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[16/9] flex flex-col group">

                {/* Traffic Lights Header */}
                <div className="h-10 bg-secondary/80 border-b border-border/50 flex items-center px-4 gap-2 z-20">
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
                            className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col items-center justify-center ${index === current ? "opacity-100 z-10" : "opacity-0 z-0"
                                }`}
                        >
                            {/* Fallback styling for when actual image is missing */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-[0.03]`} />

                            {/* Instead of a broken image, we show a sleek fallback if they haven't uploaded screenshots yet */}
                            <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center flex-col text-center p-6 border-b border-transparent">
                                {/* If image was loaded, it would cover this. Since we know they don't exist yet, we style the fallback beautifully */}
                                <slide.icon className={`w-24 h-24 mb-6 opacity-20 bg-gradient-to-br ${slide.color} rounded-3xl p-4`} />
                                <div className="text-xl font-bold opacity-30">Pega aquí tu captura de pantalla</div>
                                <div className="text-sm font-mono text-muted-foreground mt-2 opacity-50">public{slide.image}</div>
                            </div>

                            {/* The actual image tag (hide broken image icon natively) */}
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-opacity duration-300 z-20"
                                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    ))}
                </div>

                {/* Left/Right Controls (show on hover) */}
                <button
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-background/80 border border-border/50 text-foreground backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-background/80 border border-border/50 text-foreground backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Slide Information & Navigation Dots */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {slides.map((slide, index) => (
                        <button
                            key={slide.id}
                            onClick={() => setCurrent(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === current ? "w-8 bg-neon-cyan" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                }`}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-3 animate-fade-in flex-1 text-center md:text-right justify-center md:justify-end min-h-[48px]">
                    <div className="hidden sm:block">
                        <div className="text-sm font-bold text-foreground">
                            {slides[current].title}
                        </div>
                        <div className="text-xs text-muted-foreground max-w-[280px]">
                            {slides[current].description}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
