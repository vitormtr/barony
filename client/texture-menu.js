import { socket, emitUpdatePlayerTexture, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { CONFIG } from "./config.js";
import { showError, showSuccess, showWarning } from "./notifications.js";
import { isMyTurn } from "./turnIndicator.js";

let isProcessing = false;

export async function showTextureMenu(hex) {
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

// Função unificada para atualizar contagem e estado de uma opção
function updateOptionState(option, textureName) {
  const textureKey = textureName.replace('.png', '');
  const count = player?.hexCount?.[textureKey] || 0;

  // Atualiza label de contagem
  let label = option.querySelector('.hex-count');
  if (!label) {
    label = document.createElement('span');
    label.classList.add('hex-count');
    option.appendChild(label);
  }
  label.textContent = count;

  // Desabilita se não tem mais dessa textura
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
    // Verifica se está processando uma requisição
    if (isProcessing) {
      showWarning('Aguarde a ação anterior ser processada...');
      return;
    }

    // Verifica se a textura está desabilitada
    const textureKey = texture.replace('.png', '');
    if ((player?.hexCount?.[textureKey] || 0) <= 0) {
      showError('Você não tem mais dessa textura!');
      return;
    }

    // Validação local (antes de enviar ao servidor)
    if (!validateTexturePlacement(hex)) return;

    requestTexturePlacement(hex, texture);
  };
}

// Função simplificada para atualizar labels (usa updateOptionState internamente)
export function updateCountLabel(playerData) {
  updateAllOptionCounts();
}

function validateTexturePlacement(hex) {
  // Verifica se é o turno do jogador
  if (!isMyTurn()) {
    showWarning('Não é seu turno!');
    return false;
  }

  if (getHexTexture(hex) !== null) {
    showError('Este hexágono já possui uma textura!');
    return false;
  }

  if (hasAnyTexturedHex() && !isAdjacentToTexturedHex(hex)) {
    showError('A textura deve ser adjacente a uma textura existente!');
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

  // Ativa loading state
  isProcessing = true;
  showLoadingOverlay(true);

  socket.emit('applyTextureToBoard', payload);
  socket.once('textureApplied', (result) => {
    // Desativa loading state
    isProcessing = false;
    showLoadingOverlay(false);

    handleTextureApplication(result, texture);
    emitRequestPlayerData();
    updateAllOptionCounts();
  });

  // Timeout de segurança
  setTimeout(() => {
    if (isProcessing) {
      isProcessing = false;
      showLoadingOverlay(false);
      showError('Tempo esgotado. Tente novamente.');
    }
  }, 5000);
}

function handleTextureApplication(result, textureUsed) {
  if (result.success) {
    emitUpdatePlayerTexture(textureUsed);
    hideTextureMenu();
    showSuccess('Textura aplicada!');
  } else {
    // Mostra mensagem de erro do servidor
    showError(result.message || 'Falha ao aplicar a textura.');
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
