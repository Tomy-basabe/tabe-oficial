import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, TooltipRenderProps } from "react-joyride";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { Sparkles, X, ChevronRight, ChevronLeft } from "lucide-react";

function ModernTourTooltip({
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
        if (primaryProps.onClick) {
            primaryProps.onClick(e);
        }
    };

    const handleBackClick = (e: React.MouseEvent<HTMLElement>) => {
        if (backProps.onClick) {
            backProps.onClick(e);
        }
    };

    const handleSkipClick = (e: React.MouseEvent<HTMLElement>) => {
        if (skipProps.onClick) {
            skipProps.onClick(e);
        }
    };

    const handleCloseClick = (e: React.MouseEvent<HTMLElement>) => {
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
            className="relative z-[10001] max-w-sm sm:max-w-md w-[calc(100vw-32px)] sm:w-[380px] bg-white dark:bg-[#1e1e1e] text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 select-none animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl"
        >
            {/* Encabezado Estilo Notion/ChatGPT: Badge, contador y botón cerrar */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                            <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                            Guía T.A.B.E.
                        </span>
                        {size > 1 && (
                            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                                {index + 1} de {size}
                            </span>
                        )}
                    </div>

                    <button
                        {...closeProps}
                        onClick={handleCloseClick}
                        type="button"
                        title="Cerrar tutorial"
                        className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Barra de progreso sutil */}
                {size > 1 && (
                    <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${((index + 1) / size) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Contenido explicativo */}
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed pt-0.5">
                {step.content}
            </div>

            {/* Acciones: Saltar, Atrás, Siguiente */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                {/* Botón Saltar */}
                {skipProps && (
                    <button
                        {...skipProps}
                        onClick={handleSkipClick}
                        type="button"
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                        Saltar tour
                    </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    {/* Botón Atrás */}
                    {index > 0 && backProps && (
                        <button
                            {...backProps}
                            onClick={handleBackClick}
                            type="button"
                            className="px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Atrás
                        </button>
                    )}

                    {/* Botón Siguiente / Primario */}
                    <button
                        {...primaryProps}
                        onClick={handleNextClick}
                        type="button"
                        className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>{isLastStep ? "Entendido" : nextLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
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

        // Give UI a moment to render the newly navigated page before triggering tour
        const timer = setTimeout(() => {
            // No iniciar el tour si hay un modal abierto (ej: CareerPlanOnboardingModal)
            if (document.querySelector('[role="dialog"]')) {
                setRun(false);
                setInitialized(true);
                return;
            }

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
                // Verificar que los elementos objetivo realmente existan en el DOM antes de arrancar Joyride
                const availableSteps = routeSteps
                    .filter((s) => {
                        try {
                            return typeof s.target === 'string' && document.querySelector(s.target) !== null;
                        } catch {
                            return false;
                        }
                    })
                    .map((s) => ({
                        ...s,
                        disableBeacon: true,
                        disableScrolling: true,
                    }));

                if (availableSteps.length > 0) {
                    setTourSteps(availableSteps);
                    setRun(true);
                } else {
                    setRun(false);
                }
            } else {
                setRun(false);
            }
            setInitialized(true);

        }, 1000);

        return () => clearTimeout(timer);
    }, [user, isGuest, location.pathname]);

    // Escuchar evento personalizado para reiniciar el tour desde configuración o ayuda
    useEffect(() => {
        const handleTriggerTour = () => {
            const rawTutorials = localStorage.getItem("tabe-tutorials-completed") || "{}";
            let tutorialsCompleted: Record<string, boolean> = {};
            try {
                tutorialsCompleted = JSON.parse(rawTutorials);
            } catch {
                tutorialsCompleted = {};
            }
            delete tutorialsCompleted[location.pathname];
            try {
                localStorage.setItem("tabe-tutorials-completed", JSON.stringify(tutorialsCompleted));
            } catch {}

            const routeSteps = TOUR_STEPS_BY_ROUTE[location.pathname];
            if (routeSteps && routeSteps.length > 0) {
                const availableSteps = routeSteps
                    .filter((s) => {
                        try {
                            return typeof s.target === 'string' && document.querySelector(s.target) !== null;
                        } catch {
                            return false;
                        }
                    })
                    .map((s) => ({
                        ...s,
                        disableBeacon: true,
                        disableScrolling: true,
                    }));
                if (availableSteps.length > 0) {
                    setTourSteps(availableSteps);
                    setRun(true);
                }
            }
        };

        window.addEventListener("tabe:restart-tour", handleTriggerTour);
        return () => window.removeEventListener("tabe:restart-tour", handleTriggerTour);
    }, [location.pathname]);

    // Forzar a Joyride a recalcular su spotlight cuando se hace scroll
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
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED, STATUS.ERROR];

        // Terminar el tour y liberar pantalla ante finalización, salto o error de target
        if (finishedStatuses.includes(status) || type === 'error:target_not_found') {
            setRun(false);

            // Marcar ruta como visitada para no interrumpir nuevamente
            const rawTutorials = localStorage.getItem("tabe-tutorials-completed") || "{}";
            let tutorialsCompleted: Record<string, boolean> = {};
            try {
                tutorialsCompleted = JSON.parse(rawTutorials);
            } catch (e) {
                tutorialsCompleted = {};
            }
            tutorialsCompleted[location.pathname] = true;
            try {
                localStorage.setItem("tabe-tutorials-completed", JSON.stringify(tutorialsCompleted));
            } catch {}
        }

        // Antes de renderizar el paso, centrar el scroll si está en radix viewport
        if (type === 'step:before') {
            const targetEl = document.querySelector(step.target as string);
            const viewport = document.querySelector('[data-radix-scroll-area-viewport]');

            if (targetEl && viewport && viewport.contains(targetEl)) {
                const targetRectTop = targetEl.getBoundingClientRect().top;
                const scrollContentTop = viewport.firstElementChild?.getBoundingClientRect().top || 0;
                const absoluteTargetTop = targetRectTop - scrollContentTop;
                const viewportHeight = viewport.getBoundingClientRect().height;
                const offset = absoluteTargetTop - (viewportHeight / 2) + 20;

                viewport.scrollTo({ top: Math.max(0, offset), behavior: 'instant' });
                window.dispatchEvent(new Event('resize'));
            } else if (targetEl) {
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
            disableOverlayClose={false}
            steps={tourSteps}
            tooltipComponent={ModernTourTooltip}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Entendido',
                next: 'Siguiente',
                skip: 'Saltar',
            }}
            styles={{
                options: {
                    zIndex: 10000,
                    overlayColor: 'rgba(0, 0, 0, 0.45)',
                    spotlightShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 15px rgba(0, 0, 0, 0.25)',
                    arrowColor: 'transparent',
                },
                spotlight: {
                    borderRadius: 12,
                },
            }}
        />
    );
}
