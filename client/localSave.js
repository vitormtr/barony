// Local save system - saves game state to browser localStorage and allows file download/upload
// This works even when the server goes down

const LOCAL_SAVE_KEY = 'barony_local_save';
const AUTO_SAVE_INTERVAL = 10000; // Auto-save every 10 seconds

let currentGameState = null;
let autoSaveTimer = null;

// Save game state to localStorage
export function saveToLocal(gameState) {
  if (!gameState) return;

  currentGameState = gameState;

  const saveData = {
    version: '1.0',
    savedAt: new Date().toISOString(),
    gameState: gameState
  };

  try {
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.error('[LocalSave] Failed to save to localStorage:', e);
  }
}

// Load game state from localStorage
export function loadFromLocal() {
  try {
    const data = localStorage.getItem(LOCAL_SAVE_KEY);
    if (data) {
      const saveData = JSON.parse(data);
      return saveData;
    }
  } catch (e) {
    console.error('[LocalSave] Failed to load from localStorage:', e);
  }
  return null;
}

// Clear local save
export function clearLocalSave() {
  localStorage.removeItem(LOCAL_SAVE_KEY);
  currentGameState = null;
}

// Download save as JSON file
export function downloadSave() {
  const saveData = loadFromLocal();
  if (!saveData) {
    alert('No save data available to download');
    return;
  }

  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `barony_save_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Upload save from JSON file
export function uploadSave(callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const saveData = JSON.parse(event.target.result);
        if (saveData.gameState) {
          localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(saveData));
          if (callback) callback(saveData);
        } else {
          alert('Invalid save file format');
        }
      } catch (err) {
        alert('Error reading save file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

// Start auto-save timer
export function startAutoSave() {
  if (autoSaveTimer) return;

  autoSaveTimer = setInterval(() => {
    if (currentGameState) {
      saveToLocal(currentGameState);
    }
  }, AUTO_SAVE_INTERVAL);
}

// Stop auto-save timer
export function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Update current game state (called by game events)
export function updateGameState(state) {
  currentGameState = state;
}

// Check if there's a local save available
export function hasLocalSave() {
  return localStorage.getItem(LOCAL_SAVE_KEY) !== null;
}

// Get save info without loading full state
export function getLocalSaveInfo() {
  try {
    const data = localStorage.getItem(LOCAL_SAVE_KEY);
    if (data) {
      const saveData = JSON.parse(data);
      return {
        savedAt: saveData.savedAt,
        hasState: !!saveData.gameState
      };
    }
  } catch (e) {
    console.error('[LocalSave] Failed to get save info:', e);
  }
  return null;
}

// Add local save UI buttons
export function addLocalSaveButtons() {
  const leaderControls = document.getElementById('leader-controls');
  if (!leaderControls) return;

  // Check if buttons already exist
  if (document.getElementById('local-save-btn')) return;

  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'local-save-btn';
  downloadBtn.className = 'leader-btn local-save-btn';
  downloadBtn.innerHTML = '⬇️ Download Save';
  downloadBtn.title = 'Download save to your computer (works offline)';
  downloadBtn.addEventListener('click', downloadSave);

  leaderControls.appendChild(downloadBtn);
}

// Initialize local save system
export function initLocalSave() {
  // Check for existing local save on page load
  getLocalSaveInfo();
}

// Initialize on module load
initLocalSave();
