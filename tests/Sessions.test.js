import { jest } from '@jest/globals';
import { Sessions } from '../server/Sessions.js';

// Mock socket and io
const createMockSocket = (id) => ({
  id,
  join: jest.fn(),
  emit: jest.fn(),
});

const createMockIo = () => ({
  to: jest.fn(() => ({
    emit: jest.fn()
  }))
});

describe('Sessions', () => {
  let sessions;
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    sessions = new Sessions();
    mockSocket = createMockSocket('socket1');
    mockIo = createMockIo();
  });

  describe('createSession', () => {
    test('should create a room with unique id', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      expect(roomId).toHaveLength(6);
    });

    test('should add creator as first player', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      const players = sessions.getPlayersInRoom(roomId);
      expect(players).toHaveLength(1);
      expect(players[0].id).toBe('socket1');
    });

    test('should set creator as leader', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      expect(sessions.isLeader('socket1', roomId)).toBe(true);
    });

    test('should initialize board state', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      const session = sessions.session[roomId];
      expect(session.boardState).toBeDefined();
      expect(session.boardState.length).toBe(15);
      expect(session.boardState[0].length).toBe(15);
    });

    test('should set game phase to waiting', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      const session = sessions.session[roomId];
      expect(session.gamePhase).toBe('waiting');
    });
  });

  describe('addPlayerToSession', () => {
    let roomId;

    beforeEach(() => {
      roomId = sessions.createSession(mockSocket, mockIo);
    });

    test('should add player to existing room', () => {
      const socket2 = createMockSocket('socket2');
      sessions.addPlayerToSession(socket2, mockIo, roomId);
      const players = sessions.getPlayersInRoom(roomId);
      expect(players).toHaveLength(2);
    });

    test('should assign different colors to players', () => {
      const socket2 = createMockSocket('socket2');
      sessions.addPlayerToSession(socket2, mockIo, roomId);
      const players = sessions.getPlayersInRoom(roomId);
      expect(players[0].color).not.toBe(players[1].color);
    });

    test('should not exceed 4 players', () => {
      const socket2 = createMockSocket('socket2');
      const socket3 = createMockSocket('socket3');
      const socket4 = createMockSocket('socket4');
      const socket5 = createMockSocket('socket5');

      sessions.addPlayerToSession(socket2, mockIo, roomId);
      sessions.addPlayerToSession(socket3, mockIo, roomId);
      sessions.addPlayerToSession(socket4, mockIo, roomId);
      sessions.addPlayerToSession(socket5, mockIo, roomId);

      const players = sessions.getPlayersInRoom(roomId);
      expect(players).toHaveLength(4);
    });

    test('should emit error for non-existent room', () => {
      const socket2 = createMockSocket('socket2');
      sessions.addPlayerToSession(socket2, mockIo, 'INVALID');
      expect(socket2.emit).toHaveBeenCalledWith('error', 'Room not found!');
    });
  });

  describe('isLeader', () => {
    test('should return true for room creator', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      expect(sessions.isLeader('socket1', roomId)).toBe(true);
    });

    test('should return false for other players', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      const socket2 = createMockSocket('socket2');
      sessions.addPlayerToSession(socket2, mockIo, roomId);
      expect(sessions.isLeader('socket2', roomId)).toBe(false);
    });
  });

  describe('getRandomColor', () => {
    test('should return valid color', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      const color = sessions.getRandomColor(roomId);
      expect(['red', 'blue', 'green', 'yellow']).toContain(color);
    });

    test('should not repeat colors', () => {
      const roomId = sessions.createSession(mockSocket, mockIo);
      const colors = new Set();
      colors.add(sessions.session[roomId].players['socket1'].color);

      for (let i = 2; i <= 4; i++) {
        const socket = createMockSocket(`socket${i}`);
        sessions.addPlayerToSession(socket, mockIo, roomId);
        colors.add(sessions.session[roomId].players[`socket${i}`].color);
      }

      expect(colors.size).toBe(4);
    });
  });

  describe('isAdjacentToPosition', () => {
    test('should detect adjacent hex on even row', () => {
      // Even row adjacency
      expect(sessions.isAdjacentToPosition(2, 2, 2, 3)).toBe(true);  // right
      expect(sessions.isAdjacentToPosition(2, 2, 2, 1)).toBe(true);  // left
      expect(sessions.isAdjacentToPosition(2, 2, 1, 1)).toBe(true);  // top-left
      expect(sessions.isAdjacentToPosition(2, 2, 1, 2)).toBe(true);  // top-right
    });

    test('should detect adjacent hex on odd row', () => {
      // Odd row adjacency
      expect(sessions.isAdjacentToPosition(3, 2, 3, 3)).toBe(true);  // right
      expect(sessions.isAdjacentToPosition(3, 2, 3, 1)).toBe(true);  // left
    });

    test('should return false for non-adjacent hexes', () => {
      expect(sessions.isAdjacentToPosition(2, 2, 4, 4)).toBe(false);
      expect(sessions.isAdjacentToPosition(0, 0, 5, 5)).toBe(false);
    });
  });

  describe('isAdjacentToWater', () => {
    let roomId;

    beforeEach(() => {
      roomId = sessions.createSession(mockSocket, mockIo);
    });

    test('should return true when adjacent to water', () => {
      const session = sessions.session[roomId];
      session.boardState[7][7].texture = 'plain.png';
      session.boardState[7][8].texture = 'water.png';

      expect(sessions.isAdjacentToWater(session.boardState, 7, 7)).toBe(true);
    });

    test('should return false when not adjacent to water', () => {
      const session = sessions.session[roomId];
      session.boardState[7][7].texture = 'plain.png';
      session.boardState[7][8].texture = 'forest.png';

      expect(sessions.isAdjacentToWater(session.boardState, 7, 7)).toBe(false);
    });
  });

  describe('hasAnyTexture', () => {
    let roomId;

    beforeEach(() => {
      roomId = sessions.createSession(mockSocket, mockIo);
    });

    test('should return false for empty board', () => {
      const session = sessions.session[roomId];
      expect(sessions.hasAnyTexture(session.boardState)).toBe(false);
    });

    test('should return true when board has texture', () => {
      const session = sessions.session[roomId];
      session.boardState[5][5].texture = 'forest.png';
      expect(sessions.hasAnyTexture(session.boardState)).toBe(true);
    });
  });

  describe('isAdjacentToTexture', () => {
    let roomId;

    beforeEach(() => {
      roomId = sessions.createSession(mockSocket, mockIo);
    });

    test('should return true when adjacent to textured hex', () => {
      const session = sessions.session[roomId];
      session.boardState[7][7].texture = 'forest.png';

      expect(sessions.isAdjacentToTexture(session.boardState, 7, 8)).toBe(true);
    });

    test('should return false when not adjacent', () => {
      const session = sessions.session[roomId];
      session.boardState[7][7].texture = 'forest.png';

      expect(sessions.isAdjacentToTexture(session.boardState, 0, 0)).toBe(false);
    });
  });

  describe('isAdjacentToCity', () => {
    let roomId;

    beforeEach(() => {
      roomId = sessions.createSession(mockSocket, mockIo);
    });

    test('should return true when adjacent to city', () => {
      const session = sessions.session[roomId];
      session.boardState[7][7].pieces = [{ type: 'city', color: 'red' }];

      expect(sessions.isAdjacentToCity(session.boardState, 7, 8)).toBe(true);
    });

    test('should return false when not adjacent to city', () => {
      const session = sessions.session[roomId];
      session.boardState[7][7].pieces = [{ type: 'knight', color: 'red' }];

      expect(sessions.isAdjacentToCity(session.boardState, 7, 8)).toBe(false);
    });
  });

  describe('isBorderHex', () => {
    let roomId;

    beforeEach(() => {
      roomId = sessions.createSession(mockSocket, mockIo);
    });

    test('should return true for edge hex', () => {
      const session = sessions.session[roomId];
      // Fill some hexes so there's a border
      session.boardState[7][7].texture = 'plain.png';
      expect(sessions.isBorderHex(session.boardState, 7, 7)).toBe(true);
    });
  });

  describe('shuffleArray', () => {
    test('should maintain array length', () => {
      const arr = [1, 2, 3, 4, 5];
      sessions.shuffleArray(arr);
      expect(arr).toHaveLength(5);
    });

    test('should contain same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      sessions.shuffleArray(arr);
      expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('getResourceName', () => {
    test('should return correct resource names', () => {
      expect(sessions.getResourceName('field')).toBe('Field');
      expect(sessions.getResourceName('forest')).toBe('Forest');
      expect(sessions.getResourceName('mountain')).toBe('Mountain');
      expect(sessions.getResourceName('plain')).toBe('Plain');
    });
  });

  describe('calculateFinalScore', () => {
    test('should calculate score correctly', () => {
      const player = sessions.session[sessions.createSession(mockSocket, mockIo)].players['socket1'];
      player.victoryPoints = 20;
      player.resources = { field: 5, forest: 3, mountain: 2, plain: 5 };
      player.title = 'count';

      const score = sessions.calculateFinalScore(player);
      // 20 VP + 58 resources (5*5 + 3*3 + 2*2 + 5*4) + 10 (count title) = 88
      expect(score).toBe(88);
    });

    test('should give 25 points for duke title', () => {
      const player = sessions.session[sessions.createSession(mockSocket, mockIo)].players['socket1'];
      player.victoryPoints = 0;
      player.resources = { field: 0, forest: 0, mountain: 0, plain: 0 };
      player.title = 'duke';

      const score = sessions.calculateFinalScore(player);
      expect(score).toBe(25);
    });
  });
});

describe('Battle Actions', () => {
  let sessions;
  let roomId;
  let mockIo;

  beforeEach(() => {
    sessions = new Sessions();
    mockIo = createMockIo();

    // Create room with 4 players
    const socket1 = createMockSocket('socket1');
    roomId = sessions.createSession(socket1, mockIo);

    for (let i = 2; i <= 4; i++) {
      const socket = createMockSocket(`socket${i}`);
      sessions.addPlayerToSession(socket, mockIo, roomId);
    }

    // Set up board for battle
    const session = sessions.session[roomId];
    session.gamePhase = 'battle';
    session.playerOnTurn = session.players['socket1'];

    // Add some terrain
    session.boardState[7][7].texture = 'plain.png';
    session.boardState[7][8].texture = 'forest.png';
    session.boardState[7][9].texture = 'water.png';
    session.boardState[6][7].texture = 'mountain.png';
  });

  describe('actionRecruitment', () => {
    test('should fail if no city at location', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      const result = sessions.actionRecruitment(session, player, { row: 7, col: 7 }, mockIo, roomId);
      expect(result.success).toBe(false);
    });

    test('should add 2 knights at city', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      // Place city
      session.boardState[7][7].pieces = [{ type: 'city', owner: player.id, color: player.color }];

      const result = sessions.actionRecruitment(session, player, { row: 7, col: 7 }, mockIo, roomId);
      expect(result.success).toBe(true);
      expect(session.boardState[7][7].pieces.filter(p => p.type === 'knight')).toHaveLength(2);
    });

    test('should add 3 knights if adjacent to water', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      // Place city adjacent to water
      session.boardState[7][8].pieces = [{ type: 'city', owner: player.id, color: player.color }];

      const result = sessions.actionRecruitment(session, player, { row: 7, col: 8 }, mockIo, roomId);
      expect(result.success).toBe(true);
      expect(result.message).toContain('3');
    });
  });

  describe('actionConstruction', () => {
    test('should fail without knight', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      const result = sessions.actionConstruction(session, player, { row: 7, col: 7, buildType: 'village' }, mockIo, roomId);
      expect(result.success).toBe(false);
    });

    test('should build village and gain resource', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      // Place knight
      session.boardState[7][7].pieces = [{ type: 'knight', owner: player.id, color: player.color }];

      const result = sessions.actionConstruction(session, player, { row: 7, col: 7, buildType: 'village' }, mockIo, roomId);
      expect(result.success).toBe(true);
      expect(session.boardState[7][7].pieces.some(p => p.type === 'village')).toBe(true);
      expect(player.resources.plain).toBe(1);
    });
  });

  describe('actionNewCity', () => {
    test('should convert village to city', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      // Place village
      session.boardState[7][7].pieces = [{ type: 'village', owner: player.id, color: player.color }];

      const result = sessions.actionNewCity(session, player, { row: 7, col: 7 }, mockIo, roomId);
      expect(result.success).toBe(true);
      expect(session.boardState[7][7].pieces.some(p => p.type === 'city')).toBe(true);
      expect(player.victoryPoints).toBe(10);
    });

    test('should fail if no village', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];

      const result = sessions.actionNewCity(session, player, { row: 7, col: 7 }, mockIo, roomId);
      expect(result.success).toBe(false);
    });
  });

  describe('actionExpedition', () => {
    test('should require 2 knights in reserve', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];
      player.pieces.knight = 1;

      const result = sessions.actionExpedition(session, player, { row: 7, col: 7 }, mockIo, roomId);
      expect(result.success).toBe(false);
    });
  });

  describe('actionNobleTitle', () => {
    test('should require 15 resources', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];
      // Total: 1*5 + 1*3 + 1*2 + 1*4 = 14 (less than 15)
      player.resources = { field: 1, forest: 1, mountain: 1, plain: 1 };

      const result = sessions.actionNobleTitle(session, player, {}, mockIo, roomId);
      expect(result.success).toBe(false);
    });

    test('should promote title with 15 resources', () => {
      const session = sessions.session[roomId];
      const player = session.players['socket1'];
      player.resources = { field: 5, forest: 5, mountain: 3, plain: 2 };

      const result = sessions.actionNobleTitle(session, player, {}, mockIo, roomId);
      expect(result.success).toBe(true);
      expect(player.title).toBe('viscount');
    });
  });
});

