import { createBoard, updateBoard } from './BoardRender.js';
import { hideMenu } from './home-menu.js';
import { createPlayersElement } from './PlayerInterface.js';
import { CONFIG } from './config.js';
import { showError, showWarning, showInfo, showSuccess } from './notifications.js';
import { updateTurnIndicator, setLocalPlayer } from './turnIndicator.js';
import { showRoomInfo } from './roomInfo.js';
import { setLeader, disableDistributionButton, enableDistributionButton } from './leaderControls.js';

export const socket = io();
export let player = null;

socket.on(CONFIG.SOCKET.EVENTS.CONNECT, handleSocketConnect);
socket.on(CONFIG.SOCKET.EVENTS.UPDATE_BOARD, handleBoardUpdate);
socket.on(CONFIG.SOCKET.EVENTS.CREATE_BOARD, handleBoardCreation);
socket.on(CONFIG.SOCKET.EVENTS.DRAW_PLAYERS, handlePlayersDraw);
socket.on(CONFIG.SOCKET.EVENTS.ERROR, handleSocketError);
socket.on(CONFIG.SOCKET.EVENTS.PLAYER_JOINED_ROOM, handlePlayerJoinedRoom);
socket.on(CONFIG.SOCKET.EVENTS.PLAYER_DATA_RESPONSE, handlePlayerDataResponse);
socket.on('turnChanged', handleTurnChanged);
socket.on('playerDisconnected', handlePlayerDisconnected);
socket.on('phaseChanged', handlePhaseChanged);
socket.on('roomCreated', handleRoomCreated);
socket.on('roomJoined', handleRoomJoined);
socket.on('randomDistributionComplete', handleRandomDistributionComplete);
socket.on('gameRestarted', handleGameRestarted);
socket.on('restartResult', handleRestartResult);


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
  setLocalPlayer(currentPlayer.id);
}

export function handlePlayerDataResponse(playerData) {
  console.log('Dados do jogador recebidos:', playerData);
  player = playerData;
  setLocalPlayer(playerData.id);
}

function handleSocketError(message) {
  showError(`Erro: ${message}`);
}

function handleTurnChanged(turnData) {
  console.log('Turno alterado:', turnData);
  updateTurnIndicator(turnData);
}

function handlePlayerDisconnected(data) {
  console.log('Jogador desconectou:', data);
  showWarning(`Jogador ${data.playerColor} desconectou.`);
}

function handlePhaseChanged(data) {
  console.log('Fase alterada:', data);
  if (data.phase === 'battle') {
    showInfo('Fase de colocação concluída! Iniciando fase de batalha...');
  }
}

function handleRoomCreated(data) {
  console.log('Sala criada:', data.roomId);
  showRoomInfo(data.roomId);
  showSuccess(`Sala ${data.roomId} criada! Compartilhe o código.`);

  // Quem criou a sala é o líder
  if (data.isLeader) {
    setLeader(true);
  }
}

function handleRoomJoined(data) {
  console.log('Entrou na sala:', data.roomId);
  showRoomInfo(data.roomId);
  showSuccess(`Você entrou na sala ${data.roomId}!`);
  // Quem entra não é líder
  setLeader(false);
}

function handleRandomDistributionComplete(data) {
  console.log('Distribuição aleatória completa:', data);
  showSuccess(data.message);
  disableDistributionButton();
}

function handleGameRestarted(data) {
  console.log('Jogo reiniciado:', data);
  showSuccess(data.message);
  enableDistributionButton();
}

function handleRestartResult(result) {
  if (result.success) {
    console.log('Reinício bem-sucedido');
  } else {
    showError(result.message);
  }
}


