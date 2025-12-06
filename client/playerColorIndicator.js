// Module for displaying player color

const COLOR_NAMES = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow'
};

const COLOR_HEX = {
  red: '#c62828',
  blue: '#1565c0',
  green: '#2e7d32',
  yellow: '#f9a825'
};

let colorIndicator = null;

export function showPlayerColor(color) {
  if (!colorIndicator) {
    colorIndicator = document.createElement('div');
    colorIndicator.id = 'player-color-indicator';
    document.body.appendChild(colorIndicator);
  }

  const colorName = COLOR_NAMES[color] || color;
  const colorHex = COLOR_HEX[color] || '#888';

  colorIndicator.innerHTML = `
    <div class="color-badge" style="background: ${colorHex}"></div>
    <span class="color-label">You are the <strong>${colorName}</strong> player</span>
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
