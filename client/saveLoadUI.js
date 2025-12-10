// Save/Load game UI module
import {
  emitSaveGame,
  emitListSaves,
  emitLoadGame,
  emitJoinLoadedGame,
  setOnSavesListCallback,
  setOnGameLoadedCallback,
  setOnJoinedLoadedGameCallback,
  setOnLoadedGameInfoCallback,
  setOnLoadedGameColorSelectCallback
} from './ClientSocketEvents.js';
import { showRoomInfo } from './roomInfo.js';
import { hideMenu } from './home-menu.js';
import { hasLocalSave, getLocalSaveInfo, uploadSave, loadFromLocal } from './localSave.js';

let saveLoadModal = null;
let colorSelectModal = null;
let currentLoadedRoomId = null;

// Initialize callbacks
setOnSavesListCallback(handleSavesList);
setOnGameLoadedCallback(handleGameLoaded);
setOnJoinedLoadedGameCallback(handleJoinedLoadedGame);
setOnLoadedGameInfoCallback(handleLoadedGameInfo);
setOnLoadedGameColorSelectCallback(handleLoadedGameColorSelect);

// Handle when a player joins a loaded game room and needs to select color
function handleLoadedGameColorSelect(data) {
  hideMenu();
  showRoomInfo(data.roomId);
  currentLoadedRoomId = data.roomId;
  showColorSelectModal(data.availableColors, data.roomId);
}

// Show the load game button in the main menu
export function initSaveLoadMenu() {
  const menuContainer = document.querySelector('.menu-container');
  if (!menuContainer) return;

  // Check if button already exists
  if (document.getElementById('loadGameBtn')) return;

  // Add load game button after join room section
  const loadSection = document.createElement('div');
  loadSection.className = 'load-game-section';
  loadSection.innerHTML = `
    <div class="menu-divider">
      <span>or</span>
    </div>
    <button id="loadGameBtn" class="load-game-btn">Load Saved Game</button>
    <button id="uploadLocalSaveBtn" class="upload-local-btn">Upload Save File</button>
  `;

  menuContainer.appendChild(loadSection);

  document.getElementById('loadGameBtn').addEventListener('click', showLoadGameModal);
  document.getElementById('uploadLocalSaveBtn').addEventListener('click', handleUploadLocalSave);
}

// Handle upload of local save file
function handleUploadLocalSave() {
  uploadSave((saveData) => {
    if (saveData && saveData.gameState) {
      showLocalSavePreview(saveData);
    }
  });
}

// Show preview of uploaded local save
function showLocalSavePreview(saveData) {
  const modal = document.createElement('div');
  modal.id = 'local-save-preview-modal';
  modal.className = 'modal-overlay';

  const gameState = saveData.gameState;
  const date = new Date(saveData.savedAt);
  const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  const playerColors = gameState.players?.map(p => p.color) || [];
  const colorsHtml = playerColors.map(c =>
    `<span class="save-color save-color-${c}"></span>`
  ).join('');

  modal.innerHTML = `
    <div class="modal-content save-load-modal">
      <h2>Uploaded Save File</h2>
      <div class="local-save-info">
        <p><strong>Saved:</strong> ${dateStr}</p>
        <p><strong>Phase:</strong> ${gameState.gamePhase || 'Unknown'}</p>
        <p><strong>Players:</strong> ${colorsHtml}</p>
        <p class="save-warning">To restore this game, you need to create a new room and have all players join with the same colors.</p>
      </div>
      <div class="modal-buttons">
        <button class="modal-btn confirm" id="restore-local-save">Create Room & Restore</button>
        <button class="modal-btn cancel" id="cancel-local-restore">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('restore-local-save').addEventListener('click', () => {
    modal.remove();
    alert('Para restaurar o jogo:\\n\\n1. Crie uma nova sala\\n2. Compartilhe o codigo com seus amigos\\n3. Cada jogador deve escolher a mesma cor que tinha antes\\n4. O servidor vai sincronizar o estado do jogo\\n\\nO save local foi armazenado no seu navegador.');
  });

  document.getElementById('cancel-local-restore').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Show modal to load a saved game
function showLoadGameModal() {
  // Request saves list from server
  emitListSaves();

  // Create modal
  saveLoadModal = document.createElement('div');
  saveLoadModal.id = 'save-load-modal';
  saveLoadModal.className = 'modal-overlay';
  saveLoadModal.innerHTML = `
    <div class="modal-content save-load-modal">
      <h2>📂 Load Saved Game</h2>
      <div class="saves-list" id="saves-list">
        <div class="loading">Loading saves...</div>
      </div>
      <div class="modal-buttons">
        <button class="modal-btn cancel" id="close-load-modal">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(saveLoadModal);

  document.getElementById('close-load-modal').addEventListener('click', closeSaveLoadModal);
  saveLoadModal.addEventListener('click', (e) => {
    if (e.target === saveLoadModal) closeSaveLoadModal();
  });
}

