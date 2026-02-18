import { useState } from "react";
import { Hash, Volume2, Plus, ChevronDown, ChevronRight, Settings, Trash2, Users, Mic, MicOff, Headphones, HeadphoneOff, Signal, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type {
  DiscordServer,
  DiscordChannel,
  DiscordServerMember,
  DiscordVoiceParticipant
} from "@/hooks/useDiscord";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InviteFriendsModal } from "./InviteFriendsModal";

interface DiscordChannelSidebarProps {
  server: DiscordServer;
  channels: DiscordChannel[];
  currentChannel: DiscordChannel | null;
  members: DiscordServerMember[];
  voiceParticipants: DiscordVoiceParticipant[];
  allVoiceParticipants: DiscordVoiceParticipant[];
  speakingUsers: Set<string>;
  onSelectChannel: (channel: DiscordChannel) => void;
  onCreateChannel: (name: string, type: "text" | "voice") => Promise<any>;
  onDeleteChannel: (channelId: string) => Promise<void>;
  onInviteUser: (userId: string) => Promise<void>;
  inVoiceChannel: boolean;
  currentVoiceChannel: DiscordChannel | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isDeafened: boolean;
  onToggleAudio: () => void;
  onToggleDeafen: () => void;
  onLeaveVoice: () => void;
  isSpeaking?: boolean;
}

