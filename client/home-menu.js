import { emitCreateRoom, emitJoinRoom } from './ClientSocketEvents.js';
import { CONFIG } from './config.js';
import { domHelper } from './domUtils.js';


const elements = {
  createRoomBtn: document.getElementById(CONFIG.SELECTORS.CREATE_ROOM),
  joinRoomBtn: document.getElementById(CONFIG.SELECTORS.JOIN_ROOM),
  roomIdInput: document.getElementById(CONFIG.SELECTORS.ROOM_INPUT),
  menu: document.getElementById(CONFIG.SELECTORS.MENU)
};

function initializeMenu() {
  setupEventListeners();
}

function setupEventListeners() {
  domHelper.onClick(createRoomBtn, handleCreateRoom);
  domHelper.onClick(joinRoomBtn, handleJoinRoom);
}

function handleCreateRoom() {
  emitCreateRoom();
}

function handleJoinRoom() {
  const roomId = elements.roomIdInput.value.trim();
  if (roomId) {
    emitJoinRoom(roomId);
  }
}

export function hideMenu() {
  setElementsVisibility([
    elements.createRoomBtn,
    elements.joinRoomBtn,
    elements.roomIdInput,
    elements.menu
  ], 'none');

  document.body.style.backgroundImage = 'none';
}

function setElementsVisibility(elements, displayValue) {
  elements.forEach(element => {
    element.style.display = displayValue;
  });
}

initializeMenu();