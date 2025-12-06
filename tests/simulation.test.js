import { jest } from '@jest/globals';
import { Sessions } from '../server/Sessions.js';

// Mock socket and io
const createMockSocket = (id) => ({
  id,
  join: jest.fn(),
  emit: jest.fn(),
});

const createMockIo = () => {
  const emitFn = jest.fn();
  return {
    to: jest.fn(() => ({
      emit: emitFn
    })),
    _emit: emitFn // expose for testing
  };
};

describe('Full 4-Player Game Simulation', () => {
  let sessions;
  let roomId;
  let mockIo;
  let sockets;

  beforeEach(() => {
    sessions = new Sessions();
    mockIo = createMockIo();
    sockets = {};

    // Create room with player 1
    sockets.player1 = createMockSocket('player1');
    roomId = sessions.createSession(sockets.player1, mockIo);

    // Add 3 more players
    for (let i = 2; i <= 4; i++) {
      sockets[`player${i}`] = createMockSocket(`player${i}`);
      sessions.addPlayerToSession(sockets[`player${i}`], mockIo, roomId);
    }
  });

  test('should have 4 players with unique colors', () => {
    const players = sessions.getPlayersInRoom(roomId);
    expect(players).toHaveLength(4);

    const colors = players.map(p => p.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(4);
  });

  test('should be in waiting phase initially', () => {
    const session = sessions.session[roomId];
    expect(session.gamePhase).toBe('waiting');
  });

  describe('Random Distribution', () => {
    test('should distribute textures on board', () => {
      const result = sessions.randomDistribution(sockets.player1, mockIo);
      expect(result.success).toBe(true);

      const session = sessions.session[roomId];
      const texturedHexes = session.boardState.flat().filter(h => h.texture !== null);
      expect(texturedHexes.length).toBeGreaterThan(0);
    });

    test('should lock room for entry after distribution', () => {
      sessions.randomDistribution(sockets.player1, mockIo);
      const session = sessions.session[roomId];
      expect(session.lockedForEntry).toBe(true);
    });

    test('should start initial placement phase', () => {
      sessions.randomDistribution(sockets.player1, mockIo);
      const session = sessions.session[roomId];
      expect(session.gamePhase).toBe('initialPlacement');
    });

    test('should only allow leader to distribute', () => {
      const result = sessions.randomDistribution(sockets.player2, mockIo);
      expect(result.success).toBe(false);
    });
  });

  describe('Initial Placement Phase', () => {
    beforeEach(() => {
      sessions.randomDistribution(sockets.player1, mockIo);
    });

    test('should allow first player to place city', () => {
      const session = sessions.session[roomId];

      // Find a valid hex for city (plain or farm)
      let validHex = null;
      for (let row = 0; row < session.boardState.length; row++) {
        for (let col = 0; col < session.boardState[row].length; col++) {
          const hex = session.boardState[row][col];
          if (['plain.png', 'farm.png'].includes(hex.texture) &&
              (!hex.pieces || hex.pieces.length === 0) &&
              !sessions.isAdjacentToCity(session.boardState, row, col)) {
            validHex = { row, col };
            break;
          }
        }
        if (validHex) break;
      }

      if (validHex) {
        const currentPlayer = session.playerOnTurn;
        const currentSocket = Object.values(sockets).find(s => s.id === currentPlayer.id);

        const result = sessions.placePiece(currentSocket, mockIo, {
          row: validHex.row,
          col: validHex.col
        });

        expect(result.success).toBe(true);
        const hex = session.boardState[validHex.row][validHex.col];
        expect(hex.pieces.some(p => p.type === 'city')).toBe(true);
        expect(hex.pieces.some(p => p.type === 'knight')).toBe(true);
      }
    });

    test('should not allow city on forest', () => {
      const session = sessions.session[roomId];

      // Find a forest hex
      let forestHex = null;
      for (let row = 0; row < session.boardState.length; row++) {
        for (let col = 0; col < session.boardState[row].length; col++) {
          if (session.boardState[row][col].texture === 'forest.png') {
            forestHex = { row, col };
            break;
          }
        }
        if (forestHex) break;
      }

      if (forestHex) {
        const currentPlayer = session.playerOnTurn;
        const currentSocket = Object.values(sockets).find(s => s.id === currentPlayer.id);

        const result = sessions.placePiece(currentSocket, mockIo, {
          row: forestHex.row,
          col: forestHex.col
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('plains or fields');
      }
    });
  });

  describe('Skip to Battle Phase (Test Mode)', () => {
    test('should skip to battle phase', () => {
      const result = sessions.skipToBattlePhase(sockets.player1, mockIo);
      expect(result.success).toBe(true);

      const session = sessions.session[roomId];
      expect(session.gamePhase).toBe('battle');
    });

    test('should place cities and knights for all players', () => {
      sessions.skipToBattlePhase(sockets.player1, mockIo);
      const session = sessions.session[roomId];

      // Each player should have cities on board
      const players = Object.values(session.players);
      players.forEach(player => {
        const playerCities = session.boardState.flat().filter(hex =>
          hex.pieces?.some(p => p.type === 'city' && p.color === player.color)
        );
        expect(playerCities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Battle Phase Actions', () => {
    beforeEach(() => {
      sessions.skipToBattlePhase(sockets.player1, mockIo);
    });

    test('should process recruitment action', () => {
      const session = sessions.session[roomId];
      const currentPlayer = session.playerOnTurn;
      const currentSocket = Object.values(sockets).find(s => s.id === currentPlayer.id);

      // Find player's city
      let cityHex = null;
      for (let row = 0; row < session.boardState.length; row++) {
        for (let col = 0; col < session.boardState[row].length; col++) {
          const hex = session.boardState[row][col];
          if (hex.pieces?.some(p => p.type === 'city' && p.color === currentPlayer.color)) {
            cityHex = { row, col, hex };
            break;
          }
        }
        if (cityHex) break;
      }

      if (cityHex) {
        const knightsBefore = cityHex.hex.pieces.filter(p => p.type === 'knight').length;

        const result = sessions.battleAction(currentSocket, mockIo, {
          action: 'recruitment',
          row: cityHex.row,
          col: cityHex.col
        });

        expect(result.success).toBe(true);
        const knightsAfter = cityHex.hex.pieces.filter(p => p.type === 'knight').length;
        expect(knightsAfter).toBeGreaterThan(knightsBefore);
      }
    });

    test('should advance turn after action', () => {
      const session = sessions.session[roomId];
      const initialPlayer = session.playerOnTurn;

      sessions.endTurn(sockets[Object.keys(sockets).find(k => sockets[k].id === initialPlayer.id)], mockIo);

      expect(session.playerOnTurn.id).not.toBe(initialPlayer.id);
    });

    test('should not allow actions out of turn', () => {
      const session = sessions.session[roomId];
      const wrongSocket = Object.values(sockets).find(s => s.id !== session.playerOnTurn.id);

      const result = sessions.battleAction(wrongSocket, mockIo, {
        action: 'recruitment',
        row: 7,
        col: 7
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not your turn');
    });
  });

  describe('Turn Rotation', () => {
    beforeEach(() => {
      sessions.skipToBattlePhase(sockets.player1, mockIo);
    });

    test('should rotate through all 4 players', () => {
      const session = sessions.session[roomId];
      const seenPlayers = new Set();

      for (let i = 0; i < 4; i++) {
        seenPlayers.add(session.playerOnTurn.id);
        const currentSocket = Object.values(sockets).find(s => s.id === session.playerOnTurn.id);
        sessions.endTurn(currentSocket, mockIo);
      }

      expect(seenPlayers.size).toBe(4);
    });

    test('should return to first player after full rotation', () => {
      const session = sessions.session[roomId];
      const firstPlayer = session.playerOnTurn.id;

      for (let i = 0; i < 4; i++) {
        const currentSocket = Object.values(sockets).find(s => s.id === session.playerOnTurn.id);
        sessions.endTurn(currentSocket, mockIo);
      }

      expect(session.playerOnTurn.id).toBe(firstPlayer);
    });
  });

  describe('Victory Condition', () => {
    beforeEach(() => {
      sessions.skipToBattlePhase(sockets.player1, mockIo);
    });

    test('should detect when player becomes Duke', () => {
      const session = sessions.session[roomId];
      const player = session.playerOnTurn;

      // Give player enough resources
      player.resources = { field: 20, forest: 20, mountain: 20, plain: 20 };

      // Promote to Duke (requires 4 promotions: baron -> viscount -> count -> marquis -> duke)
      for (let i = 0; i < 4; i++) {
        player.resources = { field: 20, forest: 20, mountain: 20, plain: 20 };
        const currentSocket = Object.values(sockets).find(s => s.id === player.id);
        sessions.actionNobleTitle(session, player, {}, mockIo, roomId);
      }

      expect(player.title).toBe('duke');
      expect(session.gameEnding).toBe(true);
    });

    test('should calculate final scores correctly', () => {
      const session = sessions.session[roomId];
      const player = session.players['player1'];

      player.victoryPoints = 30;  // 3 new cities
      player.resources = { field: 5, forest: 3, mountain: 2, plain: 5 };
      player.title = 'marquis';  // 15 points

      const score = sessions.calculateFinalScore(player);
      // 30 VP + 15 resources + 15 (marquis) = 60
      expect(score).toBe(60);
    });
  });

  describe('Game Restart', () => {
    beforeEach(() => {
      sessions.skipToBattlePhase(sockets.player1, mockIo);
    });

    test('should restart game when leader confirms', () => {
      const result = sessions.restartGame(sockets.player1, mockIo, roomId);
      expect(result.success).toBe(true);

      const session = sessions.session[roomId];
      expect(session.gamePhase).toBe('waiting');
      expect(session.gameStarted).toBe(false);
    });

    test('should reject restart with wrong code', () => {
      const result = sessions.restartGame(sockets.player1, mockIo, 'WRONG');
      expect(result.success).toBe(false);
    });

    test('should only allow leader to restart', () => {
      const result = sessions.restartGame(sockets.player2, mockIo, roomId);
      expect(result.success).toBe(false);
    });
  });

  describe('Player Disconnection', () => {
    test('should handle player disconnection', () => {
      sessions.removePlayerFromSession(sockets.player3, mockIo);
      const players = sessions.getPlayersInRoom(roomId);
      expect(players).toHaveLength(3);
    });

    test('should transfer leadership if leader disconnects', () => {
      const session = sessions.session[roomId];
      const oldLeader = session.leaderId;

      sessions.removePlayerFromSession(sockets.player1, mockIo);

      expect(session.leaderId).not.toBe(oldLeader);
      expect(sessions.isLeader(session.leaderId, roomId)).toBe(true);
    });

    test('should delete room when all players leave', () => {
      for (let i = 1; i <= 4; i++) {
        sessions.removePlayerFromSession(sockets[`player${i}`], mockIo);
      }

      expect(sessions.session[roomId]).toBeUndefined();
    });
  });

  describe('Complete Game Flow', () => {
    test('should play through a complete game cycle', () => {
      const session = sessions.session[roomId];

      // 1. Start game with distribution
      const distResult = sessions.randomDistribution(sockets.player1, mockIo);
      expect(distResult.success).toBe(true);
      expect(session.gamePhase).toBe('initialPlacement');

      // 2. Simulate all city placements
      const placementSequence = session.initialPlacementState.placementSequence;

      for (const turn of placementSequence) {
        const player = session.players[turn.playerId];
        const socket = Object.values(sockets).find(s => s.id === player.id);

        for (let c = 0; c < turn.citiesToPlace; c++) {
          // Find valid hex
          let validHex = null;
          for (let row = 0; row < session.boardState.length; row++) {
            for (let col = 0; col < session.boardState[row].length; col++) {
              const hex = session.boardState[row][col];
              if (['plain.png', 'farm.png'].includes(hex.texture) &&
                  (!hex.pieces || hex.pieces.length === 0) &&
                  !sessions.isAdjacentToCity(session.boardState, row, col)) {
                validHex = { row, col };
                break;
              }
            }
            if (validHex) break;
          }

          if (validHex) {
            sessions.placePiece(socket, mockIo, validHex);
          }
        }
      }

      // 3. Should now be in battle phase
      expect(session.gamePhase).toBe('battle');

      // 4. Play several battle rounds
      for (let round = 0; round < 4; round++) {
        const player = session.playerOnTurn;
        const socket = Object.values(sockets).find(s => s.id === player.id);

        // Find player's city for recruitment
        let cityHex = null;
        for (let row = 0; row < session.boardState.length; row++) {
          for (let col = 0; col < session.boardState[row].length; col++) {
            const hex = session.boardState[row][col];
            if (hex.pieces?.some(p => p.type === 'city' && p.color === player.color)) {
              cityHex = { row, col };
              break;
            }
          }
          if (cityHex) break;
        }

        if (cityHex && player.pieces.knight >= 2) {
          sessions.battleAction(socket, mockIo, {
            action: 'recruitment',
            row: cityHex.row,
            col: cityHex.col
          });
        }

        sessions.endTurn(socket, mockIo);
      }

      // 5. Game should still be running
      expect(session.gamePhase).toBe('battle');

      // 6. Force Duke condition
      const player = session.playerOnTurn;
      player.resources = { field: 20, forest: 20, mountain: 20, plain: 20 };

      for (let i = 0; i < 4; i++) {
        player.resources = { field: 20, forest: 20, mountain: 20, plain: 20 };
        sessions.actionNobleTitle(session, player, {}, mockIo, roomId);
      }

      expect(player.title).toBe('duke');
      expect(session.gameEnding).toBe(true);
    });
  });
});
