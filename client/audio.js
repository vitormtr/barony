// Audio Module - Background music and sound effects for Barony

// jsfxr - 8-bit sound effect generator (embedded minimal version)
const jsfxr = (function() {
  const SHAPES = { SQUARE: 0, SAWTOOTH: 1, SINE: 2, NOISE: 3 };

  function generate(settings) {
    const sampleRate = 44100;
    const samples = [];

    const attackTime = (settings.attack || 0) * sampleRate;
    const sustainTime = (settings.sustain || 0.1) * sampleRate;
    const decayTime = (settings.decay || 0.1) * sampleRate;
    const totalSamples = Math.floor(attackTime + sustainTime + decayTime);

    let phase = 0;
    const baseFreq = settings.frequency || 440;

    for (let i = 0; i < totalSamples; i++) {
      // Envelope
      let envelope = 1;
      if (i < attackTime) {
        envelope = i / attackTime;
      } else if (i > attackTime + sustainTime) {
        envelope = 1 - (i - attackTime - sustainTime) / decayTime;
      }

      // Frequency with slide
      const freq = baseFreq + (settings.slide || 0) * (i / sampleRate) * 1000;
      phase += freq / sampleRate;

      // Waveform
      let sample = 0;
      const shape = settings.shape || SHAPES.SQUARE;

      if (shape === SHAPES.SQUARE) {
        sample = phase % 1 < 0.5 ? 1 : -1;
      } else if (shape === SHAPES.SAWTOOTH) {
        sample = 2 * (phase % 1) - 1;
      } else if (shape === SHAPES.SINE) {
        sample = Math.sin(phase * Math.PI * 2);
      } else if (shape === SHAPES.NOISE) {
        sample = Math.random() * 2 - 1;
      }

      samples.push(sample * envelope * (settings.volume || 0.5));
    }

    return createAudioBuffer(samples, sampleRate);
  }

  function createAudioBuffer(samples, sampleRate) {
    const audioContext = getAudioContext();
    if (!audioContext) return null;

    const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      channel[i] = samples[i];
    }
    return buffer;
  }

  return { generate, SHAPES };
})();

// Audio Context (lazy init for browser autoplay policy)
let audioContext = null;
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// State
let musicEnabled = true;
let sfxEnabled = true;
let musicVolume = 0.3;
let sfxVolume = 0.5;
let currentMusic = null;
let musicGainNode = null;

// Sound effect definitions (generated with jsfxr)
const SFX_DEFINITIONS = {
  // Recruitment - trumpet fanfare
  recruitment: { frequency: 523, attack: 0.01, sustain: 0.15, decay: 0.1, shape: 0, volume: 0.4, slide: 0.2 },
  // Movement - footstep
  movement: { frequency: 150, attack: 0, sustain: 0.05, decay: 0.1, shape: 3, volume: 0.3 },
  // Combat - sword clash
  combat: { frequency: 800, attack: 0, sustain: 0.1, decay: 0.2, shape: 3, volume: 0.5, slide: -0.5 },
  // Construction - hammer
  construction: { frequency: 200, attack: 0, sustain: 0.08, decay: 0.15, shape: 3, volume: 0.4 },
  // New City - fanfare
  newCity: { frequency: 440, attack: 0.02, sustain: 0.2, decay: 0.15, shape: 2, volume: 0.4, slide: 0.3 },
  // Expedition - march
  expedition: { frequency: 300, attack: 0.01, sustain: 0.1, decay: 0.1, shape: 0, volume: 0.3 },
  // Noble Title - royal fanfare
  nobleTitle: { frequency: 660, attack: 0.02, sustain: 0.25, decay: 0.2, shape: 2, volume: 0.5, slide: 0.1 },
  // Turn change - bell
  turnEnd: { frequency: 880, attack: 0.01, sustain: 0.1, decay: 0.3, shape: 2, volume: 0.3 },
  // Click/select
  click: { frequency: 600, attack: 0, sustain: 0.03, decay: 0.05, shape: 0, volume: 0.2 },
  // Error
  error: { frequency: 200, attack: 0, sustain: 0.1, decay: 0.1, shape: 0, volume: 0.3, slide: -0.3 },
  // Victory
  victory: { frequency: 523, attack: 0.02, sustain: 0.3, decay: 0.3, shape: 2, volume: 0.5, slide: 0.2 },
  // Game start
  gameStart: { frequency: 440, attack: 0.05, sustain: 0.2, decay: 0.2, shape: 2, volume: 0.4, slide: 0.15 }
};

// Pre-generated sound buffers
const sfxBuffers = {};

