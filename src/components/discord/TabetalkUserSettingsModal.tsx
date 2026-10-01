import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Mic, 
  Volume2, 
  Video, 
  User, 
  Sliders, 
  Camera, 
  Sparkles, 
  Check, 
  VolumeX, 
  Keyboard,
  ShieldCheck,
  Upload
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TabetalkUserSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MediaDeviceInfoItem {
  deviceId: string;
  label: string;
}

export function TabetalkUserSettingsModal({
  open,
  onOpenChange,
}: TabetalkUserSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"audio_video" | "profile" | "preferences">("audio_video");

  // Audio / Video Devices
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfoItem[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfoItem[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfoItem[]>([]);
  
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>(() => {
    return localStorage.getItem("tabetalk_audio_input_device") || "default";
  });
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>(() => {
    return localStorage.getItem("tabetalk_audio_output_device") || "default";
  });
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>(() => {
    return localStorage.getItem("tabetalk_video_input_device") || "default";
  });

  // Audio test / sensitivity
  const [inputVolume, setInputVolume] = useState<number>(() => {
    const saved = localStorage.getItem("tabetalk_input_volume");
    return saved ? Number(saved) : 80;
  });
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera preview
  const [isTestingCamera, setIsTestingCamera] = useState<boolean>(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Profile state
  const defaultNickname = user?.user_metadata?.name || user?.email?.split("@")[0] || "Estudiante";
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem("tabetalk_nickname") || defaultNickname;
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return localStorage.getItem("tabetalk_avatar") || user?.user_metadata?.avatar_url || "";
  });

  // Preferences state
  const [echoCancellation, setEchoCancellation] = useState<boolean>(() => {
    return localStorage.getItem("tabetalk_echo_cancellation") !== "false";
  });
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(() => {
    return localStorage.getItem("tabetalk_noise_suppression") !== "false";
  });
  const [pushToTalk, setPushToTalk] = useState<boolean>(() => {
    return localStorage.getItem("tabetalk_ptt_enabled") === "true";
  });
  const [muteShortcut, setMuteShortcut] = useState<string>(() => {
    return localStorage.getItem("tabetalk_mute_shortcut") || "M";
  });

  // List of pre-made comic avatars
  const COMIC_AVATARS = [
    "https://api.dicebear.com/7.x/bottts/svg?seed=TabeGamer",
    "https://api.dicebear.com/7.x/bottts/svg?seed=ProEstudio",
    "https://api.dicebear.com/7.x/bottts/svg?seed=RocketBoy",
    "https://api.dicebear.com/7.x/bottts/svg?seed=CyberStudent",
    "https://api.dicebear.com/7.x/bottts/svg?seed=NeonPanda",
  ];

  // Enumerate media devices
  useEffect(() => {
    if (!open) return;

    async function loadDevices() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;

      try {
        // Query devices directly
        let devices = await navigator.mediaDevices.enumerateDevices();
        
        // If device labels are empty, try requesting temporary permissions to obtain labels
        const hasLabels = devices.some((d) => d.label);
        if (!hasLabels && navigator.mediaDevices.getUserMedia) {
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            tempStream.getTracks().forEach((track) => track.stop());
            devices = await navigator.mediaDevices.enumerateDevices();
          } catch {
            // Permission denied or not available; fallback to unlabeled device list
          }
        }

        const aInputs: MediaDeviceInfoItem[] = [];
        const aOutputs: MediaDeviceInfoItem[] = [];
        const vInputs: MediaDeviceInfoItem[] = [];

        devices.forEach((d, idx) => {
          if (d.kind === "audioinput") {
            aInputs.push({ deviceId: d.deviceId || `audioinput-${idx}`, label: d.label || `Micrófono ${aInputs.length + 1}` });
          } else if (d.kind === "audiooutput") {
            aOutputs.push({ deviceId: d.deviceId || `audiooutput-${idx}`, label: d.label || `Altavoz ${aOutputs.length + 1}` });
          } else if (d.kind === "videoinput") {
            vInputs.push({ deviceId: d.deviceId || `videoinput-${idx}`, label: d.label || `Cámara ${vInputs.length + 1}` });
          }
        });

        setAudioInputs(aInputs.length ? aInputs : [{ deviceId: "default", label: "Micrófono predeterminado" }]);
        setAudioOutputs(aOutputs.length ? aOutputs : [{ deviceId: "default", label: "Altavoces predeterminados" }]);
        setVideoInputs(vInputs.length ? vInputs : [{ deviceId: "default", label: "Cámara web predeterminada" }]);
      } catch (err) {
        console.warn("Error enumerating devices:", err);
      }
    }

    loadDevices();
  }, [open]);

  // Clean up streams when modal closes
  useEffect(() => {
    if (!open) {
      stopMicTest();
      stopCameraPreview();
    }
  }, [open]);

  // Mic test logic
  const startMicTest = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioInput !== "default" ? { deviceId: { exact: selectedAudioInput } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsTestingMic(true);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn("No se pudo iniciar el test de micrófono:", e);
      toast.error("No se pudo acceder al micrófono para la prueba.");
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsTestingMic(false);
    setAudioLevel(0);
  };

  // Camera preview logic
  const startCameraPreview = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideoInput !== "default" ? { deviceId: { exact: selectedVideoInput }, width: { ideal: 640 }, height: { ideal: 360 } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setIsTestingCamera(true);
    } catch (e) {
      console.warn("No se pudo iniciar la cámara:", e);
      toast.error("No se pudo acceder a la cámara seleccionada.");
    }
  };

  const stopCameraPreview = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setIsTestingCamera(false);
  };

  // Switch camera if already previewing
  useEffect(() => {
    if (isTestingCamera) {
      stopCameraPreview();
      startCameraPreview();
    }
  }, [selectedVideoInput]);

  // Avatar upload
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        localStorage.setItem("tabetalk_avatar", result);
        toast.success("Avatar personalizado cargado");
      }
    };
    reader.readAsDataURL(file);
  };

  // Save all settings
  const handleSaveAll = () => {
    localStorage.setItem("tabetalk_audio_input_device", selectedAudioInput);
    localStorage.setItem("tabetalk_audio_output_device", selectedAudioOutput);
    localStorage.setItem("tabetalk_video_input_device", selectedVideoInput);
    localStorage.setItem("tabetalk_input_volume", inputVolume.toString());
    localStorage.setItem("tabetalk_nickname", nickname.trim() || defaultNickname);
    localStorage.setItem("tabetalk_avatar", avatarUrl);
    localStorage.setItem("tabetalk_echo_cancellation", echoCancellation.toString());
    localStorage.setItem("tabetalk_noise_suppression", noiseSuppression.toString());
    localStorage.setItem("tabetalk_ptt_enabled", pushToTalk.toString());
    localStorage.setItem("tabetalk_mute_shortcut", muteShortcut.toUpperCase());

    toast.success("Configuración de Tabetalk guardada correctamente");
    onOpenChange(false);
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="tabetalk-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col overflow-hidden text-black animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-[#FFE600] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border-3 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <Sliders className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <h3 id="tabetalk-settings-title" className="text-lg font-black uppercase tracking-wider text-black leading-none">
                AJUSTES DE TABETALK
              </h3>
              <p className="text-xs font-bold text-black/80 mt-1">
                Voz, video, dispositivos y perfil de usuario
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar modal de configuración"
            className="w-9 h-9 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-neutral-100 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[3] text-black" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-4 border-black bg-neutral-100 px-6 pt-3 gap-3 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("audio_video")}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-3 border-x-3 border-black transition-all flex items-center gap-2 -mb-[4px] cursor-pointer shrink-0",
              activeTab === "audio_video"
                ? "bg-white text-black border-b-4 border-b-white z-10 shadow-[0_-3px_0_0_#000]"
                : "bg-neutral-200/80 hover:bg-neutral-200 text-neutral-600 border-b-4 border-b-black"
            )}
          >
            <Mic className="w-4 h-4 stroke-[2.5]" />
            Voz & Video
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-3 border-x-3 border-black transition-all flex items-center gap-2 -mb-[4px] cursor-pointer shrink-0",
              activeTab === "profile"
                ? "bg-white text-black border-b-4 border-b-white z-10 shadow-[0_-3px_0_0_#000]"
                : "bg-neutral-200/80 hover:bg-neutral-200 text-neutral-600 border-b-4 border-b-black"
            )}
          >
            <User className="w-4 h-4 stroke-[2.5]" />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-3 border-x-3 border-black transition-all flex items-center gap-2 -mb-[4px] cursor-pointer shrink-0",
              activeTab === "preferences"
                ? "bg-white text-black border-b-4 border-b-white z-10 shadow-[0_-3px_0_0_#000]"
                : "bg-neutral-200/80 hover:bg-neutral-200 text-neutral-600 border-b-4 border-b-black"
            )}
          >
            <Keyboard className="w-4 h-4 stroke-[2.5]" />
            Preferencias
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-white">
          {/* TAB 1: AUDIO & VIDEO */}
          {activeTab === "audio_video" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Mic & Speakers in 2 clean columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Microfono */}
                <div className="p-4 rounded-xl border-2 border-black bg-neutral-50 shadow-[3px_3px_0px_#000] space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-black">
                    <Mic className="w-4 h-4 text-black stroke-[2.5]" />
                    Dispositivo de Entrada (Micrófono)
                  </label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full bg-white text-black text-xs font-bold px-3.5 py-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] focus:outline-hidden focus:bg-[#FFE600]/20 cursor-pointer"
                  >
                    {audioInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Altavoces */}
                <div className="p-4 rounded-xl border-2 border-black bg-neutral-50 shadow-[3px_3px_0px_#000] space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-black">
                    <Volume2 className="w-4 h-4 text-black stroke-[2.5]" />
                    Dispositivo de Salida (Altavoces)
                  </label>
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => setSelectedAudioOutput(e.target.value)}
                    className="w-full bg-white text-black text-xs font-bold px-3.5 py-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] focus:outline-hidden focus:bg-[#FFE600]/20 cursor-pointer"
                  >
                    {audioOutputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prueba de Micrófono & Sensibilidad */}
              <div className="p-5 rounded-2xl border-3 border-black bg-neutral-50 shadow-[4px_4px_0px_#000] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse border border-black" />
                    <span className="text-xs font-black uppercase tracking-wider text-black">
                      Prueba de Micrófono
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={isTestingMic ? stopMicTest : startMicTest}
                    className={cn(
                      "px-4 py-2 text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] transition-transform active:translate-y-0.5 cursor-pointer flex items-center gap-2",
                      isTestingMic
                        ? "bg-[#ed4245] text-white"
                        : "bg-[#00FF9D] text-black hover:bg-[#00E58D]"
                    )}
                  >
                    {isTestingMic ? <VolumeX className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isTestingMic ? "Detener Prueba" : "Probar Micrófono"}
                  </button>
                </div>

                {/* Reactive Mic Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-neutral-700">
                    <span>Nivel de entrada en tiempo real</span>
                    <span className="font-mono font-black">{audioLevel}%</span>
                  </div>
                  <div className="h-4 w-full bg-neutral-200 border-2 border-black rounded-full overflow-hidden p-0.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-75",
                        audioLevel > 75 ? "bg-[#ed4245]" : audioLevel > 30 ? "bg-[#00FF9D]" : "bg-[#FFE600]"
                      )}
                      style={{ width: `${isTestingMic ? audioLevel : 0}%` }}
                    />
                  </div>
                </div>

                {/* Slider de volumen */}
                <div className="pt-3 border-t-2 border-black/10 flex items-center gap-4">
                  <span className="text-xs font-bold text-neutral-800 min-w-[80px]">Sensibilidad:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={inputVolume}
                    onChange={(e) => setInputVolume(Number(e.target.value))}
                    className="flex-1 accent-black cursor-pointer h-2"
                  />
                  <span className="text-xs font-black text-black min-w-[40px] text-right font-mono">{inputVolume}%</span>
                </div>
              </div>

              {/* Cámara y Preview Box */}
              <div className="p-5 rounded-2xl border-3 border-black bg-neutral-50 shadow-[4px_4px_0px_#000] space-y-3">
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-black">
                  <Camera className="w-4 h-4 text-black stroke-[2.5]" />
                  Cámara de Video (Webcam)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => setSelectedVideoInput(e.target.value)}
                    className="flex-1 bg-white text-black text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] focus:outline-hidden focus:bg-[#FFE600]/20 cursor-pointer"
                  >
                    {videoInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={isTestingCamera ? stopCameraPreview : startCameraPreview}
                    className={cn(
                      "px-4 py-2.5 text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] transition-transform active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 shrink-0",
                      isTestingCamera
                        ? "bg-[#ed4245] text-white"
                        : "bg-[#FFE600] text-black hover:bg-[#FFE600]/90"
                    )}
                  >
                    <Video className="w-4 h-4" />
                    {isTestingCamera ? "Apagar Cámara" : "Vista Previa"}
                  </button>
                </div>

                {/* Preview Box */}
                {isTestingCamera && (
                  <div className="relative w-full aspect-video max-w-md mx-auto bg-black rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] overflow-hidden mt-3">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-md border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      En Vivo
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Nickname */}
              <div className="p-5 rounded-2xl border-3 border-black bg-neutral-50 shadow-[4px_4px_0px_#000] space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-black block">
                  Apodo dentro de Tabetalk
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Tu nombre o alias"
                  className="w-full bg-white text-black text-sm font-bold px-4 py-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] focus:outline-hidden focus:bg-[#FFE600]/20"
                />
                <p className="text-xs font-semibold text-neutral-600 mt-1">
                  Este es el nombre visible que verán los demás participantes en las salas de voz y chat.
                </p>
              </div>

              {/* Avatar Selector */}
              <div className="p-5 rounded-2xl border-3 border-black bg-neutral-50 shadow-[4px_4px_0px_#000] space-y-4">
                <label className="text-xs font-black uppercase tracking-wider text-black block">
                  Avatar de Tabetalk
                </label>
                
                {/* Active Preview */}
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_#000]">
                  <div className="w-16 h-16 rounded-2xl border-3 border-black bg-neutral-100 shadow-[3px_3px_0px_#000] overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-9 h-9 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase text-black">{nickname || "Sin alias"}</p>
                    <p className="text-xs font-bold text-neutral-500 truncate mt-0.5">
                      {user?.email || "Usuario autenticado"}
                    </p>
                    <label className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-[#FFE600] hover:bg-[#FFE600]/90 text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer transition-transform active:translate-y-0.5">
                      <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                      Subir Imagen
                      <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Pre-made Avatars */}
                <div>
                  <p className="text-xs font-bold text-neutral-700 mb-2.5">O elegí un avatar temático cómic:</p>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {COMIC_AVATARS.map((seedUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(seedUrl)}
                        className={cn(
                          "w-12 h-12 rounded-xl border-2 border-black p-0.5 bg-white shrink-0 transition-transform active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#000]",
                          avatarUrl === seedUrl && "ring-3 ring-black bg-[#FFE600] scale-105"
                        )}
                      >
                        <img src={seedUrl} alt="Preset avatar" className="w-full h-full rounded-lg" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Noise & Echo Toggles */}
              <div className="p-5 rounded-2xl border-3 border-black bg-neutral-50 shadow-[4px_4px_0px_#000] space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-black">Supresión de Eco</h4>
                    <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                      Evita que los demás escuchen el audio que sale de tus altavoces.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={echoCancellation}
                    onChange={(e) => setEchoCancellation(e.target.checked)}
                    className="w-5 h-5 accent-black cursor-pointer rounded-md border-2 border-black shrink-0"
                  />
                </div>

                <div className="border-t-2 border-black/10 pt-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-black">Cancelación de Ruido</h4>
                    <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                      Filtra ruidos de fondo, teclados y ventiladores automáticamente.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={noiseSuppression}
                    onChange={(e) => setNoiseSuppression(e.target.checked)}
                    className="w-5 h-5 accent-black cursor-pointer rounded-md border-2 border-black shrink-0"
                  />
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="p-5 rounded-2xl border-3 border-black bg-neutral-50 shadow-[4px_4px_0px_#000] space-y-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-black" />
                  <h4 className="text-xs font-black uppercase text-black">Atajos de Teclado</h4>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Modo Pulsar para Hablar (Push-to-Talk)</p>
                    <p className="text-xs font-semibold text-neutral-500 mt-0.5">Mantiene el micrófono silenciado hasta presionar la tecla.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushToTalk}
                    onChange={(e) => setPushToTalk(e.target.checked)}
                    className="w-5 h-5 accent-black cursor-pointer rounded-md border-2 border-black shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-3 border-t-2 border-black/10">
                  <span className="text-xs font-bold text-neutral-900">Tecla rápida para silenciar/activar micrófono:</span>
                  <kbd className="px-3 py-1.5 bg-white text-black font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000]">
                    {muteShortcut}
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-4 border-black bg-neutral-100 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 bg-[#00FF9D] hover:bg-[#00E58D] text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
