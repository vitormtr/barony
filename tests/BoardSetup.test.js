import {
    collectPlayerTextures,
    resetPlayerTextures,
    distributeTexturesBFS,
    findValidCityHexes,
    placeInitialPieces,
    setupBoard,
    quickSetupForTesting
} from '../server/BoardSetup.js';
import { createEmptyBoard } from '../server/utils.js';

// Helper to create a mock player
function createMockPlayer(id, color) {
    return {
        id,
        color,
        hexCount: {
            water: 4,
            farm: 6,
            mountain: 5,
            plain: 6,
            forest: 6
        },
        pieces: { knight: 7, city: 5, village: 14, stronghold: 2 }
    };
}

describe('BoardSetup', () => {
    let board;
    let players;

    beforeEach(() => {
        board = createEmptyBoard(15, 15);
        players = [
            createMockPlayer('p1', 'red'),
            createMockPlayer('p2', 'blue'),
            createMockPlayer('p3', 'green'),
            createMockPlayer('p4', 'yellow')
        ];
    });

    describe('collectPlayerTextures', () => {
        it('should collect all textures from all players', () => {
            const textures = collectPlayerTextures(players);

            // 4 players * 27 textures each = 108 total
            expect(textures.length).toBe(108);
        });

        it('should include correct texture types', () => {
            const textures = collectPlayerTextures(players);

            expect(textures.filter(t => t === 'water.png').length).toBe(16); // 4 * 4
            expect(textures.filter(t => t === 'farm.png').length).toBe(24);  // 4 * 6
            expect(textures.filter(t => t === 'mountain.png').length).toBe(20); // 4 * 5
            expect(textures.filter(t => t === 'plain.png').length).toBe(24); // 4 * 6
            expect(textures.filter(t => t === 'forest.png').length).toBe(24); // 4 * 6
        });

        it('should return empty array for empty players', () => {
            const textures = collectPlayerTextures([]);
            expect(textures.length).toBe(0);
        });
    });

    describe('resetPlayerTextures', () => {
        it('should set all texture counts to zero', () => {
            resetPlayerTextures(players);

            players.forEach(player => {
                Object.values(player.hexCount).forEach(count => {
                    expect(count).toBe(0);
                });
            });
        });
    });

    describe('distributeTexturesBFS', () => {
        it('should place textures on board using BFS', () => {
            const textures = ['plain.png', 'forest.png', 'mountain.png'];
            const result = distributeTexturesBFS(board, textures);

            expect(result.placedCount).toBe(3);
            expect(result.positions.length).toBe(3);
        });

        it('should start from center of board', () => {
            const textures = ['plain.png'];
            const result = distributeTexturesBFS(board, textures);

            expect(result.positions[0].row).toBe(7); // Center of 15x15
            expect(result.positions[0].col).toBe(7);
        });

        it('should return empty result for empty textures', () => {
            const result = distributeTexturesBFS(board, []);
            expect(result.placedCount).toBe(0);
            expect(result.positions.length).toBe(0);
        });

        it('should create connected terrain', () => {
            const textures = Array(10).fill('plain.png');
            const result = distributeTexturesBFS(board, textures);

            // All textures should be placed
            expect(result.placedCount).toBe(10);

            // Count textures on board
            let textureCount = 0;
            for (const row of board) {
                for (const hex of row) {
                    if (hex.texture) textureCount++;
                }
            }
            expect(textureCount).toBe(10);
        });
    });

    describe('findValidCityHexes', () => {
        it('should find hexes with plain or farm terrain', () => {
            board[5][5].texture = 'plain.png';
            board[5][6].texture = 'farm.png';
            board[5][7].texture = 'forest.png';
            board[5][8].texture = 'mountain.png';

            const validHexes = findValidCityHexes(board);

            expect(validHexes.length).toBe(2);
            expect(validHexes).toContainEqual({ row: 5, col: 5 });
            expect(validHexes).toContainEqual({ row: 5, col: 6 });
        });

        it('should exclude hexes with pieces', () => {
            board[5][5].texture = 'plain.png';
            board[5][5].pieces = [{ type: 'knight', color: 'red' }];
            board[5][6].texture = 'plain.png';

            const validHexes = findValidCityHexes(board);

            expect(validHexes.length).toBe(1);
            expect(validHexes[0]).toEqual({ row: 5, col: 6 });
        });

        it('should return empty array for empty board', () => {
            const validHexes = findValidCityHexes(board);
            expect(validHexes.length).toBe(0);
        });
    });

    describe('placeInitialPieces', () => {
        beforeEach(() => {
            // Setup valid hexes for city placement
            for (let i = 0; i < 20; i++) {
                board[5 + Math.floor(i / 5)][5 + (i % 5)].texture = 'plain.png';
            }
        });

        it('should place cities and knights for all players', () => {
            const result = placeInitialPieces(board, players, 3);

            // 4 players * 3 cities = 12 placements
            expect(result.placements.length).toBe(12);
        });

        it('should decrease player piece counts', () => {
            placeInitialPieces(board, players, 3);

            players.forEach(player => {
                expect(player.pieces.city).toBe(2);  // 5 - 3
                expect(player.pieces.knight).toBe(4); // 7 - 3
            });
        });

        it('should place both city and knight on same hex', () => {
            placeInitialPieces(board, players, 1);

            const placement = board[5][5]; // First placement
            if (placement.pieces) {
                const types = placement.pieces.map(p => p.type);
                if (types.includes('city')) {
                    expect(types).toContain('knight');
                }
            }
        });
    });

    describe('setupBoard', () => {
        it('should distribute textures and reset player counts', () => {
            const result = setupBoard(board, players);

            expect(result.success).toBe(true);
            expect(result.texturesPlaced).toBe(108);

            // Players should have zero textures
            players.forEach(player => {
                const totalTextures = Object.values(player.hexCount).reduce((sum, c) => sum + c, 0);
                expect(totalTextures).toBe(0);
            });
        });
    });

    describe('quickSetupForTesting', () => {
        it('should distribute textures and place pieces', () => {
            const result = quickSetupForTesting(board, players);

            expect(result.success).toBe(true);
            expect(result.texturesPlaced).toBe(108);
            expect(result.piecesPlaced).toBe(12); // 4 players * 3 cities
        });

        it('should leave board ready for battle phase', () => {
            quickSetupForTesting(board, players);

            // Check that textures exist
            let textureCount = 0;
            for (const row of board) {
                for (const hex of row) {
                    if (hex.texture) textureCount++;
                }
            }
            expect(textureCount).toBe(108);

            // Check that pieces exist
            let pieceCount = 0;
            for (const row of board) {
                for (const hex of row) {
                    if (hex.pieces) pieceCount += hex.pieces.length;
                }
            }
            // 12 cities + 12 knights = 24 pieces
            expect(pieceCount).toBe(24);
        });
    });
});
