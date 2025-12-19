import { createBoard, updateBoard } from './BoardRender.js';
import { createPlayersElement } from './PlayerInterface.js';
import { CONFIG } from './config.js';
import { showError, showWarning, showInfo, showSuccess } from './notifications.js';
import { updateTurnIndicator, setLocalPlayer } from './turnIndicator.js';
import { showRoomInfo, getRoomId } from './roomInfo.js';
import { setLeader, disableDistributionButton, enableDistributionButton, showSaveButton, hideSaveButton } from './leaderControls.js';
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
import { createTitleCard, updateTitleCard, removeTitleCard } from './titleCard.js';
import { saveToLocal, startAutoSave, updateGameState, addLocalSaveButtons } from './localSave.js';
import { showUIToggle, hideUIToggle } from './uiToggle.js';
import { initGameHistory, addHistoryEntry, showHistory, hideHistory, clearHistory } from './gameHistory.js';

export const socket = io();
export let player = null;

// Getter function for socket (avoids circular dependency issues)
export function getSocket() {
  return socket;
}

// Local hideMenu function to avoid circular dependency with home-menu.js
function hideMenu() {
  const logoMenuContainer = document.getElementById('logoMenuContainer');
  if (logoMenuContainer) {
    logoMenuContainer.style.display = 'none';
  }
  document.body.style.backgroundImage = 'none';
  showUIToggle();
}

// Getter function to always get the current player reference
export function getPlayer() {
  return player;
}

// Session storage keys
const SESSION_KEYS = {
  ROOM_ID: 'barony_roomId',
  PLAYER_COLOR: 'barony_playerColor'
};

// Save session data for reconnection
function saveSession(roomId, playerColor) {
  sessionStorage.setItem(SESSION_KEYS.ROOM_ID, roomId);
  sessionStorage.setItem(SESSION_KEYS.PLAYER_COLOR, playerColor);
}

// Clear session data
function clearSession() {
  sessionStorage.removeItem(SESSION_KEYS.ROOM_ID);
  sessionStorage.removeItem(SESSION_KEYS.PLAYER_COLOR);
}

// Get saved session
function getSavedSession() {
  const roomId = sessionStorage.getItem(SESSION_KEYS.ROOM_ID);
  const playerColor = sessionStorage.getItem(SESSION_KEYS.PLAYER_COLOR);
  if (roomId && playerColor) {
    return { roomId, playerColor };
  }
  return null;
}

// Try to reconnect to saved session
function tryReconnect() {
  const session = getSavedSession();
  if (session) {
    console.log('Attempting to reconnect to room:', session.roomId);
    socket.emit('rejoinRoom', { roomId: session.roomId, playerColor: session.playerColor });
  }
}

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
socket.on('youAreLeader', handleYouAreLeader);
socket.on('dukeAnnounced', handleDukeAnnounced);
socket.on('gameEnded', handleGameEnded);
socket.on('rejoinSuccess', handleRejoinSuccess);
socket.on('rejoinFailed', handleRejoinFailed);
socket.on('saveGameResult', handleSaveGameResult);
socket.on('savesList', handleSavesList);
socket.on('gameLoaded', handleGameLoaded);
socket.on('loadGameFailed', handleLoadGameFailed);
socket.on('joinedLoadedGame', handleJoinedLoadedGame);
socket.on('joinLoadedGameFailed', handleJoinLoadedGameFailed);
socket.on('loadedGameReady', handleLoadedGameReady);
socket.on('playerClaimedColor', handlePlayerClaimedColor);
socket.on('loadedGameInfo', handleLoadedGameInfo);
socket.on('loadedGameColorSelect', handleLoadedGameColorSelect);


export function emitJoinRoom(roomId) {
  socket.emit(CONFIG.SOCKET.EVENTS.JOIN_ROOM, roomId);
}

export function emitCreateRoom() {
  socket.emit(CONFIG.SOCKET.EVENTS.CREATE_ROOM);
}

export function emitCreateRoomWithColor(color, playerName) {
  socket.emit('createRoomWithColor', { color, playerName });
}

export function emitJoinRoomWithColor(roomId, color, playerName) {
  socket.emit('joinRoomWithColor', { roomId, color, playerName });
}

export function emitUpdatePlayerTexture(texture) {
  const payload = { texture, player };
  socket.emit(CONFIG.SOCKET.EVENTS.UPDATE_PLAYER_TEXTURE, payload)
}

