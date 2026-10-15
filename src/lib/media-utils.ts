/**
 * Utilidades seguras para acceso a cámara y micrófono.
 * Diseñadas para funcionar en Windows, Mac, Linux, Android e iOS
 * sin fallos por OverconstrainedError (como facingMode en laptops)
 * y con cancelación de eco obligatoria para evitar retorno de voz.
 */

export const SAFE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export async function getSafeMediaStream(options: { video: boolean; audio: boolean }): Promise<MediaStream | null> {
  // Si no se pide nada, retornar null
  if (!options.video && !options.audio) return null;

  // Intento 1: Video estándar y Audio con cancelación de eco (sin constraints estrictos de facingMode)
  if (options.video && options.audio) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: SAFE_AUDIO_CONSTRAINTS,
      });
    } catch (err1) {
      console.warn('Fallo intento 1 (video y audio optimizado):', err1);
      // Intento 1b: Audio simple + video simple
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err1b) {
        console.warn('Fallo intento 1b (video y audio simple):', err1b);
      }
    }
  }

  // Intento 2: Separar peticiones para rescatar lo que esté disponible
  let videoStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;

  if (options.video) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (vErr) {
      console.warn('Cámara no disponible o rechazada:', vErr);
    }
  }

  if (options.audio) {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: SAFE_AUDIO_CONSTRAINTS });
    } catch (aErr) {
      console.warn('Micrófono con cancelación falló, probando micrófono básico:', aErr);
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (aErr2) {
        console.warn('Micrófono no disponible:', aErr2);
      }
    }
  }

  // Combinar los tracks disponibles
  const tracks: MediaStreamTrack[] = [];
  if (videoStream) tracks.push(...videoStream.getVideoTracks());
  if (audioStream) tracks.push(...audioStream.getAudioTracks());

  if (tracks.length > 0) {
    return new MediaStream(tracks);
  }

  return null;
}
