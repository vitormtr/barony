// Módulo para menu de ações da fase de batalha (contextual por hexágono)
import { socket, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { showError, showSuccess, showWarning, showInfo } from "./notifications.js";
import { isMyTurn } from "./turnIndicator.js";
import { getCurrentPhase } from "./pieceMenu.js";

let contextMenuElement = null;
let actionState = {
  movementsLeft: 0,
  selectedKnights: [],
  currentAction: null
};

const ACTIONS = {
  recruitment: {
    name: 'Recrutamento',
    icon: '⚔️',
    description: 'Adicionar cavaleiros'
  },
  movement: {
    name: 'Movimento',
    icon: '🏃',
    description: 'Mover cavaleiro'
  },
  construction: {
    name: 'Construção',
    icon: '🏗️',
    description: 'Construir estrutura'
  },
  newCity: {
    name: 'Nova Cidade',
    icon: '🏰',
    description: 'Transformar em cidade'
  },
  expedition: {
    name: 'Expedição',
    icon: '🧭',
    description: 'Colocar cavaleiro'
  },
  nobleTitle: {
    name: 'Título Nobre',
    icon: '👑',
    description: 'Subir de título'
  }
};

// Inicializa a fase de batalha - adiciona handler de clique nos hexágonos
export function initBattlePhase() {
  showInfo('Fase de batalha! Clique em um hexágono para ver ações disponíveis.');
  addHexClickHandler();
}

// Determina quais ações estão disponíveis para um hexágono
function getAvailableActions(hexData) {
  const actions = [];
  const pieces = hexData.pieces || [];

  const hasPlayerCity = pieces.some(p => p.type === 'city' && p.color === player?.color);
  const hasPlayerKnight = pieces.some(p => p.type === 'knight' && p.color === player?.color);
  const hasPlayerVillage = pieces.some(p => p.type === 'village' && p.color === player?.color);
  const isEmpty = pieces.length === 0;
  const hasTexture = hexData.texture && hexData.texture !== 'water.png';

  // Recrutamento: se tem cidade do jogador
  if (hasPlayerCity) {
    actions.push('recruitment');
  }

  // Movimento: se tem cavaleiro do jogador
  if (hasPlayerKnight) {
    actions.push('movement');
  }

  // Construção: se tem cavaleiro do jogador (pode construir vila ou fortaleza)
  if (hasPlayerKnight) {
    actions.push('construction');
  }

  // Nova Cidade: se tem vila do jogador
  if (hasPlayerVillage) {
    actions.push('newCity');
  }

  // Expedição: se é borda vazia com textura
  if (isEmpty && hasTexture && isBorderHex(hexData.row, hexData.col)) {
    // Verifica se jogador tem cavaleiros suficientes na reserva
    if (player?.pieces?.knight >= 2) {
      actions.push('expedition');
    }
  }

  // Título Nobre: sempre disponível se tiver recursos (mostra em qualquer hex)
  const totalResources = calculateTotalResources();
  if (totalResources >= 15) {
    actions.push('nobleTitle');
  }

  return actions;
}

// Mostra o menu contextual no hexágono clicado
function showContextMenu(hex, hexData) {
  hideContextMenu();

  const availableActions = getAvailableActions(hexData);

  if (availableActions.length === 0) {
    showWarning('Nenhuma ação disponível neste hexágono');
    return;
  }

  contextMenuElement = document.createElement('div');
  contextMenuElement.className = 'hex-context-menu';

  let menuHTML = '';
  availableActions.forEach(actionKey => {
    const action = ACTIONS[actionKey];
    menuHTML += `
      <button class="context-action-btn" data-action="${actionKey}" title="${action.description}">
        <span class="action-icon">${action.icon}</span>
        <span class="action-name">${action.name}</span>
      </button>
    `;
  });

  contextMenuElement.innerHTML = menuHTML;

  // Posiciona o menu perto do hexágono
  const rect = hex.getBoundingClientRect();
  contextMenuElement.style.left = `${rect.left + rect.width / 2}px`;
  contextMenuElement.style.top = `${rect.top - 10}px`;

  document.body.appendChild(contextMenuElement);

  // Event listeners para cada ação
  contextMenuElement.querySelectorAll('.context-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      executeAction(action, hex, hexData);
    });
  });

  // Fecha ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 100);
}

