// Módulo para mostrar a cor do jogador

const COLOR_NAMES = {
  red: 'Vermelho',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo'
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
    <span class="color-label">Você é o jogador <strong>${colorName}</strong></span>
  `;

  colorIndicator.style.display = 'flex';

  // Adiciona classe para animação
  colorIndicator.classList.remove('fade-in');
  void colorIndicator.offsetWidth; // Force reflow
  colorIndicator.classList.add('fade-in');
}

export function hidePlayerColor() {
  if (colorIndicator) {
    colorIndicator.style.display = 'none';
  }
}
