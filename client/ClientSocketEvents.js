import { createBoard, updateBoard } from './BoardRender.js';
import { hideMenu } from './home-menu.js';
import { createPlayersElement } from './PlayerInterface.js';
import { CONFIG } from './config.js';
import { showError, showWarning, showInfo, showSuccess } from './notifications.js';
import { updateTurnIndicator, setLocalPlayer } from './turnIndicator.js';
import { showRoomInfo } from './roomInfo.js';
import { setLeader, disableDistributionButton, enableDistributionButton } from './leaderControls.js';
import {
  setPhase,
  setPlacementStep,
  setCitiesRemaining,
  setCityPosition,
  resetPlacementState,
  addPieceClickHandler
} from './pieceMenu.js';
import {
  disableTextureMenu,
  enableTextureMenu,
  showBoardCompleteTransition
} from './texture-menu.js';
import { showPlayerColor } from './playerColorIndicator.js';
import { initBattlePhase, onTurnChanged as actionMenuTurnChanged, hideActionMenu } from './actionMenu.js';

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
socket.on('initialPlacementStarted', handleInitialPlacementStarted);
socket.on('initialPlacementUpdate', handleInitialPlacementUpdate);
socket.on('initialPlacementComplete', handleInitialPlacementComplete);
socket.on('piecePlaced', handlePiecePlaced);


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
  // Este evento é emitido para TODOS os jogadores quando alguém entra
  // Só atualiza se for o próprio jogador (e ainda não tiver player definido)
  if (!player && currentPlayer.id === socket.id) {
    player = currentPlayer;
    setLocalPlayer(currentPlayer.id);
  }
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
  // Notifica o menu de ações sobre mudança de turno
  actionMenuTurnChanged();
}

function handlePlayerDisconnected(data) {
  console.log('Jogador desconectou:', data);
  showWarning(`Jogador ${data.playerColor} desconectou.`);
}

function handlePhaseChanged(data) {
  console.log('Fase alterada:', data);
  setPhase(data.phase);

  if (data.phase === 'initialPlacement') {
    if (data.step) setPlacementStep(data.step);
    showInfo('Fase de posicionamento inicial!');
  } else if (data.phase === 'battle') {
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

  // Atualiza os dados do jogador local
  if (data.player) {
    player = data.player;
    setLocalPlayer(data.player.id);
    showPlayerColor(data.player.color);
  }
}

function handleRoomJoined(data) {
  console.log('Entrou na sala:', data.roomId);
  showRoomInfo(data.roomId);
  showSuccess(`Você entrou na sala ${data.roomId}!`);
  // Quem entra não é líder
  setLeader(false);

  // Atualiza os dados do jogador local
  if (data.player) {
    player = data.player;
    setLocalPlayer(data.player.id);
    showPlayerColor(data.player.color);
  }
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
  resetPlacementState();
  enableTextureMenu();
  hideActionMenu();
}

function handleRestartResult(result) {
  if (result.success) {
    console.log('Reinício bem-sucedido');
  } else {
    showError(result.message);
  }
}

function handleInitialPlacementStarted(data) {
  console.log('Posicionamento inicial iniciado:', data);

  // Desabilita o menu de texturas
  disableTextureMenu();

  // Mostra transição de fim da construção do tabuleiro
  showBoardCompleteTransition(() => {
    // Após a transição, configura a fase de posicionamento
    setPhase('initialPlacement');
    setPlacementStep(data.currentStep);
    setCitiesRemaining(data.citiesRemaining || 3);
    setCityPosition(null);
    showInfo(data.message);

    // Atualiza o indicador de turno (dados vêm junto com o evento)
    if (data.currentPlayerId && data.currentPlayerColor) {
      updateTurnIndicator({
        currentPlayerId: data.currentPlayerId,
        currentPlayerColor: data.currentPlayerColor
      });
    }

    // Adiciona handler de clique para peças
    setTimeout(() => addPieceClickHandler(), 100);
  });
}

function handleInitialPlacementUpdate(data) {
  console.log('Atualização de posicionamento:', data);

  if (data.currentStep) setPlacementStep(data.currentStep);
  if (data.citiesRemaining !== undefined) setCitiesRemaining(data.citiesRemaining);

  showInfo(data.message);
}

function handleInitialPlacementComplete(data) {
  console.log('Posicionamento inicial completo:', data);
  setPhase('battle');
  showSuccess(data.message);
  // Inicia a fase de batalha com o menu de ações
  setTimeout(() => initBattlePhase(), 500);
}

function handlePiecePlaced(data) {
  console.log('Peça colocada:', data);
  // A atualização do tabuleiro é feita via updateBoard
  if (data.pieceType === 'city') {
    setCityPosition({ row: data.row, col: data.col });
  }
}


