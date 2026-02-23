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

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem("tabe-tutorial-seen", "true");
        }
    };

    const steps: Step[] = [
        {
            content: (
                <div className="text-left space-y-2">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">¡Bienvenido a T.A.B.E.!</h2>
                    <p className="text-sm text-foreground/80">
                        Te guiaremos por las funciones principales para que aprendas a organizar tus materias y potenciar tu estudio.
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
        },
        {
            target: '.tour-sidebar-plan',
            content: 'En "Plan de Carrera" (o Mapa de Correlatividades) podrás cargar todas tus materias, ver cuáles se cruzan y visualizar tu progreso a largo plazo.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
        },
        {
            target: '.tour-sidebar-calendar',
            content: 'Usa el Calendario para agendar exámenes y turnos de estudio. Puedes crear eventos que se repitan automáticamente.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
        },
        {
            target: '.tour-sidebar-pomodoro',
            content: 'El Pomodoro sincronizado con estadísticas te permite ganar XP por cada sesión de estudio enfocada.',
            placement: 'right',
            locale: { skip: 'Saltar', back: 'Atrás', next: 'Siguiente' },
        },
        {
            target: '.tour-header-ai',
            content: 'Siempre que te trabes con una duda teórica, haz clic aquí. Nuestro Asistente Universitario Inteligente resolverá tus preguntas paso a paso.',
            placement: 'left',
            locale: { skip: 'Saltar', back: 'Atrás', last: '¡Comenzar a aprender!' },
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
