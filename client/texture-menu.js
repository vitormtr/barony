import { socket, emitUpdatePlayerTexture, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { CONFIG } from "./config.js";
import { showError, showSuccess, showWarning } from "./notifications.js";
import { isMyTurn } from "./turnIndicator.js";
import { getCurrentPhase } from "./pieceMenu.js";

let isProcessing = false;
let textureMenuEnabled = true;

export async function showTextureMenu(hex) {
  // Don't show texture menu if disabled or in another phase
  if (!textureMenuEnabled || getCurrentPhase() !== 'waiting') {
    return;
  }

  const menu = getOrCreateTextureMenu();

  await emitRequestPlayerData();

  if (menu.dataset.lastHex !== `${hex.dataset.row}-${hex.dataset.col}`) {
    menu.innerHTML = '';
    Object.keys(CONFIG.TEXTURES).forEach(texture => {
      const option = createTextureOption(texture, hex);
      menu.appendChild(option);
    });
    menu.dataset.lastHex = `${hex.dataset.row}-${hex.dataset.col}`;
  }

  updateAllOptionCounts();
  menu.style.display = 'flex';
}

// Unified function to update option count and state
function updateOptionState(option, textureName) {
  const textureKey = textureName.replace('.png', '');
  const count = player?.hexCount?.[textureKey] || 0;

  // Update count label
  let label = option.querySelector('.hex-count');
  if (!label) {
    label = document.createElement('span');
    label.classList.add('hex-count');
    option.appendChild(label);
  }
  label.textContent = count;

  // Disable if no more of this texture
  if (count <= 0) {
    option.classList.add('disabled');
  } else {
    option.classList.remove('disabled');
  }
}

function updateAllOptionCounts() {
  const options = document.querySelectorAll('.texture-option');
  options.forEach(option => {
    const textureName = option.dataset.texture;
    if (textureName) {
      updateOptionState(option, textureName);
    }
  });
}

function getOrCreateTextureMenu() {
  let menu = document.getElementById('textureMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'textureMenu';
    document.body.appendChild(menu);
  }
  return menu;
}

function createTextureOption(textureFile, hex) {
  const container = document.createElement('div');
  container.classList.add('texture-option');
  container.style.backgroundImage = `url(/images/${textureFile})`;
  container.dataset.texture = textureFile;

  container.onclick = createTextureClickHandler(hex, textureFile);

  return container;
}

function createTextureClickHandler(hex, texture) {
  return () => {
    // Check if processing a request
    if (isProcessing) {
      showWarning('Wait for previous action to be processed...');
      return;
    }

    // Check if texture is disabled
    const textureKey = texture.replace('.png', '');
    if ((player?.hexCount?.[textureKey] || 0) <= 0) {
      showError('You have no more of this texture!');
      return;
    }

    // Local validation (before sending to server)
    if (!validateTexturePlacement(hex)) return;

    requestTexturePlacement(hex, texture);
  };
}

// Simplified function to update labels (uses updateOptionState internally)
export function updateCountLabel(playerData) {
  updateAllOptionCounts();
}

function validateTexturePlacement(hex) {
  // Check if it's player's turn
  if (!isMyTurn()) {
    showWarning('Not your turn!');
    return false;
  }

  if (getHexTexture(hex) !== null) {
    showError('This hex already has a texture!');
    return false;
  }

  if (hasAnyTexturedHex() && !isAdjacentToTexturedHex(hex)) {
    showError('Texture must be adjacent to an existing texture!');
    return false;
  }

  return true;
}

function requestTexturePlacement(hex, texture) {
  const payload = {
    row: parseInt(hex.dataset.row),
    col: parseInt(hex.dataset.col),
    texture
  };

  // Activate loading state
  isProcessing = true;
  showLoadingOverlay(true);

  socket.emit('applyTextureToBoard', payload);
  socket.once('textureApplied', (result) => {
    // Deactivate loading state
    isProcessing = false;
    showLoadingOverlay(false);

    handleTextureApplication(result, texture);
    emitRequestPlayerData();
    updateAllOptionCounts();
  });

  // Safety timeout
  setTimeout(() => {
    if (isProcessing) {
      isProcessing = false;
      showLoadingOverlay(false);
      showError('Timeout. Try again.');
    }
  }, 5000);
}

function handleTextureApplication(result, textureUsed) {
  if (result.success) {
    emitUpdatePlayerTexture(textureUsed);
    hideTextureMenu();
    showSuccess('Texture applied!');
  } else {
    // Show server error message
    showError(result.message || 'Failed to apply texture.');
  }
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

function hasAnyTexturedHex() {
  return Array.from(document.querySelectorAll('.hexagon'))
    .some(hex => getHexTexture(hex) !== null);
}

function isAdjacentToTexturedHex(hex) {
  const row = parseInt(hex.dataset.row);
  const col = parseInt(hex.dataset.col);
  const directions = getDirections(row);

  return directions.some(([dRow, dCol]) => {
    const neighbor = findNeighborHex(row + dRow, col + dCol);
    return neighbor && getHexTexture(neighbor) !== null;
  });
}

function getDirections(row) {
  return row % 2 === 1 ? CONFIG.DIRECTION_MAP.ODD : CONFIG.DIRECTION_MAP.EVEN;
}

function findNeighborHex(row, col) {
  return document.querySelector(
    `.hexagon[data-row="${row}"][data-col="${col}"]`
  );
}

function getHexTexture(hexElement) {
  return JSON.parse(hexElement.dataset.hex).texture;
}

export function addClickEventToHexagons() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.addEventListener('click', handleHexClick);
  });
}

function handleHexClick(event) {
  document.querySelectorAll('.hexagon').forEach(h => 
    h.classList.remove('selected'));
  
  this.classList.add('selected');
  event.stopPropagation();
  showTextureMenu(this);
}

export function closeMenuOnClickOutside() {
  document.addEventListener('click', handleDocumentClick);
}

function handleDocumentClick(event) {
  const menu = document.getElementById('textureMenu');
  if (menu && !menu.contains(event.target) && !event.target.classList.contains('hexagon')) {
    hideTextureMenu();
  }
}

function hideTextureMenu() {
  const menu = document.getElementById('textureMenu');
  menu && (menu.style.display = 'none');
}

// Disable texture menu (used when construction phase ends)
export function disableTextureMenu() {
  textureMenuEnabled = false;
  hideTextureMenu();

  // Remove hex selection
  document.querySelectorAll('.hexagon').forEach(h => h.classList.remove('selected'));
}

// Re-enable texture menu (used when game restarts)
export function enableTextureMenu() {
  textureMenuEnabled = true;
}

// Show board completion transition
export function showBoardCompleteTransition(callback) {
  const overlay = document.createElement('div');
  overlay.id = 'phase-transition-overlay';
  overlay.className = 'phase-transition-overlay';
  overlay.innerHTML = `
    <div class="phase-transition-content">
      <div class="phase-transition-icon">🏰</div>
      <h2 class="phase-transition-title">Board Built!</h2>
      <p class="phase-transition-subtitle">Get ready to place your cities and knights</p>
      <div class="phase-transition-progress"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Entry animation
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // Remove after 3 seconds
  setTimeout(() => {
    overlay.classList.remove('visible');
    overlay.classList.add('hiding');

    setTimeout(() => {
      overlay.remove();
      if (callback) callback();
    }, 500);
  }, 3000);
}
