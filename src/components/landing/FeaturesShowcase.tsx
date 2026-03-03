import { useState, useCallback } from "react";
import {
    LayoutDashboard, GraduationCap, FileText, Layers, ClipboardList,
    ShoppingBag, BookOpen, CalendarDays, Timer, BarChart3,
    TreePine, MessageSquare, Trophy, Users, Bot, Settings,
    ChevronDown, ChevronUp, Sparkles, X
} from "lucide-react";

interface FeaturePhoto {
    src: string;
    label: string;
}

interface FeatureSection {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    glowColor: string;
    mainImage: string;
    features: FeaturePhoto[];
}

const sections: FeatureSection[] = [
    {
        id: "dashboard",
        title: "Dashboard",
        description: "Panel principal con vista 360° de tu progreso académico: materias aprobadas, horas de estudio, racha, promedio general y próximos exámenes.",
        icon: LayoutDashboard,
        color: "text-neon-cyan",
        glowColor: "from-neon-cyan/20 to-neon-cyan/5",
        mainImage: "/features/dashboard.webp",
        features: [],
    },
    {
        id: "plan-carrera",
        title: "Plan de Carrera",
        description: "Mapa interactivo de correlatividades. Visualizá qué materias podés cursar, cuáles aprobaste y tu progreso año por año.",
        icon: GraduationCap,
        color: "text-neon-purple",
        glowColor: "from-neon-purple/20 to-neon-purple/5",
        mainImage: "/features/plan-carrera.webp",
        features: [],
    },
    {
        id: "apuntes",
        title: "Apuntes",
        description: "Editor de documentos potente con bloques, listas, títulos y formato enriquecido. Organizá tus apuntes por materia y accedé desde cualquier dispositivo.",
        icon: FileText,
        color: "text-neon-cyan",
        glowColor: "from-neon-cyan/20 to-neon-cyan/5",
        mainImage: "/features/apuntes.webp",
        features: [
            { src: "/features/apuntes-editor.webp", label: "Editor avanzado de bloques con formato enriquecido" },
        ],
    },
    {
        id: "flashcards",
        title: "Flashcards",
        description: "Creá mazos de tarjetas interactivas y estudialas con repetición espaciada. Animaciones 3D, temporizador y estadísticas de cada sesión.",
        icon: Layers,
        color: "text-neon-purple",
        glowColor: "from-neon-purple/20 to-neon-purple/5",
        mainImage: "/features/flashcards.webp",
        features: [
            { src: "/features/flashcards-crear.webp", label: "Creación y edición de tarjetas" },
            { src: "/features/flashcards-estudio.webp", label: "Modo estudio con animación 3D" },
            { src: "/features/flashcards-respuesta.webp", label: "Sistema de calificación de respuestas" },
            { src: "/features/flashcards-resultados.webp", label: "Resumen de sesión con estadísticas" },
        ],
    },
    {
        id: "cuestionarios",
        title: "Cuestionarios",
        description: "Generá quizzes con IA a partir de tus apuntes o PDFs. Elegí tema, dificultad y cantidad de preguntas. Resolvelos con temporizador.",
        icon: ClipboardList,
        color: "text-neon-green",
        glowColor: "from-neon-green/20 to-neon-green/5",
        mainImage: "/features/cuestionarios.webp",
        features: [
            { src: "/features/cuestionarios-generar.webp", label: "Generación de quiz con IA" },
            { src: "/features/cuestionarios-resolver.webp", label: "Resolución con opciones múltiples y timer" },
        ],
    },
    {
        id: "marketplace",
        title: "Marketplace",
        description: "Tienda de recursos académicos donde podés encontrar y compartir material de estudio con otros estudiantes.",
        icon: ShoppingBag,
        color: "text-amber-400",
        glowColor: "from-amber-400/20 to-amber-400/5",
        mainImage: "/features/marketplace.webp",
        features: [],
    },
    {
        id: "biblioteca",
        title: "Biblioteca",
        description: "Organizá tus archivos y recursos por año y materia. Subí PDFs, links y documentos. El visor integrado genera Flashcards, Quizzes y Resúmenes con IA directo del PDF.",
        icon: BookOpen,
        color: "text-neon-cyan",
        glowColor: "from-neon-cyan/20 to-neon-cyan/5",
        mainImage: "/features/biblioteca.webp",
        features: [
            { src: "/features/biblioteca-carpeta.webp", label: "Contenido organizado en carpetas" },
            { src: "/features/biblioteca-visor.webp", label: "Visor PDF con IA: Flashcards, Quiz y Resumen" },
        ],
    },
    {
        id: "calendario",
        title: "Calendario",
        description: "Calendario académico con vista mensual. Agendá exámenes, TPs y eventos con detalle de materia, tipo y horario.",
        icon: CalendarDays,
        color: "text-neon-purple",
        glowColor: "from-neon-purple/20 to-neon-purple/5",
        mainImage: "/features/calendario.webp",
        features: [
            { src: "/features/calendario-evento.webp", label: "Detalle de evento con materia y tipo" },
        ],
    },
    {
        id: "pomodoro",
        title: "Pomodoro",
        description: "Temporizador Pomodoro con círculo de progreso animado. Seleccioná la materia, configurá la duración y medí tu productividad.",
        icon: Timer,
        color: "text-neon-green",
        glowColor: "from-neon-green/20 to-neon-green/5",
        mainImage: "/features/pomodoro.webp",
        features: [],
    },
    {
        id: "metricas",
        title: "Métricas",
        description: "Dashboard analítico: gráficos de horas, distribución por materia, racha de estudio, productividad semanal y tendencias.",
        icon: BarChart3,
        color: "text-neon-cyan",
        glowColor: "from-neon-cyan/20 to-neon-cyan/5",
        mainImage: "/features/metricas.webp",
        features: [],
    },
    {
        id: "bosque",
        title: "Mi Bosque",
        description: "Tu bosque virtual crece con cada sesión Pomodoro completada. Cada árbol representa tu esfuerzo de estudio.",
        icon: TreePine,
        color: "text-emerald-400",
        glowColor: "from-emerald-400/20 to-emerald-400/5",
        mainImage: "/features/bosque.webp",
        features: [],
    },

    {
        id: "logros",
        title: "Logros",
        description: "Sistema de medallas y objetivos desbloqueables por racha, materias aprobadas y horas acumuladas.",
        icon: Trophy,
        color: "text-amber-400",
        glowColor: "from-amber-400/20 to-amber-400/5",
        mainImage: "/features/logros.webp",
        features: [],
    },
    {
        id: "amigos",
        title: "Amigos",
        description: "Ranking social con tus compañeros. Compará rachas, XP semanal y logros. Invitá amigos con tu código.",
        icon: Users,
        color: "text-neon-cyan",
        glowColor: "from-neon-cyan/20 to-neon-cyan/5",
        mainImage: "/features/amigos.webp",
        features: [],
    },
    {
        id: "asistente-ia",
        title: "Asistente IA",
        description: "Chat inteligente con T.A.B.E. IA. Explicar temas, simulacros, planear estudios, agendar y ver progreso. Creá IAs personalizadas.",
        icon: Bot,
        color: "text-neon-purple",
        glowColor: "from-neon-purple/20 to-neon-purple/5",
        mainImage: "/features/asistente-ia.webp",
        features: [
            { src: "/features/asistente-personajes.webp", label: "Selección de personalidad IA" },
            { src: "/features/asistente-crear.webp", label: "Crear IA personalizada con nombre y emoji" },
            { src: "/features/asistente-chat.webp", label: "Conversación en vivo con la IA" },
            { src: "/features/asistente-respuesta.webp", label: "Respuestas detalladas paso a paso" },
        ],
    },
    {
        id: "configuracion",
        title: "Configuración",
        description: "Personalizá tu experiencia: perfil, tema, notificaciones, Google Calendar y exportación de datos.",
        icon: Settings,
        color: "text-muted-foreground",
        glowColor: "from-muted/20 to-muted/5",
        mainImage: "/features/configuracion.webp",
        features: [
            { src: "/features/configuracion-opciones.webp", label: "Opciones avanzadas e integraciones" },
        ],
    },
];

