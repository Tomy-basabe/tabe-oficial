import { useState } from "react";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TabetalkUserSettingsModal } from "./TabetalkUserSettingsModal";
import type { DiscordChannel } from "@/hooks/useDiscord";

interface DiscordVoiceBarProps {
  channel: DiscordChannel | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export function DiscordVoiceBar({
  channel,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: DiscordVoiceBarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="h-20 bg-[#1e1f22] border-t border-[#1f2023] flex items-center justify-center gap-4 px-4">
      {/* Channel info */}
      <div className="absolute left-4 flex flex-col">
        <span className="text-xs text-[#23a559] font-medium">Conectado a voz</span>
        <span className="text-sm text-white">{channel?.name || "Canal de voz"}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Mute */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleAudio}
              className={cn(
                "w-14 h-14 rounded-full transition-colors",
                isAudioEnabled
                  ? "bg-[#2b2d31] hover:bg-[#404249] text-white"
                  : "bg-[#ed4245] hover:bg-[#ed4245]/80 text-white"
              )}
            >
              {isAudioEnabled ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAudioEnabled ? "Silenciar" : "Activar micrófono"}
          </TooltipContent>
        </Tooltip>

        {/* Video */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVideo}
              className={cn(
                "w-14 h-14 rounded-full transition-colors",
                isVideoEnabled
                  ? "bg-[#2b2d31] hover:bg-[#404249] text-white"
                  : "bg-[#2b2d31] hover:bg-[#404249] text-[#b5bac1]"
              )}
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoEnabled ? "Desactivar cámara" : "Activar cámara"}
          </TooltipContent>
        </Tooltip>

        {/* Screen share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleScreenShare}
              className={cn(
                "w-14 h-14 rounded-full transition-colors",
                isScreenSharing
                  ? "bg-[#23a559] hover:bg-[#23a559]/80 text-white"
                  : "bg-[#2b2d31] hover:bg-[#404249] text-[#b5bac1]"
              )}
            >
              <Monitor className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
          </TooltipContent>
        </Tooltip>

        {/* Leave */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLeave}
              className="w-14 h-14 rounded-full bg-[#ed4245] hover:bg-[#ed4245]/80 text-white"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Desconectar</TooltipContent>
        </Tooltip>
      </div>

      {/* Settings */}
      <div className="absolute right-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full bg-[#2b2d31] hover:bg-[#404249] text-[#b5bac1] cursor-pointer"
              title="Ajustes de Tabetalk"
              aria-label="Abrir ajustes de Tabetalk"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configuración</TooltipContent>
        </Tooltip>
      </div>

      {isSettingsOpen && (
        <TabetalkUserSettingsModal
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      )}
    </div>
  );
}
