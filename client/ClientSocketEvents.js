import { createBoard, updateBoard } from './BoardRender.js';
import { hideMenu } from './home-menu.js';
import { createPlayersElement } from './PlayerInterface.js';

// Constantes de eventos do Socket.IO
const SOCKET_EVENTS = {
  CONNECT: 'connect',
  UPDATE_BOARD: 'updateBoard',
  CREATE_BOARD: 'createBoard',
  ERROR: 'error',
  DRAW_PLAYERS: 'drawPlayers',
  JOIN_ROOM: 'joinRoom',
  CREATE_ROOM: 'createRoom'
};

// Configuração inicial do socket
export const socket = io();

/******************************
 * CONFIGURAÇÃO DOS LISTENERS *
 ******************************/

// Eventos de conexão
socket.on(SOCKET_EVENTS.CONNECT, handleSocketConnect);

// Eventos do tabuleiro
socket.on(SOCKET_EVENTS.UPDATE_BOARD, handleBoardUpdate);
socket.on(SOCKET_EVENTS.CREATE_BOARD, handleBoardCreation);

// Eventos de jogadores
socket.on(SOCKET_EVENTS.DRAW_PLAYERS, handlePlayersDraw);

// Eventos de erro
socket.on(SOCKET_EVENTS.ERROR, handleSocketError);

/*************************
 * HANDLERS DE EVENTOS *
 *************************/

/**
 * Manipula evento de conexão estabelecida
 */
function handleSocketConnect() {
  console.log("Conexão estabelecida com ID:", socket.id);
}

/**
 * Atualiza o estado do tabuleiro
 * @param {Object} boardState - Novo estado do tabuleiro
 */
function handleBoardUpdate(boardState) {
  console.log('Recebida atualização do tabuleiro');
  updateBoard(boardState);
}

/**
 * Cria novo tabuleiro e oculta menu
 * @param {Object} boardState - Estado inicial do tabuleiro
 */
function handleBoardCreation(boardState) {
  console.log('Iniciando criação do tabuleiro');
  createBoard(boardState);
  hideMenu();
}

/**
 * Exibe jogadores na interface
 * @param {Object} players - Dados dos jogadores
 */
function handlePlayersDraw(players) {
  console.log('Atualizando interface dos jogadores');
  createPlayersElement(Object.values(players));
}

/**
 * Manipula erros do servidor
 * @param {string} message - Mensagem de erro
 */
function handleSocketError(message) {
  alert(`Erro no servidor: ${message}`);
}

/***********************
 * EMISSORES DE EVENTOS *
 ***********************/

/**
 * Entra em uma sala existente
 * @param {string} roomId - ID da sala
 */
export function emitJoinRoom(roomId) {
  socket.emit(SOCKET_EVENTS.JOIN_ROOM, roomId);
}

/**
 * Cria uma nova sala
 */
export function emitCreateRoom() {
  socket.emit(SOCKET_EVENTS.CREATE_ROOM);
}