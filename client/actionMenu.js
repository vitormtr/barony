// Módulo para menu de ações da fase de batalha
import { socket, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { showError, showSuccess, showWarning, showInfo } from "./notifications.js";
import { isMyTurn } from "./turnIndicator.js";
import { getCurrentPhase } from "./pieceMenu.js";

let actionMenuElement = null;
let selectedAction = null;
let actionState = {
  movementsLeft: 0,
  selectedKnights: [],
  targetHex: null
};

const ACTIONS = {
  recruitment: {
    name: 'Recrutamento',
    icon: '⚔️',
    description: 'Adicione 2 cavaleiros em uma cidade (3 se adjacente a lago)'
  },
  movement: {
    name: 'Movimento',
    icon: '🏃',
    description: 'Mova 1 ou 2 cavaleiros um espaço cada'
  },
  construction: {
    name: 'Construção',
    icon: '🏗️',
    description: 'Substitua cavaleiros por vilas ou fortalezas'
  },
  newCity: {
    name: 'Nova Cidade',
    icon: '🏰',
    description: 'Substitua uma vila por uma cidade (+10 pontos)'
  },
  expedition: {
    name: 'Expedição',
    icon: '🧭',
    description: 'Coloque um cavaleiro na borda do tabuleiro'
  },
  nobleTitle: {
    name: 'Título Nobre',
    icon: '👑',
    description: 'Gaste 15+ recursos para subir de título'
  }
};

// Cria o menu de ações
export function showActionMenu() {
  if (getCurrentPhase() !== 'battle') return;

  if (!isMyTurn()) {
    return;
  }

  if (actionMenuElement) {
    actionMenuElement.remove();
  }

  actionMenuElement = document.createElement('div');
  actionMenuElement.id = 'action-menu';
  actionMenuElement.className = 'action-menu';

  let actionsHTML = '<div class="action-menu-title">Escolha uma ação</div><div class="action-buttons">';

  for (const [key, action] of Object.entries(ACTIONS)) {
    actionsHTML += `
      <button class="action-btn" data-action="${key}" title="${action.description}">
        <span class="action-icon">${action.icon}</span>
        <span class="action-name">${action.name}</span>
      </button>
    `;
  }

  actionsHTML += '</div>';
  actionMenuElement.innerHTML = actionsHTML;

  document.body.appendChild(actionMenuElement);

  // Event listeners
  actionMenuElement.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      selectAction(action);
    });
  });
}

export function hideActionMenu() {
  if (actionMenuElement) {
    actionMenuElement.remove();
    actionMenuElement = null;
  }
  selectedAction = null;
  resetActionState();
}

function resetActionState() {
  actionState = {
    movementsLeft: 0,
    selectedKnights: [],
    targetHex: null
  };
  // Remove highlights
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.classList.remove('action-highlight', 'action-selected', 'action-target');
  });
}

function selectAction(action) {
  selectedAction = action;
  hideActionMenu();

  switch (action) {
    case 'recruitment':
      startRecruitment();
      break;
    case 'movement':
      startMovement();
      break;
    case 'construction':
      startConstruction();
      break;
    case 'newCity':
      startNewCity();
      break;
    case 'expedition':
      startExpedition();
      break;
    case 'nobleTitle':
      startNobleTitle();
      break;
  }
}

// ========== RECRUTAMENTO ==========
function startRecruitment() {
  showInfo('Selecione uma cidade para recrutar cavaleiros');
  highlightPlayerCities();
  addHexClickHandler(handleRecruitmentClick);
}

function handleRecruitmentClick(hex) {
  const hexData = JSON.parse(hex.dataset.hex);

  socket.emit('battleAction', {
    action: 'recruitment',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', handleActionResult);
}

function highlightPlayerCities() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    const hexData = JSON.parse(hex.dataset.hex);
    if (hexData.pieces) {
      const hasPlayerCity = hexData.pieces.some(p =>
        p.type === 'city' && p.color === player?.color
      );
      if (hasPlayerCity) {
        hex.classList.add('action-highlight');
      }
    }
  });
}

// ========== MOVIMENTO ==========
function startMovement() {
  actionState.movementsLeft = 2;
  showInfo('Selecione um cavaleiro para mover (2 movimentos disponíveis)');
  highlightPlayerKnights();
  addHexClickHandler(handleMovementClick);
}

