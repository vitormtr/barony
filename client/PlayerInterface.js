import { CONFIG } from "./config.js";

const HUD_ID = "hud";

const PIECE_ICONS = {
  knight: '♞',
  city: '🏰',
  village: '🏠',
  stronghold: '🏯'
};

const TITLE_ICONS = {
  baron: '🏰',
  viscount: '🏛️',
  count: '⚔️',
  marquis: '👑',
  duke: '🎖️'
};

const RESOURCE_VALUES = {
  mountain: 2,
  forest: 3,
  plain: 4,
  field: 5
};

let isHudMinimized = false;

export function createPlayersElement(players) {
  const hud = getHudElement();
  clearElement(hud);

  if (isHudMinimized) {
    // Minimized: show colored dots for each player + expand button
    const minimizedContainer = document.createElement('div');
    minimizedContainer.className = 'hud-minimized';

    players.forEach(player => {
      const dot = document.createElement('span');
      dot.className = `player-dot player-dot-${player.color}`;
      dot.title = player.name || capitalizeFirstLetter(player.color);
      minimizedContainer.appendChild(dot);
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'hud-toggle-btn';
    toggleBtn.innerHTML = '▲ Players';
    toggleBtn.addEventListener('click', () => toggleHud(players));
    minimizedContainer.appendChild(toggleBtn);

    hud.appendChild(minimizedContainer);
  } else {
    // Expanded: show all player cards + minimize button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'hud-toggle-btn hud-minimize-btn';
    toggleBtn.innerHTML = '▼';
    toggleBtn.title = 'Minimize';
    toggleBtn.addEventListener('click', () => toggleHud(players));
    hud.appendChild(toggleBtn);

    players.forEach(player => {
      hud.appendChild(createPlayerElement(player));
    });
  }
}

function toggleHud(players) {
  isHudMinimized = !isHudMinimized;
  createPlayersElement(players);
}

function getHudElement() {
  return document.getElementById(HUD_ID);
}

function clearElement(element) {
  element.innerHTML = "";
}

function createPlayerElement(player) {
  const container = createElementWithClass("div", CONFIG.PLAYER_CLASSES.container);
  container.dataset.playerId = player.id;
  container.classList.add(`player-color-${player.color}`);
  container.appendChild(createPlayerInfo(player));

  return container;
}

function createPlayerInfo(player) {
  const infoContainer = createElementWithClass("div", CONFIG.PLAYER_CLASSES.info);
  infoContainer.appendChild(createPlayerHeader(player));
  infoContainer.appendChild(createPiecesElements(player.pieces, player.color));
  return infoContainer;
}

function createPlayerHeader(player) {
  const header = createElementWithClass("div", "player-header");

  // Player name
  const playerName = player.name || capitalizeFirstLetter(player.color);
  const nameElement = createElementWithClass("span", "player-name");
  nameElement.textContent = playerName;
  header.appendChild(nameElement);

  // Title badge
  const titleBadge = createElementWithClass("span", "player-title-badge");
  const title = player.title || 'baron';
  const titleName = getTitleDisplayName(title);
  const titleIcon = TITLE_ICONS[title] || '🏰';
  titleBadge.innerHTML = `${titleIcon} ${titleName}`;
  titleBadge.classList.add(`title-${title}`);
  header.appendChild(titleBadge);

  // Resource points
  const resourcePoints = calculateResourcePoints(player.resources);
  const pointsBadge = createElementWithClass("span", "player-points-badge");
  pointsBadge.textContent = `${resourcePoints} pts`;
  if (resourcePoints >= 15) {
    pointsBadge.classList.add("can-promote");
    pointsBadge.title = "Can promote title!";
  }
  header.appendChild(pointsBadge);

  // Victory points
  if (player.victoryPoints > 0) {
    const vpBadge = createElementWithClass("span", "player-vp-badge");
    vpBadge.textContent = `${player.victoryPoints} VP`;
    vpBadge.title = "Victory Points";
    header.appendChild(vpBadge);
  }

  return header;
}

function calculateResourcePoints(resources) {
  if (!resources) return 0;
  let total = 0;
  for (const [resource, count] of Object.entries(resources)) {
    total += (count || 0) * (RESOURCE_VALUES[resource] || 0);
  }
  return total;
}

function getTitleDisplayName(title) {
  const titles = {
    'baron': 'Baron',
    'viscount': 'Viscount',
    'count': 'Count',
    'marquis': 'Marquis',
    'duke': 'Duke'
  };
  return titles[title?.toLowerCase()] || 'Baron';
}

function createPiecesElements(pieces, color) {
  const piecesContainer = createElementWithClass("div", CONFIG.PLAYER_CLASSES.pieces);
  Object.entries(pieces).forEach(([pieceType, count]) => {
    piecesContainer.appendChild(createPieceElement(color, pieceType, count));
  });
  return piecesContainer;
}

function createPieceElement(color, pieceType, count) {
  const pieceContainer = createElementWithClass("div", CONFIG.PLAYER_CLASSES.piece);
  const formattedType = pieceType.toLowerCase();
  
  pieceContainer.appendChild(createPieceImage(color, formattedType));
  pieceContainer.appendChild(createCountElement(formattedType, count));
  
  return pieceContainer;
}

function createPieceImage(color, pieceType) {
  const iconSpan = document.createElement("span");
  iconSpan.className = `piece-icon piece-icon-${pieceType} piece-color-${color}`;
  iconSpan.textContent = PIECE_ICONS[pieceType] || '?';
  return iconSpan;
}

function createCountElement(pieceType, count) {
  const countElement = createElementWithClass("span", CONFIG.PLAYER_CLASSES.count(pieceType));
  countElement.textContent = count;
  return countElement;
}

function createElementWithClass(elementType, className) {
  const element = document.createElement(elementType);
  element.classList.add(className);
  return element;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
