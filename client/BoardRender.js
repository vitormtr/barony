import { Hex } from "./Hex.js";
import { addClickEventToHexagons, closeMenuOnClickOutside } from "./texture-menu.js";
import { domHelper } from "./domUtils.js";
import { CONFIG } from "./config.js";

const ERROR_MESSAGE = "Erro: hexContainer não encontrado!";

export function destroyBoard() {
  const container = domHelper.get(CONFIG.SELECTORS.HEX_CONTAINER);
  domHelper.clear(container);
}

export function createBoard(boardState) {
  const container = domHelper.get(CONFIG.SELECTORS.HEX_CONTAINER);
  if (!container) return logError();
  domHelper.clear(container);
  buildBoardStructure(container, boardState);
  addClickEventToHexagons();
  closeMenuOnClickOutside();
}

export function updateBoard(newBoard) {
  const newBoardState = newBoard.boardState;
  newBoardState.forEach(updateRow);
}

function logError() {
  console.error(ERROR_MESSAGE);
  return null;
}

function buildBoardStructure(container, boardState) {
  boardState.forEach((rowData, rowIndex) => {
    domHelper.append(container, createRow(rowIndex, rowData));
  });
}

function createRow(rowIndex, rowData) {
  const rowContainer = domHelper.create('div', [CONFIG.CLASSES.HEX_ROW]);
  
  rowData.forEach((hexData, colIndex) => {
    domHelper.append(rowContainer, createHexElement(rowIndex, colIndex, hexData));
  });

  return rowContainer;
}

function createHexElement(row, col, hexData) {
  const hex = new Hex(row, col, hexData.texture);
  const element = hex.element;
  setHexMetadata(element, { row, col, texture: hexData.texture });
  applyHexTexture(element, hexData.texture);
  return element;
}

function updateRow(rowData, rowIndex) {
  rowData.forEach((hexData, colIndex) => {
    updateHexElement(rowIndex, colIndex, hexData);
  });
}

function updateHexElement(row, col, hexData) {
  const selector = `${CONFIG.SELECTORS.HEXAGONS}[data-${CONFIG.HEXROWCOL.ROW}="${row}"][data-${CONFIG.HEXROWCOL.COL}="${col}"]`;
  const element = domHelper.get(selector);
  if (!element) return;
  try {
    const currentHexData = JSON.parse(domHelper.getDatasetValue(element, 'hex') || '{}');
    const updatedData = { ...currentHexData, texture: hexData.texture, pieces: hexData.pieces };

    domHelper.setDataset(element, { hex: JSON.stringify(updatedData) });
    domHelper.setBackgroundImage(
      element,
      hexData.texture
        ? `${CONFIG.PATHS.IMAGES}${hexData.texture}`
        : ''
    );

    // Renderiza as peças se existirem
    renderPieces(element, hexData.pieces);
  } catch (error) {
    console.error(`Erro ao atualizar hexágono [${row},${col}]:`, error);
  }
}

function renderPieces(element, pieces) {
  // Remove peças existentes
  element.querySelectorAll('.piece').forEach(p => p.remove());

  // Se não há peças, retorna
  if (!pieces || pieces.length === 0) return;

  // Encontra a cidade e conta cavaleiros
  const city = pieces.find(p => p.type === 'city');
  const knights = pieces.filter(p => p.type === 'knight');

  // Container para as peças
  let container = element.querySelector('.pieces-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'pieces-container';
    element.appendChild(container);
  }
  container.innerHTML = '';

  // Renderiza a cidade
  if (city) {
    const cityElement = document.createElement('div');
    cityElement.className = `piece piece-city piece-${city.color}`;
    cityElement.title = `Cidade - ${city.color}`;
    container.appendChild(cityElement);
  }

  // Mostra contador de cavaleiros se houver
  if (knights.length > 0) {
    const knightContainer = document.createElement('div');
    knightContainer.className = `piece piece-knight piece-${knights[0].color}`;
    knightContainer.title = `${knights.length} Cavaleiro(s) - ${knights[0].color}`;

    // Badge com quantidade
    const badge = document.createElement('span');
    badge.className = 'knight-count';
    badge.textContent = knights.length;
    knightContainer.appendChild(badge);

    container.appendChild(knightContainer);
  }
}

function setHexMetadata(element, { row, col, texture }) {
  domHelper.setDataset(element, {
    hex: JSON.stringify({ row, col, texture }) 
  });
}

function applyHexTexture(element, texture) {
  domHelper.setBackgroundImage(element, texture ? `/images/${texture}` : '');
}