export function emitRequestPlayerData() {
  console.log('Requesting player data ', socket.id);
  socket.emit(CONFIG.SOCKET.EVENTS.REQUEST_PLAYER_DATA, socket.id);
}

function handleSocketConnect() {
  console.log("Connection established with ID:", socket.id);
  // Try to reconnect to previous session
  tryReconnect();
}

// Store latest game state for local save
let latestBoardState = null;
let latestPlayers = null;
let latestGamePhase = null;
let latestTurnData = null;

function handleBoardUpdate(boardState) {
  console.log('Board update received');
  updateBoard(boardState);
  // boardState from server is { boardState: [...] }, extract the array
  latestBoardState = boardState.boardState || boardState;
  saveGameStateLocally();
}

function handleBoardCreation(boardState) {
  console.log('Starting board creation');
  createBoard(boardState);
  hideMenu();
  // boardState may be an array directly or { boardState: [...] }
  latestBoardState = Array.isArray(boardState) ? boardState : (boardState.boardState || boardState);
  saveGameStateLocally();
}

// Save current game state to localStorage
function saveGameStateLocally() {
  if (!latestBoardState) return;

  const gameState = {
    roomId: getRoomId(),
    boardState: latestBoardState,
    players: latestPlayers,
    gamePhase: latestGamePhase,
    currentTurn: latestTurnData,
    localPlayerColor: player?.color
  };

  saveToLocal(gameState);
  updateGameState(gameState);
}

function handlePlayersDraw(players) {
  console.log('Updating players interface');

  // Handle both array and object formats
  const playersArray = Array.isArray(players) ? players : Object.values(players);
  createPlayersElement(playersArray);
  latestPlayers = playersArray;
  saveGameStateLocally();

  // Update local player data if present in the list
  if (player) {
    const updatedPlayer = playersArray.find(p => p.id === player.id);
    if (updatedPlayer) {
      player.resources = updatedPlayer.resources;
      player.pieces = updatedPlayer.pieces;
      player.title = updatedPlayer.title;
      player.victoryPoints = updatedPlayer.victoryPoints;
      // Calculate resource points for title card
      player.resourcePoints = calculateResourcePoints(updatedPlayer.resources);
      player.titleName = getTitleName(updatedPlayer.title);
      // Update title card
      updateTitleCard();
    }
  }
}

function calculateResourcePoints(resources) {
  const values = { mountain: 2, forest: 3, plain: 4, field: 5 };
  let total = 0;
  for (const [resource, count] of Object.entries(resources || {})) {
    total += (count || 0) * (values[resource] || 0);
  }
  return total;
}

function getTitleName(title) {
  const titles = {
    'baron': 'Baron',
    'viscount': 'Viscount',
    'count': 'Count',
    'marquis': 'Marquis',
    'duke': 'Duke'
  };
  return titles[title?.toLowerCase()] || 'Baron';
}

function getColorHex(color) {
  const colors = {
    red: '#c62828',
    blue: '#1565c0',
    green: '#2e7d32',
    yellow: '#f9a825'
  };
  return colors[color] || '#888';
}

function handlePlayerJoinedRoom(currentPlayer) {
  // This event is emitted to ALL players when someone joins
  // Only update if it's the player themselves (and player not defined yet)
  if (!player && currentPlayer.id === socket.id) {
    player = currentPlayer;
    setLocalPlayer(currentPlayer.id);
  }
}

export function handlePlayerDataResponse(playerData) {
  console.log('Player data received:', playerData);
  if (player) {
    // Update properties in place to preserve the exported reference
    Object.assign(player, playerData);
  } else {
    player = playerData;
  }
  // Calculate resource points for title card display
  player.resourcePoints = calculateResourcePoints(player.resources);
  player.titleName = getTitleName(player.title);
  setLocalPlayer(playerData.id);
  updateTitleCard();
}

function handleSocketError(message) {
  showError(`Error: ${message}`);
}

function handleTurnChanged(turnData) {
  console.log('Turn changed:', turnData);
  updateTurnIndicator(turnData);
  // Notify action menu about turn change
  actionMenuTurnChanged();
  latestTurnData = turnData;
  saveGameStateLocally();
  // Add to history
  addHistoryEntry('turnEnd', turnData.currentPlayerColor, `${turnData.currentPlayerName}'s turn`);
}

function handlePlayerDisconnected(data) {
  console.log('Player disconnected:', data);
  const displayName = data.playerName || data.playerColor;
  showWarning(`${displayName} disconnected.`);
}

