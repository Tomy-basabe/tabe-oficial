const fs = require('fs');

// 1. useRobustDiscord.ts
let robust = fs.readFileSync('src/hooks/useRobustDiscord.ts', 'utf8');

robust = robust.replace(
    /const \[cameras, setCameras\] = useState<CameraDevice\[\]>\(\[\]\);\s+const \[selectedCameraId, setSelectedCameraId\] = useState<string>\(''\);/,
    const [cameras, setCameras] = useState<CameraDevice[]>([]);\n    const [selectedCameraId, setSelectedCameraId] = useState<string>('');\n    const [mics, setMics] = useState<CameraDevice[]>([]);\n    const [selectedMicId, setSelectedMicId] = useState<string>('');
);

robust = robust.replace(
    /const refreshCameras = useCallback\(async \(\) => \{[\s\S]*?\}, \[selectedCameraId\]\);\s*useEffect\(\(\) => \{ refreshCameras\(\); \}, \[\]\);/,
    const refreshDevices = useCallback(async () => {\n        try {\n            const devices = await navigator.mediaDevices.enumerateDevices();\n            const videoDevices = devices.filter(d => d.kind === 'videoinput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || \\\Cámara \\\\\\ }));\n            setCameras(videoDevices);\n            if (videoDevices.length > 0 && !selectedCameraId) setSelectedCameraId(videoDevices[0].deviceId);\n            \n            const audioDevices = devices.filter(d => d.kind === 'audioinput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || \\\Micrófono \\\\\\ }));\n            setMics(audioDevices);\n            if (audioDevices.length > 0 && !selectedMicId) setSelectedMicId(audioDevices[0].deviceId);\n        } catch { /* ignore */ }\n    }, [selectedCameraId, selectedMicId]);\n\n    useEffect(() => { refreshDevices(); }, []);
);
robust = robust.replace(/await refreshCameras\(\)/g, 'await refreshDevices()');
robust = robust.replace(/refreshCameras/g, 'refreshDevices'); // Any remaining

robust = robust.replace(
    /const switchCamera = useCallback\(async \(deviceId: string\) => \{[\s\S]*?try \{[\s\S]*?const vs = await navigator\.mediaDevices\.getUserMedia\(\{ video: \{ deviceId: \{ exact: deviceId \} \} \}\);[\s\S]*?const newVt = vs\.getVideoTracks\(\)\[0\];[\s\S]*?if \(cameraStreamRef\.current\) \{[\s\S]*?cameraStreamRef\.current\.getTracks\(\)\.forEach\(t => \{[\s\S]*?t\.enabled = false;[\s\S]*?try \{ t\.stop\(\); \} catch \{ \}[\s\S]*?\}\);[\s\S]*?\}[\s\S]*?cameraStreamRef\.current = vs;[\s\S]*?mainStream\.getVideoTracks\(\)\.forEach\(t => \{[\s\S]*?t\.enabled = false;[\s\S]*?try \{ t\.stop\(\); \} catch \{ \}[\s\S]*?mainStream\.removeTrack\(t\);[\s\S]*?\}\);[\s\S]*?mainStream\.addTrack\(newVt\);/,
    const switchCamera = useCallback(async (deviceId: string) => {\n        setSelectedCameraId(deviceId);\n        localStorage.setItem('tabetalk_video_input_device', deviceId);\n        if (!isVideoEnabled || !localStreamRef.current) return;\n        const mainStream = localStreamRef.current;\n\n        try {\n            if (cameraStreamRef.current) {\n                cameraStreamRef.current.getTracks().forEach(t => {\n                    t.enabled = false;\n                    try { t.stop(); } catch { }\n                });\n                cameraStreamRef.current = null;\n            }\n            mainStream.getVideoTracks().forEach(t => {\n                t.enabled = false;\n                try { t.stop(); } catch { }\n                mainStream.removeTrack(t);\n            });\n\n            const vs = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });\n            const newVt = vs.getVideoTracks()[0];\n            cameraStreamRef.current = vs;\n            mainStream.addTrack(newVt);
);

let switchMicFunc = 
    const switchMic = useCallback(async (deviceId: string) => {
        setSelectedMicId(deviceId);
        localStorage.setItem('tabetalk_audio_input_device', deviceId);
        if (!localStreamRef.current) return;
        const mainStream = localStreamRef.current;

        try {
            const as = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: localStorage.getItem('tabetalk_echo_cancellation') !== 'false',
                    noiseSuppression: localStorage.getItem('tabetalk_noise_suppression') !== 'false',
                    autoGainControl: true,
                    deviceId: { exact: deviceId }
                }
            });
            const newAt = as.getAudioTracks()[0];

            mainStream.getAudioTracks().forEach(t => {
                t.enabled = false;
                try { t.stop(); } catch {}
                mainStream.removeTrack(t);
            });
            mainStream.addTrack(newAt);
            newAt.enabled = isAudioEnabledRef.current;

            pcsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) sender.replaceTrack(newAt);
            });

            setLocalStream(new MediaStream(mainStream.getTracks()));
            setupLocalVAD(mainStream);
            log(\Mic switched to \\);
        } catch (e: any) {
            toast({ title: 'Error al cambiar micrófono', description: e.message, variant: 'destructive' });
        }
    }, [setupLocalVAD, toast, log]);
