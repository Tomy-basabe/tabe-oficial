import { useState, useRef, useEffect } from "react";
import { Hash, Users, Send, PlusCircle, Gift, Sticker, Smile, Bell, Pin, Search, HelpCircle,  Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DiscordChannel, DiscordMessage, DiscordServerMember } from "@/hooks/useDiscord";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

interface DiscordTextChannelProps {
  channel: DiscordChannel;
  messages: DiscordMessage[];
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  typingUsers: Map<string, string>;
  members?: DiscordServerMember[];
  currentUser?: any;
  showMembers?: boolean;
  onToggleMembers?: () => void;
}

export function DiscordTextChannel({
  channel,
  messages,
  onSendMessage,
  onTyping,
  typingUsers,
  members = [],
  currentUser,
}: DiscordTextChannelProps) {
  const [message, setMessage] = useState("");
  const [showMembersSidebar, setShowMembersSidebar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingThrottle = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    // Throttle typing indicator to once per 2 seconds
    const now = Date.now();
    if (now - typingThrottle.current > 2000) {
      typingThrottle.current = now;
      onTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Hoy a las ${format(date, "HH:mm")}`;
    }
    if (isYesterday(date)) {
      return `Ayer a las ${format(date, "HH:mm")}`;
    }
    return format(date, "dd/MM/yyyy HH:mm", { locale: es });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, DiscordMessage[]>);

  // Group members by role
  const owners = members.filter(m => m.role === "owner");
  const regularMembers = members.filter(m => m.role !== "owner");
  const memberGroups: Array<[DiscordServerMember[], string]> = [
    [owners, `Dueño - ${owners.length}`],
    [regularMembers, `Miembros - ${regularMembers.length}`],
  ];

  // Typing indicator text
  const typingNames = Array.from(typingUsers.values());
  let typingText = "";
  if (typingNames.length === 1) {
    typingText = `${typingNames[0]} está escribiendo...`;
  } else if (typingNames.length === 2) {
    typingText = `${typingNames[0]} y ${typingNames[1]} están escribiendo...`;
  } else if (typingNames.length > 2) {
    typingText = `Varias personas están escribiendo...`;
  }

  // Theme: Deep Blue
  // Header: bg-background/95 backdrop-blur border-b border-border text-foreground
  // Input: bg-card border-t border-border p-4

  return (
    <div className="flex-1 flex h-full bg-background dark:bg-[#0b0f18]">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <div className="min-h-[68px] px-5 flex items-center justify-between border-b border-border dark:border-white/10 bg-background/95 dark:bg-[#0d121d]/95 backdrop-blur-xl shrink-0 transition-colors shadow-[0_8px_30px_rgba(0,0,0,.12)]">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-300/20 flex items-center justify-center mr-3">
              <Hash className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground dark:text-white tracking-tight">{channel.name}</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />En vivo</span>
              </div>
              <span className="hidden md:block text-xs text-slate-400 mt-0.5">Conversación del servidor</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Tooltip>
              <TooltipTrigger>
                <div className="hover:text-cyan-300 cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5"><Bell className="w-4 h-4" /></div>
              </TooltipTrigger>
              <TooltipContent>Silenciar canal</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div className="hover:text-cyan-300 cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5"><Pin className="w-4 h-4" /></div>
              </TooltipTrigger>
              <TooltipContent>Mensajes fijados</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className={cn("hover:text-cyan-300 cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5", showMembersSidebar && "text-cyan-300 bg-white/5")}
                  onClick={() => setShowMembersSidebar(!showMembersSidebar)}
                >
                  <Users className="w-5 h-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Mostrar miembros</TooltipContent>
            </Tooltip>

            <div className="relative mx-2">
              <input
                type="text"
                placeholder="Buscar"
                className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 w-28 sm:w-36 focus:w-52 transition-all focus:bg-white/10 focus:ring-1 focus:ring-cyan-300/40 outline-none placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 absolute right-2 top-1.5 text-muted-foreground pointer-events-none" />
            </div>

            <Tooltip>
              <TooltipTrigger>
                <div className="hover:text-cyan-300 cursor-pointer transition-colors p-2 rounded-lg hover:bg-white/5"><HelpCircle className="w-4 h-4" /></div>
              </TooltipTrigger>
              <TooltipContent>Ayuda</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto discord-scrollbar px-4 sm:px-8 pt-5 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.055),transparent_36%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,.055),transparent_36%)]" ref={scrollRef}>
          {Object.keys(groupedMessages).length === 0 ? (
            <div className="flex flex-col justify-end h-full pb-8 select-none">
              <div className="w-16 h-16 bg-cyan-300/10 rounded-2xl border border-cyan-300/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-cyan-300" />
              </div>
              <p className="text-xs uppercase tracking-[.22em] text-cyan-300/80 mb-2">Inicio del canal</p>
              <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Bienvenido a #{channel.name}</h3>
              <p className="text-slate-400">Este es el comienzo de la conversación. Comparte una idea con tu comunidad.</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date} className="mb-6">
                {/* Date Separator */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-x-0 h-px bg-border/50" />
                  <span className="relative z-10 bg-background px-2 text-xs font-medium text-muted-foreground border border-border/50 rounded-full shadow-sm">
                    {formatMessageDate(date).split(" a las")[0]} {/* Just date part approx */}
                  </span>
                </div>

                {msgs.map((msg, index) => {
                  const isSequential = index > 0 && msgs[index - 1].user_id === msg.user_id &&
                    (new Date(msg.created_at).getTime() - new Date(msgs[index - 1].created_at).getTime() < 300000); // 5 mins

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "group flex px-2 -mx-2 py-0.5 rounded hover:bg-muted/30 transition-colors pr-4",
                        !isSequential ? "mt-4" : "mt-0.5"
                      )}
                    >
                      {!isSequential ? (
                        <Avatar className="w-10 h-10 mr-4 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity ring-1 ring-border shadow-sm">
                          <AvatarImage src={msg.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-xs">
                            {msg.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10 mr-4 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 text-right self-center select-none">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {!isSequential && (
                          <div className="flex items-center mb-1">
                            <span className="font-medium text-foreground mr-2 hover:underline cursor-pointer text-glow-cyan text-sm">
                              {msg.profile?.username || "Usuario"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {formatMessageDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <p className={cn("text-foreground/90 whitespace-pre-wrap leading-relaxed", !isSequential ? "text-[15px]" : "text-[15px]")}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 sm:px-8 sm:pb-6 bg-background/95 dark:bg-[#0d121d]/95 backdrop-blur-xl border-t border-border dark:border-white/10 relative z-20">
          {typingText && (
            <div className="absolute -top-6 left-4 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="discord-typing-dots">
                <div className="dot w-1.5 h-1.5 bg-foreground rounded-full animate-bounce delay-0" />
                <div className="dot w-1.5 h-1.5 bg-foreground rounded-full animate-bounce delay-100" />
                <div className="dot w-1.5 h-1.5 bg-foreground rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-xs font-bold text-foreground animate-pulse">{typingText}</span>
            </div>
          )}
          <div className="bg-white/[.045] rounded-2xl flex items-center px-3 sm:px-4 py-2.5 border border-white/10 focus-within:ring-2 focus-within:ring-cyan-300/20 focus-within:border-cyan-300/40 transition-all shadow-[0_10px_30px_rgba(0,0,0,.14)]">
            <button className="text-muted-foreground hover:text-foreground mr-3 transition-colors p-1 hover:bg-background rounded-full">
              <PlusCircle className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Enviar un mensaje a #${channel.name}`}
                className="w-full bg-transparent text-white placeholder:text-slate-500 outline-none text-sm"
              />
            </div>
            <div className="flex items-center space-x-3 ml-2 text-muted-foreground">
              <button className="hover:text-primary transition-colors hover:scale-110 active:scale-95"><Gift className="w-5 h-5" /></button>
              <button className="hover:text-primary transition-colors hover:scale-110 active:scale-95"><Sticker className="w-5 h-5" /></button>
              <button className="hover:text-primary transition-colors hover:scale-110 active:scale-95"><Smile className="w-5 h-5" /></button>
              {message.trim().length > 0 && (
                <button onClick={handleSend} className="text-primary hover:text-primary/80 transition-colors animate-in zoom-in spin-in-12 duration-200">
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      {showMembersSidebar && (
        <div className="w-60 bg-card/20 border-l border-border hidden lg:flex flex-col py-3 px-2 overflow-y-auto discord-scrollbar">
          {memberGroups.map(([group, label]) => (
            group.length > 0 && (
              <div key={label} className="mb-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-2 tracking-wider flex items-center gap-1">
                  {(label as string).startsWith("Dueño") && <span className="text-yellow-500">👑</span>}
                  {label}
                </h3>
                {/* @ts-ignore */}
                {group.map((member: DiscordServerMember) => (
                  <div key={member.id} className="flex items-center px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer opacity-90 hover:opacity-100 transition-all group">
                    <div className="relative">
                      <Avatar className="w-8 h-8 mr-3 ring-1 ring-border/50 group-hover:ring-primary/50 transition-all">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                          {member.profile?.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-[#2b2d31] rounded-full" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground flex items-center gap-1 group-hover:text-glow-cyan transition-all">
                        {member.profile?.username || "Usuario"}
                        {member.role === 'owner' && <span className="text-[10px] text-yellow-500 ml-1" title="Propietario">👑</span>}
                      </div>
                      {/* <div className="text-xs text-muted-foreground">Jugando a algo...</div> */}
                    </div>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
