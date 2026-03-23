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
    <div className="card-gamer rounded-xl p-5 border border-primary/20 bg-gradient-to-br from-card to-primary/5 relative overflow-hidden group col-span-1 lg:col-span-2">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full group-hover:bg-primary/30 transition-all duration-500" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">Asistente TABE AI</h3>
            <p className="text-xs text-muted-foreground">Tu coach académico personal</p>
          </div>
        </div>

        <div className="relative mt-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntame sobre tus materias, pedí un resumen, o que te arme un plan de estudio..."
            className="w-full bg-secondary/50 border border-white/10 rounded-xl p-4 pr-14 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 min-h-[80px]"
          />
          <Button
            size="icon"
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-primary hover:bg-primary/80 transition-transform hover:scale-105"
            onClick={handleSend}
            disabled={!prompt.trim()}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-4 text-[10px] sm:text-xs text-muted-foreground">
          <MessageSquareText className="w-3.5 h-3.5" />
          <span>Presiona Enter para enviar al chat completo</span>
        </div>
      </div>
    </div>
  );
}
