export const CONFIG = {
  PATHS: {
      IMAGES: './images/',
      SOCKET_SERVER: window.location.origin
  },
  SOCKET: {
      SERVER_URL: window.location.origin,
      EVENTS: {
        CONNECT: 'connect',
        UPDATE_BOARD: 'updateBoard',
        CREATE_BOARD: 'createBoard',
        ERROR: 'error',
        DRAW_PLAYERS: 'drawPlayers',
        UPDATE_PLAYER_PIECES: 'updatePlayerPieces',
        PLAYER_JOINED_ROOM: 'playerJoinedRoom',
        JOIN_ROOM: 'joinRoom',
        UPDATE_PLAYER_TEXTURE: 'updatePlayerTextures',
        PLAYER_DATA: 'playerData',
        PLAYER_TEXTURE_UPDATED: 'playerTextureUpdated',
        REQUEST_PLAYER_DATA: 'requestPlayerData',
        PLAYER_DATA_RESPONSE: 'playerDataResponse',
        CREATE_ROOM: 'createRoom',
        TURN_CHANGED: 'turnChanged',
        PLAYER_DISCONNECTED: 'playerDisconnected',
        PHASE_CHANGED: 'phaseChanged'
      }
  },
  CLASSES: {
      HEX: 'hexagon',
      HEX_ROW: 'hex-row',
      COORDINATE: 'coordinate-text',
      TEXTURE_MENU: 'textureMenu',
      TEXTURE_OPTION: 'texture-option',
      HEX_COUNT: 'hex-count',
      SELECTED: 'selected'
  },
  HEXROWCOL: {
      ROW: 'row',
      COL: 'col'
  },
  SELECTORS: {
      HEX_CONTAINER: '#hexContainer',
      HUD: '#hud',
      MENU: 'logoMenuContainer',
      ROOM_INPUT: 'roomIdInput',
      HEXAGONS: '.hexagon',
      TEXTURE_MENU: '#textureMenu',
      SELECTED_HEX: '.hexagon.selected',
      CREATE_ROOM: 'createRoomBtn',
      JOIN_ROOM: 'joinRoomBtn',
      BODY: 'body'
  },
  TEXTURES: {
        'plain.png': 'plain',
        'mountain.png': 'mountain',
        'water.png': 'water',
        'forest.png': 'forest',
        'farm.png': 'farm'
    },
  DIRECTION_MAP: {
      EVEN: [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]],
      ODD: [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
  },
  EVENTS: {
      CONNECTION_UPDATE: 'connectionUpdate',
      BOARD_UPDATED: 'boardUpdated',
      MENU_TOGGLE: 'menuToggle',
      PLAYERS_UPDATED: 'playersUpdated',
      HEX_CLICKED: 'hexClicked',
      ROOM_JOIN: 'roomJoin',
      ROOM_CREATE: 'roomCreate',
      TEXTURE_APPLY: 'textureApply',
      TEXTURE_SUCCESS: 'textureApplied',
      TEXTURE_ERROR: 'textureError'
  },
  MESSAGES: {
      CONTAINER_ERROR: 'Erro: Container do tabuleiro não encontrado!',
      TEXTURE_RULE: 'A textura só pode ser colocada em um hexágono adjacente ao primeiro!'
  },
  FILE_EXTENSIONS: {
      IMAGES: '.png'
  },
  
  PLAYER_CLASSES: {
    container: "player",          
    image: "playerImage",         
    info: "playerInfo",           
    name: "playerName",           
    pieces: "playerPieces",       
    piece: "piece",               
    count: countType => `${countType}Count` 
  },
  DIRECTIONS: (row) => row % 2 === 1 
      ? CONFIG.DIRECTION_MAP.ODD 
      : CONFIG.DIRECTION_MAP.EVEN 
};