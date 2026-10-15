import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Pin, Monitor, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeetVideoTileProps {
  stream?: MediaStream | null;
  name: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const MeetVideoTile: React.FC<MeetVideoTileProps> = ({
  stream,
  name,
  avatar,
  isAudioEnabled,
  isVideoEnabled,
  isLocal = false,
  isSpeaking = false,
  isScreenSharing = false,
  isPinned = false,
  onTogglePin,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasActiveVideo, setHasActiveVideo] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      videoEl.srcObject = stream;

      // CRÍTICO ANTI-ECO:
      // El stream local SIEMPRE se silencia en el DOM para no escuchar la propia voz.
      // Los streams remotos tienen volumen 1.
      if (isLocal) {
        videoEl.muted = true;
        videoEl.volume = 0;
      } else {
        videoEl.muted = false;
        videoEl.volume = 1;
      }

      // Intentar reproducción explícita para evitar que Chrome suspenda a los usuarios 3, 4, 5...
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('Autoplay pendiente de interacción del usuario para:', name, err);
            // Si el navegador bloqueó el autoplay con sonido para este peer remoto
            if (!isLocal) {
              setIsAutoplayBlocked(true);
            }
          });
      }

      const updateVideoStatus = () => {
        const videoTracks = stream.getVideoTracks();
        const hasLiveTrack = videoTracks.some((t) => t.enabled && t.readyState === 'live');
        setHasActiveVideo(hasLiveTrack && isVideoEnabled);
      };

      updateVideoStatus();

      const tracks = stream.getVideoTracks();
      tracks.forEach((track) => {
        track.addEventListener('mute', updateVideoStatus);
        track.addEventListener('unmute', updateVideoStatus);
        track.addEventListener('ended', updateVideoStatus);
      });

      return () => {
        tracks.forEach((track) => {
          track.removeEventListener('mute', updateVideoStatus);
          track.removeEventListener('unmute', updateVideoStatus);
          track.removeEventListener('ended', updateVideoStatus);
        });
      };
    } else {
      videoEl.srcObject = null;
      setHasActiveVideo(false);
    }
  }, [stream, isLocal, isVideoEnabled, name]);

  // Desbloquear audio si fue restringido por política de autoplay del navegador
  const handleUnblockAudio = () => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = false;
      videoEl.volume = 1;
      videoEl.play().then(() => setIsAutoplayBlocked(false)).catch(() => {});
    }
  };

  const initials =
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <div
      onClick={isAutoplayBlocked ? handleUnblockAudio : undefined}
      className={cn(
        'group relative w-full h-full min-h-[180px] bg-neutral-900 rounded-2xl overflow-hidden shadow-lg border transition-all duration-200 flex items-center justify-center',
        isSpeaking ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-neutral-800',
        isPinned && 'ring-2 ring-primary',
        isAutoplayBlocked && 'cursor-pointer'
      )}
    >
      {/* Elemento de Video con autoPlay explícito */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          hasActiveVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none',
          isLocal && !isScreenSharing && 'scale-x-[-1]'
        )}
      />

      {/* Avatar Placeholder cuando la cámara está apagada */}
      {!hasActiveVideo && (
        <div className="flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in duration-300">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-neutral-700 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-primary to-emerald-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-md">
              {initials}
            </div>
          )}
          <span className="mt-3 text-sm font-medium text-neutral-300 max-w-[150px] truncate">
            {name} {isLocal && '(Tú)'}
          </span>
        </div>
      )}

      {/* Aviso si el navegador pausó el audio por autoplay */}
      {isAutoplayBlocked && !isLocal && (
        <div className="absolute inset-x-3 top-3 z-20 bg-amber-500/90 backdrop-blur-md text-black text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <VolumeX className="w-4 h-4" />
            <span>Haz clic para activar audio</span>
          </span>
        </div>
      )}

      {/* Etiqueta inferior con el nombre */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium z-10">
        {isScreenSharing && <Monitor className="w-3.5 h-3.5 text-blue-400" />}
        <span className="truncate max-w-[130px] md:max-w-[200px]">
          {name} {isLocal ? '(Tú)' : ''}
        </span>
      </div>

      {/* Indicador de estado de Micrófono en la esquina superior derecha */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className={cn(
              'p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100',
              isPinned && 'opacity-100 bg-primary text-white'
            )}
            title={isPinned ? 'Desfijar' : 'Fijar video'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          className={cn(
            'p-1.5 rounded-full backdrop-blur-md flex items-center justify-center text-white text-xs',
            !isAudioEnabled ? 'bg-red-500/90 text-white' : 'bg-black/50 text-neutral-300'
          )}
          title={isAudioEnabled ? 'Micrófono activo' : 'Micrófono silenciado'}
        >
          {isAudioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};
