import {
    createPlacementSequence,
    createInitialState,
    getCurrentTurn,
    getCitiesRemaining,
    validateCityPlacement,
    placeCity,
    advancePlacement,
    isPlacementComplete,
    getPlacementProgress
} from '../server/InitialPlacement.js';
import { createEmptyBoard } from '../server/utils.js';

// Helper to create a mock player
function createMockPlayer(id, color) {
    return {
        id,
        color,
        pieces: { knight: 7, city: 5, village: 14, stronghold: 2 }
    };
}

describe('InitialPlacement', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4'];
    let board;
    let player;

    beforeEach(() => {
        board = createEmptyBoard(15, 15);
        player = createMockPlayer('p1', 'red');
    });

    describe('createPlacementSequence', () => {
        it('should create correct Barony placement sequence', () => {
            const sequence = createPlacementSequence(playerIds);

            expect(sequence.length).toBe(7);
            // P1: 1, P2: 1, P3: 1, P4: 3, P3: 2, P2: 2, P1: 2
            expect(sequence[0]).toEqual({ playerId: 'p1', citiesToPlace: 1 });
            expect(sequence[1]).toEqual({ playerId: 'p2', citiesToPlace: 1 });
            expect(sequence[2]).toEqual({ playerId: 'p3', citiesToPlace: 1 });
            expect(sequence[3]).toEqual({ playerId: 'p4', citiesToPlace: 3 });
            expect(sequence[4]).toEqual({ playerId: 'p3', citiesToPlace: 2 });
            expect(sequence[5]).toEqual({ playerId: 'p2', citiesToPlace: 2 });
            expect(sequence[6]).toEqual({ playerId: 'p1', citiesToPlace: 2 });
        });

        it('should give each player 3 cities total', () => {
            const sequence = createPlacementSequence(playerIds);

            const citiesPerPlayer = {};
            sequence.forEach(turn => {
                citiesPerPlayer[turn.playerId] = (citiesPerPlayer[turn.playerId] || 0) + turn.citiesToPlace;
            });

            expect(citiesPerPlayer['p1']).toBe(3);
            expect(citiesPerPlayer['p2']).toBe(3);
            expect(citiesPerPlayer['p3']).toBe(3);
            expect(citiesPerPlayer['p4']).toBe(3);
        });

        it('should throw error if no players or more than 4', () => {
            expect(() => createPlacementSequence([])).toThrow();
            expect(() => createPlacementSequence(['p1', 'p2', 'p3', 'p4', 'p5'])).toThrow();
        });

        it('should support 1-4 players', () => {
            expect(() => createPlacementSequence(['p1'])).not.toThrow();
            expect(() => createPlacementSequence(['p1', 'p2'])).not.toThrow();
            expect(() => createPlacementSequence(['p1', 'p2', 'p3'])).not.toThrow();
            expect(() => createPlacementSequence(['p1', 'p2', 'p3', 'p4'])).not.toThrow();
        });
    });

    describe('createInitialState', () => {
        it('should create state with sequence and zero indices', () => {
            const state = createInitialState(playerIds);

            expect(state.placementSequence.length).toBe(7);
            expect(state.currentSequenceIndex).toBe(0);
            expect(state.citiesPlacedInTurn).toBe(0);
        });
    });

    describe('getCurrentTurn', () => {
        it('should return first turn initially', () => {
            const state = createInitialState(playerIds);
            const turn = getCurrentTurn(state);

            expect(turn.playerId).toBe('p1');
            expect(turn.citiesToPlace).toBe(1);
        });

        it('should return null when sequence complete', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 7;

            expect(getCurrentTurn(state)).toBeNull();
        });
    });

    describe('getCitiesRemaining', () => {
        it('should return full count at start of turn', () => {
            const state = createInitialState(playerIds);
            expect(getCitiesRemaining(state)).toBe(1);
        });

        it('should return remaining count during turn', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 3; // P4's turn (3 cities)
            state.citiesPlacedInTurn = 1;

            expect(getCitiesRemaining(state)).toBe(2);
        });

        it('should return 0 when complete', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 7;

            expect(getCitiesRemaining(state)).toBe(0);
        });
    });

    describe('validateCityPlacement', () => {
        it('should pass for valid placement', () => {
            board[7][7].texture = 'plain.png';
            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(true);
        });

        it('should fail if no cities available', () => {
            board[7][7].texture = 'plain.png';
            player.pieces.city = 0;

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('NO_PIECES');
        });

        it('should fail if no knights available', () => {
            board[7][7].texture = 'plain.png';
            player.pieces.knight = 0;

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('NO_PIECES');
        });

        it('should fail for invalid hex', () => {
            const result = validateCityPlacement(board, player, 99, 99);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_HEX');
        });

        it('should fail for hex without texture', () => {
            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_HEX');
        });

        it('should fail for occupied hex', () => {
            board[7][7].texture = 'plain.png';
            board[7][7].pieces = [{ type: 'knight', color: 'blue' }];

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('HEX_OCCUPIED');
        });

        it('should fail for invalid terrain (forest)', () => {
            board[7][7].texture = 'forest.png';

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_TERRAIN');
        });

        it('should fail for invalid terrain (mountain)', () => {
            board[7][7].texture = 'mountain.png';

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_TERRAIN');
        });

        it('should fail for invalid terrain (water)', () => {
            board[7][7].texture = 'water.png';

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_TERRAIN');
        });

        it('should fail if adjacent to city', () => {
            board[7][7].texture = 'plain.png';
            board[7][8].texture = 'plain.png';
            board[7][8].pieces = [{ type: 'city', color: 'blue' }];

            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('ADJACENT_TO_CITY');
        });

        it('should allow placement on farm terrain', () => {
            board[7][7].texture = 'farm.png';
            const result = validateCityPlacement(board, player, 7, 7);
            expect(result.valid).toBe(true);
        });
    });

    describe('placeCity', () => {
        it('should place city and knight on valid hex', () => {
            board[7][7].texture = 'plain.png';

            const result = placeCity(board, player, 7, 7);

            expect(result.success).toBe(true);
            expect(board[7][7].pieces.length).toBe(2);
            expect(board[7][7].pieces[0].type).toBe('city');
            expect(board[7][7].pieces[1].type).toBe('knight');
            expect(player.pieces.city).toBe(4);
            expect(player.pieces.knight).toBe(6);
        });

        it('should fail for invalid placement', () => {
            board[7][7].texture = 'forest.png';

            const result = placeCity(board, player, 7, 7);

            expect(result.success).toBe(false);
            expect(player.pieces.city).toBe(5); // Unchanged
        });
    });

    describe('advancePlacement', () => {
        it('should increment cities placed', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 3; // P4's turn (3 cities)
            state.citiesPlacedInTurn = 0;

            advancePlacement(state);

            expect(state.citiesPlacedInTurn).toBe(1); // Still P4's turn
        });

        it('should move to next player when turn complete', () => {
            const state = createInitialState(playerIds);
            state.citiesPlacedInTurn = 0;

            const result = advancePlacement(state);

            expect(result.complete).toBe(false);
            expect(result.turnChanged).toBe(true);
            expect(result.nextPlayerId).toBe('p2');
        });

        it('should not change turn when cities remaining', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 3; // P4's turn (3 cities)
            state.citiesPlacedInTurn = 0;

            const result = advancePlacement(state);

            expect(result.complete).toBe(false);
            expect(result.turnChanged).toBe(false);
            expect(result.citiesRemaining).toBe(2);
        });

        it('should signal complete when sequence ends', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 6; // Last turn
            state.citiesPlacedInTurn = 1; // Need 2, so after this = 2

            const result = advancePlacement(state);

            expect(result.complete).toBe(true);
        });
    });

    describe('isPlacementComplete', () => {
        it('should return false initially', () => {
            const state = createInitialState(playerIds);
            expect(isPlacementComplete(state)).toBe(false);
        });

        it('should return true when sequence complete', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 7;

            expect(isPlacementComplete(state)).toBe(true);
        });
    });

    describe('getPlacementProgress', () => {
        it('should return 0% at start', () => {
            const state = createInitialState(playerIds);
            const progress = getPlacementProgress(state);

            expect(progress.completed).toBe(0);
            expect(progress.total).toBe(12); // 3 cities * 4 players
            expect(progress.percentage).toBe(0);
        });

        it('should track progress during placement', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 3; // After P1, P2, P3 (3 cities)
            state.citiesPlacedInTurn = 1; // P4 placed 1

            const progress = getPlacementProgress(state);

            expect(progress.completed).toBe(4);
            expect(progress.percentage).toBe(33);
        });

        it('should return 100% when complete', () => {
            const state = createInitialState(playerIds);
            state.currentSequenceIndex = 7;
            state.citiesPlacedInTurn = 0;

            const progress = getPlacementProgress(state);

            expect(progress.completed).toBe(12);
            expect(progress.percentage).toBe(100);
        });
    });
});
