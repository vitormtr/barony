// Audio Controls UI - Volume slider and mute button for music

import {
  toggleMusic,
  setMusicVolume,
  isMusicEnabled,
  getMusicVolume
} from './audio.js';

let controlsElement = null;
let isExpanded = false;

export function createAudioControls() {
  if (controlsElement) return;

  controlsElement = document.createElement('div');
  controlsElement.id = 'audioControls';
  controlsElement.className = 'audio-controls';
  controlsElement.innerHTML = `
    <button class="audio-toggle-btn" title="Audio Settings">
      <span class="audio-icon">${isMusicEnabled() ? '🔊' : '🔇'}</span>
    </button>
    <div class="audio-panel">
      <div class="audio-row">
        <span class="audio-label">Music</span>
        <input type="range" class="audio-slider music-volume" min="0" max="100" value="${getMusicVolume() * 100}">
        <button class="audio-mute-btn music-mute" title="Toggle Music">
          ${isMusicEnabled() ? '🎵' : '🚫'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(controlsElement);

  // Event listeners
  const toggleBtn = controlsElement.querySelector('.audio-toggle-btn');
  const panel = controlsElement.querySelector('.audio-panel');
  const musicSlider = controlsElement.querySelector('.music-volume');
  const musicMuteBtn = controlsElement.querySelector('.music-mute');

  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    panel.classList.toggle('visible', isExpanded);
  });

  musicSlider.addEventListener('input', (e) => {
    setMusicVolume(e.target.value / 100);
  });

  musicMuteBtn.addEventListener('click', () => {
    const enabled = toggleMusic();
    musicMuteBtn.textContent = enabled ? '🎵' : '🚫';
    updateMainIcon();
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!controlsElement.contains(e.target) && isExpanded) {
      isExpanded = false;
      panel.classList.remove('visible');
    }
  });
}

function updateMainIcon() {
  const icon = controlsElement.querySelector('.audio-icon');
  if (icon) {
    icon.textContent = isMusicEnabled() ? '🔊' : '🔇';
  }
}

export function showAudioControls() {
  if (controlsElement) {
    controlsElement.style.display = 'block';
  }
}

export function hideAudioControls() {
  if (controlsElement) {
    controlsElement.style.display = 'none';
  }
}