function handleSavesList(saves) {
  const listContainer = document.getElementById('saves-list');
  if (!listContainer) return;

  if (saves.length === 0) {
    listContainer.innerHTML = '<div class="no-saves">No saved games found.</div>';
    return;
  }

  listContainer.innerHTML = saves.map(save => {
    const date = new Date(save.savedAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    const colors = save.playerColors.map(c =>
      `<span class="save-color save-color-${c}"></span>`
    ).join('');

    return `
      <div class="save-item" data-filename="${save.filename}">
        <div class="save-info">
          <div class="save-date">${dateStr}</div>
          <div class="save-details">
            <span class="save-phase">${save.gamePhase}</span>
            <span class="save-players">${colors}</span>
          </div>
        </div>
        <button class="load-btn">Load</button>
      </div>
    `;
  }).join('');

  // Add click handlers
  listContainer.querySelectorAll('.load-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const saveItem = e.target.closest('.save-item');
      const filename = saveItem.dataset.filename;
      emitLoadGame(filename);
    });
  });
}

function handleGameLoaded(result) {
  closeSaveLoadModal();

  if (result.success) {
    currentLoadedRoomId = result.roomId;
    // Hide main menu
    hideMenu();
    // Show room info
    showRoomInfo(result.roomId);
    // Show the board with saved state
    if (result.boardState) {
      import('./BoardRender.js').then(({ createBoard }) => {
        createBoard(result.boardState);
      });
    }
    // Show color selection modal over the board
    showColorSelectModal(result.playerColors, result.roomId);
  }
}

function showColorSelectModal(colors, roomId) {
  colorSelectModal = document.createElement('div');
  colorSelectModal.id = 'color-select-modal';
  colorSelectModal.className = 'modal-overlay';

  const colorButtons = colors.map(color => `
    <button class="color-select-btn color-btn-${color}" data-color="${color}">
      <span class="color-dot color-dot-${color}"></span>
      <span class="color-name">${capitalizeFirst(color)}</span>
    </button>
  `).join('');

  colorSelectModal.innerHTML = `
    <div class="modal-content color-select-modal">
      <h2>👤 Select Your Color</h2>
      <p>Room: <strong>${roomId}</strong></p>
      <p class="color-hint">Share the room code with other players to join.</p>
      <div class="color-buttons" id="color-buttons">
        ${colorButtons}
      </div>
    </div>
  `;

  document.body.appendChild(colorSelectModal);

  // Show room info
  showRoomInfo(roomId);

  // Add click handlers
  colorSelectModal.querySelectorAll('.color-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      emitJoinLoadedGame(roomId, color);
    });
  });
}

function handleJoinedLoadedGame(result) {
  // Close modal after claiming a color
  closeColorSelectModal();

  if (result.allJoined) {
    // All players joined, game will start via loadedGameReady event
  } else {
    // Show waiting message - player can see the board while waiting
    import('./notifications.js').then(({ showInfo }) => {
      const remaining = result.remainingColors.length;
      showInfo(`Waiting for ${remaining} more player(s) to join...`);
    });
  }
}

function handleLoadedGameInfo(info) {
  if (info && info.remainingColors) {
    updateColorButtons(info.remainingColors);
  }
}

function updateColorButtons(remainingColors) {
  const buttons = document.querySelectorAll('.color-select-btn');
  buttons.forEach(btn => {
    const color = btn.dataset.color;
    if (!remainingColors.includes(color)) {
      btn.disabled = true;
      btn.classList.add('claimed');
      btn.innerHTML = `
        <span class="color-dot color-dot-${color}"></span>
        <span class="color-name">${capitalizeFirst(color)} (Claimed)</span>
      `;
    }
  });
}

function closeSaveLoadModal() {
  if (saveLoadModal) {
    saveLoadModal.remove();
    saveLoadModal = null;
  }
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

// Add save button to leader controls (called when game is started)
export function addSaveButton() {
  const leaderControls = document.getElementById('leader-controls');
  if (!leaderControls) return;

  // Check if button already exists
  if (document.getElementById('save-game-btn')) return;

  const saveBtn = document.createElement('button');
  saveBtn.id = 'save-game-btn';
  saveBtn.className = 'leader-btn save-btn';
  saveBtn.innerHTML = '💾 Save Game';
  saveBtn.addEventListener('click', emitSaveGame);

  leaderControls.appendChild(saveBtn);
}

// Remove save button
export function removeSaveButton() {
  const saveBtn = document.getElementById('save-game-btn');
  if (saveBtn) {
    saveBtn.remove();
  }
}

// Initialize on page load
initSaveLoadMenu();
