import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  Users,
  PhoneOff,
  Info,
  Copy,
  Check,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MeetControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  participantsCount: number;
  unreadMessagesCount: number;
  activeSidePanel: 'chat' | 'participants' | 'info' | 'settings' | null;
  roomId: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleSidePanel: (panel: 'chat' | 'participants' | 'info' | 'settings') => void;
  onLeaveMeeting: () => void;
}

export const MeetControls: React.FC<MeetControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  participantsCount,
  unreadMessagesCount,
  activeSidePanel,
  roomId,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSidePanel,
  onLeaveMeeting,
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyMeetingLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Enlace de la reunión copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="w-full h-20 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800 px-4 md:px-8 flex items-center justify-between select-none z-30">
      {/* Información izquierda: Código de reunión y botón copiar */}
      <div className="hidden sm:flex items-center gap-3 text-neutral-300">
        <span className="font-medium text-sm text-neutral-200 tracking-wide font-mono">
          {roomId}
        </span>
        <button
          onClick={copyMeetingLink}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          title="Copiar enlace de invitación"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado' : 'Copiar enlace'}</span>
        </button>
      </div>

      {/* Controles centrales multimedia (Micrófono, Cámara, Pantalla, Colgar) */}
      <div className="flex items-center gap-2.5 md:gap-4 mx-auto sm:mx-0">
        {/* Micrófono */}
        <button
          onClick={onToggleAudio}
          className={cn(
            'w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm',
            isAudioEnabled
              ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          )}
          title={isAudioEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Cámara */}
        <button
          onClick={onToggleVideo}
          className={cn(
            'w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm',
            isVideoEnabled
              ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          )}
          title={isVideoEnabled ? 'Apagar cámara' : 'Encender cámara'}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Compartir Pantalla */}
        <button
          onClick={onToggleScreenShare}
          className={cn(
            'w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hidden xs:flex',
            isScreenSharing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-white'
          )}
          title={isScreenSharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        {/* Salir de la reunión (Botón rojo destacado) */}
        <button
          onClick={onLeaveMeeting}
          className="h-11 md:h-12 px-5 md:px-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 font-medium transition-all duration-200 shadow-sm ml-1"
          title="Salir de la videollamada"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden md:inline text-sm">Salir</span>
        </button>
      </div>

      {/* Controles derechos: Información, Participantes y Chat */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Info de la reunión */}
        <button
          onClick={() => onToggleSidePanel('info')}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            activeSidePanel === 'info'
              ? 'bg-primary text-primary-foreground'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
          title="Detalles de la reunión"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* Participantes */}
        <button
          onClick={() => onToggleSidePanel('participants')}
          className={cn(
            'relative w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            activeSidePanel === 'participants'
              ? 'bg-primary text-primary-foreground'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
          title="Personas en la llamada"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-neutral-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
            {participantsCount}
          </span>
        </button>

        {/* Chat */}
        <button
          onClick={() => onToggleSidePanel('chat')}
          className={cn(
            'relative w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            activeSidePanel === 'chat'
              ? 'bg-primary text-primary-foreground'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
          title="Chat de la reunión"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMessagesCount > 0 && activeSidePanel !== 'chat' && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        {/* Ajustes de Cámara y Micrófono */}
        <button
          onClick={() => onToggleSidePanel('settings')}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            activeSidePanel === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          )}
          title="Configuración de cámara y micrófono"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
};
