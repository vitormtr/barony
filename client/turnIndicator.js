// Module for turn indicator management
import { showInfo } from './notifications.js';

let turnIndicator = null;
let currentTurnPlayerId = null;
let localPlayerId = null;

function getOrCreateTurnIndicator() {
  if (!turnIndicator) {
    turnIndicator = document.createElement('div');
    turnIndicator.id = 'turn-indicator';
    document.body.appendChild(turnIndicator);
  }
  return turnIndicator;
}

// Called when local player is defined
export function setLocalPlayer(playerId) {
  localPlayerId = playerId;
}

export function updateTurnIndicator(turnData) {
  const { currentPlayerId, currentPlayerColor, currentPlayerName } = turnData;
  currentTurnPlayerId = currentPlayerId;

  const indicator = getOrCreateTurnIndicator();
  const isYourTurn = localPlayerId && localPlayerId === currentPlayerId;

  // Remove old classes
  indicator.classList.remove('red', 'blue', 'green', 'yellow', 'your-turn');

  // Add current color class
  indicator.classList.add(currentPlayerColor);

  // Use player name if available, otherwise capitalize color
  const displayName = currentPlayerName || currentPlayerColor.charAt(0).toUpperCase() + currentPlayerColor.slice(1);

  if (isYourTurn) {
    indicator.classList.add('your-turn');
    indicator.textContent = '🎯 Your turn!';
    showInfo('It\'s your turn to play!');
  } else {
    indicator.textContent = `${displayName}'s turn`;
  }

  // Update highlight in HUD
  updatePlayerHighlight(currentPlayerId);
}

function updatePlayerHighlight(currentPlayerId) {
  // Remove highlight from all players
  document.querySelectorAll('.player').forEach(playerEl => {
    playerEl.classList.remove('current-turn');
  });

  // Add highlight to current player
  const playerElements = document.querySelectorAll('.player');
  playerElements.forEach(playerEl => {
    const playerId = playerEl.dataset.playerId;
    if (playerId === currentPlayerId) {
      playerEl.classList.add('current-turn');
    }
  });
}

export function isMyTurn() {
  console.log('isMyTurn check - localPlayerId:', localPlayerId, 'currentTurnPlayerId:', currentTurnPlayerId);
  return localPlayerId && localPlayerId === currentTurnPlayerId;
}

export function getCurrentTurnPlayerId() {
  return currentTurnPlayerId;
}

export function getLocalPlayerId() {
  return localPlayerId;
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
