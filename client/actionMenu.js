// Module for battle phase action menu (contextual by hex)
import { socket, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { showError, showSuccess, showWarning, showInfo } from "./notifications.js";
import { isMyTurn } from "./turnIndicator.js";
import { getCurrentPhase } from "./pieceMenu.js";

let contextMenuElement = null;
let actionState = {
  movementsLeft: 0,
  selectedKnights: [],
  currentAction: null,
  adjacentKnights: [],  // Adjacent knights to clicked hex
  targetHex: null,      // Destination hex for movement
  movedKnightsCount: {} // Count of knights that moved TO each position (key: "row,col")
};

const ACTIONS = {
  recruitment: {
    name: 'Recruitment',
    icon: '⚔️',
    description: 'Add knights'
  },
  movement: {
    name: 'Move',
    icon: '🐴',
    description: 'Move knight'
  },
  construction: {
    name: 'Construction',
    icon: '🔨',
    description: 'Build structure'
  },
  newCity: {
    name: 'New City',
    icon: '🏰',
    description: 'Transform into city'
  },
  expedition: {
    name: 'Expedition',
    icon: '🧭',
    description: 'Place knight'
  },
  nobleTitle: {
    name: 'Noble Title',
    icon: '👑',
    description: 'Advance title'
  }
};

// Initialize battle phase - add click handler on hexes
export function initBattlePhase() {
  showInfo('Battle phase! Click on a hex to see available actions.');
  addHexClickHandler();
}

// Check if hex is adjacent to water
function isAdjacentToWater(row, col) {
  const directions = row % 2 === 1
    ? [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
    : [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]];

  for (const [dRow, dCol] of directions) {
    const adjRow = row + dRow;
    const adjCol = col + dCol;
    const neighbor = document.querySelector(`.hexagon[data-row="${adjRow}"][data-col="${adjCol}"]`);
    if (neighbor) {
      try {
        const neighborData = JSON.parse(neighbor.dataset.hex);
        if (neighborData.texture === 'water.png') {
          return true;
        }
      } catch {
        // Invalid hex data, skip
      }
    }
  }
  return false;
}

// Find adjacent knights that can move to this hex
// Filters out knights that have already moved this turn
function getAdjacentPlayerKnights(row, col) {
  const knights = [];
  const directions = row % 2 === 1
    ? [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
    : [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]];

  directions.forEach(([dRow, dCol]) => {
    const adjRow = row + dRow;
    const adjCol = col + dCol;

    const neighbor = document.querySelector(`.hexagon[data-row="${adjRow}"][data-col="${adjCol}"]`);
    if (neighbor) {
      let neighborData;
      try {
        neighborData = JSON.parse(neighbor.dataset.hex);
      } catch {
        return; // Skip invalid hex
      }
      if (neighborData.pieces) {
        const playerKnights = neighborData.pieces.filter(p =>
          p.type === 'knight' && p.color === player?.color
        );
        if (playerKnights.length > 0) {
          // Check how many knights from this position have already moved
          const key = `${adjRow},${adjCol}`;
          const movedCount = actionState.movedKnightsCount[key] || 0;
          const availableCount = playerKnights.length - movedCount;
          if (availableCount > 0) {
            knights.push({ row: adjRow, col: adjCol, count: availableCount });
          }
        }
      }
    }
  });

  return knights;
}

// Determine which actions are available for a hex
function getAvailableActions(hexData) {
  const actions = [];
  const pieces = hexData.pieces || [];

  const hasPlayerCity = pieces.some(p => p.type === 'city' && p.color === player?.color);
  const hasPlayerKnight = pieces.some(p => p.type === 'knight' && p.color === player?.color);
  const hasPlayerVillage = pieces.some(p => p.type === 'village' && p.color === player?.color);
  const hasStructure = pieces.some(p => ['city', 'village', 'stronghold'].includes(p.type));
  const isEmpty = pieces.length === 0;
  const hasTexture = hexData.texture && hexData.texture !== 'water.png';

  // If already started moving, can only continue moving
  if (actionState.currentAction === 'movement' && actionState.movementsLeft > 0) {
    // Only show movement if there's adjacent knight
    if (hasTexture) {
      const adjacentKnights = getAdjacentPlayerKnights(hexData.row, hexData.col);
      if (adjacentKnights.length > 0) {
        actions.push('movement');
        actionState.adjacentKnights = adjacentKnights;
      }
    }
    return actions; // Return only movement, no other action
  }

  // Recruitment: if player has city
  if (hasPlayerCity) {
    actions.push('recruitment');
  }

  // Movement: if hex is valid for movement and has adjacent player knight
  // Check 2 pieces per hex limit
  if (hasTexture) {
    const playerKnightsHere = pieces.filter(p => p.type === 'knight' && p.color === player?.color).length;
    const enemyPiecesHere = pieces.filter(p => p.color !== player?.color).length;
    const allyPiecesHere = pieces.filter(p => p.color === player?.color).length;

    // Can move here if:
    // 1. Less than 2 pieces total, OR
    // 2. Exactly 1 ally knight + 1 enemy (combat will remove enemy, leaving 2 knights)
    const canMoveHere = pieces.length < 2 ||
      (playerKnightsHere === 1 && enemyPiecesHere === 1 && allyPiecesHere === 1);

    if (canMoveHere) {
      const adjacentKnights = getAdjacentPlayerKnights(hexData.row, hexData.col);
      if (adjacentKnights.length > 0) {
        actions.push('movement');
        // Store adjacent knights for later use
        actionState.adjacentKnights = adjacentKnights;
      }
    }
  }

  // Construction: if player has knight and NO structure (city/village/stronghold)
  if (hasPlayerKnight && !hasStructure) {
    actions.push('construction');
  }

  // New City: if player has village
  if (hasPlayerVillage) {
    actions.push('newCity');
  }

  // Expedition: if empty border with texture
  if (isEmpty && hasTexture && isBorderHex(hexData.row, hexData.col)) {
    // Check if player has enough knights in reserve
    if (player?.pieces?.knight >= 2) {
      actions.push('expedition');
    }
  }

  // Noble Title: always available if has resources (shows on any hex)
  const totalResources = calculateTotalResources();
  if (totalResources >= 15) {
    actions.push('nobleTitle');
  }

  return actions;
}

// Show context menu on clicked hex
function showContextMenu(hex, hexData) {
  hideAllMenus();

  const availableActions = getAvailableActions(hexData);

  if (availableActions.length === 0) {
    showWarning('No action available on this hex');
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

  // Position menu near hex
  const rect = hex.getBoundingClientRect();
  contextMenuElement.style.left = `${rect.left + rect.width / 2}px`;
  contextMenuElement.style.top = `${rect.top - 10}px`;

  document.body.appendChild(contextMenuElement);

  // Event listeners for each action
  contextMenuElement.querySelectorAll('.context-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      executeAction(action, hex, hexData);
    });
  });

  // Close on click outside
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