// Medieval music tracks from Internet Archive (CC0 - Public Domain)
// Using direct URLs that don't require redirects
const MUSIC_TRACKS = [
  'https://ia800402.us.archive.org/3/items/medieval-instrumental-background-music/Dancing%20at%20the%20Inn.mp3',
  'https://ia800402.us.archive.org/3/items/medieval-instrumental-background-music/Nordic%20Wist.mp3',
  'https://ia800402.us.archive.org/3/items/medieval-instrumental-background-music/Royal%20Coupling.mp3',
  'https://ia800402.us.archive.org/3/items/medieval-instrumental-background-music/The%20Britons.mp3',
  'https://ia800402.us.archive.org/3/items/medieval-instrumental-background-music/Cold%20Journey.mp3',
  'https://ia800402.us.archive.org/3/items/medieval-instrumental-background-music/Celebration.mp3'
];

let currentTrackIndex = 0;

// Initialize sound effects
function initSoundEffects() {
  const ctx = getAudioContext();
  if (!ctx) return;

  for (const [name, settings] of Object.entries(SFX_DEFINITIONS)) {
    sfxBuffers[name] = jsfxr.generate(settings);
  }
}

// Play a sound effect
export function playSfx(name) {
  if (!sfxEnabled) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) {
    console.warn('No audio context');
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  if (!sfxBuffers[name]) {
    initSoundEffects();
  }

  const buffer = sfxBuffers[name];
  if (!buffer) {
    console.warn('No buffer for sound:', name);
    return;
  }

  try {
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    gainNode.gain.value = sfxVolume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
    console.log('Playing SFX:', name);
  } catch (e) {
    console.error('Error playing SFX:', e);
  }
}

// Start background music
export function startMusic() {
  if (!musicEnabled) {
    console.log('Music disabled, not starting');
    return;
  }
  if (currentMusic) {
    console.log('Music already playing');
    return;
  }

  console.log('Starting background music...');

  currentMusic = new Audio();
  currentMusic.volume = musicVolume;

  // Play random track
  currentTrackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
  const trackUrl = MUSIC_TRACKS[currentTrackIndex];
  console.log('Loading track:', trackUrl);
  currentMusic.src = trackUrl;

  // Debug events
  currentMusic.addEventListener('canplaythrough', () => {
    console.log('Music ready to play');
  });

  currentMusic.addEventListener('playing', () => {
    console.log('Music now playing');
  });

  // Loop through tracks
  currentMusic.addEventListener('ended', () => {
    currentTrackIndex = (currentTrackIndex + 1) % MUSIC_TRACKS.length;
    console.log('Track ended, playing next:', MUSIC_TRACKS[currentTrackIndex]);
    currentMusic.src = MUSIC_TRACKS[currentTrackIndex];
    currentMusic.play().catch((e) => console.warn('Failed to play next track:', e));
  });

  currentMusic.addEventListener('error', (e) => {
    console.error('Music error:', e, currentMusic.error);
    currentTrackIndex = (currentTrackIndex + 1) % MUSIC_TRACKS.length;
    currentMusic.src = MUSIC_TRACKS[currentTrackIndex];
    currentMusic.play().catch(() => {});
  });

  currentMusic.play().catch((e) => {
    console.log('Music autoplay blocked, will start on user interaction');
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

// Toggle sound effects
export function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

// Set music volume (0-1)
export function setMusicVolume(vol) {
  musicVolume = Math.max(0, Math.min(1, vol));
  if (currentMusic) {
    currentMusic.volume = musicVolume;
  }
}

// Set SFX volume (0-1)
export function setSfxVolume(vol) {
  sfxVolume = Math.max(0, Math.min(1, vol));
}

// Get current states
export function isMusicEnabled() { return musicEnabled; }
export function isSfxEnabled() { return sfxEnabled; }
export function getMusicVolume() { return musicVolume; }
export function getSfxVolume() { return sfxVolume; }

// Resume audio context (call on user interaction)
export function resumeAudio() {
  console.log('Resuming audio...');
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') {
    ctx.resume().then(() => console.log('AudioContext resumed'));
  }
  // Try to start music if not already playing
  if (musicEnabled && !currentMusic) {
    startMusic();
  }
  // If music exists but is paused, try to play
  if (currentMusic && currentMusic.paused) {
    console.log('Attempting to play paused music');
    currentMusic.play().catch((e) => console.warn('Still cannot play:', e));
  }
}

// Initialize audio system
export function initAudio() {
  // Pre-generate sound effects
  initSoundEffects();

  // Add click listener to resume audio (browser autoplay policy)
  document.addEventListener('click', () => {
    resumeAudio();
  }, { once: true });

  console.log('Audio system initialized');
}
