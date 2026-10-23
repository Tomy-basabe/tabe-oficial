// Web Audio API Comic Synthesizer - Silenced per user request
export const ComicAudio = {
  isMuted: () => true,
  setMuted: (_muted: boolean) => {},
  toggleMute: () => true,

  // All sounds disabled
  playPop: () => {},
  playPowerUp: () => {},
  playBoing: () => {},
  playSprout: () => {},
  playWater: () => {},
  playFanfare: () => {},
};