// Hide all action menus (context menu, recruitment, construction, knight selection, noble title)
function hideAllMenus() {
  hideContextMenu();
  // Check if there's a knight selection menu open (for movement)
  const hasKnightSelectionMenu = document.querySelector('.knight-selection-menu:not(.recruitment-menu)');

  // Remove any other menus that might be open
  document.querySelectorAll('.knight-selection-menu, .construction-menu, .noble-title-menu, .recruitment-menu').forEach(menu => {
    menu.remove();
  });

  // Reset action state if movement was started but no knight moved yet
  if (hasKnightSelectionMenu && actionState.currentAction === 'movement' && Object.keys(actionState.movedKnightsCount).length === 0) {
    resetActionState(true);
  }
}

function handleClickOutside(e) {
  if (contextMenuElement && !contextMenuElement.contains(e.target)) {
    hideContextMenu();
  }
}

// Execute selected action
function executeAction(action, hex, hexData) {
  hideContextMenu();
  actionState.currentAction = action;

  switch (action) {
    case 'recruitment':
      executeRecruitment(hexData);
      break;
    case 'movement':
      executeMovement(hex, hexData);
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

// ========== RECRUITMENT ==========
function executeRecruitment(hexData) {
  const adjacentToWater = isAdjacentToWater(hexData.row, hexData.col);
  const maxKnights = adjacentToWater ? 3 : 2;
  const availableKnights = player?.pieces?.knight || 0;
  const canRecruit = Math.min(maxKnights, availableKnights);

  if (canRecruit <= 0) {
    showError('No knights available to recruit!');
    return;
  }

  // If can only recruit 1, do it directly
  if (canRecruit === 1) {
    doRecruitment(hexData, 1);
    return;
  }

  // Show selection menu
  showRecruitmentMenu(hexData, canRecruit, adjacentToWater);
}

function showRecruitmentMenu(hexData, maxKnights, adjacentToWater) {
  hideAllMenus();
  const menu = document.createElement('div');
  menu.className = 'knight-selection-menu recruitment-menu';

  let buttonsHtml = '';
  for (let i = 1; i <= maxKnights; i++) {
    buttonsHtml += `
      <button class="knight-select-btn recruit-btn" data-count="${i}">
        <span class="recruit-count">${i}</span>
        <span class="recruit-label">knight${i > 1 ? 's' : ''}</span>
      </button>
    `;
  }

  menu.innerHTML = `
    <div class="knight-selection-title">
      How many knights to recruit?
      ${adjacentToWater ? '<span class="water-bonus">(Lake bonus: +1)</span>' : ''}
    </div>
    <div class="recruitment-buttons">
      ${buttonsHtml}
    </div>
    <button class="knight-select-btn cancel">Cancel</button>
  `;

  // Position menu near the hex
  const hex = document.querySelector(`.hexagon[data-row="${hexData.row}"][data-col="${hexData.col}"]`);
  if (hex) {
    const rect = hex.getBoundingClientRect();
    menu.style.left = `${rect.left + rect.width / 2}px`;
    menu.style.top = `${rect.top - 10}px`;
  }

  document.body.appendChild(menu);

  // Add click handlers
  menu.querySelectorAll('.recruit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count);
      menu.remove();
      doRecruitment(hexData, count);
    });
  });

  menu.querySelector('.cancel').addEventListener('click', () => {
    menu.remove();
  });
}