function handlePhaseChanged(data) {
  console.log('Phase changed:', data);
  setPhase(data.phase);
  latestGamePhase = data.phase;
  saveGameStateLocally();

  if (data.phase === 'initialPlacement') {
    if (data.step) setPlacementStep(data.step);
    showInfo('Initial placement phase!');
  } else if (data.phase === 'battle') {
    showInfo('Placement phase complete! Starting battle phase...');
    // Start auto-save and add download button when battle phase starts
    startAutoSave();
    addLocalSaveButtons();
  }
}

function handleRoomCreated(data) {
  console.log('Room created:', data.roomId);
  hideMenu();
  showRoomInfo(data.roomId);
  showSuccess(`Room ${data.roomId} created! Share the code.`);

  // Room creator is the leader
  if (data.isLeader) {
    setLeader(true);
  }

  // Update local player data
  if (data.player) {
    player = data.player;
    setLocalPlayer(data.player.id);
    showPlayerColor(data.player.color, data.player.name);
    // Save session for reconnection
    saveSession(data.roomId, data.player.color);
  }
}

function handleRoomJoined(data) {
  console.log('Joined room:', data.roomId);
  hideMenu();
  showRoomInfo(data.roomId);
  showSuccess(`You joined room ${data.roomId}!`);
  // Joiners are not leaders
  setLeader(false);

  // Update local player data
  if (data.player) {
    player = data.player;
    setLocalPlayer(data.player.id);
    showPlayerColor(data.player.color, data.player.name);
    // Save session for reconnection
    saveSession(data.roomId, data.player.color);
  }
}

function handleRandomDistributionComplete(data) {
  console.log('Random distribution complete:', data);
  showSuccess(data.message);
  disableDistributionButton();
  showSaveButton();
}

function handleGameRestarted(data) {
  console.log('Game restarted:', data);
  showSuccess(data.message);
  enableDistributionButton();
  resetPlacementState();
  enableTextureMenu();
  hideActionMenu();
  removeTitleCard();
  hideSaveButton();
}

function handleRestartResult(result) {
  if (result.success) {
    console.log('Restart successful');
  } else {
    showError(result.message);
  }
}

function handleInitialPlacementStarted(data) {
  console.log('Initial placement started:', data);

  // Disable texture menu
  disableTextureMenu();

  // Show board completion transition
  showBoardCompleteTransition(() => {
    // After transition, configure placement phase
    setPhase('initialPlacement');
    setPlacementStep(data.currentStep);
    setCitiesRemaining(data.citiesRemaining || 3);
    setCityPosition(null);
    showInfo(data.message);

    // Update turn indicator (data comes with event)
    if (data.currentPlayerId && data.currentPlayerColor) {
      updateTurnIndicator({
        currentPlayerId: data.currentPlayerId,
        currentPlayerColor: data.currentPlayerColor
      });
    }

    // Add click handler for pieces
    setTimeout(() => addPieceClickHandler(), 100);
  });
}

function handleInitialPlacementUpdate(data) {
  console.log('Placement update:', data);

  if (data.currentStep) setPlacementStep(data.currentStep);
  if (data.citiesRemaining !== undefined) setCitiesRemaining(data.citiesRemaining);

  showInfo(data.message);
}

function handleInitialPlacementComplete(data) {
  console.log('Initial placement complete:', data);
  setPhase('battle');
  latestGamePhase = 'battle';
  showSuccess(data.message);
  // Start battle phase with action menu and title card
  setTimeout(() => {
    initBattlePhase();
    createTitleCard();
    // Initialize game history
    initGameHistory();
    showHistory();
    addHistoryEntry('gameStart', player?.color || 'blue', 'Battle phase');
    // Start auto-save and add download button
    startAutoSave();
    addLocalSaveButtons();
  }, 500);
}

function handlePiecePlaced(data) {
  console.log('Piece placed:', data);
  // Board update is done via updateBoard
  if (data.pieceType === 'city') {
    setCityPosition({ row: data.row, col: data.col });
  }
}

function handleYouAreLeader() {
  console.log('You are now the room leader!');
  setLeader(true);
  showInfo('You are now the room leader!');
}

function handleDukeAnnounced(data) {
  console.log('Duke announced:', data);
  showWarning(data.message);
}

function handleGameEnded(data) {
  console.log('Game ended:', data);
  hideActionMenu();
  showGameEndScreen(data);
}

