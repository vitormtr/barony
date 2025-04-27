import { createBoard, updateBoard } from './BoardRender.js';
import { hideMenu } from './home-menu.js';
import { createPlayersElement } from './PlayerInterface.js';
import { CONFIG } from './config.js';
export const socket = io();
export let player = null;

socket.on(CONFIG.SOCKET.EVENTS.CONNECT, handleSocketConnect);
socket.on(CONFIG.SOCKET.EVENTS.UPDATE_BOARD, handleBoardUpdate);
socket.on(CONFIG.SOCKET.EVENTS.CREATE_BOARD, handleBoardCreation);
socket.on(CONFIG.SOCKET.EVENTS.DRAW_PLAYERS, handlePlayersDraw);
socket.on(CONFIG.SOCKET.EVENTS.ERROR, handleSocketError);
socket.on(CONFIG.SOCKET.EVENTS.PLAYER_JOINED_ROOM, handlePlayerJoinedRoom);
socket.on(CONFIG.SOCKET.EVENTS.PLAYER_DATA_RESPONSE, handlePlayerDataResponse);


export function emitJoinRoom(roomId) {
  socket.emit(CONFIG.SOCKET.EVENTS.JOIN_ROOM, roomId);
}

export function emitCreateRoom() {
  socket.emit(CONFIG.SOCKET.EVENTS.CREATE_ROOM);
}

export function emitUpdatePlayerTexture(texture) {
  const payload = { texture, player };
  socket.emit(CONFIG.SOCKET.EVENTS.UPDATE_PLAYER_TEXTURE, payload)
}

export function emitRequestPlayerData() {
  console.log('Solicitando dados do jogador ', socket.id);
  socket.emit(CONFIG.SOCKET.EVENTS.REQUEST_PLAYER_DATA, socket.id);
}

function handleSocketConnect() {
  console.log("Conexão estabelecida com ID:", socket.id);
}

function handleBoardUpdate(boardState) {
  console.log('Recebida atualização do tabuleiro');
  updateBoard(boardState);
}

function handleBoardCreation(boardState) {
  console.log('Iniciando criação do tabuleiro');
  createBoard(boardState);
  hideMenu();
}

function handlePlayersDraw(players) {
  console.log('Atualizando interface dos jogadores');
  createPlayersElement(Object.values(players));
}

function handlePlayerJoinedRoom(currentPlayer) {
  player = currentPlayer;
}

export function handlePlayerDataResponse(playerData) {
  console.log('Dados do jogador recebidos:', playerData);
  player = playerData;
}

function handleSocketError(message) {
  alert(`Erro no servidor: ${message}`);
}


