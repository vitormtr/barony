// Room leader controls module
import { socket, emitSaveGame } from './ClientSocketEvents.js';
import { showSuccess, showError, showWarning, showInfo } from './notifications.js';
import { getRoomId } from './roomInfo.js';

let isLeader = false;
let leaderControlsElement = null;
let restartModalElement = null;

export function setLeader(leader) {
  isLeader = leader;
  if (leader) {
    showLeaderControls();
  }
}

export function isRoomLeader() {
  return isLeader;
}

function showLeaderControls() {
  if (leaderControlsElement) {
    leaderControlsElement.style.display = 'flex';
    return;
  }

  leaderControlsElement = document.createElement('div');
  leaderControlsElement.id = 'leader-controls';
  leaderControlsElement.innerHTML = `
    <div class="leader-badge">Room Leader</div>
    <div class="leader-buttons">
      <button id="randomDistributionBtn" class="leader-btn" title="Distribute all textures randomly on the board">
        Distribute Textures
      </button>
      <button id="skipToBattleBtn" class="leader-btn test-btn" title="[TEST] Skip directly to battle phase">
        [TEST] Skip to Battle
      </button>
      <button id="saveGameBtn" class="leader-btn save-btn" title="Save current game state">
        💾 Save Game
      </button>
      <button id="restartGameBtn" class="leader-btn restart-btn" title="Restart game from scratch">
        Restart Game
      </button>
    </div>
  `;
  document.body.appendChild(leaderControlsElement);

  // Event listeners
  document.getElementById('randomDistributionBtn').addEventListener('click', handleRandomDistribution);
  document.getElementById('skipToBattleBtn').addEventListener('click', handleSkipToBattle);
  document.getElementById('saveGameBtn').addEventListener('click', handleSaveGame);
  document.getElementById('restartGameBtn').addEventListener('click', showRestartModal);
}

function handleSaveGame() {
  if (!isLeader) {
    showError('Only the leader can save the game!');
    return;
  }
  emitSaveGame();
}

function handleRandomDistribution() {
  if (!isLeader) {
    showError('Only the leader can do this!');
    return;
  }

  // Confirmation
  if (!confirm('This will distribute ALL textures from ALL players randomly on the board.\n\nAfter this, new players will NOT be able to join the room.\n\nDo you want to continue?')) {
    return;
  }

  showInfo('Distributing textures...');
  socket.emit('randomDistribution');
}

function handleSkipToBattle() {
  if (!isLeader) {
    showError('Only the leader can do this!');
    return;
  }

  if (!confirm('[TEST] This will:\n- Distribute textures randomly\n- Place 3 cities+knights for each player\n- Start battle phase\n\nDo you want to continue?')) {
    return;
  }

  showInfo('[TEST] Skipping to battle phase...');
  socket.emit('skipToBattle');

  socket.once('skipToBattleResult', (result) => {
    if (result.success) {
      showSuccess(result.message);
      disableSkipToBattleButton();
      disableDistributionButton();
    } else {
      showError(result.message);
    }
  });
}

function disableSkipToBattleButton() {
  const btn = document.getElementById('skipToBattleBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.display = 'none';
  }
}

function showRestartModal() {
  if (!isLeader) {
    showError('Only the leader can do this!');
    return;
  }

  if (restartModalElement) {
    restartModalElement.style.display = 'flex';
    restartModalElement.querySelector('input').value = '';
    restartModalElement.querySelector('input').focus();
    return;
  }

  restartModalElement = document.createElement('div');
  restartModalElement.id = 'restart-modal';
  restartModalElement.className = 'modal-overlay';
  restartModalElement.innerHTML = `
    <div class="modal-content">
      <h3>Restart Game</h3>
      <p>To confirm restart, enter the room code:</p>
      <input type="text" id="restartConfirmInput" placeholder="Room code" maxlength="6" autocomplete="off">
      <div class="modal-buttons">
        <button id="confirmRestartBtn" class="modal-btn confirm">Confirm</button>
        <button id="cancelRestartBtn" class="modal-btn cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(restartModalElement);

  // Event listeners
  document.getElementById('confirmRestartBtn').addEventListener('click', handleRestartConfirm);
  document.getElementById('cancelRestartBtn').addEventListener('click', hideRestartModal);
  restartModalElement.addEventListener('click', (e) => {
    if (e.target === restartModalElement) hideRestartModal();
  });

  // Enter to confirm
  document.getElementById('restartConfirmInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRestartConfirm();
  });

  restartModalElement.querySelector('input').focus();
}

function hideRestartModal() {
  if (restartModalElement) {
    restartModalElement.style.display = 'none';
  }
}

function handleRestartConfirm() {
  const input = document.getElementById('restartConfirmInput');
  const confirmCode = input.value.trim();
  const currentRoomId = getRoomId();

  if (!confirmCode) {
    showWarning('Enter the room code to confirm.');
    input.focus();
    return;
  }

  if (confirmCode !== currentRoomId) {
    showError('Incorrect code!');
    input.value = '';
    input.focus();
    return;
  }

  showInfo('Restarting game...');
  socket.emit('restartGame', confirmCode);
  hideRestartModal();
}

// Hide controls (when no longer leader or room was reset)
export function hideLeaderControls() {
  if (leaderControlsElement) {
    leaderControlsElement.style.display = 'none';
  }
}

// Disable distribution button after use
export function disableDistributionButton() {
  const btn = document.getElementById('randomDistributionBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Board Set Up';
    btn.classList.add('disabled');
  }
}

// Re-enable button after restart
export function enableDistributionButton() {
  const btn = document.getElementById('randomDistributionBtn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Distribute Textures';
    btn.classList.remove('disabled');
  }
  // Hide save button on restart
  hideSaveButton();
}

// Show save button when game is in progress
export function showSaveButton() {
  const btn = document.getElementById('saveGameBtn');
  if (btn) {
    btn.style.display = 'block';
  }
}

// Hide save button
export function hideSaveButton() {
  const btn = document.getElementById('saveGameBtn');
  if (btn) {
    btn.style.display = 'none';
  }
}
