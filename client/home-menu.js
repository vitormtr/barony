import { emitCreateRoom, emitJoinRoom, emitCreateRoomWithColor, emitJoinRoomWithColor, socket } from './ClientSocketEvents.js';
import { CONFIG } from './config.js';
import { domHelper } from './domUtils.js';

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
  domHelper.onClick(createRoomBtn, handleCreateRoom);
  domHelper.onClick(joinRoomBtn, handleJoinRoom);
}

function setupSocketListeners() {
  // Listen for available colors when joining/creating
  socket.on('availableColors', handleAvailableColors);
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
    socket.emit('getAvailableColors', roomId);
  }
}

function handleAvailableColors(data) {
  if (data.error) {
    import('./notifications.js').then(({ showError }) => {
      showError(data.error);
    });
    return;
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
    emitJoinRoomWithColor(pendingRoomId, color, playerName);
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
  setElementsVisibility([
    elements.createRoomBtn,
    elements.joinRoomBtn,
    elements.roomIdInput,
    elements.playerNameInput,
    elements.menu
  ], 'none');

  document.body.style.backgroundImage = 'none';
}

function setElementsVisibility(elements, displayValue) {
  elements.forEach(element => {
    if (element) element.style.display = displayValue;
  });
}

initializeMenu();