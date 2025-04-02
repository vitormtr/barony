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
    const updatedData = { ...currentHexData, texture: hexData.texture };
    
    domHelper.setDataset(element, { hex: JSON.stringify(updatedData) });
    domHelper.setBackgroundImage(
      element,
      hexData.texture
        ? `${CONFIG.PATHS.IMAGES}${hexData.texture}`
        : ''
    );
  } catch (error) {
    console.error(`Erro ao atualizar hexágono [${row},${col}]:`, error);
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
