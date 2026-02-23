import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
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
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
                disableScrolling: true,
                disableBeacon: true,
            },
            {
                target: '.tour-dashboard-schedule',
                content: 'En este minicalendario verás tus repasos y eventos más próximos para que no te olvides de nada.',
                placement: 'left',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Empezar!' },
                disableScrolling: true,
            }
        ],
        "/carrera": [
            {
                target: '.tour-career-add',
                content: '¡Agrega aquí las materias de tu plan de estudios! Podrás vincular correlativas para organizar tu mapa académico.',
                placement: 'bottom-end',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/notion": [
            {
                target: '.tour-notion-create',
                content: 'Usa este botón para crear tu primer apunte enriquecido.',
                placement: 'right',
                locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
                disableBeacon: true,
                disableScrolling: true,
            },
            {
                target: '.tour-notion-list',
                content: 'Al abrir un apunte, podrás seleccionarle cualquier texto y usar el menú flotante para preguntarle a la IA.',
                placement: 'right',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableScrolling: true,
            }
        ],
        "/flashcards": [
            {
                target: '.tour-flashcards-decks',
                content: 'Los mazos organizan tus Flashcards. Selecciona un Mazo y empieza el "Modo Repaso" para testear tu memoria usando repetición espaciada.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/cuestionarios": [
            {
                target: '.tour-quizzes-decks',
                content: 'Genera exámenes de opción múltiple manualmente o deja que la Inteligencia Artificial los cree a base de tus apuntes.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/marketplace": [
            {
                target: '.tour-marketplace-decks',
                content: '¡Gasta tus Monedas de Tabe! Aquí puedes comprar fondos, pócimas de XP y herramientas para potenciar tu estudio.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/biblioteca": [
            {
                target: '.tour-library-upload',
                content: 'Sube tus PDFs o imágenes directas a la nube de Tabe para poder leerlos sin interrupciones.',
                placement: 'left',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/calendario": [
            {
                target: '.tour-calendar-schedule',
                content: 'Si usas Google Calendar, aprieta aquí para exportar o importar todos tus eventos automáticamente.',
                placement: 'bottom-end',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/pomodoro": [
            {
                target: '.tour-pomodoro-stats',
                content: 'Estudia en bloques de alta concentración. Cuando termines este reloj, ganarás XP y harás crecer tus árboles.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/metricas": [
            {
                target: '.tour-metrics-overview',
                content: 'Tu mapa térmico a lo GitHub. Cada cuadrado verde representa cuántas horas estudiaste ese día.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/bosque": [
            {
                target: '.tour-forest-tree',
                content: 'Cada bloque de Pomodoro que terminas se planta aquí en forma de árbol. ¡No dejes que tu bosque muera, mantén la consistencia!',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/discord": [
            {
                target: '.tour-discord-connect',
                content: 'Únete a las salas de voz para estudiar chill con personas reales escuchando Lofi.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/logros": [
            {
                target: '.tour-achievements-list',
                content: 'Cada objetivo cumplido tiene su medalla. Úsalas para adornar tu perfil.',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
                disableBeacon: true,
                disableScrolling: true,
            }
        ],
        "/amigos": [
            {
                target: '.tour-friends-add',
                content: 'Agrega a tus compañeros usando su ID de Tabe (Lo encontrarás arriba a la derecha).',
                placement: 'bottom',
                locale: { skip: 'Saltar', back: 'Atrás', next: '¡Entendido!' },
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
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={tourSteps}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: '#a855f7', // neon-purple
                    backgroundColor: 'hsl(var(--card))',
                    textColor: 'hsl(var(--foreground))',
                    arrowColor: 'hsl(var(--card))',
                    overlayColor: 'rgba(0, 0, 0, 0.7)',
                },
                buttonNext: {
                    background: 'linear-gradient(to right, #00ffaa, #b026ff)',
                    border: 0,
                    color: '#fff',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                },
                buttonBack: {
                    color: 'hsl(var(--muted-foreground))',
                    marginRight: '1rem',
                },
                buttonSkip: {
                    color: 'hsl(var(--muted-foreground))',
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                tooltipContent: {
                    padding: '10px 0',
                }
            }}
        />
    );
}