function handleMovementClick(hex) {
  const hexData = JSON.parse(hex.dataset.hex);

  // Se já selecionou um cavaleiro, este é o destino
  if (actionState.selectedKnights.length > 0 && hex.classList.contains('action-target')) {
    const from = actionState.selectedKnights[0];
    socket.emit('battleAction', {
      action: 'movement',
      from: { row: from.row, col: from.col },
      to: { row: hexData.row, col: hexData.col }
    });

    socket.once('battleActionResult', (result) => {
      if (result.success) {
        actionState.movementsLeft--;
        actionState.selectedKnights = [];
        resetActionState();

        if (actionState.movementsLeft > 0) {
          showInfo(`Movimento realizado! ${actionState.movementsLeft} movimento(s) restante(s). Selecione outro cavaleiro ou clique em "Encerrar"`);
          highlightPlayerKnights();
          showEndActionButton();
        } else {
          showSuccess('Movimentos concluídos!');
          endTurn();
        }
      } else {
        showError(result.message);
      }
      emitRequestPlayerData();
    });
    return;
  }

  // Seleciona o cavaleiro
  if (hexData.pieces) {
    const hasPlayerKnight = hexData.pieces.some(p =>
      p.type === 'knight' && p.color === player?.color
    );
    if (hasPlayerKnight) {
      actionState.selectedKnights = [{ row: hexData.row, col: hexData.col }];
      resetActionState();
      hex.classList.add('action-selected');
      highlightAdjacentHexes(hexData.row, hexData.col);
      showInfo('Selecione o destino');
    }
  }
}

function highlightPlayerKnights() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    const hexData = JSON.parse(hex.dataset.hex);
    if (hexData.pieces) {
      const hasPlayerKnight = hexData.pieces.some(p =>
        p.type === 'knight' && p.color === player?.color
      );
      if (hasPlayerKnight) {
        hex.classList.add('action-highlight');
      }
    }
  });
}

function highlightAdjacentHexes(row, col) {
  const directions = row % 2 === 1
    ? [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
    : [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]];

  directions.forEach(([dRow, dCol]) => {
    const newRow = row + dRow;
    const newCol = col + dCol;
    const neighbor = document.querySelector(`.hexagon[data-row="${newRow}"][data-col="${newCol}"]`);
    if (neighbor) {
      const neighborData = JSON.parse(neighbor.dataset.hex);
      // Pode mover para hex com textura (exceto água)
      if (neighborData.texture && neighborData.texture !== 'water.png') {
        neighbor.classList.add('action-target');
      }
    }
  });
}

// ========== CONSTRUÇÃO ==========
function startConstruction() {
  showInfo('Selecione um cavaleiro para construir uma estrutura');
  highlightPlayerKnights();
  addHexClickHandler(handleConstructionClick);
}

function handleConstructionClick(hex) {
  const hexData = JSON.parse(hex.dataset.hex);

  if (!hexData.pieces) return;

  const hasPlayerKnight = hexData.pieces.some(p =>
    p.type === 'knight' && p.color === player?.color
  );

  if (!hasPlayerKnight) {
    showWarning('Selecione um hexágono com seu cavaleiro');
    return;
  }

  // Mostra opções de construção
  showConstructionOptions(hex, hexData);
}

function showConstructionOptions(hex, hexData) {
  const menu = document.createElement('div');
  menu.className = 'construction-menu';
  menu.innerHTML = `
    <div class="construction-title">Construir:</div>
    <button class="construction-btn" data-type="village">🏠 Vila</button>
    <button class="construction-btn" data-type="stronghold">🏯 Fortaleza</button>
    <button class="construction-btn cancel">Cancelar</button>
  `;

  const rect = hex.getBoundingClientRect();
  menu.style.left = `${rect.left + rect.width / 2}px`;
  menu.style.top = `${rect.top - 10}px`;

  document.body.appendChild(menu);

  menu.querySelectorAll('.construction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      menu.remove();
      if (btn.classList.contains('cancel')) {
        resetActionState();
        showActionMenu();
        return;
      }

      const buildType = btn.dataset.type;
      socket.emit('battleAction', {
        action: 'construction',
        row: hexData.row,
        col: hexData.col,
        buildType
      });

      socket.once('battleActionResult', handleActionResult);
    });
  });
}

// ========== NOVA CIDADE ==========
function startNewCity() {
  showInfo('Selecione uma vila para transformar em cidade');
  highlightPlayerVillages();
  addHexClickHandler(handleNewCityClick);
}

function handleNewCityClick(hex) {
  const hexData = JSON.parse(hex.dataset.hex);

  socket.emit('battleAction', {
    action: 'newCity',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', handleActionResult);
}

function highlightPlayerVillages() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    const hexData = JSON.parse(hex.dataset.hex);
    if (hexData.pieces) {
      const hasPlayerVillage = hexData.pieces.some(p =>
        p.type === 'village' && p.color === player?.color
      );
      if (hasPlayerVillage) {
        hex.classList.add('action-highlight');
      }
    }
  });
}