function doRecruitment(hexData, knightCount) {
  socket.emit('battleAction', {
    action: 'recruitment',
    row: hexData.row,
    col: hexData.col,
    knightCount: knightCount
  });

  socket.once('battleActionResult', (result) => {
    handleActionResult(result);
  });
}

// ========== MOVEMENT ==========
// New flow: player clicks destination, if there's adjacent knight, can move
function executeMovement(hex, hexData) {
  // Initialize movements if first time
  if (actionState.movementsLeft === 0) {
    actionState.movementsLeft = 2;
  }

  // Store destination
  actionState.targetHex = { row: hexData.row, col: hexData.col };

  // If only 1 adjacent knight, move directly
  if (actionState.adjacentKnights.length === 1) {
    const from = actionState.adjacentKnights[0];
    performMovement(from, actionState.targetHex);
  } else {
    // Multiple adjacent knights - show menu to choose
    showKnightSelectionMenu(hex, hexData);
  }
}

function showKnightSelectionMenu(hex, hexData) {
  hideAllMenus();
  const menu = document.createElement('div');
  menu.className = 'knight-selection-menu';

  // Get direction names for better UX
  const getDirectionName = (fromRow, fromCol, toRow, toCol) => {
    const dRow = toRow - fromRow;
    const dCol = toCol - fromCol;
    // Simplified direction naming
    if (dRow < 0 && dCol === 0) return '↑ North';
    if (dRow < 0 && dCol > 0) return '↗ Northeast';
    if (dRow > 0 && dCol > 0) return '↘ Southeast';
    if (dRow > 0 && dCol === 0) return '↓ South';
    if (dRow > 0 && dCol < 0) return '↙ Southwest';
    if (dRow < 0 && dCol < 0) return '↖ Northwest';
    if (dCol > 0) return '→ East';
    if (dCol < 0) return '← West';
    return 'Adjacent';
  };

  menu.innerHTML = `
    <div class="knight-selection-title">Move knight from:</div>
    ${actionState.adjacentKnights.map((k, i) => {
      const direction = getDirectionName(k.row, k.col, hexData.row, hexData.col);
      const knightCount = k.count > 1 ? ` (${k.count} knights)` : '';
      return `
        <button class="knight-select-btn" data-index="${i}" data-row="${k.row}" data-col="${k.col}">
          <span class="knight-direction">${direction}</span>
          <span class="knight-info">${knightCount}</span>
        </button>
      `;
    }).join('')}
    <button class="knight-select-btn cancel">Cancel</button>
  `;

  const rect = hex.getBoundingClientRect();
  menu.style.left = `${rect.left + rect.width / 2}px`;
  menu.style.top = `${rect.top - 10}px`;

  document.body.appendChild(menu);

  // Add highlight on hover
  menu.querySelectorAll('.knight-select-btn:not(.cancel)').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const row = btn.dataset.row;
      const col = btn.dataset.col;
      const sourceHex = document.querySelector(`.hexagon[data-row="${row}"][data-col="${col}"]`);
      if (sourceHex) {
        sourceHex.classList.add('knight-source-highlight');
      }
    });

    btn.addEventListener('mouseleave', () => {
      document.querySelectorAll('.knight-source-highlight').forEach(h => {
        h.classList.remove('knight-source-highlight');
      });
    });
  });

  menu.querySelectorAll('.knight-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove highlights
      document.querySelectorAll('.knight-source-highlight').forEach(h => {
        h.classList.remove('knight-source-highlight');
      });
      menu.remove();
      if (btn.classList.contains('cancel')) {
        // Reset action state if no movement was made yet
        if (Object.keys(actionState.movedKnightsCount).length === 0) {
          resetActionState(true);
        }
        return;
      }
      const index = parseInt(btn.dataset.index);
      const from = actionState.adjacentKnights[index];
      performMovement(from, actionState.targetHex);
    });
  });
}

