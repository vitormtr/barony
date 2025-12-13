// UI Toggle module - hide/show all UI elements except the board

let isHidden = false;
let toggleContainer = null;

const UI_ELEMENTS_TO_HIDE = [
  '#room-info',
  '#leader-controls',
  '#turn-indicator',
  '#hud',
  '#player-color-indicator'
];

export function initUIToggle() {
  if (toggleContainer) return;

  toggleContainer = document.createElement('div');
  toggleContainer.id = 'ui-toggle-container';
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

function toggleUI(show) {
  isHidden = !show;

  UI_ELEMENTS_TO_HIDE.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = show ? '' : 'none';
    }
  });

  // Update toggle text
  const toggleText = document.querySelector('.ui-toggle-text');
  if (toggleText) {
    toggleText.textContent = show ? 'Show UI' : 'Show UI';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUIToggle);
} else {
  initUIToggle();
}
