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
    logger.error(`Erro no evento ${event}`, { error, ...meta });
    socket.emit(SOCKET_EVENTS.ERROR, { 
      event,
      message: error.message,
      code: error.code || 'INTERNAL_ERROR'
    });
  };

  const handleCreateRoom = () => {
    try {
      logger.info('Iniciando criação de sala', { socketId: socket.id });
      const roomId = sessionManager.createSession(socket, io);
      logger.info('Sala criada com sucesso', { roomId, socketId: socket.id });

      // Envia o roomId junto com os dados do jogador (criador é o líder)
      const playerData = sessionManager.getPlayer(socket.id);
      socket.emit('roomCreated', { roomId, player: playerData, isLeader: true });
      io.to(roomId).emit(SOCKET_EVENTS.PLAYER_JOINED_ROOM, playerData);
    } catch (error) {
      handleError(error, SOCKET_EVENTS.CREATE_ROOM);
    }
  };

  const handleJoinRoom = (roomId) => {
    try {
      if (!roomId) throw new Error('ID da sala não fornecido');

      logger.info('Jogador entrando na sala', { roomId, socketId: socket.id });
      sessionManager.addPlayerToSession(socket, io, roomId);

      const players = sessionManager.getPlayersInRoom(roomId);
      const playerData = sessionManager.getPlayer(socket.id);

      // Se o jogador foi adicionado com sucesso
      if (playerData) {
        logger.info('Jogadores atualizados na sala', { roomId, playersCount: players.length });

        // Envia o roomId para o jogador que entrou
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
        throw new Error('Payload inválido');
      }

      logger.info('Aplicando textura ao tabuleiro', { payload, socketId: socket.id });
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
      logger.error('Jogador não encontrado', { socketId: socket.id });
      return;
    }
    const playerObj = new Player(player.id, player.color, player.hexCount, player.pieces);

    socket.emit(SOCKET_EVENTS.PLAYER_DATA_RESPONSE, JSON.parse(JSON.stringify(playerObj)));
  }

  const handleDisconnect = () => {
    logger.info('Jogador desconectado', { socketId: socket.id });
    sessionManager.removePlayerFromSession(socket, io);
  };

  // Handler para distribuição aleatória de texturas (apenas líder)
  const handleRandomDistribution = () => {
    try {
      logger.info('Solicitação de distribuição aleatória', { socketId: socket.id });
      const result = sessionManager.randomDistribution(socket, io);

      if (result.success) {
        logger.info('Distribuição aleatória concluída');
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, result.message);
      }
    } catch (error) {
      handleError(error, 'randomDistribution');
    }
  };

  // Handler para reiniciar o jogo (apenas líder com confirmação)
  const handleRestartGame = (confirmRoomId) => {
    try {
      logger.info('Solicitação de reinício do jogo', { socketId: socket.id, confirmRoomId });
      const result = sessionManager.restartGame(socket, io, confirmRoomId);

      socket.emit('restartResult', result);

      if (!result.success) {
        socket.emit(SOCKET_EVENTS.ERROR, result.message);
      }
    } catch (error) {
      handleError(error, 'restartGame');
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
}