/* ── Lightbox global ── */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-[10000] p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
                <X className="w-6 h-6 text-white" />
            </button>
            <img
                src={src}
                alt="Vista ampliada"
                className="max-w-[95vw] max-h-[90vh] rounded-xl shadow-2xl border border-white/10 object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

/* ── Feature Card ── */
function FeatureCard({
    section,
    index,
    onImageClick,
}: {
    section: FeatureSection;
    index: number;
    onImageClick: (src: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const Icon = section.icon;
    const isEven = index % 2 === 0;
    const hasFeatures = section.features.length > 0;

    return (
        <div className="space-y-6">
            <div
                className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${isEven ? "" : "lg:[direction:rtl]"}`}
            >
                {/* Text */}
                <div className={`space-y-5 ${isEven ? "" : "lg:[direction:ltr]"}`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-sm font-medium ${section.color}`}>
                        <Icon className="w-4 h-4" />
                        {section.title}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold leading-tight">
                        {section.title}
                    </h3>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        {section.description}
                    </p>
                    {hasFeatures && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/80 transition-all text-sm font-medium ${section.color}`}
                        >
                            <Sparkles className="w-4 h-4" />
                            {expanded ? "Ocultar funciones" : `Ver ${section.features.length} funciones`}
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {/* Image */}
                <div className={`relative group cursor-pointer ${isEven ? "" : "lg:[direction:ltr]"}`} onClick={() => onImageClick(section.mainImage)}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${section.glowColor} rounded-2xl blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />
                    <div className="relative rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/20 transition-transform duration-300 hover:scale-[1.02]">
                        <img
                            src={section.mainImage}
                            alt={section.title}
                            className="w-full h-auto"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                </div>
            </div>

            {/* Expanded features */}
            {hasFeatures && expanded && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {section.features.map((feat, i) => (
                        <div
                            key={i}
                            className="group/feat relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                            onClick={() => onImageClick(feat.src)}
                        >
                            <img
                                src={feat.src}
                                alt={feat.label}
                                className="w-full h-40 object-cover object-top"
                                loading="lazy"
                                decoding="async"
                            />
                            <div className="p-3">
                                <p className="text-xs font-medium text-muted-foreground leading-snug flex items-start gap-1.5">
                                    <Sparkles className={`w-3 h-3 mt-0.5 flex-shrink-0 ${section.color}`} />
                                    {feat.label}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Main Section ── */
export function FeaturesShowcase() {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    const openLightbox = useCallback((src: string) => {
        setLightboxSrc(src);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxSrc(null);
    }, []);

    return (
        <>
            <section id="funcionalidades" className="py-24 relative overflow-hidden bg-background">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-purple/3 via-transparent to-transparent pointer-events-none" />

                <div className="container mx-auto px-4 md:px-6 relative z-10">
                    {/* Header */}
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-sm font-medium text-neon-purple mb-6">
                            <Sparkles className="w-4 h-4" />
                            Explorá la Plataforma
                        </div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold mb-5">
                            Todo lo que necesitás para{" "}
                            <span className="gradient-text">aprobar</span>
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Cada herramienta fue diseñada para que estudies menos tiempo pero de forma más inteligente. Hacé click en cada imagen para verla en detalle.
                        </p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-20 lg:space-y-28">
                        {sections.map((section, i) => (
                            <FeatureCard
                                key={section.id}
                                section={section}
                                index={i}
                                onImageClick={openLightbox}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Single global lightbox */}
            {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}
        </>
    );
}
