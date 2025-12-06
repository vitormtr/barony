// Módulo para gerenciar indicador de turno
import { showInfo } from './notifications.js';

let turnIndicator = null;
let currentTurnPlayerId = null;
let localPlayerId = null;

const COLOR_NAMES = {
  red: 'Vermelho',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo'
};

function getOrCreateTurnIndicator() {
  if (!turnIndicator) {
    turnIndicator = document.createElement('div');
    turnIndicator.id = 'turn-indicator';
    document.body.appendChild(turnIndicator);
  }
  return turnIndicator;
}

// Chamado quando o jogador local é definido
export function setLocalPlayer(playerId) {
  localPlayerId = playerId;
}

export function updateTurnIndicator(turnData) {
  const { currentPlayerId, currentPlayerColor } = turnData;
  currentTurnPlayerId = currentPlayerId;

  const indicator = getOrCreateTurnIndicator();
  const isYourTurn = localPlayerId && localPlayerId === currentPlayerId;

  // Remove classes antigas
  indicator.classList.remove('red', 'blue', 'green', 'yellow', 'your-turn');

  // Adiciona classe da cor atual
  indicator.classList.add(currentPlayerColor);

  if (isYourTurn) {
    indicator.classList.add('your-turn');
    indicator.textContent = '🎯 Seu turno!';
    showInfo('É a sua vez de jogar!');
  } else {
    indicator.textContent = `Vez do jogador ${COLOR_NAMES[currentPlayerColor] || currentPlayerColor}`;
  }

  // Atualiza destaque na HUD
  updatePlayerHighlight(currentPlayerId);
}

function updatePlayerHighlight(currentPlayerId) {
  // Remove destaque de todos os jogadores
  document.querySelectorAll('.player').forEach(playerEl => {
    playerEl.classList.remove('current-turn');
  });

  // Adiciona destaque ao jogador atual
  const playerElements = document.querySelectorAll('.player');
  playerElements.forEach(playerEl => {
    const playerId = playerEl.dataset.playerId;
    if (playerId === currentPlayerId) {
      playerEl.classList.add('current-turn');
    }
  });
}

export function isMyTurn() {
  return localPlayerId && localPlayerId === currentTurnPlayerId;
}

export function getCurrentTurnPlayerId() {
  return currentTurnPlayerId;
}

export function hideTurnIndicator() {
  if (turnIndicator) {
    turnIndicator.style.display = 'none';
  }
}

export function showTurnIndicator() {
  if (turnIndicator) {
    turnIndicator.style.display = 'block';
  }
}
