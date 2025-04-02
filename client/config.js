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
        JOIN_ROOM: 'joinRoom',
        CREATE_ROOM: 'createRoom'
      }
  },
  CLASSES: {
      HEX: 'hexagon',
      HEX_ROW: 'hex-row',
      COORDINATE: 'coordinate-text',
      PLAYER: 'player',
      TEXTURE_MENU: 'textureMenu',
      TEXTURE_OPTION: 'texture-option',
      PLAYER_IMAGE: 'playerImage',
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
      PLAIN: 'plain.png',
      MOUNTAIN: 'mountain.png',
      WATER: 'water.png',
      FOREST: 'forest.png',
      FARM: 'farm.png'
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
  DIRECTIONS: (row) => row % 2 === 1 
      ? CONFIG.DIRECTION_MAP.ODD 
      : CONFIG.DIRECTION_MAP.EVEN 
};