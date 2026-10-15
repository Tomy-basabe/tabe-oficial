import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTCMeet } from '@/hooks/useWebRTCMeet';
import { MeetLobby } from './MeetLobby';
import { MeetVideoTile } from './MeetVideoTile';
import { MeetControls } from './MeetControls';
import { MeetSidePanel } from './MeetSidePanel';
import { Copy, Check, Users, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const MeetRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados de entrada y sesión
  const [hasJoined, setHasJoined] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [initialAudio, setInitialAudio] = useState(true);
  const [initialVideo, setInitialVideo] = useState(true);

  // Estados de interfaz
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'participants' | 'info' | null>(null);
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [readMessagesCount, setReadMessagesCount] = useState(0);

  // Inicializar metadatos de usuario
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    }
    if (user?.user_metadata?.avatar_url) {
      setUserAvatar(user.user_metadata.avatar_url);
    }
  }, [user]);

  // Hook WebRTC
  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    participants,
    messages,
    isLocalSpeaking,
    hasPermissionError,
    myPeerId,
    joinMeeting,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMessage,
    leaveMeeting,
  } = useWebRTCMeet({
    roomId: roomId || 'reunion',
    userName: userName || 'Usuario',
    userAvatar,
    initialAudio,
    initialVideo,
  });

  // Manejar unión desde el Lobby
  const handleJoinFromLobby = (config: { userName: string; initialAudio: boolean; initialVideo: boolean }) => {
    setUserName(config.userName);
    setInitialAudio(config.initialAudio);
    setInitialVideo(config.initialVideo);
    setHasJoined(true);
    setHasLeft(false);
  };

  // Cuando hasJoined pasa a true, conectarse
  useEffect(() => {
    if (hasJoined && !hasLeft && roomId) {
      joinMeeting();
    }
  }, [hasJoined, hasLeft, roomId, joinMeeting]);

  // Actualizar contador de mensajes leídos cuando el panel de chat está abierto
  useEffect(() => {
    if (activeSidePanel === 'chat') {
      setReadMessagesCount(messages.length);
    }
  }, [messages.length, activeSidePanel]);

  const unreadMessagesCount = Math.max(0, messages.length - readMessagesCount);

  // Manejar colgar llamada
  const handleLeave = () => {
    leaveMeeting();
    setHasLeft(true);
    setHasJoined(false);
  };

  // Reingresar
  const handleRejoin = () => {
    setHasLeft(false);
    setHasJoined(true);
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Enlace de la llamada copiado');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // CASO 1: SALA DE ESPERA (LOBBY)
  if (!hasJoined && !hasLeft) {
    return <MeetLobby onJoinRoom={handleJoinFromLobby} />;
  }

  // CASO 2: PANTALLA TRAS COLGAR O SALIR
  if (hasLeft) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-primary mx-auto">
            <ArrowLeft className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Has salido de la llamada</h2>
            <p className="text-sm text-neutral-400">
              ¿Deseas volver a ingresar o iniciar una nueva reunión?
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleRejoin}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Volver a unirse</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/meet')}
              className="w-full h-12 rounded-xl border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
            >
              Volver a la pantalla de inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // CASO 3: SALA DE VIDEOLLAMADA ACTIVA
  const remoteParticipants = Array.from(participants.values());
  const totalCount = remoteParticipants.length + 1; // remotos + local

  // Determinar clases de grid responsivo para los videos
  const getGridClasses = () => {
    if (pinnedPeerId) return 'flex-1 flex flex-col';
    if (totalCount === 1) return 'grid grid-cols-1 place-items-center max-w-4xl mx-auto h-full';
    if (totalCount === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-center';
    if (totalCount <= 4) return 'grid grid-cols-1 sm:grid-cols-2 gap-4 h-full items-center';
    if (totalCount <= 6) return 'grid grid-cols-2 md:grid-cols-3 gap-4 h-full items-center';
    return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full items-center';
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col justify-between overflow-hidden">
      {/* Aviso de error de permisos si existe */}
      {hasPermissionError && (
        <div className="bg-amber-950/80 border-b border-amber-800 px-4 py-2 text-xs text-amber-200 flex items-center justify-center gap-2 z-40">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{hasPermissionError}</span>
        </div>
      )}

      {/* Área Central: Grid de Videos + Panel Lateral */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 p-3 md:p-6 overflow-y-auto flex flex-col">
          {/* Si el usuario está solo: Banner informativo con enlace para invitar */}
          {totalCount === 1 && (
            <div className="mb-4 max-w-xl mx-auto w-full bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200">Tu reunión está lista</h4>
                  <p className="text-xs text-neutral-400">Comparte el enlace con quienes desees que se unan.</p>
                </div>
              </div>
              <button
                onClick={copyRoomLink}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar enlace'}</span>
              </button>
            </div>
          )}

          {/* Grid de Video Tiles */}
          <div className={cn('w-full flex-1 transition-all duration-300', getGridClasses())}>
            {/* Tile Local */}
            <div className="w-full h-full min-h-[220px] max-h-[75vh]">
              <MeetVideoTile
                stream={localStream}
                name={userName || 'Tú'}
                avatar={userAvatar}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isLocal={true}
                isSpeaking={isLocalSpeaking}
                isScreenSharing={isScreenSharing}
                isPinned={pinnedPeerId === myPeerId}
                onTogglePin={() => setPinnedPeerId(pinnedPeerId === myPeerId ? null : myPeerId)}
              />
            </div>

            {/* Tiles Remotos */}
            {remoteParticipants.map((participant) => (
              <div key={participant.peerId} className="w-full h-full min-h-[220px] max-h-[75vh]">
                <MeetVideoTile
                  stream={participant.stream}
                  name={participant.name}
                  avatar={participant.avatar}
                  isAudioEnabled={participant.audioEnabled}
                  isVideoEnabled={participant.videoEnabled}
                  isSpeaking={participant.isSpeaking}
                  isScreenSharing={participant.isScreenSharing}
                  isPinned={pinnedPeerId === participant.peerId}
                  onTogglePin={() =>
                    setPinnedPeerId(pinnedPeerId === participant.peerId ? null : participant.peerId)
                  }
                />
              </div>
            ))}
          </div>
        </main>

        {/* Panel lateral desplegable para Chat, Participantes e Info */}
        {activeSidePanel && (
          <MeetSidePanel
            activePanel={activeSidePanel}
            onClose={() => setActiveSidePanel(null)}
            roomId={roomId || 'reunion'}
            myPeerId={myPeerId}
            userName={userName || 'Usuario'}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            participants={participants}
            messages={messages}
            onSendMessage={sendMessage}
          />
        )}
      </div>

      {/* Barra de Controles Inferior */}
      <MeetControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        participantsCount={totalCount}
        unreadMessagesCount={unreadMessagesCount}
        activeSidePanel={activeSidePanel}
        roomId={roomId || 'reunion'}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleSidePanel={(panel) =>
          setActiveSidePanel(activeSidePanel === panel ? null : panel)
        }
        onLeaveMeeting={handleLeave}
      />
    </div>
  );
};
export default MeetRoom;
