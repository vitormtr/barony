// Module for piece selection menu (initial placement phase)
import { socket, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { showError, showSuccess, showWarning, showInfo } from "./notifications.js";
import { isMyTurn, getLocalPlayerId } from "./turnIndicator.js";

let currentPhase = 'waiting';
let citiesRemaining = 3;
let isProcessing = false;
let pieceMenuElement = null;
let phaseIndicatorElement = null;

export function setPhase(phase) {
  currentPhase = phase;
  updatePhaseIndicator();
}

export function setPlacementStep(step) {
  // Kept for compatibility, but no longer used
  updatePhaseIndicator();
}

export function setCitiesRemaining(count) {
  citiesRemaining = count;
  updatePhaseIndicator();
}

export function setCityPosition(pos) {
  // Kept for compatibility, but no longer used
}

export function getCurrentPhase() {
  return currentPhase;
}

// Phase indicator removed - no longer showing placement messages
function updatePhaseIndicator() {
  // Remove existing indicator if present
  if (phaseIndicatorElement) {
    phaseIndicatorElement.remove();
    phaseIndicatorElement = null;
  }
}

// Show piece menu when clicking a hex
export function showPieceMenu(hex) {
  if (currentPhase !== 'initialPlacement') {
    return;
  }

  // Check if it's player's turn
  if (!isMyTurn()) {
    showWarning('Not your turn!');
    return;
  }

  const hexData = JSON.parse(hex.dataset.hex);

  // Check if hex has texture
  if (!hexData.texture) {
    showWarning('Select a hex with texture!');
    return;
  }

  // Check if hex is already occupied
  if (hexData.pieces && hexData.pieces.length > 0) {
    showWarning('This hex is already occupied!');
    return;
  }

  // Terrain validation for city (only plain and field)
  const validCityTerrains = ['plain.png', 'farm.png'];
  if (!validCityTerrains.includes(hexData.texture)) {
    showError('Cities can only be placed on plain or field!');
    return;
  }

  // Show confirmation menu
  showPieceConfirmation(hex);
}

// Show confirmation dialog to place city
function showPieceConfirmation(hex) {
  if (pieceMenuElement) {
    pieceMenuElement.remove();
  }

  const cityCount = player?.pieces?.city || 0;
  const knightCount = player?.pieces?.knight || 0;

  pieceMenuElement = document.createElement('div');
  pieceMenuElement.id = 'piece-menu';
  pieceMenuElement.className = 'piece-menu';
  pieceMenuElement.innerHTML = `
    <div class="piece-menu-content">
      <div class="piece-icon city"></div>
      <div class="piece-name">City + Knight</div>
      <div class="piece-count">Cities: ${cityCount} | Knights: ${knightCount}</div>
      <button id="confirmPieceBtn" class="piece-btn confirm">Confirm</button>
      <button id="cancelPieceBtn" class="piece-btn cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(pieceMenuElement);

  // Position near hex
  const rect = hex.getBoundingClientRect();
  pieceMenuElement.style.left = `${rect.left + rect.width / 2}px`;
  pieceMenuElement.style.top = `${rect.top - 10}px`;

  // Event listeners
  document.getElementById('confirmPieceBtn').addEventListener('click', () => {
    placePiece(hex);
  });

  document.getElementById('cancelPieceBtn').addEventListener('click', () => {
    hidePieceMenu();
  });

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', handleClickOutsidePieceMenu);
  }, 100);
}

function handleClickOutsidePieceMenu(event) {
  if (pieceMenuElement && !pieceMenuElement.contains(event.target)) {
    hidePieceMenu();
  }
}

function hidePieceMenu() {
  if (pieceMenuElement) {
    pieceMenuElement.remove();
    pieceMenuElement = null;
  }
  document.removeEventListener('click', handleClickOutsidePieceMenu);
}

// Send request to place city (knight is automatic)
function placePiece(hex) {
  if (isProcessing) {
    showWarning('Wait for previous action to be processed...');
    return;
  }

  const payload = {
    row: parseInt(hex.dataset.row),
    col: parseInt(hex.dataset.col)
  };

  isProcessing = true;
  showLoadingOverlay(true);

  console.log('Enviando placePiece:', payload);
  socket.emit('placePiece', payload);

  const resultHandler = (result) => {
    console.log('Recebido placePieceResult:', result);
    isProcessing = false;
    showLoadingOverlay(false);
    hidePieceMenu();

    if (result && result.success) {
      showSuccess('City + Knight placed!');
      emitRequestPlayerData();
    } else {
      showError(result?.message || 'Failed to place city.');
    }
  };

  socket.once('placePieceResult', resultHandler);

  // Safety timeout (increased to 10 seconds)
  setTimeout(() => {
    if (isProcessing) {
      console.log('Timeout reached - removing listener');
      socket.off('placePieceResult', resultHandler);
      isProcessing = false;
      showLoadingOverlay(false);
      showError('Timeout. Try again.');
    }
  }, 10000);
}

function showLoadingOverlay(show) {
  let overlay = document.getElementById('loading-overlay');

  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  } else {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

// Reset state when game restarts
export function resetPlacementState() {
  currentPhase = 'waiting';
  citiesRemaining = 3;
  isProcessing = false;
  hidePieceMenu();
  updatePhaseIndicator();
}

// Add click handler on hexes for placement phase
export function addPieceClickHandler() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.addEventListener('click', handleHexClickForPiece);
  });
}

function handleHexClickForPiece(event) {
  if (currentPhase === 'initialPlacement') {
    event.stopPropagation();
    showPieceMenu(this);
  }
}
