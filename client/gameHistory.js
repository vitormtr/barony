// Game History Module - Shows a log of game actions

let historyContainer = null;
let historyList = null;
const MAX_HISTORY_ITEMS = 50;

const ACTION_ICONS = {
  recruitment: '⚔️',
  movement: '🏃',
  construction: '🏠',
  newCity: '🏰',
  expedition: '🚩',
  nobleTitle: '👑',
  combat: '💥',
  turnEnd: '🔄',
  gameStart: '🎮',
  placement: '📍'
};

const ACTION_NAMES = {
  recruitment: 'Recruited',
  movement: 'Moved',
  construction: 'Built',
  newCity: 'New City',
  expedition: 'Expedition',
  nobleTitle: 'Title Up',
  combat: 'Combat',
  turnEnd: 'End Turn',
  gameStart: 'Game Started',
  placement: 'Placed'
};

export function initGameHistory() {
  if (historyContainer) return;

  historyContainer = document.createElement('div');
  historyContainer.id = 'gameHistory';
  historyContainer.className = 'game-history';
  historyContainer.innerHTML = `
    <div class="history-header">
      <span class="history-title">Game Log</span>
      <button class="history-toggle-btn" title="Minimize">−</button>
    </div>
    <div class="history-content">
      <ul class="history-list"></ul>
    </div>
  `;

  document.body.appendChild(historyContainer);
  historyList = historyContainer.querySelector('.history-list');

  // Toggle minimize
  const toggleBtn = historyContainer.querySelector('.history-toggle-btn');
  toggleBtn.addEventListener('click', () => {
    historyContainer.classList.toggle('minimized');
    toggleBtn.textContent = historyContainer.classList.contains('minimized') ? '+' : '−';
  });

  // Make draggable by header
  const header = historyContainer.querySelector('.history-header');
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target === toggleBtn) return; // Don't drag when clicking toggle
    isDragging = true;
    offsetX = e.clientX - historyContainer.offsetLeft;
    offsetY = e.clientY - historyContainer.offsetTop;
    header.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    // Keep within viewport bounds
    const maxX = window.innerWidth - historyContainer.offsetWidth;
    const maxY = window.innerHeight - historyContainer.offsetHeight;
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    historyContainer.style.left = newX + 'px';
    historyContainer.style.top = newY + 'px';
    historyContainer.style.right = 'auto'; // Clear right positioning
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = 'grab';
    }
  });
}

export function addHistoryEntry(action, playerColor, details = '') {
  if (!historyList) return;

  const entry = document.createElement('li');
  entry.className = `history-entry player-${playerColor}`;

  const icon = ACTION_ICONS[action] || '•';
  const actionName = ACTION_NAMES[action] || action;
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  entry.innerHTML = `
    <span class="entry-icon">${icon}</span>
    <span class="entry-color color-${playerColor}"></span>
    <span class="entry-action">${actionName}</span>
    <span class="entry-details">${details}</span>
    <span class="entry-time">${time}</span>
  `;

  // Add to top of list
  historyList.insertBefore(entry, historyList.firstChild);

  // Limit history size
  while (historyList.children.length > MAX_HISTORY_ITEMS) {
    historyList.removeChild(historyList.lastChild);
  }

  // Scroll to top
  const content = historyContainer.querySelector('.history-content');
  content.scrollTop = 0;
}

export function clearHistory() {
  if (historyList) {
    historyList.innerHTML = '';
  }
}

export function showHistory() {
  if (historyContainer) {
    historyContainer.style.display = 'flex';
  }
}

export function hideHistory() {
  if (historyContainer) {
    historyContainer.style.display = 'none';
  }
}
