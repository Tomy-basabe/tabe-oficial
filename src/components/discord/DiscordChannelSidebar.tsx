import { useState } from "react";
import { Hash, Volume2, Plus, ChevronDown, Settings, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DiscordChannelSidebarProps {
  server: DiscordServer;
  channels: DiscordChannel[];
  currentChannel: DiscordChannel | null;
  members: DiscordServerMember[];
  voiceParticipants: DiscordVoiceParticipant[];
  speakingUsers: Set<string>;
  onSelectChannel: (channel: DiscordChannel) => void;
  onCreateChannel: (name: string, type: "text" | "voice") => Promise<any>;
  onDeleteChannel: (channelId: string) => Promise<void>;
  inVoiceChannel: boolean;
  currentVoiceChannel: DiscordChannel | null;
}

export function DiscordChannelSidebar({
  server,
  channels,
  currentChannel,
  members,
  voiceParticipants,
  speakingUsers,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannel,
  inVoiceChannel,
  currentVoiceChannel,
}: DiscordChannelSidebarProps) {
  const [showCreateText, setShowCreateText] = useState(false);
  const [showCreateVoice, setShowCreateVoice] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [creating, setCreating] = useState(false);

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

  const getVoiceParticipantsForChannel = (channelId: string) => {
    return voiceParticipants.filter((p) => p.channel_id === channelId);
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col">
      {/* Server header */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-12 px-4 flex items-center justify-between border-b border-[#1f2023] hover:bg-[#35373c] transition-colors">
            <span className="font-semibold text-white truncate">{server.name}</span>
            <ChevronDown className="w-4 h-4 text-[#b5bac1]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[#111214] border-none text-[#b5bac1]">
          <DropdownMenuItem className="hover:bg-[#5865f2] hover:text-white cursor-pointer">
            <Users className="w-4 h-4 mr-2" />
            Invitar personas
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-[#5865f2] hover:text-white cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Configuración del servidor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Text channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-[#949ba4] uppercase">
              Canales de texto
            </span>
            <Dialog open={showCreateText} onOpenChange={setShowCreateText}>
              <DialogTrigger asChild>
                <button className="text-[#949ba4] hover:text-[#dbdee1]">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#313338] border-none text-white">
                <DialogHeader>
                  <DialogTitle>Crear canal de texto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="nuevo-canal"
                    className="bg-[#1e1f22] border-none text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateText();
                    }}
                  />
                  <Button
                    onClick={handleCreateText}
                    disabled={!channelName.trim() || creating}
                    className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
                  >
                    Crear canal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {textChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={currentChannel?.id === channel.id}
              onClick={() => onSelectChannel(channel)}
              onDelete={() => onDeleteChannel(channel.id)}
            />
          ))}
        </div>

        {/* Voice channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-[#949ba4] uppercase">
              Canales de voz
            </span>
            <Dialog open={showCreateVoice} onOpenChange={setShowCreateVoice}>
              <DialogTrigger asChild>
                <button className="text-[#949ba4] hover:text-[#dbdee1]">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#313338] border-none text-white">
                <DialogHeader>
                  <DialogTitle>Crear canal de voz</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Sala de estudio"
                    className="bg-[#1e1f22] border-none text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateVoice();
                    }}
                  />
                  <Button
                    onClick={handleCreateVoice}
                    disabled={!channelName.trim() || creating}
                    className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
                  >
                    Crear canal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {voiceChannels.map((channel) => {
            const participants = getVoiceParticipantsForChannel(channel.id);
            const isCurrentVoice = currentVoiceChannel?.id === channel.id;

            return (
              <div key={channel.id}>
                <ChannelItem
                  channel={channel}
                  isActive={isCurrentVoice}
                  onClick={() => onSelectChannel(channel)}
                  onDelete={() => onDeleteChannel(channel.id)}
                />
                {/* Show users in voice channel */}
                {participants.length > 0 && (
                  <div className="ml-6 space-y-0.5">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded",
                          speakingUsers.has(participant.user_id) && "bg-[#3c3f44]"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={participant.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-[#5865f2]">
                              {(participant.profile?.nombre || participant.profile?.username || "U")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Speaking indicator ring */}
                          {speakingUsers.has(participant.user_id) && (
                            <div className="absolute inset-0 rounded-full border-2 border-[#23a559] animate-pulse" />
                          )}
                        </div>
                        <span className={cn(
                          "text-sm truncate",
                          speakingUsers.has(participant.user_id) 
                            ? "text-[#23a559] font-medium" 
                            : "text-[#949ba4]"
                        )}>
                          {participant.profile?.nombre || participant.profile?.username || "Usuario"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User panel at bottom */}
      <div className="h-[52px] bg-[#232428] px-2 flex items-center">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#5865f2] text-white text-sm">
              U
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Usuario</p>
            <p className="text-xs text-[#949ba4]">En línea</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
  onDelete,
}: {
  channel: DiscordChannel;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const Icon = channel.type === "text" ? Hash : Volume2;

  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer",
        isActive
          ? "bg-[#404249] text-white"
          : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
      )}
      onClick={onClick}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 truncate">{channel.name}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 text-[#949ba4] hover:text-[#ed4245]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Eliminar canal</TooltipContent>
      </Tooltip>
    </div>
  );
}
