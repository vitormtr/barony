import {
    getRandomColor,
    getPlayersInRoom,
    getPlayer,
    createPlayer,
    canPlayerJoin,
    addPlayer,
    findPlayerByColor,
    updatePlayerSocketId,
    updatePiecesOwnership,
    rejoinPlayer,
    getNextPlayer,
    promoteNewLeader,
    resetPlayer,
    resetAllPlayers,
    getCitiesRemainingForPlayer
} from '../server/PlayerManager.js';
import { Player } from '../server/Player.js';
import { PLAYER_COLORS } from '../server/constants.js';
import { createEmptyBoard } from '../server/utils.js';

describe('PlayerManager', () => {
    let mockSession;

    beforeEach(() => {
        mockSession = {
            players: {},
            boardState: createEmptyBoard(15, 15),
            leaderId: null,
            playerOnTurn: null,
            lockedForEntry: false,
            gameStarted: false,
            initialPlacementState: {}
        };
    });

    describe('getRandomColor', () => {
        it('should return a valid color from PLAYER_COLORS', () => {
            const color = getRandomColor(mockSession);
            expect(PLAYER_COLORS).toContain(color);
        });

        it('should return unused color when some colors taken', () => {
            mockSession.players['p1'] = { color: 'red' };
            mockSession.players['p2'] = { color: 'blue' };

            const color = getRandomColor(mockSession);
            expect(['green', 'yellow']).toContain(color);
        });

        it('should return null when all colors taken', () => {
            mockSession.players['p1'] = { color: 'red' };
            mockSession.players['p2'] = { color: 'blue' };
            mockSession.players['p3'] = { color: 'green' };
            mockSession.players['p4'] = { color: 'yellow' };

            const color = getRandomColor(mockSession);
            expect(color).toBeNull();
        });

        it('should return random color for null session', () => {
            const color = getRandomColor(null);
            expect(PLAYER_COLORS).toContain(color);
        });
    });

    describe('getPlayersInRoom', () => {
        it('should return empty array for empty session', () => {
            const players = getPlayersInRoom(mockSession);
            expect(players).toEqual([]);
        });

        it('should return all players in session', () => {
            mockSession.players['p1'] = { id: 'p1', color: 'red' };
            mockSession.players['p2'] = { id: 'p2', color: 'blue' };

            const players = getPlayersInRoom(mockSession);
            expect(players.length).toBe(2);
        });

        it('should return empty array for null session', () => {
            const players = getPlayersInRoom(null);
            expect(players).toEqual([]);
        });
    });

    describe('getPlayer', () => {
        it('should return player by socket ID', () => {
            const player = { id: 'p1', color: 'red' };
            mockSession.players['p1'] = player;

            const result = getPlayer(mockSession, 'p1');
            expect(result).toBe(player);
        });

        it('should return null for unknown socket ID', () => {
            const result = getPlayer(mockSession, 'unknown');
            expect(result).toBeUndefined();
        });

        it('should return null for null session', () => {
            const result = getPlayer(null, 'p1');
            expect(result).toBeNull();
        });
    });

    describe('createPlayer', () => {
        it('should create player with socket ID and color', () => {
            const player = createPlayer('socket1', mockSession);

            expect(player.id).toBe('socket1');
            expect(PLAYER_COLORS).toContain(player.color);
        });

        it('should create player with unused color', () => {
            mockSession.players['p1'] = { color: 'red' };
            mockSession.players['p2'] = { color: 'blue' };
            mockSession.players['p3'] = { color: 'green' };

            const player = createPlayer('socket4', mockSession);
            expect(player.color).toBe('yellow');
        });
    });

    describe('canPlayerJoin', () => {
        it('should allow join for empty session', () => {
            const result = canPlayerJoin(mockSession);
            expect(result.canJoin).toBe(true);
        });

        it('should reject join for null session', () => {
            const result = canPlayerJoin(null);
            expect(result.canJoin).toBe(false);
            expect(result.error).toBe('Room not found!');
        });

        it('should reject join when room is full', () => {
            mockSession.players = { p1: {}, p2: {}, p3: {}, p4: {} };

            const result = canPlayerJoin(mockSession);
            expect(result.canJoin).toBe(false);
            expect(result.error).toBe('Room is full!');
        });

        it('should reject join when entry is locked', () => {
            mockSession.lockedForEntry = true;

            const result = canPlayerJoin(mockSession);
            expect(result.canJoin).toBe(false);
            expect(result.error).toContain('Entry blocked');
        });

        it('should reject join when game started', () => {
            mockSession.gameStarted = true;

            const result = canPlayerJoin(mockSession);
            expect(result.canJoin).toBe(false);
            expect(result.error).toContain('Game already started');
        });
    });

    describe('addPlayer', () => {
        it('should add player to session', () => {
            const result = addPlayer(mockSession, 'socket1');

            expect(result.success).toBe(true);
            expect(result.player).toBeDefined();
            expect(mockSession.players['socket1']).toBe(result.player);
        });

        it('should fail when session is full', () => {
            mockSession.players = { p1: {}, p2: {}, p3: {}, p4: {} };

            const result = addPlayer(mockSession, 'socket5');
            expect(result.success).toBe(false);
        });
    });

    describe('findPlayerByColor', () => {
        it('should find player by color', () => {
            const player = { id: 'p1', color: 'red' };
            mockSession.players['p1'] = player;

            const result = findPlayerByColor(mockSession, 'red');
            expect(result).toBe(player);
        });

        it('should return undefined for unknown color', () => {
            const result = findPlayerByColor(mockSession, 'purple');
            expect(result).toBeUndefined();
        });
    });

    describe('updatePlayerSocketId', () => {
        it('should update player socket ID in session', () => {
            const player = { id: 'old-socket', color: 'red' };
            mockSession.players['old-socket'] = player;
            mockSession.leaderId = 'old-socket';
            mockSession.playerOnTurn = player;

            updatePlayerSocketId(mockSession, 'old-socket', 'new-socket', player);

            expect(player.id).toBe('new-socket');
            expect(mockSession.players['new-socket']).toBe(player);
            expect(mockSession.players['old-socket']).toBeUndefined();
            expect(mockSession.leaderId).toBe('new-socket');
            expect(mockSession.playerOnTurn.id).toBe('new-socket');
        });
    });

    describe('updatePiecesOwnership', () => {
        it('should update piece ownership on board', () => {
            mockSession.boardState[5][5].pieces = [
                { type: 'knight', owner: 'old-socket', color: 'red' }
            ];

            updatePiecesOwnership(mockSession.boardState, 'old-socket', 'new-socket');

            expect(mockSession.boardState[5][5].pieces[0].owner).toBe('new-socket');
        });

        it('should not affect other players pieces', () => {
            mockSession.boardState[5][5].pieces = [
                { type: 'knight', owner: 'other-player', color: 'blue' }
            ];

            updatePiecesOwnership(mockSession.boardState, 'old-socket', 'new-socket');

            expect(mockSession.boardState[5][5].pieces[0].owner).toBe('other-player');
        });
    });

    describe('rejoinPlayer', () => {
        it('should rejoin player with new socket ID', () => {
            const player = new Player('old-socket', 'red');
            mockSession.players['old-socket'] = player;

            const result = rejoinPlayer(mockSession, 'new-socket', 'red');

            expect(result.success).toBe(true);
            expect(result.player.id).toBe('new-socket');
            expect(mockSession.players['new-socket']).toBe(player);
        });

        it('should fail for non-existent player', () => {
            const result = rejoinPlayer(mockSession, 'new-socket', 'purple');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Player not found');
        });

        it('should fail for null session', () => {
            const result = rejoinPlayer(null, 'new-socket', 'red');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Room not found');
        });
    });

    describe('getNextPlayer', () => {
        it('should return next player in order', () => {
            const players = [
                { id: 'p1', color: 'red' },
                { id: 'p2', color: 'blue' },
                { id: 'p3', color: 'green' }
            ];

            const next = getNextPlayer(players, 'p1');
            expect(next.id).toBe('p2');
        });

        it('should wrap around to first player', () => {
            const players = [
                { id: 'p1', color: 'red' },
                { id: 'p2', color: 'blue' },
                { id: 'p3', color: 'green' }
            ];

            const next = getNextPlayer(players, 'p3');
            expect(next.id).toBe('p1');
        });

        it('should return first player for unknown current', () => {
            const players = [
                { id: 'p1', color: 'red' },
                { id: 'p2', color: 'blue' }
            ];

            const next = getNextPlayer(players, 'unknown');
            expect(next.id).toBe('p1');
        });
    });

    describe('promoteNewLeader', () => {
        it('should set first remaining player as leader', () => {
            const remainingPlayers = [
                { id: 'p2', color: 'blue' },
                { id: 'p3', color: 'green' }
            ];

            const newLeader = promoteNewLeader(mockSession, remainingPlayers);

            expect(newLeader.id).toBe('p2');
            expect(mockSession.leaderId).toBe('p2');
        });
    });

    describe('resetPlayer', () => {
        it('should reset player to initial state', () => {
            const player = new Player('p1', 'red');
            player.pieces.knight = 3;
            player.resources.field = 5;
            player.title = 'duke';
            player.victoryPoints = 10;

            resetPlayer(player);

            expect(player.pieces.knight).toBe(7);
            expect(player.resources.field).toBe(0);
            expect(player.title).toBe('baron');
            expect(player.victoryPoints).toBe(0);
        });
    });

    describe('resetAllPlayers', () => {
        it('should reset all players', () => {
            const players = [
                new Player('p1', 'red'),
                new Player('p2', 'blue')
            ];
            players[0].pieces.knight = 0;
            players[1].pieces.knight = 0;

            resetAllPlayers(players);

            expect(players[0].pieces.knight).toBe(7);
            expect(players[1].pieces.knight).toBe(7);
        });
    });

    describe('getCitiesRemainingForPlayer', () => {
        it('should return cities remaining for current player', () => {
            const state = {
                placementSequence: [
                    { playerId: 'p1', citiesToPlace: 3, citiesPlaced: 1 }
                ],
                currentSequenceIndex: 0
            };

            const remaining = getCitiesRemainingForPlayer(state, 'p1');
            expect(remaining).toBe(2);
        });

        it('should return 0 for non-current player', () => {
            const state = {
                placementSequence: [
                    { playerId: 'p1', citiesToPlace: 3 }
                ],
                currentSequenceIndex: 0
            };

            const remaining = getCitiesRemainingForPlayer(state, 'p2');
            expect(remaining).toBe(0);
        });

        it('should return 0 for null state', () => {
            const remaining = getCitiesRemainingForPlayer(null, 'p1');
            expect(remaining).toBe(0);
        });
    });
});
