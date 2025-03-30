import { Hex } from "./Hex.js";
import { addClickEventToHexagons, closeMenuOnClickOutside } from "./texture-menu.js";
// Constantes globais
const CONTAINER_ID = "hexContainer";
const ERROR_MESSAGE = "Erro: hexContainer não encontrado!";

/*********************
 * FUNÇÕES PÚBLICAS *
 *********************/

/**
 * Destroi o tabuleiro removendo todos os elementos do container
 * @returns {void} Não retorna valor
 */
export function destroyBoard() {
  const container = getContainer();
  container && (container.innerHTML = "");
}

/**
 * Cria todo o tabuleiro baseado no estado fornecido
 * @param {Array} boardState - Matriz bidimensional com o estado inicial do tabuleiro
 * @returns {void} Não retorna valor
 */
export function createBoard(boardState) {
  const container = getContainer();
  if (!container) return logError();

  clearContainer(container);
  buildBoardStructure(container, boardState);
  addClickEventToHexagons();
  closeMenuOnClickOutside();
}

/**
 * Atualiza o tabuleiro existente com um novo estado
 * @param {Object} newBoard - Objeto contendo o novo estado do tabuleiro
 * @returns {void} Não retorna valor
 */
export function updateBoard(newBoard) {
  const newBoardState = newBoard.boardState;
  newBoardState.forEach(updateRow);
}

/**********************
 * FUNÇÕES AUXILIARES *
 **********************/

/**
 * Obtém o elemento container do tabuleiro
 * @returns {HTMLElement|null} Elemento do container ou null se não encontrado
 */
function getContainer() {
  return document.getElementById(CONTAINER_ID);
}

/**
 * Loga mensagem de erro no console
 * @returns {null} Retorna null para tratamento de fluxo
 */
function logError() {
  console.error(ERROR_MESSAGE);
  return null;
}

/**
 * Limpa o conteúdo do container
 * @param {HTMLElement} container - Elemento container do tabuleiro
 * @returns {void} Não retorna valor
 */
function clearContainer(container) {
  container.innerHTML = "";
}

/**
 * Constrói toda a estrutura do tabuleiro
 * @param {HTMLElement} container - Elemento container principal
 * @param {Array} boardState - Matriz com o estado do tabuleiro
 * @returns {void} Não retorna valor
 */
function buildBoardStructure(container, boardState) {
  boardState.forEach((rowData, rowIndex) => {
    container.appendChild(createRow(rowIndex, rowData));
  });
}

/**
 * Cria uma linha do tabuleiro com hexágonos
 * @param {number} rowIndex - Índice da linha (baseado em 0)
 * @param {Array} rowData - Dados dos hexágonos na linha
 * @returns {HTMLElement} Elemento div contendo a linha completa
 */
function createRow(rowIndex, rowData) {
  const rowContainer = document.createElement("div");
  rowContainer.classList.add("hex-row");

  rowData.forEach((hexData, colIndex) => {
    rowContainer.appendChild(createHexElement(rowIndex, colIndex, hexData));
  });

  return rowContainer;
}

/**
 * Cria um elemento de hexágono individual
 * @param {number} row - Número da linha
 * @param {number} col - Número da coluna
 * @param {Object} hexData - Dados do hexágono (textura)
 * @returns {HTMLElement} Elemento do hexágono configurado
 */
function createHexElement(row, col, hexData) {
  const hex = new Hex(row, col, hexData.texture);
  const element = hex.element;

  setHexMetadata(element, { row, col, texture: hexData.texture });
  applyHexTexture(element, hexData.texture);

  return element;
}

/**
 * Atualiza todos os hexágonos de uma linha
 * @param {Array} rowData - Dados da linha para atualização
 * @param {number} rowIndex - Índice da linha sendo atualizada
 * @returns {void} Não retorna valor
 */
function updateRow(rowData, rowIndex) {
  rowData.forEach((hexData, colIndex) => {
    updateHexElement(rowIndex, colIndex, hexData);
  });
}

/**
 * Atualiza um elemento específico de hexágono
 * @param {number} row - Índice da linha do hexágono
 * @param {number} col - Índice da coluna do hexágono
 * @param {Object} hexData - Novos dados do hexágono
 * @returns {void} Não retorna valor
 */
function updateHexElement(row, col, hexData) {
  const element = document.querySelector(
    `.hexagon[data-row="${row}"][data-col="${col}"]`
  );

  if (!element) return;

  const updatedData = updateHexData(element.dataset.hex, hexData.texture);
  element.dataset.hex = JSON.stringify(updatedData);
  applyHexTexture(element, hexData.texture);
}

/**********************
 * FUNÇÕES UTILITÁRIAS *
 **********************/

/**
 * Define os metadados do hexágono no dataset do elemento
 * @param {HTMLElement} element - Elemento do hexágono
 * @param {Object} data - Dados a serem armazenados {row, col, texture}
 * @returns {void} Não retorna valor
 */
function setHexMetadata(element, { row, col, texture }) {
  element.dataset.hex = JSON.stringify({ row, col, texture });
}

/**
 * Aplica a textura visual ao elemento do hexágono
 * @param {HTMLElement} element - Elemento do hexágono
 * @param {string|null} texture - Nome do arquivo de textura ou null
 * @returns {void} Não retorna valor
 */
function applyHexTexture(element, texture) {
  element.style.backgroundImage = texture 
    ? `url(/images/${texture})` 
    : "";
}

/**
 * Atualiza os dados do hexágono mantendo informações existentes
 * @param {string} existingData - Dados atuais no formato JSON string
 * @param {string|null} newTexture - Nova textura a ser aplicada
 * @returns {Object} Novo objeto com dados atualizados
 */
function updateHexData(existingData, newTexture) {
  const data = JSON.parse(existingData);
  return { ...data, texture: newTexture };
}