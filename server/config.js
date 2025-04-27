export const config = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    SOCKET_RECOVERY: {
      maxDisconnectionDuration: 120000,
      skipMiddlewares: true
    },
    SOCKET_EVENTS: {
      CREATE_ROOM: 'createRoom',
      JOIN_ROOM: 'joinRoom',
      UPDATE_BOARD: 'updateBoard',
      CREATE_BOARD: 'createBoard',
      DRAW_PLAYERS: 'drawPlayers',
      ERROR: 'error',
      UPDATE_PLAYER_PIECES: 'updatePlayerPieces',
      PLAYER_JOINED_ROOM: 'playerJoinedRoom',
      UPDATED_PLAYER_TEXTURE: 'updateDPlayerTextures',
      REQUEST_PLAYER_DATA: 'requestPlayerData',
      PLAYER_DATA_RESPONSE: 'playerDataResponse'
    }
  };