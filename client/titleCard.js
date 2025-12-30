// Player resources and title display
import { player } from './ClientSocketEvents.js';

const TITLES = [
  { name: 'Baron', points: 0, icon: '🏰' },
  { name: 'Viscount', points: 5, icon: '🏛️' },
  { name: 'Count', points: 10, icon: '⚔️' },
  { name: 'Marquis', points: 15, icon: '👑' },
  { name: 'Duke', points: 25, icon: '🎖️' }
];

const RESOURCE_INFO = {
  mountain: { icon: '⛰️', value: 2, color: '#8B7355' },
  forest: { icon: '🌲', value: 3, color: '#228B22' },
  plain: { icon: '🌻', value: 4, color: '#DAA520' },
  field: { icon: '🌾', value: 5, color: '#FFD700' }
};

let resourcePanelElement = null;
let isMinimized = false;

export function createTitleCard() {
  createResourcePanel();
}

function toggleMinimize() {
  isMinimized = !isMinimized;
  resourcePanelElement.classList.toggle('minimized', isMinimized);
  updateTitleCard();
}

// Create the resource panel on the right side
function createResourcePanel() {
  if (resourcePanelElement) return;

  resourcePanelElement = document.createElement('div');
  resourcePanelElement.id = 'resource-panel';
  resourcePanelElement.className = 'resource-panel';

  document.body.appendChild(resourcePanelElement);
  updateTitleCard();
}

export function updateTitleCard() {
  if (!resourcePanelElement) return;

  const currentTitle = player?.title || 'baron';
  const titleName = player?.titleName || 'Baron';
  const resources = player?.resources || {};
  const totalPoints = player?.resourcePoints || 0;
  const canPromote = totalPoints >= 15 && currentTitle.toLowerCase() !== 'duke';

  // Minimized view
  if (isMinimized) {
    const canPromoteBadge = canPromote ? 'can-promote' : '';
    resourcePanelElement.innerHTML = `
      <div class="title-card-header minimized-header" id="resource-toggle">
        <span class="title-card-icon">📜</span>
        <span class="resources-badge ${canPromoteBadge}">${totalPoints} pts</span>
        <span class="toggle-icon">▲</span>
      </div>
    `;
    document.getElementById('resource-toggle').addEventListener('click', toggleMinimize);
    return;
  }

  let html = `
    <div class="resource-panel-header" id="resource-toggle">
      <span class="panel-title">Your Resources</span>
      <span class="toggle-icon">▶</span>
    </div>

    <div class="resource-score ${canPromote ? 'can-promote' : ''}">
      <span class="score-value">${totalPoints}</span>
      <span class="score-label">points</span>
      ${canPromote ? '<span class="promote-badge">CAN PROMOTE!</span>' : ''}
    </div>

    <div class="resource-grid">
  `;

  // Show each resource type
  for (const [resource, info] of Object.entries(RESOURCE_INFO)) {
    const count = resources[resource] || 0;
    const points = count * info.value;

    html += `
      <div class="resource-item ${count > 0 ? 'has-tokens' : ''}">
        <div class="resource-icon-large">${info.icon}</div>
        <div class="resource-details">
          <span class="resource-count">${count}</span>
          <span class="resource-points">${points} pts</span>
        </div>
        <div class="resource-value-hint">×${info.value}</div>
      </div>
    `;
  }

  html += `
    </div>

    <div class="title-section">
      <div class="current-title">
        <span class="title-label">Title:</span>
        <span class="title-value">${titleName}</span>
      </div>
      <div class="title-progress">
  `;

  // Mini title progression
  TITLES.forEach((title, index) => {
    const isCurrent = currentTitle.toLowerCase() === title.name.toLowerCase();
    const isPast = getTitleIndex(currentTitle) > index;
    let statusClass = '';
    if (isCurrent) statusClass = 'current';
    else if (isPast) statusClass = 'achieved';

    html += `<div class="title-dot ${statusClass}" title="${title.name} (${title.points} VP)">${title.icon}</div>`;
  });

  html += `
      </div>
    </div>
  `;

  if (canPromote) {
    html += `<div class="promote-hint">Click hex → Noble Title</div>`;
  }

  resourcePanelElement.innerHTML = html;
  document.getElementById('resource-toggle').addEventListener('click', toggleMinimize);
}

function getTitleIndex(title) {
  return TITLES.findIndex(t => t.name.toLowerCase() === title.toLowerCase());
}

export function removeTitleCard() {
  if (resourcePanelElement) {
    resourcePanelElement.remove();
    resourcePanelElement = null;
  }
}
