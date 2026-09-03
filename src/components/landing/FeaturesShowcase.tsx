import { useState, useCallback } from "react";
import {
    LayoutDashboard, GraduationCap, FileText, Layers, ClipboardList,
    ShoppingBag, BookOpen, CalendarDays, Timer, BarChart3,
    TreePine, Trophy, Users, Bot, Settings,
    ChevronDown, ChevronUp, Sparkles, X
} from "lucide-react";

interface FeaturePhoto { src: string; label: string; }
interface FeatureSection {
    id: string; title: string; description: string; icon: React.ElementType;
    color: string; mainImage: string; features: FeaturePhoto[];
}

const brandColors = ["#1475e5", "#ff9415", "#48bd22", "#ffd21c"];

const sections: FeatureSection[] = [
    { id: "dashboard", title: "Dashboard", description: "Panel principal con vista 360° de tu progreso académico.", icon: LayoutDashboard, color: brandColors[0], mainImage: "/features/dashboard.webp", features: [] },
    { id: "plan-carrera", title: "Plan de Carrera", description: "Mapa interactivo de correlatividades y progreso por año.", icon: GraduationCap, color: brandColors[1], mainImage: "/features/plan-carrera.webp", features: [] },
    { id: "apuntes", title: "Apuntes", description: "Editor de documentos con bloques, listas y formato enriquecido.", icon: FileText, color: brandColors[2], mainImage: "/features/apuntes.webp", features: [{ src: "/features/apuntes-editor.webp", label: "Editor avanzado de bloques" }] },
    { id: "flashcards", title: "Flashcards", description: "Tarjetas interactivas con repetición espaciada y animaciones 3D.", icon: Layers, color: brandColors[3], mainImage: "/features/flashcards.webp", features: [{ src: "/features/flashcards-crear.webp", label: "Creación de tarjetas" }, { src: "/features/flashcards-estudio.webp", label: "Modo estudio 3D" }, { src: "/features/flashcards-respuesta.webp", label: "Calificación de respuestas" }, { src: "/features/flashcards-resultados.webp", label: "Resumen de sesión" }] },
    { id: "cuestionarios", title: "Cuestionarios", description: "Quizzes generados con IA a partir de tus apuntes o PDFs.", icon: ClipboardList, color: brandColors[2], mainImage: "/features/cuestionarios.webp", features: [{ src: "/features/cuestionarios-generar.webp", label: "Generación con IA" }, { src: "/features/cuestionarios-resolver.webp", label: "Resolución con timer" }] },
    { id: "marketplace", title: "Marketplace", description: "Tienda de recursos académicos para compartir material.", icon: ShoppingBag, color: brandColors[3], mainImage: "/features/marketplace.webp", features: [] },
    { id: "biblioteca", title: "Biblioteca", description: "Organizá archivos por año y materia. Visor PDF con IA integrada.", icon: BookOpen, color: brandColors[0], mainImage: "/features/biblioteca.webp", features: [{ src: "/features/biblioteca-carpeta.webp", label: "Carpetas organizadas" }, { src: "/features/biblioteca-visor.webp", label: "Visor PDF con IA" }] },
    { id: "calendario", title: "Calendario", description: "Calendario académico con vista mensual para exámenes y TPs.", icon: CalendarDays, color: brandColors[1], mainImage: "/features/calendario.webp", features: [{ src: "/features/calendario-evento.webp", label: "Detalle de evento" }] },
    { id: "pomodoro", title: "Pomodoro", description: "Temporizador con círculo animado y métricas de productividad.", icon: Timer, color: brandColors[2], mainImage: "/features/pomodoro.webp", features: [] },
    { id: "metricas", title: "Métricas", description: "Gráficos de horas, distribución por materia y racha de estudio.", icon: BarChart3, color: brandColors[0], mainImage: "/features/metricas.webp", features: [] },
    { id: "bosque", title: "Mi Bosque", description: "Tu bosque virtual crece con cada sesión Pomodoro.", icon: TreePine, color: brandColors[2], mainImage: "/features/bosque.webp", features: [] },
    { id: "logros", title: "Logros", description: "Medallas y objetivos desbloqueables por racha y progreso.", icon: Trophy, color: brandColors[3], mainImage: "/features/logros.webp", features: [] },
    { id: "amigos", title: "Amigos", description: "Ranking social con compañeros. Compará rachas y XP.", icon: Users, color: brandColors[0], mainImage: "/features/amigos.webp", features: [] },
    { id: "asistente-ia", title: "Asistente IA", description: "Chat inteligente para explicar temas, planear y crear IAs personalizadas.", icon: Bot, color: brandColors[1], mainImage: "/features/asistente-ia.webp", features: [{ src: "/features/asistente-personajes.webp", label: "Personalidades IA" }, { src: "/features/asistente-crear.webp", label: "Crear IA personalizada" }, { src: "/features/asistente-chat.webp", label: "Chat en vivo" }, { src: "/features/asistente-respuesta.webp", label: "Respuestas paso a paso" }] },
    { id: "configuracion", title: "Configuración", description: "Perfil, tema, notificaciones, Google Calendar y exportación.", icon: Settings, color: "#666", mainImage: "/features/configuracion.webp", features: [{ src: "/features/configuracion-opciones.webp", label: "Opciones avanzadas" }] },
];

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
            </button>
            <img src={src} alt="Vista ampliada" className="max-w-[95vw] max-h-[90vh] rounded-xl shadow-2xl border-2 border-white/10 object-contain" onClick={e => e.stopPropagation()} />
        </div>
    );
}

