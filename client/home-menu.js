import { emitCreateRoom, emitJoinRoom, emitCreateRoomWithColor, emitJoinRoomWithColor, emitJoinLoadedGame, getSocket } from './ClientSocketEvents.js';
import { CONFIG } from './config.js';
import { domHelper } from './domUtils.js';
import { showRoomInfo } from './roomInfo.js';

const elements = {
  createRoomBtn: document.getElementById(CONFIG.SELECTORS.CREATE_ROOM),
  joinRoomBtn: document.getElementById(CONFIG.SELECTORS.JOIN_ROOM),
  roomIdInput: document.getElementById(CONFIG.SELECTORS.ROOM_INPUT),
  playerNameInput: document.getElementById('playerNameInput'),
  menu: document.getElementById(CONFIG.SELECTORS.MENU)
};

let pendingAction = null; // 'create' or 'join'
let pendingRoomId = null;
let colorSelectModal = null;

function initializeMenu() {
  setupEventListeners();
  setupSocketListeners();
}

function setupEventListeners() {
  domHelper.onClick(elements.createRoomBtn, handleCreateRoom);
  domHelper.onClick(elements.joinRoomBtn, handleJoinRoom);
}

function setupSocketListeners() {
  // Listen for available colors when joining/creating
  getSocket().on('availableColors', handleAvailableColors);
}

function getPlayerName() {
  const name = elements.playerNameInput?.value?.trim();
  return name || null;
}

function handleCreateRoom() {
  pendingAction = 'create';
  pendingRoomId = null;
  // Request available colors (all 4 for new room)
  showColorSelectModal(['red', 'blue', 'green', 'yellow'], null);
}

function handleJoinRoom() {
  const roomId = elements.roomIdInput.value.trim();
  if (roomId) {
    pendingAction = 'join';
    pendingRoomId = roomId;
    // Request available colors from server
    getSocket().emit('getAvailableColors', roomId);
  }
}

let isLoadedGame = false;

function handleAvailableColors(data) {
  if (data.error) {
    import('./notifications.js').then(({ showError }) => {
      showError(data.error);
    });
    return;
  }

  // If it's a loaded game, show the board and use loaded game flow
  if (data.loadedGame) {
    isLoadedGame = true;
    hideMenu();
    showRoomInfo(data.roomId);
    // Show the board
    if (data.boardState) {
      import('./BoardRender.js').then(({ createBoard }) => {
        createBoard(data.boardState);
      });
    }
  }

  showColorSelectModal(data.colors, data.roomId);
}

function showColorSelectModal(colors, roomId) {
  if (colorSelectModal) {
    colorSelectModal.remove();
  }

  colorSelectModal = document.createElement('div');
  colorSelectModal.id = 'color-select-modal';
  colorSelectModal.className = 'modal-overlay';

  const colorButtons = colors.map(color => `
    <button class="color-select-btn color-btn-${color}" data-color="${color}">
      <span class="color-dot color-dot-${color}"></span>
      <span class="color-name">${capitalizeFirst(color)}</span>
    </button>
  `).join('');

  const title = pendingAction === 'create' ? 'Create Room' : 'Join Room';
  const roomInfo = roomId ? `<p>Room: <strong>${roomId}</strong></p>` : '';

  colorSelectModal.innerHTML = `
    <div class="modal-content color-select-modal">
      <h2>${title}</h2>
      ${roomInfo}
      <p class="color-hint">Choose your color:</p>
      <div class="color-buttons" id="color-buttons">
        ${colorButtons}
      </div>
      <div class="modal-buttons">
        <button class="modal-btn cancel" id="cancel-color-select">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(colorSelectModal);

  // Add click handlers
  colorSelectModal.querySelectorAll('.color-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      handleColorSelected(color);
    });
  });

  document.getElementById('cancel-color-select').addEventListener('click', closeColorSelectModal);
  colorSelectModal.addEventListener('click', (e) => {
    if (e.target === colorSelectModal) closeColorSelectModal();
  });
}

function handleColorSelected(color) {
  const playerName = getPlayerName();
  closeColorSelectModal();

  if (pendingAction === 'create') {
    emitCreateRoomWithColor(color, playerName);
  } else if (pendingAction === 'join' && pendingRoomId) {
    if (isLoadedGame) {
      // Use loaded game flow
      emitJoinLoadedGame(pendingRoomId, color);
      isLoadedGame = false;
    } else {
      emitJoinRoomWithColor(pendingRoomId, color, playerName);
    }
  }

  pendingAction = null;
  pendingRoomId = null;
}

function closeColorSelectModal() {
  if (colorSelectModal) {
    colorSelectModal.remove();
    colorSelectModal = null;
  }
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function hideMenu() {
  const logoMenuContainer = document.getElementById('logoMenuContainer');
  if (logoMenuContainer) {
    logoMenuContainer.style.display = 'none';
  }
  document.body.style.backgroundImage = 'none';
}

function setElementsVisibility(elements, displayValue) {
  elements.forEach(element => {
    if (element) element.style.display = displayValue;
  });
}

initializeMenu();