import { Hex } from "./Hex.js";
import { addClickEventToHexagons, closeMenuOnClickOutside } from "./texture-menu.js";
import { domHelper } from "./domUtils.js";
import { CONFIG } from "./config.js";

const ERROR_MESSAGE = "Error: hexContainer not found!";

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
  setHexMetadata(element, { row, col, texture: hexData.texture, pieces: hexData.pieces });
  applyHexTexture(element, hexData.texture);
  // Render pieces if they exist (for loaded games)
  if (hexData.pieces && hexData.pieces.length > 0) {
    renderPieces(element, hexData.pieces);
  }
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

    // Render pieces if they exist
    renderPieces(element, hexData.pieces);
  } catch (error) {
    console.error(`Error updating hex [${row},${col}]:`, error);
  }
}

function renderPieces(element, pieces) {
  // Remove existing pieces
  element.querySelectorAll('.piece').forEach(p => p.remove());
  const existingContainer = element.querySelector('.pieces-container');
  if (existingContainer) existingContainer.remove();

  // If no pieces, return
  if (!pieces || pieces.length === 0) return;

  // Separate structures and knights
  const structure = pieces.find(p => ['city', 'stronghold', 'village'].includes(p.type));
  const knights = pieces.filter(p => p.type === 'knight');

  // Container for pieces
  const container = document.createElement('div');
  container.className = 'pieces-container';
  element.appendChild(container);

  // Render the structure (city, stronghold or village)
  if (structure) {
    const structureElement = document.createElement('div');
    structureElement.className = `piece piece-${structure.type} piece-${structure.color}`;
    structureElement.title = `${getStructureName(structure.type)} - ${structure.color}`;
    container.appendChild(structureElement);
  }

  // Group knights by color
  if (knights.length > 0) {
    const knightsByColor = {};
    knights.forEach(k => {
      if (!knightsByColor[k.color]) knightsByColor[k.color] = [];
      knightsByColor[k.color].push(k);
    });

    const knightsContainer = document.createElement('div');
    const totalKnights = Math.min(knights.length, 4);
    knightsContainer.className = `knights-container knights-${totalKnights}`;

    // Show up to 4 knights total, prioritizing color variety
    let knightsShown = 0;
    const colors = Object.keys(knightsByColor);
    let colorIndex = 0;

    while (knightsShown < 4 && knightsShown < knights.length) {
      const color = colors[colorIndex % colors.length];
      if (knightsByColor[color].length > 0) {
        const knight = knightsByColor[color].shift();
        const knightElement = document.createElement('div');
        knightElement.className = `piece piece-knight piece-${knight.color}`;
        knightElement.title = `Knight - ${knight.color}`;
        knightsContainer.appendChild(knightElement);
        knightsShown++;
      }
      colorIndex++;
      // Avoid infinite loop if all colors are empty
      if (colorIndex > colors.length * 3) break;
    }

    container.appendChild(knightsContainer);
  }
}

function getStructureName(type) {
  const names = {
    city: 'City',
    stronghold: 'Stronghold',
    village: 'Village'
  };
  return names[type] || type;
}

function setHexMetadata(element, { row, col, texture, pieces }) {
  domHelper.setDataset(element, {
    hex: JSON.stringify({ row, col, texture, pieces })
  });
}

function applyHexTexture(element, texture) {
  domHelper.setBackgroundImage(element, texture ? `/images/${texture}` : '');
}
