import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, TooltipRenderProps } from "react-joyride";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { Sparkles, X, ChevronRight, ChevronLeft } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";

function ComicTourTooltip({
    index,
    isLastStep,
    size,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
}: TooltipRenderProps) {
    const handleNextClick = (e: React.MouseEvent<HTMLElement>) => {
        ComicAudio.playPop();
        if (primaryProps.onClick) {
            primaryProps.onClick(e);
        }
    };

    const handleBackClick = (e: React.MouseEvent<HTMLElement>) => {
        ComicAudio.playPop();
        if (backProps.onClick) {
            backProps.onClick(e);
        }
    };

    const handleSkipClick = (e: React.MouseEvent<HTMLElement>) => {
        ComicAudio.playPop();
        if (skipProps.onClick) {
            skipProps.onClick(e);
        }
    };

    const handleCloseClick = (e: React.MouseEvent<HTMLElement>) => {
        ComicAudio.playPop();
        if (closeProps.onClick) {
            closeProps.onClick(e);
        }
    };

    // Obtenemos el texto del botón primario asegurando que NUNCA aparezca "Last"
    const nextLabel = (() => {
        if (step.locale?.last && step.locale.last.toLowerCase() !== 'last') {
            return step.locale.last;
        }
        if (step.locale?.next && step.locale.next.toLowerCase() !== 'next' && !isLastStep) {
            return step.locale.next;
        }
        return 'Siguiente';
    })();

    return (
        <div
            {...tooltipProps}
            className="relative z-[10001] max-w-sm sm:max-w-md w-[calc(100vw-32px)] sm:w-auto bg-card text-foreground border-4 border-foreground rounded-2xl p-4 sm:p-5 shadow-[6px_6px_0_0_#ff9415] space-y-3.5 select-none animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Encabezado Neo-Brutalist: Badge y botón cerrar */}
            <div className="flex items-center justify-between gap-2 border-b-2 border-border/80 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-[11px] sm:text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000] -rotate-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 fill-black stroke-black" />
                        Guía TABE
                    </span>
                    {size > 1 && (
                        <span className="px-2 py-0.5 rounded-lg bg-secondary text-foreground font-black text-[10px] sm:text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
                            Paso {index + 1} de {size}
                        </span>
                    )}
                </div>

                <button
                    {...closeProps}
                    onClick={handleCloseClick}
                    type="button"
                    title="Cerrar tutorial"
                    className="w-7 h-7 rounded-lg bg-secondary hover:bg-destructive hover:text-white border-2 border-black shadow-[1.5px_1.5px_0_0_#000] flex items-center justify-center transition-all cursor-pointer"
                >
                    <X className="w-4 h-4 stroke-[3]" />
                </button>
            </div>

            {/* Contenido explicativo */}
            <div className="text-xs sm:text-sm font-bold text-foreground leading-relaxed pt-0.5">
                {step.content}
            </div>

            {/* Acciones: Saltar, Atrás, Siguiente */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-border/80">
                {/* Botón Saltar */}
                {skipProps && (
                    <button
                        {...skipProps}
                        onClick={handleSkipClick}
                        type="button"
                        className="text-[11px] sm:text-xs font-black uppercase text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                        Saltar
                    </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    {/* Botón Atrás */}
                    {index > 0 && backProps && (
                        <button
                            {...backProps}
                            onClick={handleBackClick}
                            type="button"
                            className="px-3 py-1.5 rounded-xl bg-secondary text-foreground font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-secondary/80 active:translate-y-[1px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
                            Atrás
                        </button>
                    )}

                    {/* Botón Siguiente / Primario */}
                    <button
                        {...primaryProps}
                        onClick={handleNextClick}
                        type="button"
                        className="px-4 py-2 rounded-xl bg-[#FFE600] text-black font-black text-xs sm:text-sm uppercase tracking-wide border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-[#ffe033] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                        <span>{nextLabel}</span>
                        <ChevronRight className="w-4 h-4 stroke-[3]" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function TutorialTour() {
    const { user, isGuest } = useAuth();
    const location = useLocation();
    const [run, setRun] = useState(false);
    const [tourSteps, setTourSteps] = useState<Step[]>([]);
    const [initialized, setInitialized] = useState(false);

    // DICCIONARIO DE PASOS POR SECCIÓN (RUTAS)
    const TOUR_STEPS_BY_ROUTE: Record<string, Step[]> = {
        "/dashboard": [
            {
                target: '.tour-dashboard-stats',
                content: '¡Bienvenido a T.A.B.E.! Aquí en tu Tablero verás un resumen de todo tu progreso y tu Nivel actual.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableScrolling: true,
                disableBeacon: true,
            },
            {
                target: '.tour-dashboard-schedule',
                content: 'En este minicalendario verás tus repasos y eventos más próximos para que no te olvides de nada.',
                placement: 'left',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableScrolling: true,
            }
        ],
        "/carrera": [
            {
                target: '.tour-career-add',
                content: '¡Agrega aquí las materias de tu plan de estudios! Podrás vincular correlativas para organizar tu mapa académico.',
                placement: 'bottom-end',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/apuntes": [
            {
                target: '.tour-notion-create',
                content: 'Usa este botón para crear tu primer apunte enriquecido.',
                placement: 'right',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            },
            {
                target: '.tour-notion-list',
                content: 'Al abrir un apunte, podrás seleccionarle cualquier texto y usar el menú flotante para preguntarle a la IA.',
                placement: 'right',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableScrolling: true,
            }
        ],
        "/notion": [
            {
                target: '.tour-notion-create',
                content: 'Usa este botón para crear tu primer apunte enriquecido.',
                placement: 'right',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            },
            {
                target: '.tour-notion-list',
                content: 'Al abrir un apunte, podrás seleccionarle cualquier texto y usar el menú flotante para preguntarle a la IA.',
                placement: 'right',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableScrolling: true,
            }
        ],
        "/flashcards": [
            {
                target: '.tour-flashcards-decks',
                content: 'Los mazos organizan tus Flashcards. Selecciona un Mazo y empieza el "Modo Repaso" para testear tu memoria usando repetición espaciada.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/cuestionarios": [
            {
                target: '.tour-quizzes-decks',
                content: 'Genera exámenes de opción múltiple manualmente o deja que la Inteligencia Artificial los cree a base de tus apuntes.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/marketplace": [
            {
                target: '.tour-marketplace-decks',
                content: '¡Descubre el contenido de la Comunidad! Aquí puedes explorar y compartir mazos, cuestionarios, apuntes y recursos académicos creados por estudiantes.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/comunidad": [
            {
                target: '.tour-marketplace-decks',
                content: '¡Descubre el contenido de la Comunidad! Aquí puedes explorar y compartir mazos, cuestionarios, apuntes y recursos académicos creados por estudiantes.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/biblioteca": [
            {
                target: '.tour-library-upload',
                content: 'Sube tus PDFs o imágenes directas a la nube de Tabe para poder leerlos sin interrupciones.',
                placement: 'left',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/calendario": [
            {
                target: '.tour-calendar-schedule',
                content: 'Si usas Google Calendar, aprieta aquí para exportar o importar todos tus eventos automáticamente.',
                placement: 'bottom-end',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/pomodoro": [
            {
                target: '.tour-pomodoro-stats',
                content: 'Estudia en bloques de alta concentración. Cuando termines este reloj, ganarás XP y harás crecer tus árboles.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/metricas": [
            {
                target: '.tour-metrics-overview',
                content: 'Tu mapa térmico a lo GitHub. Cada cuadrado verde representa cuántas horas estudiaste ese día.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/bosque": [
            {
                target: '.tour-forest-tree',
                content: 'Cada bloque de Pomodoro que terminas se planta aquí en forma de árbol. ¡No dejes que tu bosque muera, mantén la consistencia!',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/tabetalk": [
            {
                target: '.tour-discord-connect',
                content: 'Únete a las salas de voz para estudiar chill con personas reales escuchando Lofi.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/discord": [
            {
                target: '.tour-discord-connect',
                content: 'Únete a las salas de voz para estudiar chill con personas reales escuchando Lofi.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/logros": [
            {
                target: '.tour-achievements-list',
                content: 'Cada objetivo cumplido tiene su medalla. Úsalas para adornar tu perfil.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/amigos": [
            {
                target: '.tour-friends-add',
                content: 'Agrega a tus compañeros usando su ID de Tabe (Lo encontrarás arriba a la derecha).',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente', last: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ]
    };

    useEffect(() => {
        if (!user && !isGuest) return;

        // Give UI a tiny moment to render the newly navigated page before triggering tour
        const timer = setTimeout(() => {
            const rawTutorials = localStorage.getItem("tabe-tutorials-completed") || "{}";
            let tutorialsCompleted: Record<string, boolean> = {};

            try {
                tutorialsCompleted = JSON.parse(rawTutorials);
            } catch (e) {
                tutorialsCompleted = {};
            }

            const currentPath = location.pathname;
            const routeSteps = TOUR_STEPS_BY_ROUTE[currentPath];

            if (routeSteps && routeSteps.length > 0 && !tutorialsCompleted[currentPath]) {
                setTourSteps(routeSteps);
                setRun(true);
            } else {
                setRun(false);
            }
            setInitialized(true);

        }, 800);

        return () => clearTimeout(timer);
    }, [user, isGuest, location.pathname]);

    // Hack: Force Joyride to re-calculate its overlay mask when scrolling Radix's viewport
    useEffect(() => {
        if (!run) return;
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
        const handleScroll = () => {
            window.dispatchEvent(new Event('resize'));
        };
        if (viewport) {
            viewport.addEventListener('scroll', handleScroll);
            return () => viewport.removeEventListener('scroll', handleScroll);
        }
    }, [run]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, step } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);

            // Mark this specific route as visited
            const rawTutorials = localStorage.getItem("tabe-tutorials-completed") || "{}";
            let tutorialsCompleted: Record<string, boolean> = {};
            try {
                tutorialsCompleted = JSON.parse(rawTutorials);
            } catch (e) {
                tutorialsCompleted = {};
            }
            tutorialsCompleted[location.pathname] = true;
            localStorage.setItem("tabe-tutorials-completed", JSON.stringify(tutorialsCompleted));
        }

        // Before step renders, ensure the target is scrolled into the ScrollArea viewport
        if (type === 'step:before') {
            const targetEl = document.querySelector(step.target as string);
            const viewport = document.querySelector('[data-radix-scroll-area-viewport]');

            if (targetEl && viewport && viewport.contains(targetEl)) {
                // Calculate position of target relative to the scrolling container
                const targetRectTop = targetEl.getBoundingClientRect().top;
                const scrollContentTop = viewport.firstElementChild?.getBoundingClientRect().top || 0;

                // Absolute pixel distance from the top of the scrollable content
                const absoluteTargetTop = targetRectTop - scrollContentTop;

                // Center the item vertically by subtracting half the viewport height
                const viewportHeight = viewport.getBoundingClientRect().height;
                const offset = absoluteTargetTop - (viewportHeight / 2) + 20;

                viewport.scrollTo({ top: Math.max(0, offset), behavior: 'instant' });
                // Force an immediate recalculation manually
                window.dispatchEvent(new Event('resize'));
            } else if (targetEl) {
                // Just fallback to native scroll if not in scrollarea
                targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    };

    if (!initialized || !run || tourSteps.length === 0) return null;

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={tourSteps}
            tooltipComponent={ComicTourTooltip}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Siguiente',
                next: 'Siguiente',
                skip: 'Saltar',
            }}
            styles={{
                options: {
                    zIndex: 10000,
                    overlayColor: 'rgba(0, 0, 0, 0.65)',
                },
            }}
        />
    );
}