describe('Save/Load Game', () => {
  let sessions;
  let mockIo;
  let roomId;

  beforeEach(() => {
    sessions = new Sessions();
    mockIo = createMockIo();

    // Create room with 4 players
    const socket1 = createMockSocket('socket1');
    roomId = sessions.createSession(socket1, mockIo);

    for (let i = 2; i <= 4; i++) {
      const socket = createMockSocket(`socket${i}`);
      sessions.addPlayerToSession(socket, mockIo, roomId);
    }

    // Set up game state
    const session = sessions.session[roomId];
    session.gamePhase = 'battle';
    session.gameStarted = true;
    session.playerOnTurn = session.players['socket1'];

    // Add some terrain and pieces
    session.boardState[7][7].texture = 'plain.png';
    session.boardState[7][7].pieces = [
      { type: 'city', owner: 'socket1', color: 'red' },
      { type: 'knight', owner: 'socket1', color: 'red' }
    ];
  });

  describe('joinLoadedGame', () => {
    test('should set playerOnTurn when player with matching color joins', () => {
      const session = sessions.session[roomId];
      const originalColor = session.playerOnTurn.color;

      // Simulate loaded game state - need to set up the player with the right color
      session.loadedGame = true;
      session.availableColors = [originalColor];
      session.playerOnTurnColor = originalColor;
      session.playerOnTurn = null;

      // Remove other players and keep only one with the matching color
      const playerWithColor = Object.values(session.players).find(p => p.color === originalColor);
      const oldId = playerWithColor.id;
      session.players = { [oldId]: playerWithColor };

      // Join with the color that should be on turn
      const newSocket = createMockSocket('newSocket1');
      const result = sessions.joinLoadedGame(newSocket, mockIo, roomId, originalColor);

      expect(result.success).toBe(true);
      expect(result.allJoined).toBe(true);
      expect(session.playerOnTurn).not.toBeNull();
      expect(session.playerOnTurn.color).toBe(originalColor);
    });

    test('should set playerOnTurn to first player when playerOnTurnColor is null and all joined', () => {
      const session = sessions.session[roomId];

      // Simulate loaded game with null playerOnTurnColor (the bug scenario)
      session.loadedGame = true;
      session.playerOnTurnColor = null;   // This was the bug - null color
      session.playerOnTurn = null;

      // Keep only one player with 'red' color
      const redPlayer = Object.values(session.players).find(p => p.color === 'red');
      if (redPlayer) {
        session.players = { [redPlayer.id]: redPlayer };
        session.availableColors = ['red'];
      } else {
        // If no red player, use the first one
        const firstPlayer = Object.values(session.players)[0];
        session.players = { [firstPlayer.id]: firstPlayer };
        session.availableColors = [firstPlayer.color];
      }

      const colorToJoin = session.availableColors[0];
      const newSocket = createMockSocket('newSocket1');
      const result = sessions.joinLoadedGame(newSocket, mockIo, roomId, colorToJoin);

      expect(result.success).toBe(true);
      expect(result.allJoined).toBe(true);
      // Should have fallback to first player since playerOnTurnColor was null
      expect(session.playerOnTurn).not.toBeNull();
    });

    test('should update piece owners when player joins loaded game', () => {
      const session = sessions.session[roomId];

      // Get the player with red color (the one who owns the pieces)
      const redPlayer = Object.values(session.players).find(p => p.color === 'red');
      const oldPlayerId = redPlayer ? redPlayer.id : 'socket1';
      const newPlayerId = 'newSocket1';

      // Update pieces to have correct owner
      session.boardState[7][7].pieces = [
        { type: 'city', owner: oldPlayerId, color: 'red' },
        { type: 'knight', owner: oldPlayerId, color: 'red' }
      ];

      // Simulate loaded game with only one player
      session.loadedGame = true;
      session.availableColors = ['red'];
      session.playerOnTurnColor = 'red';

      // Keep only the red player
      if (redPlayer) {
        session.players = { [oldPlayerId]: redPlayer };
      }

      const newSocket = createMockSocket(newPlayerId);
      sessions.joinLoadedGame(newSocket, mockIo, roomId, 'red');

      // Check that piece owners were updated
      const pieces = session.boardState[7][7].pieces;
      expect(pieces.every(p => p.owner === newPlayerId)).toBe(true);
    });

    test('should have valid playerOnTurn after all players join', () => {
      const session = sessions.session[roomId];

      // Get the red player
      const redPlayer = Object.values(session.players).find(p => p.color === 'red');
      const oldId = redPlayer ? redPlayer.id : 'socket1';

      // Simulate loaded game with only one slot
      session.loadedGame = true;
      session.availableColors = ['red'];
      session.playerOnTurnColor = 'red';
      session.playerOnTurn = null;

      if (redPlayer) {
        session.players = { [oldId]: redPlayer };
      }

      const newSocket = createMockSocket('newSocket1');
      const result = sessions.joinLoadedGame(newSocket, mockIo, roomId, 'red');

      expect(result.allJoined).toBe(true);
      // playerOnTurn should be set so currentTurn won't be null
      expect(session.playerOnTurn).toBeDefined();
      expect(session.playerOnTurn).not.toBeNull();
      expect(session.playerOnTurn.id).toBe('newSocket1');
    });
  });
});