function performMovement(from, to) {
  socket.emit('battleAction', {
    action: 'movement',
    from: { row: from.row, col: from.col },
    to: { row: to.row, col: to.col }
  });

  socket.once('battleActionResult', (result) => {
    if (result.success) {
      actionState.movementsLeft--;
      // Track that a knight moved TO this position (increment counter)
      const key = `${to.row},${to.col}`;
      actionState.movedKnightsCount[key] = (actionState.movedKnightsCount[key] || 0) + 1;
      emitRequestPlayerData();

      if (actionState.movementsLeft > 0) {
        showSuccess(`Movement done! ${actionState.movementsLeft} movement(s) remaining.`);
        showInfo('Click another hex to move or wait for turn to end.');
        showEndActionButton();
      } else {
        showSuccess('Movements complete!');
        resetActionState(true);
        removeEndActionButton();
        endTurn();
      }
    } else {
      showError(result.message);
      // Reset state if no movement was made yet
      if (Object.keys(actionState.movedKnightsCount).length === 0) {
        resetActionState(true);
      }
    }
  });
}

// ========== CONSTRUCTION ==========
function showConstructionOptions(hex, hexData) {
  hideAllMenus();
  const menu = document.createElement('div');
  menu.className = 'construction-menu';
  menu.innerHTML = `
    <div class="construction-title">Build:</div>
    <button class="construction-btn" data-type="village">🏠 Village</button>
    <button class="construction-btn" data-type="stronghold">🏯 Stronghold</button>
    <button class="construction-btn cancel">Cancel</button>
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

      socket.once('battleActionResult', (result) => {
        handleActionResult(result);
      });
    });
  });
}

// ========== NEW CITY ==========
function executeNewCity(hexData) {
  socket.emit('battleAction', {
    action: 'newCity',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', (result) => {
    handleActionResult(result);
  });
}

// ========== EXPEDITION ==========
function executeExpedition(hexData) {
  socket.emit('battleAction', {
    action: 'expedition',
    row: hexData.row,
    col: hexData.col
  });

  socket.once('battleActionResult', (result) => {
    handleActionResult(result);
  });
}

// ========== NOBLE TITLE ==========
function showNobleTitleConfirmation() {
  hideAllMenus();
  const totalResources = calculateTotalResources();

  const menu = document.createElement('div');
  menu.className = 'noble-title-menu modal-overlay';
  menu.innerHTML = `
    <div class="modal-content">
      <h3>👑 Noble Title</h3>
      <p>You have <strong>${totalResources}</strong> resources.</p>
      <p>Spend 15 resources to advance your title?</p>
      <p class="current-title">Current title: <strong>${player?.titleName || 'Baron'}</strong></p>
      <div class="modal-buttons">
        <button class="modal-btn confirm">Confirm</button>
        <button class="modal-btn cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(menu);

  menu.querySelector('.confirm').addEventListener('click', () => {
    menu.remove();
    socket.emit('battleAction', { action: 'nobleTitle' });
    socket.once('battleActionResult', (result) => {
      handleActionResult(result);
    });
  });

  menu.querySelector('.cancel').addEventListener('click', () => {
    menu.remove();
  });
}

