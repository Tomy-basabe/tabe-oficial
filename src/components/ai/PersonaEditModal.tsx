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
            <div className="bg-card border border-border/50 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Editar IA</h2>
                        <p className="text-xs text-muted-foreground">Modificá el nombre, emoji y el prompt</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Luna, Coach, Profe..."
                            className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            maxLength={30}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Emoji
                        </label>
                        <div className="grid grid-cols-10 gap-1.5">
                            {EMOJI_OPTIONS.map((e) => (
                                <button
                                    key={e}
                                    onClick={() => setEmoji(e)}
                                    className={cn(
                                        "w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110",
                                        emoji === e
                                            ? "bg-primary/20 ring-2 ring-primary/50 scale-110"
                                            : "bg-secondary/50 hover:bg-secondary"
                                    )}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                            Prompt Modelo (Personalidad e Instrucciones)
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Escribí cómo querés que se comporte esta IA..."
                            className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[120px] resize-y"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button variant="ghost" onClick={onCancel} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleFinish}
                        disabled={!name.trim() || !prompt.trim()}
                        className="flex-1 gap-2"
                    >
                        <Check className="w-4 h-4" /> Guardar Cambios
                    </Button>
                </div>
            </div>
        </div>
    );
}
