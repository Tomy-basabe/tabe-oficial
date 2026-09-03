import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIAssistantWidget() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSend = () => {
    if (!prompt.trim()) return;
    navigate("/TABEAI", { state: { initialPrompt: prompt } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="neo-bento-card bento-hover-purple p-6 flex flex-col h-full bg-purple-50/50 dark:bg-background">
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-[#1475e5]/12 rounded-xl">
            <Sparkles className="w-5 h-5 text-[#1475e5]" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg">Asistente TABE AI</h3>
            <p className="text-xs font-bold text-muted-foreground">Tu coach académico personal</p>
          </div>
        </div>

        <div className="relative mt-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntame sobre tus materias, pedí un resumen, o que te arme un plan de estudio..."
            className="w-full bg-secondary/50 border-2 border-border rounded-xl p-4 pr-14 text-sm font-bold resize-none focus:outline-none focus:border-[#1475e5] transition-colors placeholder:text-muted-foreground/50 min-h-[80px]"
          />
          <Button
            size="icon"
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-[#1475e5] hover:bg-[#1475e5]/80 transition-transform hover:scale-105"
            onClick={handleSend}
            disabled={!prompt.trim()}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-4 text-[10px] sm:text-xs text-muted-foreground font-bold">
          <MessageSquareText className="w-3.5 h-3.5" />
          <span>Presiona Enter para enviar al chat completo</span>
        </div>
      </div>
    </div>
  );
}
