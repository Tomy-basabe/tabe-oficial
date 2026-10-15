/**
 * Utilidades seguras para acceso a cámara y micrófono.
 * Soporta selección explícita de dispositivo de cámara y micrófono (deviceId),
 * cancelación de eco profesional y fallback progresivo sin bloqueos en Windows.
 */

export const SAFE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

interface GetMediaOptions {
  video: boolean;
  audio: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

export async function getSafeMediaStream(options: GetMediaOptions): Promise<MediaStream | null> {
  if (!options.video && !options.audio) return null;

  const audioConstraints: MediaTrackConstraints | boolean = options.audio
    ? options.audioDeviceId
      ? { ...SAFE_AUDIO_CONSTRAINTS, deviceId: { exact: options.audioDeviceId } }
      : SAFE_AUDIO_CONSTRAINTS
    : false;

  const videoConstraints: MediaTrackConstraints | boolean = options.video
    ? options.videoDeviceId
      ? { deviceId: { exact: options.videoDeviceId } }
      : true
    : false;

  // Intento 1: Conjunto completo
  if (videoConstraints && audioConstraints) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
    } catch (err1) {
      console.warn('Fallo intento 1 (video y audio específico):', err1);
      // Intento 1b: sin deviceId estricto
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: SAFE_AUDIO_CONSTRAINTS,
        });
      } catch (err1b) {
        console.warn('Fallo intento 1b:', err1b);
      }
    }
  }

  // Intento 2: Separar peticiones para rescatar lo que esté disponible
  let videoStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;

  if (options.video) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
      });
    } catch {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (vErr) {
        console.warn('Cámara no disponible:', vErr);
      }
    }
  }

  if (options.audio) {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
    } catch {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (aErr) {
        console.warn('Micrófono no disponible:', aErr);
      }
    }
  }

  const tracks: MediaStreamTrack[] = [];
  if (videoStream) tracks.push(...videoStream.getVideoTracks());
  if (audioStream) tracks.push(...audioStream.getAudioTracks());

  if (tracks.length > 0) {
    return new MediaStream(tracks);
  }

  return null;
}
