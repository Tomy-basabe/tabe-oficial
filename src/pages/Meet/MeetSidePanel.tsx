import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Copy, Check, Users, MessageSquare, Info, Mic, MicOff, Video, VideoOff, Settings2, Camera } from 'lucide-react';
import { MeetParticipant, MeetChatMessage } from '@/hooks/useWebRTCMeet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MeetSidePanelProps {
  activePanel: 'chat' | 'participants' | 'info' | 'settings';
  onClose: () => void;
  roomId: string;
  myPeerId: string;
  userName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  participants: Map<string, MeetParticipant>;
  messages: MeetChatMessage[];
  videoDevices?: MediaDeviceInfo[];
  audioDevices?: MediaDeviceInfo[];
  selectedVideoDeviceId?: string;
  selectedAudioDeviceId?: string;
  onSendMessage: (text: string) => void;
  onSwitchCamera?: (deviceId: string) => void;
  onSwitchMicrophone?: (deviceId: string) => void;
}

export const MeetSidePanel: React.FC<MeetSidePanelProps> = ({
  activePanel,
  onClose,
  roomId,
  myPeerId,
  userName,
  isAudioEnabled,
  isVideoEnabled,
  participants,
  messages,
  videoDevices = [],
  audioDevices = [],
  selectedVideoDeviceId = '',
  selectedAudioDeviceId = '',
  onSendMessage,
  onSwitchCamera,
  onSwitchMicrophone,
}) => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePanel === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activePanel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Enlace de la llamada copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Código de reunión copiado');
  };

  const allParticipantsList = [
    {
      peerId: myPeerId,
      name: `${userName || 'Tú'} (Tú)`,
      audioEnabled: isAudioEnabled,
      videoEnabled: isVideoEnabled,
      isLocal: true,
    },
    ...Array.from(participants.values()).map((p) => ({
      peerId: p.peerId,
      name: p.name,
      avatar: p.avatar,
      audioEnabled: p.audioEnabled,
      videoEnabled: p.videoEnabled,
      isLocal: false,
    })),
  ];

  return (
    <aside className="fixed inset-0 md:static md:inset-auto w-full md:w-80 lg:w-96 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col z-40 text-neutral-100 animate-in slide-in-from-right duration-200">
      {/* Header del Panel */}
      <div className="h-16 px-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          {activePanel === 'chat' && (
            <>
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Mensajes de la llamada</span>
            </>
          )}
          {activePanel === 'participants' && (
            <>
              <Users className="w-5 h-5 text-primary" />
              <span>Personas ({allParticipantsList.length})</span>
            </>
          )}
          {activePanel === 'info' && (
            <>
              <Info className="w-5 h-5 text-primary" />
              <span>Detalles de la reunión</span>
            </>
          )}
          {activePanel === 'settings' && (
            <>
              <Settings2 className="w-5 h-5 text-primary" />
              <span>Configuración de dispositivos</span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Cerrar panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PESTAÑA: CONFIGURACIÓN DE DISPOSITIVOS */}
        {activePanel === 'settings' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" />
                <span>Cámara de video</span>
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Elige qué cámara usar si tienes varias cámaras, OBS Virtual Camera o webcam externa.
              </p>
              <select
                value={selectedVideoDeviceId}
                onChange={(e) => onSwitchCamera && onSwitchCamera(e.target.value)}
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
            </div>

            <div className="space-y-2 pt-4 border-t border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-primary" />
                <span>Micrófono de entrada</span>
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Selecciona tu micrófono o auriculares para la llamada.
              </p>
              <select
                value={selectedAudioDeviceId}
                onChange={(e) => onSwitchMicrophone && onSwitchMicrophone(e.target.value)}
                className="w-full h-10 px-3 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
              >
                {audioDevices.length === 0 ? (
                  <option value="">Micrófono por defecto</option>
                ) : (
                  audioDevices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Micrófono ${index + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
              💡 <strong>Consejo:</strong> Si tu cámara se ve en negro o no inicia, prueba seleccionando otra cámara de la lista.
            </div>
          </div>
        )}

        {/* PESTAÑA: INFORMACIÓN DE REUNIÓN */}
        {activePanel === 'info' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-2">Información para unirse</h4>
              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                Comparte esta información con las personas que desees que se unan a la llamada.
              </p>
              
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                    Código de la reunión
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-emerald-400">{roomId}</span>
                    <button
                      onClick={copyCode}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                    Enlace completo
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-neutral-300 truncate max-w-[200px]">
                      {window.location.href}
                    </span>
                    <button
                      onClick={copyLink}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Listo' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 text-blue-200 text-xs leading-relaxed">
              💡 <strong>Acceso directo:</strong> Quien tenga el enlace o el código puede ingresar inmediatamente desde su navegador, sin necesidad de descargas ni instalaciones.
            </div>
          </div>
        )}

        {/* PESTAÑA: PARTICIPANTES */}
        {activePanel === 'participants' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1 block">
              En la reunión ({allParticipantsList.length})
            </span>
            <div className="space-y-1">
              {allParticipantsList.map((p) => {
                const initial = p.name.charAt(0).toUpperCase();
                return (
                  <div
                    key={p.peerId}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-primary">
                        {initial}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-200 truncate max-w-[170px]">
                          {p.name}
                        </span>
                        {p.isLocal && <span className="text-[10px] text-primary font-semibold">Tú</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-400">
                      {p.audioEnabled ? (
                        <Mic className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-400" />
                      )}
                      {p.videoEnabled ? (
                        <Video className="w-4 h-4 text-neutral-300" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PESTAÑA: CHAT */}
        {activePanel === 'chat' && (
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Aún no hay mensajes.</p>
                  <p className="mt-1">Los mensajes enviados aquí son visibles para todos los participantes de la llamada.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === myPeerId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col p-3 rounded-2xl max-w-[85%] text-xs',
                        isMine
                          ? 'ml-auto bg-primary text-primary-foreground rounded-tr-none'
                          : 'mr-auto bg-neutral-800 text-neutral-200 rounded-tl-none'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-[11px] opacity-90 truncate max-w-[120px]">
                          {isMine ? 'Tú' : msg.senderName}
                        </span>
                        <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                      </div>
                      <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input de chat fijo abajo */}
      {activePanel === 'chat' && (
        <form onSubmit={handleSend} className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enviar un mensaje a todos..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </aside>
  );
};