export function DiscordChannelSidebar({
  server,
  channels,
  currentChannel,
  members,
  voiceParticipants,
  allVoiceParticipants,
  speakingUsers,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannel,
  onInviteUser,
  inVoiceChannel,
  currentVoiceChannel,
  isAudioEnabled,
  isVideoEnabled,
  isDeafened,
  onToggleAudio,
  onToggleDeafen,
  onLeaveVoice,
  isSpeaking,
}: DiscordChannelSidebarProps) {
  const { user } = useAuth();
  const [showCreateText, setShowCreateText] = useState(false);
  const [showCreateVoice, setShowCreateVoice] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  const handleCreateText = async () => {
    if (!channelName.trim()) return;
    setCreating(true);
    await onCreateChannel(channelName.trim(), "text");
    setChannelName("");
    setShowCreateText(false);
    setCreating(false);
  };

  const handleCreateVoice = async () => {
    if (!channelName.trim()) return;
    setCreating(true);
    await onCreateChannel(channelName.trim(), "voice");
    setChannelName("");
    setShowCreateVoice(false);
    setCreating(false);
  };

  const getChannelParticipants = (channelId: string) => {
    return allVoiceParticipants.filter(p => p.channel_id === channelId);
  };

  // Theme: Deep Blue / Gamer
  // bg-card/30 backdrop-blur-xl border-r border-border

  return (
    <div className="w-60 bg-card/30 backdrop-blur-xl border-r border-border flex flex-col h-full shrink-0">
      {/* Server Header */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-12 px-4 border-b border-border flex items-center justify-between hover:bg-white/5 transition-colors group w-full">
            <span className="font-bold text-foreground font-orbitron truncate">{server.name}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-card border-border text-foreground">
          <DropdownMenuItem
            className="cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-colors"
            onClick={() => setShowInviteModal(true)}
          >
            <Users className="w-4 h-4 mr-2" />
            Invitar gente
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-colors">
            <Settings className="w-4 h-4 mr-2" />
            Ajustes del servidor
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          {/* <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar Servidor
          </DropdownMenuItem> - Moved to Server List Context Menu */}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-y-auto discord-scrollbar py-3 px-2">
        {/* Text Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1 group">
            <button
              onClick={() => setTextCollapsed(!textCollapsed)}
              className="flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase gap-0.5 flex-1"
            >
              {textCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Canales de Texto
            </button>
            <Dialog open={showCreateText} onOpenChange={setShowCreateText}>
              <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground p-0 gap-0 sm:max-w-md overflow-hidden">
                <DialogHeader className="p-6 pb-2 bg-muted/20">
                  <DialogTitle className="text-xl font-bold font-orbitron text-primary">Crear Canal de Texto</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4 bg-muted/10">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">nombre del canal</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="nuevo-canal"
                        className="pl-9 bg-background border-input text-foreground h-10 font-medium"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 p-4 flex justify-between items-center border-t border-border">
                  <button onClick={() => setShowCreateText(false)} className="text-sm hover:underline px-4 hover:text-primary transition-colors">Cancelar</button>
                  <Button onClick={handleCreateText} disabled={!channelName.trim() || creating} className="bg-primary hover:bg-primary/90 text-primary-foreground">Crear Canal</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!textCollapsed && (
            <div className="space-y-[2px]">
              {textChannels.map((channel) => (
                <div key={channel.id} className="relative group">
                  <button
                    onClick={() => onSelectChannel(channel)}
                    className={cn(
                      "w-full flex items-center px-2 py-1.5 rounded transition-all duration-200 group-hover:bg-white/5",
                      currentChannel?.id === channel.id
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Hash className="w-4 h-4 mr-1.5 opacity-60 shrink-0" />
                    <span className="font-medium text-sm truncate">{channel.name}</span>
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar canal</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice Channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1 group">
            <button
              onClick={() => setVoiceCollapsed(!voiceCollapsed)}
              className="flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase gap-0.5 flex-1"
            >
              {voiceCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Canales de Voz
            </button>
            <Dialog open={showCreateVoice} onOpenChange={setShowCreateVoice}>
              <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground p-0 gap-0 sm:max-w-md overflow-hidden">
                <DialogHeader className="p-6 pb-2 bg-muted/20">
                  <DialogTitle className="text-xl font-bold font-orbitron text-primary">Crear Canal de Voz</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4 bg-muted/10">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">nombre del canal</label>
                    <div className="relative">
                      <Volume2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="Voz General"
                        className="pl-9 bg-background border-input text-foreground h-10 font-medium"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 p-4 flex justify-between items-center border-t border-border">
                  <button onClick={() => setShowCreateVoice(false)} className="text-sm hover:underline px-4 hover:text-primary transition-colors">Cancelar</button>
                  <Button onClick={handleCreateVoice} disabled={!channelName.trim() || creating} className="bg-primary hover:bg-primary/90 text-primary-foreground">Crear Canal</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!voiceCollapsed && (
            <div className="space-y-[2px]">
              {voiceChannels.map((channel) => {
                const participants = getChannelParticipants(channel.id);
                return (
                  <div key={channel.id} className="mb-1">
                    <div className="relative group">
                      <button
                        onClick={() => onSelectChannel(channel)}
                        className={cn(
                          "w-full flex items-center px-2 py-1.5 rounded transition-all duration-200 group-hover:bg-white/5",
                          currentChannel?.id === channel.id
                            ? "bg-white/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Volume2 className="w-4 h-4 mr-1.5 opacity-60 shrink-0" />
                        <span className="font-medium text-sm truncate">{channel.name}</span>
                      </button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar canal</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Participants List */}
                    {participants.length > 0 && (
                      <div className="ml-6 mt-0.5 space-y-0.5 mb-2">
                        {participants.map((participant) => (
                          <div key={participant.user_id} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-white/5 group/participant">
                            <div className="relative">
                              <Avatar className="w-6 h-6 border border-background/20">
                                <AvatarImage src={participant.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{participant.profile?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              {participant.is_speaking && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2b2d31]" />
                              )}
                            </div>
                            <span className={cn(
                              "text-sm text-muted-foreground truncate max-w-[100px] group-hover/participant:text-foreground transition-colors",
                              participant.is_speaking && "text-foreground font-medium"
                            )}>
                              {participant.profile?.username || "Usuario"}
                            </span>
                            {participant.is_muted && (
                              <MicOff className="w-3 h-3 text-destructive ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal Logic */}
      <InviteFriendsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInviteUser={onInviteUser}
        serverName={server.name}
        serverId={server.id}
        existingMemberIds={members.map(m => m.user_id)}
      />

      {/* Voice Connected Panel (Above User Panel) */}
      {inVoiceChannel && (
        <div className="bg-success/10 border-y border-success/20 p-2 flex flex-col gap-1 backdrop-blur-sm">
          <div className="flex items-center justify-between text-success">
            <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wide">
              <Signal className="w-3.5 h-3.5 animate-pulse" />
              <span>Voz Conectada</span>
            </div>
            <button
              onClick={onLeaveVoice}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 text-[10px] font-bold uppercase tracking-wider"
              title="Desconectar"
            >
              <PhoneOff className="w-3 h-3" />
              <span>Salir</span>
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-0.5">
            <span className="truncate max-w-[150px] font-medium text-success/80">
              {currentVoiceChannel?.name || "Canal de Voz"} / {server.name}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <Button size="sm" variant="ghost" className="h-7 w-full text-xs hover:bg-success/20 hover:text-success" onClick={() => {/* Stream logic potentially */ }}>
              Video
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-full text-xs hover:bg-success/20 hover:text-success" onClick={() => {/* Share logic */ }}>
              Pantalla
            </Button>
          </div>
        </div>
      )}

      {/* User Panel */}
      <div className="bg-card/50 border-t border-border p-2 flex items-center gap-2 backdrop-blur-md">
        <div className="relative group cursor-pointer hover:opacity-80 transition-opacity">
          <div className={cn(
            "absolute -inset-0.5 rounded-full bg-success opacity-0 transition-opacity duration-200",
            isSpeaking && "opacity-100 animate-pulse"
          )} />
          <Avatar className="w-8 h-8 ring-2 ring-primary/20 relative z-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {user?.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-card rounded-full flex items-center justify-center z-20">
            <div className={cn("w-2 h-2 rounded-full", isSpeaking ? "bg-success" : "bg-muted-foreground")} />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center -space-y-0.5">
          <span className="text-sm font-bold text-foreground truncate block">
            {user?.user_metadata?.name || user?.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-muted-foreground truncate block font-medium opacity-80">
            #{user?.id?.substring(0, 4)}
          </span>
        </div>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleAudio}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                  !isAudioEnabled ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Silenciar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleDeafen}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                  isDeafened ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Ensordecer</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Ajustes</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
