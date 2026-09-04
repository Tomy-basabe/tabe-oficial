import { useState, useEffect } from "react";
import { Bot, Sparkles, ArrowRight, Check, Pencil } from "lucide-react";
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

const EMOJI_OPTIONS = [
    "🤖", "🧠", "🌙", "💪", "🎓", "🦊", "🔥", "⚡", "🌟", "💎",
    "🎯", "🧙", "👾", "🐱", "🦉", "🌸", "☕", "🎭", "🏆", "🚀",
];

const PERSONALITY_QUESTIONS = [
    {
        id: "tone",
        question: "¿Cómo querés que te hable?",
        options: [
            { label: "Informal y cercano", value: "informal", emoji: "😎" },
            { label: "Profesional pero amigable", value: "profesional", emoji: "👔" },
            { label: "Directo y sin vueltas", value: "directo", emoji: "🎯" },
            { label: "Cálido y empático", value: "calido", emoji: "🤗" },
        ],
    },
    {
        id: "strictness",
        question: "¿Qué nivel de exigencia preferís?",
        options: [
            { label: "Relajado, sin presión", value: "relajado", emoji: "🌴" },
            { label: "Equilibrado", value: "equilibrado", emoji: "⚖️" },
            { label: "Exigente pero justo", value: "exigente", emoji: "📚" },
            { label: "Modo bestia, sin piedad", value: "bestia", emoji: "💀" },
        ],
    },
    {
        id: "style",
        question: "¿Cómo querés que te ayude?",
        options: [
            { label: "Explicar con ejemplos simples", value: "ejemplos", emoji: "💡" },
            { label: "Desafiarme con preguntas", value: "desafios", emoji: "⚔️" },
            { label: "Organizar y planificar", value: "organizar", emoji: "📋" },
            { label: "Motivar y celebrar logros", value: "motivar", emoji: "🎉" },
        ],
    },
];

function buildPersonalityPrompt(answers: Record<string, string>): string {
    const toneMap: Record<string, string> = {
        informal: "Usás lenguaje muy informal, argentino, con humor y confianza. Tuteás al estudiante.",
        profesional: "Sos profesional pero accesible. Usás un tono claro y amigable sin ser demasiado formal.",
        directo: "Vas al punto. No te andás con rodeos. Respondés de forma concisa y eficiente.",
        calido: "Sos cálido y empático. Te preocupás por cómo se siente el estudiante. Sos paciente y comprensivo.",
    };

    const strictnessMap: Record<string, string> = {
        relajado: "No presionás. Dejás que el estudiante vaya a su ritmo. Celebrás cualquier avance por pequeño que sea.",
        equilibrado: "Mantenés un balance entre exigencia y apoyo. Marcás errores con respeto pero no dejás pasar nada importante.",
        exigente: "Esperás lo mejor del estudiante. Corrregís errores y pedís más cuando sabes que puede dar más.",
        bestia: "Sos despiadado. Señalás cada error, no aceptás mediocridad. Si el estudiante no se esfuerza, se lo hacés saber sin filtro.",
    };

    const styleMap: Record<string, string> = {
        ejemplos: "Explicás usando analogías, ejemplos de la vida real y casos prácticos. Hacés que lo complejo sea simple.",
        desafios: "Desafiás al estudiante con preguntas socráticas. Lo obligás a pensar y razonar antes de dar la respuesta.",
        organizar: "Ayudás a planificar. Creás cronogramas, listas de tareas y estrategias de estudio. Sos metódico.",
        motivar: "Tu prioridad es mantener la motivación alta. Celebrás cada logro, usás refuerzo positivo constantemente.",
    };

    const tone = toneMap[answers.tone] || toneMap.informal;
    const strictness = strictnessMap[answers.strictness] || strictnessMap.equilibrado;
    const style = styleMap[answers.style] || styleMap.ejemplos;

    return `${tone} ${strictness} ${style}`;
}