// ========== UTILITIES ==========
function calculateTotalResources() {
  // Use pre-calculated resourcePoints from server
  return player?.resourcePoints || 0;
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
    try {
      const neighborData = JSON.parse(neighbor.dataset.hex);
      if (!neighborData.texture) return true;
    } catch {
      return true; // Treat invalid data as border
    }
  }
  return false;
}

function handleActionResult(result) {
  resetActionState();

  if (result.success) {
    showSuccess(result.message || 'Action completed!');
    emitRequestPlayerData();
    endTurn();
  } else {
    showError(result.message || 'Action failed');
  }
}

function endTurn() {
  socket.emit('endTurn');
}

function resetActionState(full = false) {
  if (full) {
    actionState = {
      movementsLeft: 0,
      selectedKnights: [],
      currentAction: null,
      adjacentKnights: [],
      targetHex: null,
      movedKnightsCount: {}
    };
  } else {
    actionState.selectedKnights = [];
    actionState.adjacentKnights = [];
    actionState.targetHex = null;
    // Preserve movementsLeft, currentAction, and movedKnightsCount during movement
  }
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
    btn.textContent = 'End Action';
    document.body.appendChild(btn);
  }

  btn.onclick = () => {
    removeEndActionButton();
    resetActionState(true); // Full reset
    endTurn();
  };
}

function removeEndActionButton() {
  const btn = document.getElementById('end-action-btn');
  if (btn) btn.remove();
}

// Main hex click handler
function handleHexClick(e) {
  if (getCurrentPhase() !== 'battle') {
    return;
  }
  if (!isMyTurn()) {
    showWarning('Not your turn!');
    return;
  }

  const hex = e.target.closest('.hexagon');
  if (!hex) return;

  e.stopPropagation();

  let hexData;
  try {
    hexData = JSON.parse(hex.dataset.hex);
  } catch {
    showError('Invalid hex data');
    return;
  }
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

// Called when turn changes
export function onTurnChanged() {
  hideAllMenus();
  resetActionState(true); // Full reset on turn change
  removeEndActionButton();

  if (getCurrentPhase() === 'battle' && isMyTurn()) {
    setTimeout(() => {
      showInfo('Your turn! Click on a hex to see available actions.');
      addHexClickHandler();
    }, 500);
  }
}

// Export for compatibility
export function hideActionMenu() {
  hideAllMenus();
  resetActionState(true); // Full reset
  removeEndActionButton();
  removeHexClickHandler();
}

export function getSelectedAction() {
  return actionState.currentAction;
}