;
robust = robust.replace(
    /const stopScreenShare = useCallback\(async \(\) => \{/,
    switchMicFunc + '\n    const stopScreenShare = useCallback(async () => {'
);

robust = robust.replace(
    /if \(targetCameraId && targetCameraId !== 'default'\) \{\s*vs = await navigator\.mediaDevices\.getUserMedia\(\{\s*video: \{ deviceId: \{ ideal: targetCameraId \}, width: \{ ideal: 1280 \}, height: \{ ideal: 720 \} \}\s*\}\);\s*\} else \{\s*vs = await navigator\.mediaDevices\.getUserMedia\(\{\s*video: \{ width: \{ ideal: 1280 \}, height: \{ ideal: 720 \}, facingMode: 'user' \}\s*\}\);\s*\}\s*\} catch \(e1\) \{\s*console\.warn\('\[Tabetalk WebRTC\] Error con constraints de cámara ideales, probando fallback básico:', e1\);\s*vs = await navigator\.mediaDevices\.getUserMedia\(\{ video: true \}\);\s*\}/,
    if (targetCameraId && targetCameraId !== 'default') {\n                        vs = await navigator.mediaDevices.getUserMedia({\n                            video: { deviceId: { exact: targetCameraId } }\n                        });\n                    } else {\n                        vs = await navigator.mediaDevices.getUserMedia({\n                            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }\n                        });\n                    }\n                } catch (e1) {\n                    console.warn('[Tabetalk WebRTC] Error con cámara seleccionada, probando fallback básico:', e1);\n                    vs = await navigator.mediaDevices.getUserMedia({ video: true });\n                    toast({ title: 'Cámara seleccionada no disponible', description: 'Se activó la cámara predeterminada del sistema.', variant: 'destructive' });\n                }
);

robust = robust.replace(
    /switchCamera,\s*startScreenShare/,
    switchCamera,\n        mics,\n        selectedMicId,\n        switchMic,\n        startScreenShare
);

fs.writeFileSync('src/hooks/useRobustDiscord.ts', robust, 'utf8');

// 2. DiscordVoiceChannel.tsx
let channelStr = fs.readFileSync('src/components/discord/DiscordVoiceChannel.tsx', 'utf8');
channelStr = channelStr.replace(
    /onSwitchCamera\?: \(deviceId: string\) => void;\s*screenStream/,
    onSwitchCamera?: (deviceId: string) => void;\n  mics?: CameraDevice[];\n  selectedMicId?: string;\n  onSwitchMic?: (deviceId: string) => void;\n  screenStream
);
channelStr = channelStr.replace(
    /onSwitchCamera,\s*screenStream,/,
    onSwitchCamera,\n  mics = [],\n  selectedMicId = '',\n  onSwitchMic,\n  screenStream,
);