export function PersonaOnboarding({ onComplete, onCancel }: PersonaOnboardingProps) {
    const [step, setStep] = useState(0); // 0 = name, 1-3 = questions, 4 = confirm
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🤖");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [editedPrompt, setEditedPrompt] = useState("");
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);

    // When reaching confirmation step, generate the prompt
    const isConfirmStep = step > PERSONALITY_QUESTIONS.length;
    useEffect(() => {
        if (step === PERSONALITY_QUESTIONS.length + 1 && !editedPrompt) {
            setEditedPrompt(buildPersonalityPrompt(answers));
        }
    }, [step]);

    const handleAnswer = (questionId: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        if (step < PERSONALITY_QUESTIONS.length) {
            setStep(step + 1);
        } else {
            setStep(PERSONALITY_QUESTIONS.length + 1);
        }
    };

    const handleFinish = () => {
        const descriptions: string[] = [];
        PERSONALITY_QUESTIONS.forEach((q) => {
            const answer = q.options.find((o) => o.value === answers[q.id]);
            if (answer) descriptions.push(answer.label.toLowerCase());
        });

        onComplete({
            name: name.trim() || "Mi IA",
            avatar_emoji: emoji,
            description: descriptions.join(", "),
            personality_prompt: editedPrompt || buildPersonalityPrompt(answers),
        });
    };

    // Regenerate prompt from answers (reset edits)
    const handleRegenerate = () => {
        setEditedPrompt(buildPersonalityPrompt(answers));
        setIsEditingPrompt(false);
    };

    if (step === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white border-4 border-black rounded-xl p-6 max-w-md w-full shadow-[8px_8px_0_0_#000] animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-[#00E5FF] border-2 border-black shadow-[2px_2px_0_0_#000]">
                            <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase text-black">Crear nueva IA</h2>
                            <p className="text-xs font-bold text-black/70 uppercase">Dale un nombre y elegí un emoji</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-black text-black uppercase mb-1.5 block">
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Luna, Coach, Profe..."
                                className="w-full px-4 py-3 bg-white border-4 border-black rounded-xl text-sm font-bold focus:outline-none focus:ring-0 shadow-[4px_4px_0_0_#000] text-black"
                                autoFocus
                                maxLength={30}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-black text-black uppercase mb-2 block">
                                Emoji
                            </label>
                            <div className="grid grid-cols-10 gap-1.5">
                                {EMOJI_OPTIONS.map((e) => (
                                    <button
                                        key={e}
                                        onClick={() => setEmoji(e)}
                                        className={cn(
                                            "w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all",
                                            emoji === e
                                                ? "bg-[#BFFF00] border-2 border-black shadow-[2px_2px_0_0_#000] scale-110"
                                                : "bg-gray-100 border-2 border-transparent hover:border-black hover:scale-110"
                                        )}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <Button variant="ghost" onClick={onCancel} className="flex-1 border-4 border-black font-black uppercase text-black hover:bg-gray-200">
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => setStep(1)}
                            disabled={!name.trim()}
                            className="flex-1 gap-2 bg-[#00E5FF] hover:bg-[#00cce6] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] font-black uppercase"
                        >
                            Siguiente <ArrowRight className="w-4 h-4" strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Steps 1-3: Personality questions
    const questionIndex = step - 1;
    if (questionIndex < PERSONALITY_QUESTIONS.length) {
        const question = PERSONALITY_QUESTIONS[questionIndex];
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white border-4 border-black rounded-xl p-6 max-w-md w-full shadow-[8px_8px_0_0_#000] animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{emoji}</span>
                        <span className="text-xl font-black uppercase text-black">{name}</span>
                    </div>

                    <div className="mb-6">
                        <div className="flex gap-1.5 mb-4">
                            {PERSONALITY_QUESTIONS.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-2 flex-1 rounded-full transition-colors border-2 border-black",
                                        i <= questionIndex ? "bg-[#BFFF00]" : "bg-white"
                                    )}
                                />
                            ))}
                        </div>
                        <p className="text-sm font-bold text-black/70 uppercase mb-2">
                            Pregunta {questionIndex + 1} de {PERSONALITY_QUESTIONS.length}
                        </p>
                        <h3 className="text-2xl font-black text-black leading-tight">{question.question}</h3>
                    </div>

                    <div className="space-y-3">
                        {question.options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleAnswer(question.id, option.value)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-4 rounded-xl border-4 transition-all text-left hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000] hover:shadow-[4px_4px_0_0_#000]",
                                    answers[question.id] === option.value
                                        ? "border-black bg-[#C688EB]"
                                        : "border-black bg-white"
                                )}
                            >
                                <span className="text-xl">{option.emoji}</span>
                                <span className="text-sm font-black uppercase text-black">{option.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 mt-8">
                        <Button
                            variant="ghost"
                            onClick={() => setStep(step - 1)}
                            className="flex-1 border-4 border-black font-black uppercase text-black hover:bg-gray-200"
                        >
                            Atrás
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 4: Confirmation with editable personality
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-black rounded-xl p-6 max-w-md w-full shadow-[8px_8px_0_0_#000] animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">{emoji}</div>
                    <h2 className="text-2xl font-black uppercase text-black">{name}</h2>
                    <p className="text-sm font-bold text-black/70 mt-1 uppercase">
                        Tu nueva IA está lista
                    </p>
                </div>

                <div className="bg-gray-100 border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-black font-black uppercase tracking-wider">
                            Personalidad
                        </p>
                        <button
                            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                            className="flex items-center gap-1.5 text-xs font-black uppercase bg-[#00E5FF] border-2 border-black px-2 py-1 rounded shadow-[2px_2px_0_0_#000] text-black hover:translate-y-[-2px]"
                        >
                            <Pencil className="w-3 h-3" strokeWidth={3} />
                            {isEditingPrompt ? "Listo" : "Editar"}
                        </button>
                    </div>
                    {isEditingPrompt ? (
                        <div className="space-y-3">
                            <textarea
                                value={editedPrompt}
                                onChange={(e) => setEditedPrompt(e.target.value)}
                                className="w-full px-3 py-3 bg-white border-2 border-black rounded-lg text-sm font-bold focus:outline-none focus:ring-0 shadow-inner resize-none leading-relaxed text-black"
                                rows={5}
                                placeholder="Describí cómo querés que sea tu IA..."
                                autoFocus
                            />
                            <button
                                onClick={handleRegenerate}
                                className="text-xs font-black uppercase text-black hover:underline"
                            >
                                ↻ Regenerar desde preguntas
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-black font-bold leading-relaxed">
                            {editedPrompt}
                        </p>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setStep(PERSONALITY_QUESTIONS.length);
                            setEditedPrompt("");
                        }}
                        className="flex-1 border-4 border-black font-black uppercase text-black hover:bg-gray-200"
                    >
                        Ajustar
                    </Button>
                    <Button onClick={handleFinish} className="flex-1 gap-2 bg-[#BFFF00] hover:bg-[#a6e600] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] font-black uppercase">
                        <Check className="w-5 h-5" strokeWidth={3} /> Crear IA
                    </Button>
                </div>
            </div>
        </div>
    );
}
