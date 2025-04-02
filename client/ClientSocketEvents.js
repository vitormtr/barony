import { createBoard, updateBoard } from './BoardRender.js';
import { hideMenu } from './home-menu.js';
import { createPlayersElement } from './PlayerInterface.js';
import { CONFIG } from './config.js';

export const socket = io();

socket.on(CONFIG.SOCKET.EVENTS.CONNECT, handleSocketConnect);
socket.on(CONFIG.SOCKET.EVENTS.UPDATE_BOARD, handleBoardUpdate);
socket.on(CONFIG.SOCKET.EVENTS.CREATE_BOARD, handleBoardCreation);
socket.on(CONFIG.SOCKET.EVENTS.DRAW_PLAYERS, handlePlayersDraw);
socket.on(CONFIG.SOCKET.EVENTS.ERROR, handleSocketError);

export function emitJoinRoom(roomId) {
  socket.emit(CONFIG.SOCKET.EVENTS.JOIN_ROOM, roomId);
}

export function emitCreateRoom() {
  socket.emit(CONFIG.SOCKET.EVENTS.CREATE_ROOM);
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

function handleSocketError(message) {
  alert(`Erro no servidor: ${message}`);
}

