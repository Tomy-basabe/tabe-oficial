import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RoomControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveRoom: () => void;
}

export function RoomControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveRoom,
}: RoomControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-card/80 backdrop-blur-md border-t border-border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={onToggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isAudioEnabled ? "Silenciar micrófono" : "Activar micrófono"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={onToggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isVideoEnabled ? "Apagar cámara" : "Encender cámara"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full",
              isScreenSharing && "bg-primary hover:bg-primary/90"
            )}
            onClick={onToggleScreenShare}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-8 bg-border mx-2" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={onLeaveRoom}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Salir de la sala</TooltipContent>
      </Tooltip>
    </div>
  );
}