function FeatureCard({ section, index, onImageClick }: { section: FeatureSection; index: number; onImageClick: (src: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [loadedFeats, setLoadedFeats] = useState<Record<number, boolean>>({});
    const Icon = section.icon;
    const isEven = index % 2 === 0;
    const hasFeatures = section.features.length > 0;

    return (
        <div className="space-y-6">
            <div className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${isEven ? "" : "lg:[direction:rtl]"}`}>
                {/* Text */}
                <div className={`space-y-4 ${isEven ? "" : "lg:[direction:ltr]"}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm font-extrabold"
                        style={{ borderColor: section.color + "40", backgroundColor: section.color + "12", color: section.color }}>
                        <Icon className="w-4 h-4" /> {section.title}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black">{section.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{section.description}</p>
                    {hasFeatures && (
                        <button onClick={() => setExpanded(!expanded)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-extrabold transition-all duration-200 hover:-translate-y-0.5"
                            style={{ borderColor: section.color + "40", backgroundColor: section.color + "10", color: section.color }}>
                            <Sparkles className="w-4 h-4" />
                            {expanded ? "Ocultar" : `Ver ${section.features.length} funciones`}
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {/* Image */}
                <div className={`relative group cursor-pointer ${isEven ? "" : "lg:[direction:ltr]"}`} onClick={() => onImageClick(section.mainImage)}>
                    <div className="relative aspect-video rounded-xl border-2 border-border overflow-hidden shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0_0_hsl(var(--border))] bg-muted/10">
                        {!loaded && (
                            <div className="absolute inset-0 bg-muted/20 animate-pulse flex items-center justify-center">
                                <Icon className="w-10 h-10 opacity-10" style={{ color: section.color }} />
                            </div>
                        )}
                        <img src={section.mainImage} alt={section.title}
                            className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
                            loading="lazy" decoding="async" onLoad={() => setLoaded(true)} />
                    </div>
                </div>
            </div>

            {/* Expanded features */}
            {hasFeatures && expanded && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {section.features.map((feat, i) => (
                        <div key={i} className="rounded-xl border-2 border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-[3px_3px_0_0_hsl(var(--border))] hover:shadow-[5px_5px_0_0_hsl(var(--border))]"
                            onClick={() => onImageClick(feat.src)}>
                            <div className="relative h-36 bg-muted/10">
                                {!loadedFeats[i] && <div className="absolute inset-0 bg-muted/20 animate-pulse" />}
                                <img src={feat.src} alt={feat.label}
                                    className={`w-full h-full object-cover object-top transition-opacity duration-500 ${loadedFeats[i] ? "opacity-100" : "opacity-0"}`}
                                    loading="lazy" decoding="async" onLoad={() => setLoadedFeats(p => ({ ...p, [i]: true }))} />
                            </div>
                            <div className="p-3">
                                <p className="text-xs font-bold text-muted-foreground flex items-start gap-1.5">
                                    <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: section.color }} />
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

export function FeaturesShowcase() {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const open = useCallback((src: string) => setLightboxSrc(src), []);
    const close = useCallback(() => setLightboxSrc(null), []);

    return (
        <>
            <section id="funcionalidades" className="py-20 md:py-28 bg-secondary/40">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <span className="inline-block px-4 py-2 rounded-lg bg-[#ff9415]/10 border-2 border-[#ff9415]/20 text-sm font-extrabold text-[#ff9415] mb-6">
                            🔍 Explorá la Plataforma
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black mb-5">
                            Todo lo que necesitás para <span className="text-[#1475e5]">aprobar</span>
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Cada herramienta fue diseñada para que estudies de forma más inteligente. Hacé click en cada imagen para verla en detalle.
                        </p>
                    </div>

                    <div className="space-y-20 lg:space-y-28">
                        {sections.map((s, i) => (
                            <FeatureCard key={s.id} section={s} index={i} onImageClick={open} />
                        ))}
                    </div>
                </div>
            </section>
            {lightboxSrc && <Lightbox src={lightboxSrc} onClose={close} />}
        </>
    );
}
