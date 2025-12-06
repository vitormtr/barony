import { CONFIG } from "./config.js";

const HUD_ID = "hud";

export function createPlayersElement(players) {
  const hud = getHudElement();
  clearElement(hud);

  players.forEach(player => {
    hud.appendChild(createPlayerElement(player));
  });
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
  container.appendChild(createProfileImage(player));
  container.appendChild(createPlayerInfo(player));

  return container;
}

function createProfileImage(player) {
  const img = createElementWithClass("img", CONFIG.PLAYER_CLASSES.image);
  img.src = `./images/${player.image}`;
  img.alt = `Player ${player.name}`;
  return img;
}

function createPlayerInfo(player) {
  const infoContainer = createElementWithClass("div", CONFIG.PLAYER_CLASSES.info);
  infoContainer.appendChild(createPlayerName(player.color));
  infoContainer.appendChild(createPiecesElements(player.pieces, player.color));
  return infoContainer;
}

function createPlayerName(color) {
  const nameElement = createElementWithClass("div", CONFIG.PLAYER_CLASSES.name);
  nameElement.textContent = `${color} Player`;
  return nameElement;
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
  const img = document.createElement("img");
  img.src = `./images/${color}${pieceType}.png`;
  img.alt = capitalizeFirstLetter(pieceType);
  return img;
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