function showGameEndScreen(data) {
  // Remove previous screen if exists
  const existing = document.getElementById('game-end-screen');
  if (existing) existing.remove();

  const screen = document.createElement('div');
  screen.id = 'game-end-screen';
  screen.className = 'game-end-screen';

  const scoresHtml = data.scores.map((s, i) => `
    <div class="score-row ${i === 0 ? 'winner' : ''}">
      <span class="rank">#${i + 1}</span>
      <span class="color-dot" style="background: ${getColorHex(s.color)}"></span>
      <span class="player-name">${s.name || s.color}</span>
      <span class="title">${s.title}</span>
      <span class="points">${s.score} pts</span>
      <span class="details">(${s.victoryPoints} VP + ${s.resources} resources)</span>
    </div>
  `).join('');

  const winnerName = data.winner.name || data.winner.color;

  screen.innerHTML = `
    <div class="game-end-content">
      <h1>🏆 Game Over!</h1>
      <h2>${winnerName} won!</h2>
      <div class="scores-list">
        ${scoresHtml}
      </div>
      <button class="play-again-btn" onclick="location.reload()">Play Again</button>
    </div>
  `;

  document.body.appendChild(screen);
}

function handleRejoinSuccess(data) {
  console.log('Rejoin successful:', data);

  // Hide menu and show game
  hideMenu();

  // Create the board
  createBoard(data.boardState);

  // Update player data
  player = data.player;
  setLocalPlayer(data.player.id);
  showPlayerColor(data.player.color, data.player.name);

  // Show room info
  showRoomInfo(data.roomId);

  // Set leader status
  setLeader(data.isLeader);

  // Draw all players
  createPlayersElement(Object.values(data.players));

  // Update turn indicator
  if (data.currentTurn) {
    updateTurnIndicator(data.currentTurn);
  }

  // Handle phase-specific UI
  if (data.gamePhase === 'battle') {
    setPhase('battle');
    latestGamePhase = 'battle';
    disableTextureMenu();
    if (data.isLeader) showSaveButton();
    setTimeout(() => {
      initBattlePhase();
      createTitleCard();
      // Initialize game history for loaded game
      initGameHistory();
      showHistory();
      addHistoryEntry('gameStart', player?.color || 'blue', 'Game loaded');
      // Trigger turn changed to setup action menu correctly
      actionMenuTurnChanged();
      // Start auto-save and add download button
      startAutoSave();
      addLocalSaveButtons();
    }, 500);
  } else if (data.gamePhase === 'initialPlacement') {
    setPhase('initialPlacement');
    disableTextureMenu();
    if (data.isLeader) showSaveButton();
    if (data.placementState) {
      setPlacementStep(data.placementState.step);
      setCitiesRemaining(data.placementState.citiesRemaining);
    }
    setTimeout(() => addPieceClickHandler(), 100);
  } else if (data.gamePhase === 'placement') {
    // Texture placement phase - leader can still distribute
    if (data.isLeader) {
      enableDistributionButton();
    }
  }

  showSuccess('Reconnected to game!');
}

function handleRejoinFailed(data) {
  console.log('Rejoin failed:', data.message);
  // Clear invalid session
  clearSession();
  // User stays on menu screen
}

// ========== SAVE/LOAD GAME HANDLERS ==========

// Callbacks for save/load UI
let onSavesListCallback = null;
let onGameLoadedCallback = null;
let onJoinedLoadedGameCallback = null;
let onLoadedGameInfoCallback = null;

export function setOnSavesListCallback(callback) {
  onSavesListCallback = callback;
}

export function setOnGameLoadedCallback(callback) {
  onGameLoadedCallback = callback;
}

export function setOnJoinedLoadedGameCallback(callback) {
  onJoinedLoadedGameCallback = callback;
}

export function setOnLoadedGameInfoCallback(callback) {
  onLoadedGameInfoCallback = callback;
}

function handleSaveGameResult(result) {
  if (result.success) {
    showSuccess(`Game saved! (${result.filename})`);
  } else {
    showError(result.message || 'Failed to save game');
  }
}

function handleSavesList(saves) {
  console.log('Saves list received:', saves);
  if (onSavesListCallback) {
    onSavesListCallback(saves);
  }
}

function handleGameLoaded(result) {
  console.log('Game loaded:', result);
  if (onGameLoadedCallback) {
    onGameLoadedCallback(result);
  }
}

