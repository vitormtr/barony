// Audio Module - Background music for Barony

// State
let musicEnabled = true;
let musicVolume = 0.3;
let currentMusic = null;

// Local medieval music file
const MUSIC_FILE = './audio/medieval-music.mp3';

// Start background music
export function startMusic() {
  if (!musicEnabled) {
    return;
  }
  if (currentMusic) {
    return;
  }

  currentMusic = new Audio();
  currentMusic.volume = musicVolume;
  currentMusic.loop = true;
  currentMusic.src = MUSIC_FILE;

  currentMusic.play().catch(() => {
    // Will start on user interaction
  });
}

// Stop background music
export function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
    currentMusic = null;
  }
}

// Toggle music
export function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
  return musicEnabled;
}

// Set music volume (0-1)
export function setMusicVolume(vol) {
  musicVolume = Math.max(0, Math.min(1, vol));
  if (currentMusic) {
    currentMusic.volume = musicVolume;
  }
}

// Get current states
export function isMusicEnabled() { return musicEnabled; }
export function getMusicVolume() { return musicVolume; }

// Stub functions for compatibility
export function playSfx() {}
export function toggleSfx() { return false; }
export function setSfxVolume() {}
export function isSfxEnabled() { return false; }
export function getSfxVolume() { return 0; }

// Resume audio (call on user interaction)
export function resumeAudio() {
  if (musicEnabled && !currentMusic) {
    startMusic();
  }
  if (currentMusic && currentMusic.paused) {
    currentMusic.play().catch(() => {});
  }
}

// Initialize audio system
export function initAudio() {
  document.addEventListener('click', () => {
    resumeAudio();
  }, { once: true });
}
