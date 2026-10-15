import { useState, useEffect, useCallback } from 'react';

export function useMediaDevices() {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');

  const enumerate = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevices = devices.filter((d) => d.kind === 'videoinput');
      const aDevices = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(vDevices);
      setAudioDevices(aDevices);

      // Si no hay seleccionado o el seleccionado ya no existe, elegir el primero
      setSelectedVideoDeviceId((prev) => {
        if (prev && vDevices.some((d) => d.deviceId === prev)) return prev;
        return vDevices.length > 0 ? vDevices[0].deviceId : '';
      });

      setSelectedAudioDeviceId((prev) => {
        if (prev && aDevices.some((d) => d.deviceId === prev)) return prev;
        return aDevices.length > 0 ? aDevices[0].deviceId : '';
      });
    } catch (err) {
      console.warn('Error al enumerar dispositivos de medios:', err);
    }
  }, []);

  useEffect(() => {
    enumerate();

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', enumerate);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', enumerate);
      };
    }
  }, [enumerate]);

  return {
    videoDevices,
    audioDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    setSelectedVideoDeviceId,
    setSelectedAudioDeviceId,
    refreshDevices: enumerate,
  };
}
