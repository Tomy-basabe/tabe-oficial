import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, BookOpen, FileQuestion, Calendar, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAIPersonality, AI_PERSONALITIES } from "@/hooks/useAIPersonality";
import { PersonalitySelector } from "@/components/ai/PersonalitySelector";
import { useStreamingChat } from "@/hooks/useStreamingChat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { id: "explain", label: "Explicar tema", icon: BookOpen, prompt: "Explícame el concepto de " },
  { id: "quiz", label: "Simulacro", icon: FileQuestion, prompt: "Hazme un simulacro de examen de " },
  { id: "plan", label: "Plan de estudio", icon: Calendar, prompt: "Genera un plan de estudio para " },
  { id: "schedule", label: "Agendar", icon: Calendar, prompt: "Agendame " },
  { id: "progress", label: "Mi progreso", icon: Sparkles, prompt: "Analizá mi progreso académico y dame recomendaciones" },
];

function getInitialMessage(personalityId: string): Message {
  const personality = AI_PERSONALITIES.find(p => p.id === personalityId);
  
  const greetings: Record<string, string> = {
    motivador: "¡Hola campeón! 👋🌟 Soy **T.A.B.E. IA**, tu coach académico personal. ¡Estoy acá para ayudarte a alcanzar tus metas!\n\n• **Explicaciones** claras de temas difíciles\n• **Simulacros** para que llegues preparado\n• **Planes de estudio** a tu medida\n• **Agendar eventos** en tu calendario 📅\n\n¡Vamos a romperla juntos! 💪 ¿En qué te puedo ayudar hoy?",
    
    exigente: "Buenas. 📚 Soy **T.A.B.E. IA**. Esperás aprobar, ¿no? Entonces vamos a trabajar en serio.\n\n• Te explico temas, pero vas a tener que pensar\n• Simulacros exigentes como los reales\n• Planes de estudio sin excusas\n• Agendo tus compromisos académicos\n\nNo voy a aceptar respuestas mediocres. ¿Empezamos?",
    
    debatidor: "Hola. ⚔️ Soy **T.A.B.E. IA**, y mi trabajo es hacerte pensar.\n\n• Te explico temas... pero vas a tener que defenderlos\n• Simulacros donde cuestiono cada respuesta\n• Planes de estudio que vamos a debatir\n• Y sí, también agendo eventos\n\nSi tu razonamiento es débil, te lo voy a hacer ver. ¿Estás listo para defender tus ideas?",
    
    profe_injusto: "Llegaste. 👹 Soy **T.A.B.E. IA**, el profe más exigente que vas a tener.\n\n• Te enseño, pero nunca estoy 100% satisfecho\n• Mis simulacros son más duros que cualquier cátedra\n• Si aprobás conmigo, el final real es un paseo\n\nAclaración: soy injusto porque te preparo para lo peor. ¿Bancás la exigencia?",
    
    te_van_a_bochar: "Sentate. 💀 Soy **T.A.B.E. IA** en modo crisis.\n\nVoy a ser directo: tenés materias pendientes, exámenes cerca, y quizás no estás tan preparado como creés.\n\n• Te muestro la realidad de tu preparación\n• Sin filtros, sin excusas\n• Pero después de la verdad cruda, te doy un plan\n\n¿Querés saber dónde estás parado realmente? Preguntame por tu progreso.",
  };

  return {
    id: "1",
    role: "assistant",
    content: greetings[personalityId] || greetings.motivador,
    timestamp: new Date(),
  };
}

export default function AIAssistant() {
  const { user } = useAuth();
  const { personality, setPersonality, currentConfig } = useAIPersonality();
  const { isStreaming, streamMessage } = useStreamingChat();
  const [messages, setMessages] = useState<Message[]>([getInitialMessage(personality)]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset chat when personality changes
  const handlePersonalityChange = (newPersonality: typeof personality) => {
    setPersonality(newPersonality);
    setMessages([getInitialMessage(newPersonality)]);
    toast.success(`Modo ${AI_PERSONALITIES.find(p => p.id === newPersonality)?.name} activado`);
  };

  const handleResetChat = () => {
    setMessages([getInitialMessage(personality)]);
    toast.success("Chat reiniciado");
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    const conversationHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    const assistantMsgId = (Date.now() + 1).toString();
    let assistantContent = "";

    // Create placeholder message for streaming
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }]);

    streamMessage(
      conversationHistory.slice(1),
      personality,
      // onDelta - update message as tokens arrive
      (delta) => {
        assistantContent += delta;
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMsgId 
              ? { ...m, content: assistantContent }
              : m
          )
        );
      },
      // onComplete - handle tool results
      (result) => {
        if (result.event_created) {
          toast.success("Evento agregado al calendario", {
            action: {
              label: "Ver calendario",
              onClick: () => window.location.href = "/calendario",
            },
          });
        }

        if (result.flashcards_created) {
          toast.success(`¡${result.flashcards_created.cards_count} flashcards creadas!`, {
            action: {
              label: "Ver mazos",
              onClick: () => window.location.href = "/flashcards",
            },
          });
        }
      },
      // onError
      (error) => {
        console.error("AI error:", error);
        toast.error(error.message);
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMsgId 
              ? { ...m, content: `Lo siento, hubo un error: ${error.message}` }
              : m
          )
        );
      }
    );
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
  };

  const renderContent = (content: string) => {
    return content
      .split("\n")
      .map((line, i) => {
        let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        if (processed.startsWith("• ")) {
          processed = `<span class="flex gap-2"><span>•</span><span>${processed.slice(2)}</span></span>`;
        }
        return <div key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
      });
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Asistente IA
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {currentConfig.emoji} {currentConfig.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            title="Reiniciar chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <PersonalitySelector
            currentPersonality={personality}
            onSelect={handlePersonalityChange}
            disabled={isStreaming}
          />
          <div className="px-3 py-1.5 bg-neon-green/20 text-neon-green rounded-full text-xs font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            Online
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.prompt)}
              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/80 transition-colors"
            >
              <Icon className="w-4 h-4 text-primary" />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Chat Container */}
      <div className="flex-1 card-gamer rounded-xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-background" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary rounded-bl-sm"
                )}
              >
                <div className="text-sm space-y-1">
                  {renderContent(message.content)}
                </div>
                <p className="text-xs opacity-50 mt-2">
                  {message.timestamp.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-neon-gold/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-neon-gold" />
                </div>
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                <Bot className="w-5 h-5 text-background" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  Escribiendo...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu pregunta o pedido..."
              className="flex-1 px-4 py-3 bg-secondary rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className={cn(
                "px-4 py-3 rounded-xl transition-all flex items-center gap-2",
                inputValue.trim() && !isStreaming
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Podés pedirme simulacros, explicaciones, o que agende eventos. Ej: "Haceme un simulacro de final de Física"
          </p>
        </div>
      </div>
    </div>
  );
}
