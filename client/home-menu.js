import { emitCreateRoom, emitJoinRoom } from './ClientSocketEvents.js';

// Constantes de elementos da UI
const UI_ELEMENTS = {
  CREATE_BTN: 'createRoomBtn',
  JOIN_BTN: 'joinRoomBtn',
  ROOM_INPUT: 'roomIdInput',
  MENU_CONTAINER: 'logoMenuContainer'
};

// Configuração de estilos
const STYLE_CONFIG = {
  HIDDEN: 'none',
  BACKGROUND_IMAGE: 'none'
};

// Inicialização dos elementos DOM
const elements = {
  createRoomBtn: document.getElementById(UI_ELEMENTS.CREATE_BTN),
  joinRoomBtn: document.getElementById(UI_ELEMENTS.JOIN_BTN),
  roomIdInput: document.getElementById(UI_ELEMENTS.ROOM_INPUT),
  menu: document.getElementById(UI_ELEMENTS.MENU_CONTAINER)
};

/***********************
 * CONFIGURAÇÃO INICIAL *
 ***********************/

/**
 * Configura os event listeners para os controles da sala
 */
function initializeMenu() {
  setupEventListeners();
}

/**
 * Adiciona os ouvintes de eventos aos botões
 * @private
 */
function setupEventListeners() {
  elements.createRoomBtn.addEventListener('click', handleCreateRoom);
  elements.joinRoomBtn.addEventListener('click', handleJoinRoom);
}

/*********************
 * HANDLERS DE EVENTOS *
 *********************/

/**
 * Manipula o clique no botão de criar sala
 * @private
 */
function handleCreateRoom() {
  emitCreateRoom();
}

/**
 * Manipula o clique no botão de entrar na sala
 * @private
 */
function handleJoinRoom() {
  const roomId = elements.roomIdInput.value.trim();
  if (roomId) {
    emitJoinRoom(roomId);
  }
}

/*********************
 * GERENCIAMENTO DA UI *
 *********************/

/**
 * Oculta todos os elementos do menu e remove o plano de fundo
 * @returns {void}
 */
export function hideMenu() {
  setElementsVisibility([
    elements.createRoomBtn,
    elements.joinRoomBtn,
    elements.roomIdInput,
    elements.menu
  ], STYLE_CONFIG.HIDDEN);
  
  document.body.style.backgroundImage = STYLE_CONFIG.BACKGROUND_IMAGE;
}

/**
 * Aplica visibilidade a múltiplos elementos
 * @param {Array<HTMLElement>} elements - Lista de elementos a modificar
 * @param {string} displayValue - Valor do display CSS a aplicar
 * @private
 */
function setElementsVisibility(elements, displayValue) {
  elements.forEach(element => {
    element.style.display = displayValue;
  });
}

// Inicializa o menu quando o script é carregado
initializeMenu();