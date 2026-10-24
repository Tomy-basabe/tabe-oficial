import { useState, useEffect } from "react";
import { Bot, ArrowRight, ArrowLeft, Check, Pencil, X, Sparkles, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PersonaOnboardingProps {
    onComplete: (data: {
        name: string;
        avatar_emoji: string;
        description: string;
        personality_prompt: string;
    }) => void;
    onCancel: () => void;
}

const EMOJI_CATEGORIES = [
    { label: "Estudio & Académico", emojis: ["🎓", "📚", "🧠", "✍️", "🔬", "📐"] },
    { label: "Tecnología & IA", emojis: ["🤖", "⚡", "👾", "💻", "🚀", "💡"] },
    { label: "Creatividad & Enfoque", emojis: ["🎯", "🔥", "☕", "🌟", "💎", "🎨"] },
    { label: "Compañeros & Mentores", emojis: ["🦉", "🦊", "🧙", "🌙", "🌸", "🏆"] },
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

interface PersonalityQuestion {
    id: "tone" | "strictness" | "style";
    title: string;
    subtitle: string;
    options: {
        label: string;
        desc: string;
        value: string;
        emoji: string;
    }[];
}

const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
    {
        id: "tone",
        title: "¿Qué tono de voz preferís?",
        subtitle: "Define la cercanía y formalidad con la que se comunicará con vos.",
        options: [
            { label: "Cercano y distendido", desc: "Español argentino relajado, empático y con humor.", value: "informal", emoji: "😎" },
            { label: "Profesional y amigable", desc: "Claro, pedagógico y enfocado, sin ser distante.", value: "profesional", emoji: "👔" },
            { label: "Directo y conciso", desc: "Va directo al grano, sin rodeos ni preámbulos.", value: "directo", emoji: "🎯" },
            { label: "Cálido y contenedor", desc: "Paciente, motivador y atento a tu bienestar emocional.", value: "calido", emoji: "🤗" },
        ],
    },
    {
        id: "strictness",
        title: "¿Qué nivel de exigencia querés?",
        subtitle: "Establece cómo evaluará tus respuestas y qué tanto te retará.",
        options: [
            { label: "A tu ritmo", desc: "Tranquilo, sin presión. Festeja cada pequeño avance.", value: "relajado", emoji: "🌴" },
            { label: "Equilibrado", desc: "Te guía con paciencia pero marca errores con claridad.", value: "equilibrado", emoji: "⚖️" },
            { label: "Exigente y riguroso", desc: "Pide fundamentación y no deja cabos sueltos.", value: "exigente", emoji: "📚" },
            { label: "Modo Alto Rendimiento", desc: "Cero mediocridad. Te exige al 100% como un coach pro.", value: "bestia", emoji: "⚡" },
        ],
    },
    {
        id: "style",
        title: "¿Cuál será su método principal?",
        subtitle: "La técnica didáctica predominante al resolver dudas y guiarte.",
        options: [
            { label: "Analogías y ejemplos", desc: "Baja la teoría a casos prácticos de la vida real.", value: "ejemplos", emoji: "💡" },
            { label: "Método Socrático", desc: "Te responde con preguntas clave para que deduzcas vos.", value: "desafios", emoji: "⚔️" },
            { label: "Estructura y planificación", desc: "Esquematiza en listas, cronogramas y mapas lógicos.", value: "organizar", emoji: "📋" },
            { label: "Motivación y hábitos", desc: "Prioriza tu disciplina, enfoque y refuerzo positivo.", value: "motivar", emoji: "🎉" },
        ],
    },
];

function buildPersonalityPrompt(answers: Record<string, string>): string {
    const toneMap: Record<string, string> = {
        informal: "Usás un lenguaje cercano, argentino, motivador y cálido. Tuteás al estudiante con confianza y celebrás cada logro.",
        profesional: "Mantenés un tono profesional, claro, accesible y pedagógico. Explicás con rigor académico pero sin distanciamiento.",
        directo: "Vas directo al punto. Respondés con máxima concisión, precisión y sin rodeos innecesarios.",
        calido: "Sos profundamente empático, paciente y comprensivo. Cuidás la tranquilidad del estudiante y brindás apoyo constante.",
    };

    const strictnessMap: Record<string, string> = {
        relajado: "No ejercés presión. Respetás el ritmo propio del estudiante y reforzás positivamente cualquier intento.",
        equilibrado: "Equilibrás comprensión y rigurosidad. Marcás correcciones con respeto constructivo y foco en aprender del error.",
        exigente: "Esperás solidez en las respuestas. Pedís justificación teórica y no te conformás con respuestas a medias.",
        bestia: "Exigís excelencia absoluta. Señalás imprecisiones con contundencia y desafiás al estudiante a dar su 100%.",
    };

    const styleMap: Record<string, string> = {
        ejemplos: "Utilizás analogías intuitivas, ejemplos cotidianos y casos de estudio reales para volver simple lo complejo.",
        desafios: "Aplicás el método socrático: guiás mediante preguntas reflexivas para que el estudiante llegue a la conclusión.",
        organizar: "Sos metódico y estructurado: resumís con viñetas claras, organizás prioridades y ayudás a planificar el estudio.",
        motivar: "Focalizás en la constancia y la motivación. Usás refuerzo positivo y recordás al estudiante su capacidad para superar el examen.",
    };

    const tone = toneMap[answers.tone] || toneMap.informal;
    const strictness = strictnessMap[answers.strictness] || strictnessMap.equilibrado;
    const style = styleMap[answers.style] || styleMap.ejemplos;

    return `${tone} ${strictness} ${style}`;
}

export function PersonaOnboarding({ onComplete, onCancel }: PersonaOnboardingProps) {
    const [step, setStep] = useState(0); // 0 = Identity, 1-3 = Questions, 4 = Review & Customize
    const [name, setName] = useState("");
    const [tagline, setTagline] = useState("");
    const [emoji, setEmoji] = useState("🤖");
    const [answers, setAnswers] = useState<Record<string, string>>({
        tone: "informal",
        strictness: "equilibrado",
        style: "ejemplos",
    });
    const [editedPrompt, setEditedPrompt] = useState("");
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);

    useEffect(() => {
        if (step === 4 && !editedPrompt) {
            setEditedPrompt(buildPersonalityPrompt(answers));
        }
    }, [step, answers, editedPrompt]);

    const handleAnswer = (questionId: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        if (step < PERSONALITY_QUESTIONS.length) {
            setStep(step + 1);
        } else {
            setStep(4);
        }
    };

    const handleFinish = () => {
        const descriptions: string[] = [];
        if (tagline.trim()) {
            descriptions.push(tagline.trim());
        } else {
            PERSONALITY_QUESTIONS.forEach((q) => {
                const answer = q.options.find((o) => o.value === answers[q.id]);
                if (answer) descriptions.push(answer.label.toLowerCase());
            });
        }

        onComplete({
            name: name.trim() || "Mi Tutor IA",
            avatar_emoji: emoji,
            description: descriptions.slice(0, 2).join(" · "),
            personality_prompt: editedPrompt || buildPersonalityPrompt(answers),
        });
    };

    const totalSteps = PERSONALITY_QUESTIONS.length + 2; // Step 0, 1, 2, 3, 4
    const progressPercent = ((step + 1) / totalSteps) * 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200/80 dark:border-zinc-800/90 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col transition-all duration-300">
                {/* Header sutil estilo Apple / Notion */}
                <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
                            <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                {step === 0 && "Crear nuevo Agente de IA"}
                                {step >= 1 && step <= 3 && `Personalidad (${step}/3)`}
                                {step === 4 && "Confirmar y afinar Agente"}
                            </h2>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {step === 0 && "Define su identidad, avatar y nombre"}
                                {step >= 1 && step <= 3 && "Elegí cómo interactuará y te enseñará"}
                                {step === 4 && "Revisa las instrucciones del modelo"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Barra de progreso estilo iOS / Notion */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-1">
                    <div
                        className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Contenido del Wizard */}
                <div className="p-6 overflow-y-auto max-h-[75vh]">
                    {/* PASO 0: IDENTIDAD Y AVATAR */}
                    {step === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            {/* Live Preview Card estilo GPT / Notion */}
                            <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 flex items-center gap-4 shadow-2xs">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-3xl shadow-xs shrink-0 select-none transition-transform duration-200 hover:scale-105">
                                    {emoji}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate">
                                        {name.trim() || "Nombre del Agente"}
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                        {tagline.trim() || "Tutor Académico Personalizado"}
                                    </p>
                                </div>
                            </div>

                            {/* Inputs de Nombre y Rol */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                        Nombre del Agente
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Tutor de Redes, Luna, Mentor Socrático..."
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all shadow-2xs"
                                        autoFocus
                                        maxLength={35}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                        Rol o Especialidad <span className="text-zinc-400 font-normal">(Opcional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={tagline}
                                        onChange={(e) => setTagline(e.target.value)}
                                        placeholder="Ej: Especialista en resolución de ejercicios prácticos"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all shadow-2xs"
                                        maxLength={60}
                                    />
                                </div>
                            </div>

                            {/* Selector de Avatar/Emoji estilo Notion */}
                            <div>
                                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                                    Elige un Avatar
                                </label>
                                <div className="grid grid-cols-8 gap-2 p-3 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70">
                                    {ALL_EMOJIS.map((e) => (
                                        <button
                                            key={e}
                                            type="button"
                                            onClick={() => setEmoji(e)}
                                            className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer",
                                                emoji === e
                                                    ? "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shadow-xs scale-110"
                                                    : "hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:scale-105"
                                            )}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASOS 1 A 3: PREGUNTAS DE PERSONALIDAD (Tarjetas interactivas estilo Apple) */}
                    {step >= 1 && step <= PERSONALITY_QUESTIONS.length && (
                        (() => {
                            const qIndex = step - 1;
                            const question = PERSONALITY_QUESTIONS[qIndex];
                            return (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
                                    <div className="mb-2">
                                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                            {question.title}
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            {question.subtitle}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        {question.options.map((opt) => {
                                            const isSelected = answers[question.id] === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handleAnswer(question.id, opt.value)}
                                                    className={cn(
                                                        "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer",
                                                        isSelected
                                                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs"
                                                            : "bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <span className="text-2xl shrink-0 select-none">{opt.emoji}</span>
                                                        <div className="min-w-0">
                                                            <div className={cn(
                                                                "text-sm font-medium",
                                                                isSelected ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100"
                                                            )}>
                                                                {opt.label}
                                                            </div>
                                                            <div className={cn(
                                                                "text-xs mt-0.5 line-clamp-1",
                                                                isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"
                                                            )}>
                                                                {opt.desc}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ml-3",
                                                        isSelected
                                                            ? "border-white bg-white text-zinc-900 dark:border-zinc-900 dark:bg-zinc-900 dark:text-white"
                                                            : "border-zinc-300 dark:border-zinc-700 opacity-0 group-hover:opacity-100"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()
                    )}

                    {/* PASO 4: CONFIRMACIÓN Y CUSTOM INSTRUCTIONS (estilo GPT Custom Instructions / Notion) */}
                    {step === 4 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
                            {/* Summary Card */}
                            <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-4 shadow-2xs">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-3xl shadow-xs shrink-0 select-none">
                                    {emoji}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate">
                                        {name.trim() || "Mi Tutor IA"}
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                        {tagline.trim() || "Tutor configurado y listo para estudiar"}
                                    </p>
                                </div>
                                <div className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-medium shrink-0">
                                    Listo
                                </div>
                            </div>

                            {/* Prompt Box con diseño Notion Code/Text */}
                            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-2xs">
                                <div className="px-4 py-2.5 bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Instrucciones del Sistema (Prompt)
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const regenerated = buildPersonalityPrompt(answers);
                                                setEditedPrompt(regenerated);
                                                setIsEditingPrompt(false);
                                            }}
                                            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Regenerar desde respuestas"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Restablecer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                                            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Pencil className="w-3 h-3" />
                                            {isEditingPrompt ? "Guardar" : "Personalizar"}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3.5">
                                    {isEditingPrompt ? (
                                        <textarea
                                            value={editedPrompt}
                                            onChange={(e) => setEditedPrompt(e.target.value)}
                                            className="w-full text-xs font-mono leading-relaxed bg-zinc-50/60 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white resize-none"
                                            rows={6}
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                                            {editedPrompt}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer de navegación estilo Apple */}
                <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between gap-3">
                    {step > 0 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Atrás
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                    )}

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step + 1)}
                            disabled={step === 0 && !name.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            Continuar
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleFinish}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                            <Check className="w-4 h-4" />
                            Crear Agente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
