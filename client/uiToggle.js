// UI Toggle module - hide/show all UI elements except the board

let isHidden = false;
let toggleContainer = null;

const UI_ELEMENTS_TO_HIDE = [
  '#room-info',
  '#leader-controls',
  '#turn-indicator',
  '#hud',
  '#player-color-indicator',
  '#resource-panel',
  '.coordinate-text'
];

export function initUIToggle() {
  if (toggleContainer) return;

  toggleContainer = document.createElement('div');
  toggleContainer.id = 'ui-toggle-container';
  toggleContainer.style.display = 'none'; // Hidden by default
  toggleContainer.innerHTML = `
    <label class="ui-toggle-label">
      <input type="checkbox" id="ui-toggle-checkbox" checked>
      <span class="ui-toggle-text">Show UI</span>
    </label>
  `;

  document.body.appendChild(toggleContainer);

  const checkbox = document.getElementById('ui-toggle-checkbox');
  checkbox.addEventListener('change', (e) => {
    toggleUI(e.target.checked);
  });
}

export function showUIToggle() {
  if (toggleContainer) {
    toggleContainer.style.display = '';
  }
}

export function hideUIToggle() {
  if (toggleContainer) {
    toggleContainer.style.display = 'none';
  }
}

function toggleUI(show) {
  isHidden = !show;

  UI_ELEMENTS_TO_HIDE.forEach(selector => {
    // Use querySelectorAll to handle both single elements and multiple elements (like .coordinate-text)
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.style.display = show ? '' : 'none';
    });
  });

  // Update toggle text
  const toggleText = document.querySelector('.ui-toggle-text');
  if (toggleText) {
    toggleText.textContent = show ? 'Hide UI' : 'Show UI';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUIToggle);
} else {
  initUIToggle();
}
