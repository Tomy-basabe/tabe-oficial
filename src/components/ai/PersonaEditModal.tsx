import { useState } from "react";
import { Check, X, Sparkles, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIPersona } from "@/hooks/useAIPersonas";

interface PersonaEditModalProps {
    persona: AIPersona;
    onComplete: (id: string, data: {
        name: string;
        avatar_emoji: string;
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

export function PersonaEditModal({ persona, onComplete, onCancel }: PersonaEditModalProps) {
    const [name, setName] = useState(persona.name);
    const [emoji, setEmoji] = useState(persona.avatar_emoji || "🤖");
    const [prompt, setPrompt] = useState(persona.personality_prompt);

    const handleFinish = () => {
        onComplete(persona.id, {
            name: name.trim() || "Mi Tutor IA",
            avatar_emoji: emoji,
            personality_prompt: prompt.trim(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200/80 dark:border-zinc-800/90 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col transition-all duration-300">
                {/* Header sutil estilo Apple / Notion */}
                <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
                            <Sliders className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                Editar Agente de IA
                            </h2>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Personaliza su nombre, avatar y comportamiento
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

                {/* Contenido del Modal */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                    {/* Live Preview Card estilo GPT Builder */}
                    <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 flex items-center gap-4 shadow-2xs">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-3xl shadow-xs shrink-0 select-none transition-transform duration-200 hover:scale-105">
                            {emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 truncate">
                                {name.trim() || "Nombre del Agente"}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {persona.description || "Tutor personalizado"}
                            </p>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                Nombre del Agente
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Tutor de Redes, Luna, Mentor..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all shadow-2xs"
                                maxLength={35}
                            />
                        </div>

                        {/* Selector de Avatar/Emoji */}
                        <div>
                            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                                Avatar
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

                        {/* Editor de Prompt estilo Custom GPT Instructions */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                                    Instrucciones de Personalidad (System Prompt)
                                </label>
                                <span className="text-[11px] text-zinc-400 font-mono">
                                    {prompt.length} caracteres
                                </span>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Escribe las directivas de cómo quieres que se comporte esta IA..."
                                className="w-full text-xs font-mono leading-relaxed bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 shadow-2xs resize-y min-h-[140px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer estilo Apple */}
                <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleFinish}
                        disabled={!name.trim() || !prompt.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                        <Check className="w-4 h-4" />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
