// Web Audio API Comic Synthesizer - Ultra lightweight & zero dependencies
let audioCtx: AudioContext | null = null;
let isAudioMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const ComicAudio = {
  isMuted: () => isAudioMuted,
  setMuted: (muted: boolean) => {
    isAudioMuted = muted;
  },
  toggleMute: () => {
    isAudioMuted = !isAudioMuted;
    return isAudioMuted;
  },

  // Play a bouncy cartoon pop sound
  playPop: () => {
    if (isAudioMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore audio errors gracefully
    }
  },

  // Play a retro comic power-up / XP burst sound
  playPowerUp: () => {
    if (isAudioMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [330, 440, 550, 660, 880];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        const startTime = now + idx * 0.04;
        const endTime = startTime + 0.08;

        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch {
      // Ignore audio errors gracefully
    }
  },

  // Play a bouncy spring "boing"
  playBoing: () => {
    if (isAudioMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.12);
      osc.frequency.linearRampToValueAtTime(350, now + 0.22);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio errors gracefully
    }
  },
};
