import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useAuth } from "@/contexts/AuthContext";

export function TutorialTour() {
    const { user, isGuest } = useAuth();
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Run tutorial if they are a guest OR if they haven't seen it yet
        const hasSeenTutorial = localStorage.getItem("tabe-tutorial-seen");

        if (!hasSeenTutorial && (user || isGuest)) {
            // Slight delay so the UI can mount before starting the tour
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user, isGuest]);

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
            localStorage.setItem("tabe-tutorial-seen", "true");
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

                viewport.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
            }
        }
    };

    const steps: Step[] = [
        {
            content: (
                <div className="text-left space-y-2">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">¡Bienvenido a T.A.B.E.!</h2>
                    <p className="text-sm text-foreground/80">
                        Te guiaremos por todos los apartados principales para que aproveches al máximo la plataforma.
                    </p>
                </div>
            ),
            locale: { skip: 'Saltar', next: 'Siguiente' },
            placement: 'center',
            target: 'body',
        },
        {
            target: '.tour-sidebar-dashboard',
            content: 'Este es tu Tablero Principal. Aquí verás el estado de tus materias, nivel de Experiencia (XP) y próximos exámenes.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-plan',
            content: 'En "Plan de Carrera" (o Mapa de Correlatividades) podrás cargar todas tus materias, ver cuáles se cruzan y visualizar tu progreso a largo plazo.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-notion',
            content: 'Integra tus apuntes directamente desde Notion para tener todo tu material de estudio centralizado.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-flashcards',
            content: 'Repasa conceptos clave con tarjetas de memoria inteligentes para mejorar tu retención.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-cuestionarios',
            content: 'Pon a prueba tus conocimientos con exámenes de práctica autogenerados para cada materia.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-marketplace',
            content: 'Descubre e intercambia recursos educativos, resúmenes y guías con la comunidad estudiantil.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-biblioteca',
            content: 'Sube y organiza tus PDFs, libros y documentos de la cursada en una sola nube.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-calendar',
            content: 'Usa el Calendario para agendar exámenes y turnos de estudio. Transforma tareas urgentes en eventos recurrentes.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-pomodoro',
            content: 'El Pomodoro integrado te premiará con XP cada vez que completes una sesión de estudio profunda.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-metricas',
            content: 'Analiza tus horas de concentración y progreso histórico en la pestaña de métricas.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-bosque',
            content: 'Siembra constancia: visualiza tu esfuerzo mediante árboles digitales en tu propio bosque interactivo.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-discord',
            content: 'Ingresa a nuestra comunidad de Discord para estudiar en grupo, hacer consultas y socializar.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-logros',
            content: 'Aquí verás las medallas y recompensas desbloqueadas por tu dedicación.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-amigos',
            content: 'Motívate compitiendo sanamente con tus amigos y comparen su progreso y XP acumulada.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-asistenteia',
            content: 'Chatea con otros universitarios, o habla directamente con el asistente IA integrado en la barra lateral.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-sidebar-configuracion',
            content: 'Ajusta la apariencia visual (¡elige tu color favorito!) y modifica las configuraciones de tu cuenta.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
            disableScrolling: true,
            isFixed: true,
        },
        {
            target: '.tour-header-ai',
            content: 'Finalmente, nuestra IA experta flotante te acompañará a donde vayas. Haz clic y pregúntale lo que quieras de tus apuntes.',
            placement: 'left',
            locale: { skip: 'Saltar', back: 'Atrás', last: '¡Comenzar a aprender!' },
            disableBeacon: true,
            disableScrolling: true,
            isFixed: true,
        }
    ];

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={steps}
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
