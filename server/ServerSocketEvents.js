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
    const playerObj = new Player(player.id, player.color, player.hexCount, player.pieces);

    socket.emit(SOCKET_EVENTS.PLAYER_DATA_RESPONSE, JSON.parse(JSON.stringify(playerObj)));
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
}