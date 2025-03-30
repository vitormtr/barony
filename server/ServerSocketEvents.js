// Criar módulo separado para constantes
const SOCKET_EVENTS = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  APPLY_TEXTURE: 'applyTextureToBoard',
  TEXTURE_APPLIED: 'textureApplied',
  DRAW_PLAYERS: 'drawPlayers',
  DISCONNECT: 'disconnect',
  ERROR: 'error'
};

// Módulo para logging consistente
const logger = {
  info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

// Validação de payloads
const validatePayload = (payload, requiredFields) => {
  return requiredFields.every(field => payload.hasOwnProperty(field));
};

export function handleSocketEvents(socket, io, sessionManager) {
  // Handler genérico de erros
  const handleError = (error, event, meta = {}) => {
    logger.error(`Erro no evento ${event}`, { error, ...meta });
    socket.emit(SOCKET_EVENTS.ERROR, { 
      event,
      message: error.message,
      code: error.code || 'INTERNAL_ERROR'
    });
  };

  // Criar sala com tratamento completo
  const handleCreateRoom = () => {
    try {
      logger.info('Iniciando criação de sala', { socketId: socket.id });
      const roomId = sessionManager.createSession(socket, io);
      logger.info('Sala criada com sucesso', { roomId, socketId: socket.id });
    } catch (error) {
      handleError(error, SOCKET_EVENTS.CREATE_ROOM);
    }
  };

  // Entrar na sala com validação
  const handleJoinRoom = (roomId) => {
    try {
      if (!roomId) throw new Error('ID da sala não fornecido');
      
      logger.info('Jogador entrando na sala', { roomId, socketId: socket.id });
      sessionManager.addPlayerToSession(socket, io, roomId);
      
      const players = sessionManager.getPlayersInRoom(roomId);
      logger.info('Jogadores atualizados na sala', { roomId, players });
      
      io.to(roomId).emit(SOCKET_EVENTS.DRAW_PLAYERS, players);
    } catch (error) {
      handleError(error, SOCKET_EVENTS.JOIN_ROOM, { roomId });
    }
  };

  // Aplicar textura com validação
  const handleApplyTexture = (payload) => {
    try {
      const requiredFields = ['row', 'col', 'texture'];
      if (!validatePayload(payload, requiredFields)) {
        throw new Error('Payload inválido');
      }
      
      logger.info('Aplicando textura ao tabuleiro', { payload, socketId: socket.id });
      const success = sessionManager.applyTextureToBoard(socket, io, payload);
      
      socket.emit(SOCKET_EVENTS.TEXTURE_APPLIED, { success });
    } catch (error) {
      handleError(error, SOCKET_EVENTS.APPLY_TEXTURE, { payload });
    }
  };

  // Desconexão com log detalhado
  const handleDisconnect = () => {
    logger.info('Jogador desconectado', { socketId: socket.id });
  };

  // Registrar handlers
  socket.on(SOCKET_EVENTS.CREATE_ROOM, handleCreateRoom);
  socket.on(SOCKET_EVENTS.JOIN_ROOM, handleJoinRoom);
  socket.on(SOCKET_EVENTS.APPLY_TEXTURE, handleApplyTexture);
  socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
}