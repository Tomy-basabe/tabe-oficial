import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp: Date;
}

interface RoomChatProps {
  roomId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function RoomChat({ roomId, isOpen, onToggle }: RoomChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("Usuario");
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch username
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("nombre, username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setUsername(data.nombre || data.username || "Usuario");
      }
    };
    fetchUsername();
  }, [user]);

  // Subscribe to chat messages via broadcast
  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`chat:${roomId}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setMessages((prev) => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, user]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !user || !channelRef.current) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      username,
      message: newMessage.trim(),
      timestamp: new Date(),
    };

    channelRef.current.send({
      type: "broadcast",
      event: "chat-message",
      payload: message,
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="icon"
        className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full shadow-lg"
        onClick={onToggle}
      >
        <MessageCircle className="w-5 h-5" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
            {messages.length > 99 ? "99+" : messages.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 h-96 bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Chat de la sala</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          ✕
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No hay mensajes aún. ¡Sé el primero en escribir!
            </p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    isOwn ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <span className="text-xs text-muted-foreground mb-1">
                    {isOwn ? "Tú" : msg.username}
                  </span>
                  <div
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-secondary/50"
            maxLength={500}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
