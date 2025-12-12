import { Player } from './Player.js';
const SOCKET_EVENTS = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  APPLY_TEXTURE: 'applyTextureToBoard',
  TEXTURE_APPLIED: 'textureApplied',
  DRAW_PLAYERS: 'drawPlayers',
  PLAYER_JOINED_ROOM: 'playerJoinedRoom',
  DISCONNECT: 'disconnect',
  UPDATE_PLAYER_TEXTURE: 'updatePlayerTextures',
  PLAYER_TEXTURE_UPDATED: 'playerTextureUpdated',
  REQUEST_PLAYER_DATA: 'requestPlayerData',
  PLAYER_DATA_RESPONSE: 'playerDataResponse',
  ERROR: 'error'
};



const logger = {
  info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

const validatePayload = (payload, requiredFields) => {
  return requiredFields.every(field => payload.hasOwnProperty(field));
};

export function handleSocketEvents(socket, io, sessionManager) {
  const handleError = (error, event, meta = {}) => {
    logger.error(`Error in event ${event}`, { error, ...meta });
    socket.emit(SOCKET_EVENTS.ERROR, {
      event,
      message: error.message,
      code: error.code || 'INTERNAL_ERROR'
    });
  };

  const handleCreateRoom = () => {
    try {
      logger.info('Starting room creation', { socketId: socket.id });
      const roomId = sessionManager.createSession(socket, io);
      logger.info('Room created successfully', { roomId, socketId: socket.id });

      // Send roomId along with player data (creator is the leader)
      const playerData = sessionManager.getPlayer(socket.id);
      socket.emit('roomCreated', { roomId, player: playerData, isLeader: true });
      io.to(roomId).emit(SOCKET_EVENTS.PLAYER_JOINED_ROOM, playerData);
    } catch (error) {
      handleError(error, SOCKET_EVENTS.CREATE_ROOM);
    }
  };

  const handleJoinRoom = (roomId) => {
    try {
      if (!roomId) throw new Error('Room ID not provided');

      logger.info('Player joining room', { roomId, socketId: socket.id });
      sessionManager.addPlayerToSession(socket, io, roomId);

      const players = sessionManager.getPlayersInRoom(roomId);
      const playerData = sessionManager.getPlayer(socket.id);

      // If player was added successfully
      if (playerData) {
        logger.info('Players updated in room', { roomId, playersCount: players.length });

        // Send roomId to the player who joined
        socket.emit('roomJoined', { roomId, player: playerData });

        io.to(roomId).emit(SOCKET_EVENTS.DRAW_PLAYERS, players);
        io.to(roomId).emit(SOCKET_EVENTS.PLAYER_JOINED_ROOM, playerData);
      }
    } catch (error) {
      handleError(error, SOCKET_EVENTS.JOIN_ROOM, { roomId });
    }
  };

  const handleApplyTexture = (payload) => {
    try {
      const requiredFields = ['row', 'col', 'texture'];
      if (!validatePayload(payload, requiredFields)) {
        throw new Error('Invalid payload');
      }

      logger.info('Applying texture to board', { payload, socketId: socket.id });
      const result = sessionManager.applyTextureToBoard(socket, io, payload);

      socket.emit(SOCKET_EVENTS.TEXTURE_APPLIED, result);
    } catch (error) {
      handleError(error, SOCKET_EVENTS.APPLY_TEXTURE, { payload });
    }
  };

  const handleUpdatePlayerTexture = (payload) => {
    const { texture, player } = payload;
    const playerObj = new Player(player.id, player.color, player.hexCount, player.pieces); 
    playerObj.updateTextures(texture);
    
    socket.emit(SOCKET_EVENTS.PLAYER_TEXTURE_UPDATED, JSON.parse(JSON.stringify(playerObj)));
  };  

  const handleRequestPlayerData = (socketId) => {
    const player = sessionManager.getPlayer(socketId);
    if (!player) {
      logger.error('Player not found', { socketId: socket.id });
      return;
    }
    // Send all player data including resources, title, and victory points
    socket.emit(SOCKET_EVENTS.PLAYER_DATA_RESPONSE, JSON.parse(JSON.stringify(player)));
  }

  const handleDisconnect = () => {
    logger.info('Player disconnected', { socketId: socket.id });
    sessionManager.removePlayerFromSession(socket, io);
  };

  // Handler for random texture distribution (leader only)
  const handleRandomDistribution = () => {
    try {
      logger.info('Random distribution request', { socketId: socket.id });
      const result = sessionManager.randomDistribution(socket, io);

      if (result.success) {
        logger.info('Random distribution completed');
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, result.message);
      }
    } catch (error) {
      handleError(error, 'randomDistribution');
    }
  };

  // Handler to restart game (leader only with confirmation)
  const handleRestartGame = (confirmRoomId) => {
    try {
      logger.info('Game restart request', { socketId: socket.id, confirmRoomId });
      const result = sessionManager.restartGame(socket, io, confirmRoomId);

      socket.emit('restartResult', result);

      if (!result.success) {
        socket.emit(SOCKET_EVENTS.ERROR, result.message);
      }
    } catch (error) {
      handleError(error, 'restartGame');
    }
  };

  // Handler to place piece in initial placement phase
  const handlePlacePiece = (payload) => {
    try {
      logger.info('Piece placement request', { socketId: socket.id, payload });
      const result = sessionManager.placePiece(socket, io, payload);

      logger.info('Piece placement result', { socketId: socket.id, result });
      socket.emit('placePieceResult', result);

      if (!result.success) {
        socket.emit(SOCKET_EVENTS.ERROR, result.message);
      }
    } catch (error) {
      handleError(error, 'placePiece', { payload });
      // Ensure client receives a response even in case of error
      socket.emit('placePieceResult', { success: false, message: 'Internal server error' });
    }
  };

  // Handler for battle phase actions
  const handleBattleAction = (payload) => {
    try {
      logger.info('Battle action received', { socketId: socket.id, action: payload.action });
      const result = sessionManager.battleAction(socket, io, payload);
      logger.info('Battle action result', { socketId: socket.id, result });
      socket.emit('battleActionResult', result);
    } catch (error) {
      handleError(error, 'battleAction', { payload });
      socket.emit('battleActionResult', { success: false, message: 'Internal server error' });
    }
  };

  // Handler to end turn
  const handleEndTurn = () => {
    try {
      logger.info('Ending turn', { socketId: socket.id });
      sessionManager.endTurn(socket, io);
    } catch (error) {
      handleError(error, 'endTurn');
    }
  };

  // Handler to skip directly to battle phase (TEST)
  const handleSkipToBattle = () => {
    try {
      logger.info('[TEST] Skip to battle request', { socketId: socket.id });
      const result = sessionManager.skipToBattlePhase(socket, io);
      socket.emit('skipToBattleResult', result);
    } catch (error) {
      handleError(error, 'skipToBattle');
    }
  };

  // Handler to rejoin a room after page refresh
  const handleRejoinRoom = (payload) => {
    try {
      const { roomId, playerColor } = payload;
      logger.info('Rejoin request', { socketId: socket.id, roomId, playerColor });

      const result = sessionManager.rejoinRoom(socket, io, roomId, playerColor);

      if (result.success) {
        socket.emit('rejoinSuccess', result.data);
      } else {
        socket.emit('rejoinFailed', { message: result.message });
      }
    } catch (error) {
      handleError(error, 'rejoinRoom', { payload });
      socket.emit('rejoinFailed', { message: 'Failed to rejoin room' });
    }
  };

  // Handler to save game
  const handleSaveGame = () => {
    try {
      logger.info('Save game request', { socketId: socket.id });
      const result = sessionManager.saveGame(socket);
      socket.emit('saveGameResult', result);
    } catch (error) {
      handleError(error, 'saveGame');
      socket.emit('saveGameResult', { success: false, message: 'Error saving game' });
    }
  };

  // Handler to list saved games
  const handleListSaves = () => {
    try {
      logger.info('List saves request', { socketId: socket.id });
      const saves = sessionManager.listSaves();
      socket.emit('savesList', saves);
    } catch (error) {
      handleError(error, 'listSaves');
      socket.emit('savesList', []);
    }
  };

  // Handler to load a saved game
  const handleLoadGame = (filename) => {
    try {
      logger.info('Load game request', { socketId: socket.id, filename });
      const result = sessionManager.loadGame(socket, io, filename);

      if (result.success) {
        socket.emit('gameLoaded', result);
      } else {
        socket.emit('loadGameFailed', { message: result.message });
      }
    } catch (error) {
      handleError(error, 'loadGame');
      socket.emit('loadGameFailed', { message: 'Error loading game' });
    }
  };

  // Handler to load a game from local save data
  const handleLoadLocalSave = (saveData) => {
    try {
      logger.info('Load local save request', { socketId: socket.id });
      const result = sessionManager.loadLocalSave(socket, io, saveData);

      if (result.success) {
        socket.emit('gameLoaded', result);
      } else {
        socket.emit('loadGameFailed', { message: result.message });
      }
    } catch (error) {
      handleError(error, 'loadLocalSave');
      socket.emit('loadGameFailed', { message: 'Error loading local save' });
    }
  };

  // Handler to join a loaded game by claiming a color
  const handleJoinLoadedGame = (payload) => {
    try {
      const { roomId, color } = payload;
      logger.info('Join loaded game request', { socketId: socket.id, roomId, color });
      const result = sessionManager.joinLoadedGame(socket, io, roomId, color);

      if (result.success) {
        socket.emit('joinedLoadedGame', result);

        // If all players joined, notify everyone and start game
        if (result.allJoined) {
          const session = sessionManager.session[roomId];
          console.log('Loaded game ready - playerOnTurn:', session.playerOnTurn);
          console.log('Players:', Object.keys(session.players));
          io.to(roomId).emit('loadedGameReady', {
            boardState: session.boardState,
            players: Object.values(session.players),
            gamePhase: session.gamePhase,
            currentTurn: session.playerOnTurn ? {
              currentPlayerId: session.playerOnTurn.id,
              currentPlayerColor: session.playerOnTurn.color
            } : null
          });
        } else {
          // Notify others about the new player
          io.to(roomId).emit('playerClaimedColor', {
            color,
            remainingColors: result.remainingColors
          });
        }
      } else {
        socket.emit('joinLoadedGameFailed', { message: result.message });
      }
    } catch (error) {
      handleError(error, 'joinLoadedGame', { payload });
      socket.emit('joinLoadedGameFailed', { message: 'Error joining loaded game' });
    }
  };

  // Handler to get loaded game info
  const handleGetLoadedGameInfo = (roomId) => {
    try {
      const info = sessionManager.getLoadedGameInfo(roomId);
      socket.emit('loadedGameInfo', info);
    } catch (error) {
      handleError(error, 'getLoadedGameInfo');
      socket.emit('loadedGameInfo', null);
    }
  };

  // Handler to get available colors for a room
  const handleGetAvailableColors = (roomId) => {
    try {
      const result = sessionManager.getAvailableColors(roomId);
      socket.emit('availableColors', result);
    } catch (error) {
      handleError(error, 'getAvailableColors');
      socket.emit('availableColors', { error: 'Failed to get available colors' });
    }
  };

  // Handler to create room with specific color and name
  const handleCreateRoomWithColor = (payload) => {
    try {
      const { color, playerName } = payload;
      logger.info('Creating room with color', { socketId: socket.id, color, playerName });

      const roomId = sessionManager.createSessionWithColor(socket, io, color, playerName);
      const playerData = sessionManager.getPlayer(socket.id);

      socket.emit('roomCreated', { roomId, player: playerData, isLeader: true });
      io.to(roomId).emit(SOCKET_EVENTS.PLAYER_JOINED_ROOM, playerData);
    } catch (error) {
      handleError(error, 'createRoomWithColor', { payload });
    }
  };

  // Handler to join room with specific color and name
  const handleJoinRoomWithColor = (payload) => {
    try {
      const { roomId, color, playerName } = payload;
      logger.info('Joining room with color', { socketId: socket.id, roomId, color, playerName });

      const result = sessionManager.addPlayerWithColor(socket, io, roomId, color, playerName);

      if (result.success) {
        const players = sessionManager.getPlayersInRoom(roomId);
        const playerData = sessionManager.getPlayer(socket.id);

        socket.emit('roomJoined', { roomId, player: playerData });
        io.to(roomId).emit(SOCKET_EVENTS.DRAW_PLAYERS, players);
        io.to(roomId).emit(SOCKET_EVENTS.PLAYER_JOINED_ROOM, playerData);
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, result.message);
      }
    } catch (error) {
      handleError(error, 'joinRoomWithColor', { payload });
    }
  };

  socket.on(SOCKET_EVENTS.CREATE_ROOM, handleCreateRoom);
  socket.on(SOCKET_EVENTS.JOIN_ROOM, handleJoinRoom);
  socket.on(SOCKET_EVENTS.APPLY_TEXTURE, handleApplyTexture);
  socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
  socket.on(SOCKET_EVENTS.UPDATE_PLAYER_TEXTURE, handleUpdatePlayerTexture);
  socket.on(SOCKET_EVENTS.REQUEST_PLAYER_DATA, handleRequestPlayerData);
  socket.on('randomDistribution', handleRandomDistribution);
  socket.on('restartGame', handleRestartGame);
  socket.on('placePiece', handlePlacePiece);
  socket.on('battleAction', handleBattleAction);
  socket.on('endTurn', handleEndTurn);
  socket.on('skipToBattle', handleSkipToBattle);
  socket.on('rejoinRoom', handleRejoinRoom);
  socket.on('saveGame', handleSaveGame);
  socket.on('listSaves', handleListSaves);
  socket.on('loadGame', handleLoadGame);
  socket.on('loadLocalSave', handleLoadLocalSave);
  socket.on('joinLoadedGame', handleJoinLoadedGame);
  socket.on('getLoadedGameInfo', handleGetLoadedGameInfo);
  socket.on('getAvailableColors', handleGetAvailableColors);
  socket.on('createRoomWithColor', handleCreateRoomWithColor);
  socket.on('joinRoomWithColor', handleJoinRoomWithColor);
}