function hideContextMenu() {
  if (contextMenuElement) {
    contextMenuElement.remove();
    contextMenuElement = null;
  }
  document.removeEventListener('click', handleClickOutside);
}

function handleClickOutside(e) {
  if (contextMenuElement && !contextMenuElement.contains(e.target)) {
    hideContextMenu();
  }
}

// Executa a ação selecionada
function executeAction(action, hex, hexData) {
  hideContextMenu();
  actionState.currentAction = action;

  switch (action) {
    case 'recruitment':
      executeRecruitment(hexData);
      break;
    case 'movement':
      startMovement(hex, hexData);
      break;
    case 'construction':
      showConstructionOptions(hex, hexData);
      break;
    case 'newCity':
      executeNewCity(hexData);
      break;
    case 'expedition':
      executeExpedition(hexData);
      break;
    case 'nobleTitle':
      showNobleTitleConfirmation();
      break;
  }
}

// ========== RECRUTAMENTO ==========
function executeRecruitment(hexData) {
  socket.emit('battleAction', {
    action: 'recruitment',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', handleActionResult);
}

// ========== MOVIMENTO ==========
function startMovement(hex, hexData) {
  actionState.movementsLeft = 2;
  actionState.selectedKnights = [{ row: hexData.row, col: hexData.col }];

  // Destaca o hexágono selecionado
  hex.classList.add('action-selected');

  // Destaca hexágonos adjacentes válidos
  highlightAdjacentHexes(hexData.row, hexData.col);

  showInfo('Selecione o destino (2 movimentos disponíveis)');
  showEndActionButton();

  // Handler especial para movimento
  removeHexClickHandler();
  addMovementClickHandler();
}

function addMovementClickHandler() {
  document.addEventListener('click', handleMovementClick);
}

function removeMovementClickHandler() {
  document.removeEventListener('click', handleMovementClick);
}

function handleMovementClick(e) {
  const hex = e.target.closest('.hexagon');
  if (!hex) return;

  e.stopPropagation();
  const hexData = JSON.parse(hex.dataset.hex);

  // Se clicou em um destino válido
  if (hex.classList.contains('action-target')) {
    const from = actionState.selectedKnights[0];
    socket.emit('battleAction', {
      action: 'movement',
      from: { row: from.row, col: from.col },
      to: { row: hexData.row, col: hexData.col }
    });

    socket.once('battleActionResult', (result) => {
      if (result.success) {
        actionState.movementsLeft--;
        resetActionState();

        if (actionState.movementsLeft > 0) {
          showInfo(`Movimento realizado! ${actionState.movementsLeft} movimento(s) restante(s). Clique em outro cavaleiro ou "Encerrar Ação"`);
          // Volta para o modo de seleção normal
          removeMovementClickHandler();
          addHexClickHandler();
        } else {
          showSuccess('Movimentos concluídos!');
          removeEndActionButton();
          removeMovementClickHandler();
          addHexClickHandler();
          endTurn();
        }
      } else {
        showError(result.message);
      }
      emitRequestPlayerData();
    });
    return;
  }

  // Se clicou em outro cavaleiro próprio, seleciona ele
  if (hexData.pieces) {
    const hasPlayerKnight = hexData.pieces.some(p =>
      p.type === 'knight' && p.color === player?.color
    );
    if (hasPlayerKnight) {
      resetActionState();
      actionState.selectedKnights = [{ row: hexData.row, col: hexData.col }];
      hex.classList.add('action-selected');
      highlightAdjacentHexes(hexData.row, hexData.col);
      showInfo('Selecione o destino');
    }
  }
}

function highlightAdjacentHexes(row, col) {
  // Remove destaques anteriores
  document.querySelectorAll('.hexagon').forEach(h => {
    h.classList.remove('action-target');
  });

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
function executeNewCity(hexData) {
  socket.emit('battleAction', {
    action: 'newCity',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', handleActionResult);
}

// ========== EXPEDIÇÃO ==========
function executeExpedition(hexData) {
  socket.emit('battleAction', {
    action: 'expedition',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', handleActionResult);
}

// ========== TÍTULO NOBRE ==========
function showNobleTitleConfirmation() {
  const totalResources = calculateTotalResources();

  const menu = document.createElement('div');
  menu.className = 'noble-title-menu modal-overlay';
  menu.innerHTML = `
    <div class="modal-content">
      <h3>👑 Título Nobre</h3>
      <p>Você tem <strong>${totalResources}</strong> recursos.</p>
      <p>Deseja gastar 15 recursos para subir de título?</p>
      <p class="current-title">Título atual: <strong>${player?.titleName || 'Barão'}</strong></p>
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
  });
}

// ========== UTILITÁRIOS ==========
function calculateTotalResources() {
  if (!player || !player.resources) return 0;
  return Object.values(player.resources).reduce((sum, val) => sum + val, 0);
}

function isBorderHex(row, col) {
  const directions = row % 2 === 1
    ? [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
    : [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]];

  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    const neighbor = document.querySelector(`.hexagon[data-row="${newRow}"][data-col="${newCol}"]`);
    if (!neighbor) return true;
    const neighborData = JSON.parse(neighbor.dataset.hex);
    if (!neighborData.texture) return true;
  }
  return false;
}

function handleActionResult(result) {
  resetActionState();

  if (result.success) {
    showSuccess(result.message || 'Ação realizada!');
    emitRequestPlayerData();
    endTurn();
  } else {
    showError(result.message || 'Falha na ação');
  }
}

function endTurn() {
  socket.emit('endTurn');
}

function resetActionState() {
  actionState = {
    movementsLeft: actionState.movementsLeft, // Preserva para movimento
    selectedKnights: [],
    currentAction: null
  };
  // Remove highlights
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.classList.remove('action-highlight', 'action-selected', 'action-target');
  });
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
    removeEndActionButton();
    resetActionState();
    removeMovementClickHandler();
    addHexClickHandler();
    endTurn();
  };
}

function removeEndActionButton() {
  const btn = document.getElementById('end-action-btn');
  if (btn) btn.remove();
}

// Handler principal de clique nos hexágonos
function handleHexClick(e) {
  if (getCurrentPhase() !== 'battle') return;
  if (!isMyTurn()) {
    showWarning('Não é seu turno!');
    return;
  }

  const hex = e.target.closest('.hexagon');
  if (!hex) return;

  e.stopPropagation();

  const hexData = JSON.parse(hex.dataset.hex);
  showContextMenu(hex, hexData);
}

function addHexClickHandler() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.removeEventListener('click', handleHexClick);
    hex.addEventListener('click', handleHexClick);
  });
}

function removeHexClickHandler() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.removeEventListener('click', handleHexClick);
  });
}

// Chamado quando o turno muda
export function onTurnChanged() {
  hideContextMenu();
  resetActionState();
  removeMovementClickHandler();
  removeEndActionButton();

  if (getCurrentPhase() === 'battle' && isMyTurn()) {
    setTimeout(() => {
      showInfo('Seu turno! Clique em um hexágono para ver ações disponíveis.');
      addHexClickHandler();
    }, 500);
  }
}

// Exporta para compatibilidade
export function hideActionMenu() {
  hideContextMenu();
  resetActionState();
  removeMovementClickHandler();
  removeEndActionButton();
  removeHexClickHandler();
}

export function showActionMenu() {
  // Não usado mais - mantido para compatibilidade
}

export function getSelectedAction() {
  return actionState.currentAction;
}