// ========== EXPEDIÇÃO ==========
function startExpedition() {
  showInfo('Selecione um espaço vazio na borda do tabuleiro');
  highlightBorderHexes();
  addHexClickHandler(handleExpeditionClick);
}

function handleExpeditionClick(hex) {
  const hexData = JSON.parse(hex.dataset.hex);

  socket.emit('battleAction', {
    action: 'expedition',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', handleActionResult);
}

function highlightBorderHexes() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    const hexData = JSON.parse(hex.dataset.hex);
    // Verifica se é borda e está vazio (tem textura mas sem peças)
    if (hexData.texture && hexData.texture !== 'water.png' &&
        (!hexData.pieces || hexData.pieces.length === 0)) {
      // Verifica se é borda (lógica simplificada - hexágonos nas extremidades)
      if (isBorderHex(hexData.row, hexData.col)) {
        hex.classList.add('action-highlight');
      }
    }
  });
}

function isBorderHex(row, col) {
  // Considera borda os hexágonos que têm pelo menos um vizinho sem textura
  const directions = row % 2 === 1
    ? [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
    : [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]];

  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    const neighbor = document.querySelector(`.hexagon[data-row="${newRow}"][data-col="${newCol}"]`);
    if (!neighbor) return true; // Fora do tabuleiro = borda
    const neighborData = JSON.parse(neighbor.dataset.hex);
    if (!neighborData.texture) return true; // Vizinho sem textura = borda
  }
  return false;
}

// ========== TÍTULO NOBRE ==========
function startNobleTitle() {
  // Verifica se tem recursos suficientes
  const totalResources = calculateTotalResources();

  if (totalResources < 15) {
    showError(`Recursos insuficientes! Você tem ${totalResources}/15 necessários.`);
    showActionMenu();
    return;
  }

  showNobleTitleMenu(totalResources);
}

function calculateTotalResources() {
  if (!player || !player.resources) return 0;
  return Object.values(player.resources).reduce((sum, val) => sum + val, 0);
}

function showNobleTitleMenu(totalResources) {
  const menu = document.createElement('div');
  menu.className = 'noble-title-menu modal-overlay';
  menu.innerHTML = `
    <div class="modal-content">
      <h3>Título Nobre</h3>
      <p>Você tem ${totalResources} recursos.</p>
      <p>Deseja gastar 15 recursos para subir de título?</p>
      <p class="current-title">Título atual: ${player?.title || 'Barão'}</p>
      <div class="modal-buttons">
        <button class="modal-btn confirm">Confirmar</button>
        <button class="modal-btn cancel">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(menu);

  menu.querySelector('.confirm').addEventListener('click', () => {
    menu.remove();
    socket.emit('battleAction', { action: 'nobleTitle' });
    socket.once('battleActionResult', handleActionResult);
  });

  menu.querySelector('.cancel').addEventListener('click', () => {
    menu.remove();
    showActionMenu();
  });
}

// ========== UTILITÁRIOS ==========
function handleActionResult(result) {
  resetActionState();
  removeHexClickHandler();

  if (result.success) {
    showSuccess(result.message || 'Ação realizada!');
    emitRequestPlayerData();
    endTurn();
  } else {
    showError(result.message || 'Falha na ação');
    showActionMenu();
  }
}

function endTurn() {
  socket.emit('endTurn');
}

function showEndActionButton() {
  let btn = document.getElementById('end-action-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'end-action-btn';
    btn.className = 'end-action-btn';
    btn.textContent = 'Encerrar Ação';
    document.body.appendChild(btn);
  }

  btn.onclick = () => {
    btn.remove();
    resetActionState();
    removeHexClickHandler();
    endTurn();
  };
}

let currentHexClickHandler = null;

function addHexClickHandler(handler) {
  removeHexClickHandler();
  currentHexClickHandler = (e) => {
    const hex = e.target.closest('.hexagon');
    if (hex) {
      e.stopPropagation();
      handler(hex);
    }
  };
  document.addEventListener('click', currentHexClickHandler);
}

function removeHexClickHandler() {
  if (currentHexClickHandler) {
    document.removeEventListener('click', currentHexClickHandler);
    currentHexClickHandler = null;
  }
}

// Inicializa o menu quando a fase de batalha começa
export function initBattlePhase() {
  showActionMenu();
}

// Chamado quando o turno muda
export function onTurnChanged() {
  hideActionMenu();
  resetActionState();
  removeHexClickHandler();

  if (getCurrentPhase() === 'battle' && isMyTurn()) {
    setTimeout(() => showActionMenu(), 500);
  }
}

export function getSelectedAction() {
  return selectedAction;
}