function handleLoadGameFailed(data) {
  showError(data.message || 'Failed to load game');
}

function handleJoinedLoadedGame(result) {
  console.log('Joined loaded game:', result);

  if (result.success) {
    player = result.player;
    setLocalPlayer(result.player.id);
    showPlayerColor(result.player.color, result.player.name);
    setLeader(result.isLeader);

    if (onJoinedLoadedGameCallback) {
      onJoinedLoadedGameCallback(result);
    }
  }
}

function handleJoinLoadedGameFailed(data) {
  showError(data.message || 'Failed to join loaded game');
}

function handleLoadedGameReady(data) {
  console.log('Loaded game ready:', data);
  console.log('handleLoadedGameReady - currentTurn:', data.currentTurn);
  console.log('handleLoadedGameReady - player:', player);
  console.log('handleLoadedGameReady - player.id:', player?.id);

  // Hide menu and show game
  hideMenu();

  // Create the board
  createBoard(data.boardState);

  // Update local player data from server
  const playersArray = Array.isArray(data.players) ? data.players : Object.values(data.players);
  if (player) {
    const updatedPlayer = playersArray.find(p => p.id === player.id);
    if (updatedPlayer) {
      // Update properties in place to preserve the exported reference
      Object.assign(player, updatedPlayer);
      console.log('Updated player data:', player);
    }
  }

  // Draw all players
  createPlayersElement(playersArray);

  // Update turn indicator
  if (data.currentTurn) {
    console.log('Calling updateTurnIndicator with:', data.currentTurn);
    updateTurnIndicator(data.currentTurn);
  } else {
    console.log('WARNING: currentTurn is null/undefined!');
  }

  // Save session for reconnection
  const roomId = sessionStorage.getItem('barony_loadedRoomId');
  if (roomId && player) {
    saveSession(roomId, player.color);
    sessionStorage.removeItem('barony_loadedRoomId');
  }

  // Show room info
  if (roomId) {
    showRoomInfo(roomId);
  }

  // Show save button for leader
  showSaveButton();

  // Store game state for local save
  latestBoardState = data.boardState;
  latestPlayers = playersArray;
  latestGamePhase = data.gamePhase;
  latestTurnData = data.currentTurn;

  // Handle phase-specific UI
  if (data.gamePhase === 'battle') {
    setPhase('battle');
    disableTextureMenu();
    setTimeout(() => {
      initBattlePhase();
      createTitleCard();
      // Trigger turn changed to setup action menu correctly
      actionMenuTurnChanged();
      // Start auto-save and add download button
      startAutoSave();
      addLocalSaveButtons();
      saveGameStateLocally();
    }, 500);
  } else if (data.gamePhase === 'initialPlacement') {
    setPhase('initialPlacement');
    disableTextureMenu();
    setTimeout(() => addPieceClickHandler(), 100);
  }

  showSuccess('Game loaded successfully!');
}

function handlePlayerClaimedColor(data) {
  console.log('Player claimed color:', data);
  // Update UI if needed
  if (onLoadedGameInfoCallback) {
    onLoadedGameInfoCallback({ remainingColors: data.remainingColors });
  }
}

function handleLoadedGameInfo(info) {
  console.log('Loaded game info:', info);
  if (onLoadedGameInfoCallback) {
    onLoadedGameInfoCallback(info);
  }
}

// Callback for color select when joining loaded game
let onLoadedGameColorSelectCallback = null;

export function setOnLoadedGameColorSelectCallback(callback) {
  onLoadedGameColorSelectCallback = callback;
}

function handleLoadedGameColorSelect(data) {
  console.log('Loaded game color select:', data);
  if (onLoadedGameColorSelectCallback) {
    onLoadedGameColorSelectCallback(data);
  }
}

// Export functions for save/load
export function emitSaveGame() {
  socket.emit('saveGame');
}

export function emitListSaves() {
  socket.emit('listSaves');
}

export function emitLoadGame(filename) {
  socket.emit('loadGame', filename);
}

export function emitLoadLocalSave(saveData) {
  socket.emit('loadLocalSave', saveData);
}

export function emitJoinLoadedGame(roomId, color) {
  sessionStorage.setItem('barony_loadedRoomId', roomId);
  socket.emit('joinLoadedGame', { roomId, color });
}

export function emitGetLoadedGameInfo(roomId) {
  socket.emit('getLoadedGameInfo', roomId);
}

