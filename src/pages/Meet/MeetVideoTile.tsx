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

  // Asignar el stream al elemento <video> únicamente cuando cambie la instancia de stream
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }

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

      // Reproducción explícita para evitar que navegadores suspendan el audio/video en llamadas de 3+ personas
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsAutoplayBlocked(false);
          })
          .catch(() => {
            if (!isLocal) {
              setIsAutoplayBlocked(true);
            }
          });
      }
    } else {
      videoEl.srcObject = null;
      setHasActiveVideo(false);
      setIsAutoplayBlocked(false);
    }
  }, [stream, isLocal]);

  // Evaluar si debe mostrarse la imagen de video (cámara activa o pantalla compartida)
  useEffect(() => {
    if (!stream) {
      setHasActiveVideo(false);
      return;
    }

    const updateVideoStatus = () => {
      const videoTracks = stream.getVideoTracks();
      const hasLiveTrack = videoTracks.some((t) => t.readyState === 'live');
      setHasActiveVideo(hasLiveTrack && (isVideoEnabled || isScreenSharing));
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
  }, [stream, isVideoEnabled, isScreenSharing]);

  // Desbloquear audio si fue restringido por política de autoplay del navegador
  const handleUnblockAudio = () => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = false;
      videoEl.volume = 1;
      videoEl
        .play()
        .then(() => setIsAutoplayBlocked(false))
        .catch(() => {});
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
        'group relative w-full h-full min-h-[160px] bg-neutral-900 rounded-2xl overflow-hidden shadow-lg border transition-all duration-200 flex items-center justify-center',
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
          'w-full h-full transition-opacity duration-300',
          isScreenSharing ? 'object-contain bg-black' : 'object-cover',
          hasActiveVideo ? 'opacity-100' : 'opacity-0 absolute pointer-events-none',
          isLocal && !isScreenSharing && 'scale-x-[-1]'
        )}
      />

      {/* Avatar Placeholder cuando la cámara está apagada y no comparte pantalla */}
      {!hasActiveVideo && (
        <div className="flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in duration-300">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-2 border-neutral-700 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-primary to-emerald-600 flex items-center justify-center text-white text-xl md:text-3xl font-bold shadow-md">
              {initials}
            </div>
          )}
          <span className="mt-3 text-xs md:text-sm font-medium text-neutral-300 max-w-[150px] truncate">
            {name} {isLocal && '(Tú)'}
          </span>
        </div>
      )}

      {/* Aviso si el navegador pausó el audio por autoplay */}
      {isAutoplayBlocked && !isLocal && (
        <div className="absolute inset-x-3 top-3 z-20 bg-amber-500/95 backdrop-blur-md text-black text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-1.5">
            <VolumeX className="w-4 h-4 shrink-0" />
            <span>Haz clic para escuchar audio</span>
          </span>
        </div>
      )}

      {/* Etiqueta inferior con el nombre */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium z-10">
        {isScreenSharing && <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
        <span className="truncate max-w-[120px] md:max-w-[200px]">
          {name} {isLocal ? '(Tú)' : ''}
        </span>
      </div>

      {/* Indicador de estado de Micrófono y Fijar en la esquina superior derecha */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={cn(
              'p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100',
              isPinned && 'opacity-100 bg-primary text-white'
            )}
            title={isPinned ? 'Desfijar' : 'Fijar video en pantalla principal'}
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