channelStr = channelStr.replace(
    /const \[showCameraMenu, setShowCameraMenu\] = useState\(false\);/,
    const [showCameraMenu, setShowCameraMenu] = useState(false);\n  const [showMicMenu, setShowMicMenu] = useState(false);
);

let newMicBtn = 
            <div className="relative flex">
              <ComicControlBtn
                icon={isAudioEnabled ? Mic : MicOff}
                active={!isAudioEnabled}
                onClick={onToggleAudio}
                tooltip={isAudioEnabled ? "Mutear" : "Desmutear"}
                variant={isAudioEnabled ? "yellow" : "danger"}
              />
              {mics.length > 1 && (
                <button
                  onClick={() => setShowMicMenu(!showMicMenu)}
                  className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000] transition-all"
                  title="Cambiar micrófono"
                >
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}

              {showMicMenu && mics.length > 1 && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-card border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] p-2 min-w-[200px] z-50">
                  <div className="text-[11px] font-black uppercase text-muted-foreground px-2 py-1 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" /> Dispositivos
                  </div>
                  {mics.map(mic => (
                    <button
                      key={mic.deviceId}
                      onClick={() => { onSwitchMic?.(mic.deviceId); setShowMicMenu(false); }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg transition-colors truncate border-2 border-transparent my-0.5",
                        mic.deviceId === selectedMicId
                          ? "bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_#000]"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      {mic.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
;
channelStr = channelStr.replace(
    /<ComicControlBtn\s*icon=\{isAudioEnabled \? Mic : MicOff\}[\s\S]*?variant=\{isAudioEnabled \? "yellow" : "danger"\}\s*\/>/,
    newMicBtn
);

// Fix both VideoTile and SmallTile
let useEffectOld =   // Vincular stream al elemento de video
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!stream || !showVideo) {
      el.srcObject = null;
      return;
    }

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch(() => {});
  }, [stream, showVideo]);;
let useEffectNew =   // Vincular stream al elemento de video
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      return;
    }
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch((err) => console.log('AutoPlay prevented:', err));
  }, [stream]);;
channelStr = channelStr.replace(useEffectOld, useEffectNew);

let useEffectSmallOld =   useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream || !showVideo) {
      el.srcObject = null;
      return;
    }
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch(() => {});
  }, [stream, showVideo]);;
let useEffectSmallNew =   useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      return;
    }
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch((err) => console.log('AutoPlay prevented:', err));
  }, [stream]);;
channelStr = channelStr.replace(useEffectSmallOld, useEffectSmallNew);
fs.writeFileSync('src/components/discord/DiscordVoiceChannel.tsx', channelStr, 'utf8');


// 3. DiscordVoiceContext.tsx
let contextStr = fs.readFileSync('src/contexts/DiscordVoiceContext.tsx', 'utf8');
contextStr = contextStr.replace(
    /switchCamera: voice\.switchCamera,/,
    switchCamera: voice.switchCamera,\n        mics: voice.mics,\n        selectedMicId: voice.selectedMicId,\n        switchMic: voice.switchMic,
);
fs.writeFileSync('src/contexts/DiscordVoiceContext.tsx', contextStr, 'utf8');


// 4. Tabetalk.tsx
let tabeStr = fs.readFileSync('src/pages/Tabetalk.tsx', 'utf8');
tabeStr = tabeStr.replace(
    /switchCamera,\s*screenStream,/,
    switchCamera,\n    mics,\n    selectedMicId,\n    switchMic,\n    screenStream,
);
tabeStr = tabeStr.replace(
    /onSwitchCamera=\{switchCamera\}\s*speakingUsers/,
    onSwitchCamera={switchCamera}\n                  mics={mics}\n                  selectedMicId={selectedMicId}\n                  onSwitchMic={switchMic}\n                  speakingUsers
);
fs.writeFileSync('src/pages/Tabetalk.tsx', tabeStr, 'utf8');
