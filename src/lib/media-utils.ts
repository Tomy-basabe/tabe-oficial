/**
 * Utilidades seguras para acceso a cámara y micrófono.
 * Diseñado con constraints flexibles (evitando exact: deviceId que bloquea en Windows)
 * y con cancelación de eco activa.
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
    ? options.audioDeviceId && options.audioDeviceId.trim() !== ''
      ? { ...SAFE_AUDIO_CONSTRAINTS, deviceId: options.audioDeviceId }
      : SAFE_AUDIO_CONSTRAINTS
    : false;

  const videoConstraints: MediaTrackConstraints | boolean = options.video
    ? options.videoDeviceId && options.videoDeviceId.trim() !== ''
      ? { deviceId: options.videoDeviceId }
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
      console.warn('Intento con constraints específicos falló, probando genérico:', err1);
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: SAFE_AUDIO_CONSTRAINTS,
        });
      } catch (err1b) {
        console.warn('Fallo intento genérico con audio y video:', err1b);
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
