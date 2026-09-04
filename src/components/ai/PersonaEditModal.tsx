import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const EMOJI_OPTIONS = [
    "🤖", "🧠", "🌙", "💪", "🎓", "🦊", "🔥", "⚡", "🌟", "💎",
    "🎯", "🧙", "👾", "🐱", "🦉", "🌸", "☕", "🎭", "🏆", "🚀",
];

export function PersonaEditModal({ persona, onComplete, onCancel }: PersonaEditModalProps) {
    const [name, setName] = useState(persona.name);
    const [emoji, setEmoji] = useState(persona.avatar_emoji);
    const [prompt, setPrompt] = useState(persona.personality_prompt);

    const handleFinish = () => {
        onComplete(persona.id, {
            name: name.trim() || "Mi IA",
            avatar_emoji: emoji,
            personality_prompt: prompt,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-black rounded-xl p-6 max-w-md w-full shadow-[8px_8px_0_0_#000] animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-[#00E5FF] border-2 border-black shadow-[2px_2px_0_0_#000]">
                        <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase text-black">Editar IA</h2>
                        <p className="text-xs font-bold text-black/70 uppercase">Modificá el nombre, emoji y el prompt</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-sm font-black text-black uppercase mb-1.5 block">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Luna, Coach, Profe..."
                            className="w-full px-4 py-3 bg-white border-4 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-0 shadow-[4px_4px_0_0_#000]"
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

                    <div>
                        <label className="text-sm font-black text-black uppercase mb-1.5 block">
                            Prompt Modelo (Personalidad e Instrucciones)
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Escribí cómo querés que se comporte esta IA..."
                            className="w-full px-4 py-3 bg-white border-4 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-0 shadow-[4px_4px_0_0_#000] min-h-[120px] resize-y"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <Button variant="ghost" onClick={onCancel} className="flex-1 border-4 border-black font-black uppercase text-black hover:bg-gray-200">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleFinish}
                        disabled={!name.trim() || !prompt.trim()}
                        className="flex-1 gap-2 bg-[#BFFF00] hover:bg-[#a6e600] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] font-black uppercase"
                    >
                        <Check className="w-5 h-5" strokeWidth={3} /> Guardar Cambios
                    </Button>
                </div>
            </div>
        </div>
    );
}
