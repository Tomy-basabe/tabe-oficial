import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, Mic, MicOff, VideoOff, ArrowRight, Copy, Check, Users, ShieldCheck, Sparkles, Settings2, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getSafeMediaStream } from '@/lib/media-utils';
import { useMediaDevices } from '@/hooks/useMediaDevices';

interface MeetLobbyProps {
  onJoinRoom?: (config: {
    userName: string;
    initialAudio: boolean;
    initialVideo: boolean;
    stream?: MediaStream | null;
    videoDeviceId?: string;
    audioDeviceId?: string;
  }) => void;
}

export const MeetLobby: React.FC<MeetLobbyProps> = ({ onJoinRoom }) => {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados locales
  const [inputCode, setInputCode] = useState('');
  const [userName, setUserName] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Hook de enumeración de cámaras y micrófonos
  const {
    videoDevices,
    audioDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    setSelectedVideoDeviceId,
    setSelectedAudioDeviceId,
  } = useMediaDevices();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Inicializar nombre si el usuario está logueado
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    } else if (!userName) {
      setUserName(`Invitado_${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [user]);

  // Cargar preview con la cámara seleccionada
  useEffect(() => {
    if (!paramRoomId) return;

    let isCancelled = false;

    async function startPreview() {
      // Detener tracks anteriores si estamos cambiando de cámara
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      try {
        const stream = await getSafeMediaStream({
          video: isVideoEnabled,
          audio: isAudioEnabled,
          videoDeviceId: selectedVideoDeviceId || undefined,
          audioDeviceId: selectedAudioDeviceId || undefined,
        });

        if (isCancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          streamRef.current = stream;
          setPreviewStream(stream);

          const hasVideoTrack = stream.getVideoTracks().length > 0;
          setHasCameraError(!hasVideoTrack && isVideoEnabled);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.volume = 0;
          }
        } else {
          setHasCameraError(true);
        }
      } catch (err) {
        console.warn('Error iniciando preview con cámara seleccionada:', err);
        setHasCameraError(true);
      }
    }

    startPreview();

    return () => {
      isCancelled = true;
    };
  }, [paramRoomId, selectedVideoDeviceId, selectedAudioDeviceId, isVideoEnabled, isAudioEnabled]);

  // Alternar audio en el lobby
  const toggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
  };

  // Alternar video en el lobby
  const toggleVideo = async () => {
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);

    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((t) => {
          t.enabled = next;
        });
      }
    }
  };

  const generateRoomCode = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const randPart = (len: number) =>
      Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    return `${randPart(3)}-${randPart(4)}-${randPart(3)}`;
  };

  const handleCreateNewMeeting = () => {
    const newRoomId = generateRoomCode();
    navigate(`/meet/${newRoomId}`);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    let code = inputCode.trim();
    if (code.includes('/meet/')) {
      code = code.split('/meet/')[1].split('?')[0].split('#')[0];
    }
    code = code.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();

    if (code) {
      navigate(`/meet/${code}`);
    } else {
      toast.error('Por favor introduce un código o enlace válido');
    }
  };

  const handleJoinClick = () => {
    if (!userName.trim()) {
      toast.error('Por favor escribe tu nombre antes de unirte');
      return;
    }

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isAudioEnabled;
      });
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isVideoEnabled;
      });
    }

    if (onJoinRoom) {
      onJoinRoom({
        userName: userName.trim(),
        initialAudio: isAudioEnabled,
        initialVideo: isVideoEnabled,
        stream: streamRef.current,
        videoDeviceId: selectedVideoDeviceId || undefined,
        audioDeviceId: selectedAudioDeviceId || undefined,
      });
    }
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Enlace de la llamada copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  // CASO 1: VISTA PREVIA PARA UNIRSE A /meet/:roomId
  if (paramRoomId) {
    const initials = userName
      ? userName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'U';

    return (
      <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col justify-between p-4 md:p-8">
        {/* Header simple */}
        <header className="flex items-center justify-between max-w-6xl w-full mx-auto pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
              <Video className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">T.A.B.E. Meet</span>
          </div>
          <div className="text-xs font-mono bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-neutral-400">
            Sala: <span className="text-primary font-bold">{paramRoomId}</span>
          </div>
        </header>

        {/* Contenedor central: Preview de Cámara + Formulario de Ingreso */}
        <main className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-6">
          {/* Columna Izquierda: Vista previa de cámara y selectores */}
          <div className="lg:col-span-7 flex flex-col items-center w-full">
            <div className="relative w-full aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                  isVideoEnabled && !hasCameraError ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                }`}
              />

              {(!isVideoEnabled || hasCameraError) && (
                <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in">
                  <div className="w-20 h-20 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl font-bold text-primary mb-2 shadow-inner">
                    {initials}
                  </div>
                  <span className="text-xs text-neutral-400 font-medium">
                    {hasCameraError
                      ? 'La cámara seleccionada no emite imagen o está en uso'
                      : 'La cámara está apagada'}
                  </span>
                </div>
              )}

              {/* Controles de mic, video y configuración flotantes sobre el preview */}
              <div className="absolute bottom-4 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-10">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${
                    isAudioEnabled ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  title={isAudioEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
                >
                  {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoEnabled ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  title={isVideoEnabled ? 'Apagar cámara' : 'Encender cámara'}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                  className={`p-3 rounded-full transition-colors ${
                    showDeviceSettings ? 'bg-primary text-primary-foreground' : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  }`}
                  title="Elegir cámara y micrófono"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Panel de Selección de Dispositivos (Cámaras y Micrófonos) */}
            <div className="w-full mt-3 p-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  <span>Cámara activa:</span>
                </span>
                <span className="text-[11px] text-neutral-400">
                  {videoDevices.length} cámara(s) detectada(s)
                </span>
              </div>

              <select
                value={selectedVideoDeviceId}
                onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
              >
                {videoDevices.length === 0 ? (
                  <option value="">Cámara por defecto</option>
                ) : (
                  videoDevices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Cámara ${index + 1}`}
                    </option>
                  ))
                )}
              </select>

              {audioDevices.length > 0 && showDeviceSettings && (
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-primary" />
                    <span>Micrófono activo:</span>
                  </span>
                  <select
                    value={selectedAudioDeviceId}
                    onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                    className="w-full h-10 px-3 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                  >
                    {audioDevices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Micrófono ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Unión */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">¿Listo para unirte?</h1>
              <p className="text-sm text-neutral-400 mt-1.5">
                Ingresa con tu nombre para que los demás puedan reconocerte en la llamada.
              </p>
            </div>

            <div className="w-full space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5 text-left">
                  Tu nombre en la llamada
                </label>
                <Input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 h-11 text-sm rounded-xl focus:ring-primary"
                  maxLength={30}
                />
              </div>

              <Button
                onClick={handleJoinClick}
                className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center gap-2"
              >
                <span>Unirse ahora</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-full pt-4 border-t border-neutral-900 flex flex-col gap-2">
              <span className="text-xs text-neutral-400 font-medium text-left">Enlace de la reunión:</span>
              <button
                type="button"
                onClick={copyRoomLink}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 transition-colors"
              >
                <span className="truncate max-w-[240px] text-neutral-400 font-mono">
                  {window.location.href}
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </span>
              </button>
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-neutral-600 py-2">
          Conexión segura WebRTC P2P con cancelación de eco • T.A.B.E. Meet
        </footer>
      </div>
    );
  }

  // CASO 2: VISTA PRINCIPAL /meet (CREAR O UNIRSE)
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col justify-between p-4 md:p-8">
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto pb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
            <Video className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">T.A.B.E. Meet</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Acceso por enlace privado</span>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto py-10">
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Videollamadas P2P seguras en tiempo real</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Videollamadas para interactuar y estudiar en equipo.
          </h1>

          <p className="text-base text-neutral-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Inicia una videollamada al instante o únete a una reunión compartiendo solo tu código o enlace directo, con cámara, micrófono, chat en vivo y pantalla compartida.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 max-w-md mx-auto lg:mx-0">
            <Button
              onClick={handleCreateNewMeeting}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg"
            >
              <Video className="w-4 h-4" />
              <span>Nueva reunión</span>
            </Button>

            <form onSubmit={handleJoinByCode} className="w-full sm:w-auto flex items-center gap-2 flex-1">
              <Input
                type="text"
                placeholder="Código o enlace"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="h-12 bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 rounded-xl focus:ring-primary text-sm font-mono"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={!inputCode.trim()}
                className="h-12 px-4 rounded-xl border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200"
              >
                Unirse
              </Button>
            </form>
          </div>

          <div className="pt-6 border-t border-neutral-900 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Sin instalaciones ni registros obligatorios</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Múltiples participantes simultáneos</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl space-y-4">
            <div className="relative aspect-video rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center group">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Video className="w-8 h-8" />
              </div>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-neutral-300">
                Tu enlace de reunión privado
              </div>
            </div>

            <div className="space-y-2 text-center pt-2">
              <h3 className="font-semibold text-base text-neutral-200">Reuniones accesibles solo por enlace</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Nadie puede ver tu reunión en la app principal. Solo las personas que reciban tu enlace o código podrán conectarse.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-neutral-600 py-3">
        T.A.B.E. Meet • Videoconferencias en tiempo real
      </footer>
    </div>
  );
};
