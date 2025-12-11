// Module for displaying player color

const COLOR_HEX = {
  red: '#c62828',
  blue: '#1565c0',
  green: '#2e7d32',
  yellow: '#f9a825'
};

let colorIndicator = null;
let currentPlayerName = null;

export function showPlayerColor(color, playerName = null) {
  if (!colorIndicator) {
    colorIndicator = document.createElement('div');
    colorIndicator.id = 'player-color-indicator';
    document.body.appendChild(colorIndicator);
  }

  currentPlayerName = playerName;
  const colorHex = COLOR_HEX[color] || '#888';
  const displayName = playerName || color.charAt(0).toUpperCase() + color.slice(1);

  colorIndicator.innerHTML = `
    <div class="color-badge" style="background: ${colorHex}"></div>
    <span class="color-label">You are <strong>${displayName}</strong></span>
  `;

  colorIndicator.style.display = 'flex';

  // Add class for animation
  colorIndicator.classList.remove('fade-in');
  void colorIndicator.offsetWidth; // Force reflow
  colorIndicator.classList.add('fade-in');
}

export function hidePlayerColor() {
  if (colorIndicator) {
    colorIndicator.style.display = 'none';
  }
}
