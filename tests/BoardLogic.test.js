import {
    getDirections,
    isWithinBounds,
    getNeighbors,
    isAdjacentToPosition,
    isAdjacentToWater,
    isBorderHex,
    isAdjacentToTexture,
    isAdjacentToCity,
    hasAnyTexture,
    shuffleArray,
    getResourceName,
    findHexes,
    countPiecesOnBoard,
    getPiecesAt,
    hasPieceType
} from '../server/BoardLogic.js';
import { DIRECTION_MAP } from '../server/constants.js';
import { createEmptyBoard } from '../server/utils.js';

describe('BoardLogic', () => {
    let emptyBoard;

    beforeEach(() => {
        emptyBoard = createEmptyBoard(5, 5);
    });

    describe('getDirections', () => {
        it('should return ODD directions for odd rows', () => {
            expect(getDirections(1)).toBe(DIRECTION_MAP.ODD);
            expect(getDirections(3)).toBe(DIRECTION_MAP.ODD);
        });

        it('should return EVEN directions for even rows', () => {
            expect(getDirections(0)).toBe(DIRECTION_MAP.EVEN);
            expect(getDirections(2)).toBe(DIRECTION_MAP.EVEN);
        });
    });

    describe('isWithinBounds', () => {
        it('should return true for valid positions', () => {
            expect(isWithinBounds(emptyBoard, 0, 0)).toBe(true);
            expect(isWithinBounds(emptyBoard, 2, 2)).toBe(true);
            expect(isWithinBounds(emptyBoard, 4, 4)).toBe(true);
        });

        it('should return false for positions outside board', () => {
            expect(isWithinBounds(emptyBoard, -1, 0)).toBe(false);
            expect(isWithinBounds(emptyBoard, 0, -1)).toBe(false);
            expect(isWithinBounds(emptyBoard, 5, 0)).toBe(false);
            expect(isWithinBounds(emptyBoard, 0, 5)).toBe(false);
        });
    });

    describe('getNeighbors', () => {
        it('should return 6 neighbors for center hex', () => {
            const neighbors = getNeighbors(emptyBoard, 2, 2);
            expect(neighbors.length).toBe(6);
        });

        it('should return fewer neighbors for corner hex', () => {
            const neighbors = getNeighbors(emptyBoard, 0, 0);
            expect(neighbors.length).toBeLessThan(6);
        });

        it('should return valid positions only', () => {
            const neighbors = getNeighbors(emptyBoard, 2, 2);
            neighbors.forEach(n => {
                expect(isWithinBounds(emptyBoard, n.row, n.col)).toBe(true);
            });
        });
    });

    describe('isAdjacentToPosition', () => {
        it('should return true for adjacent positions on even row', () => {
            // Even row (0): adjacent to (0,1), (1,0), etc.
            expect(isAdjacentToPosition(0, 1, 0, 2)).toBe(true);
            expect(isAdjacentToPosition(0, 1, 1, 1)).toBe(true);
        });

        it('should return true for adjacent positions on odd row', () => {
            // Odd row (1): different offset
            expect(isAdjacentToPosition(1, 1, 1, 2)).toBe(true);
            expect(isAdjacentToPosition(1, 1, 0, 1)).toBe(true);
        });

        it('should return false for non-adjacent positions', () => {
            expect(isAdjacentToPosition(0, 0, 2, 2)).toBe(false);
            expect(isAdjacentToPosition(0, 0, 0, 3)).toBe(false);
        });
    });

    describe('isAdjacentToWater', () => {
        it('should return true when adjacent to water', () => {
            emptyBoard[2][3].texture = 'water.png';
            expect(isAdjacentToWater(emptyBoard, 2, 2)).toBe(true);
        });

        it('should return false when not adjacent to water', () => {
            emptyBoard[0][0].texture = 'water.png';
            expect(isAdjacentToWater(emptyBoard, 4, 4)).toBe(false);
        });

        it('should return false on empty board', () => {
            expect(isAdjacentToWater(emptyBoard, 2, 2)).toBe(false);
        });
    });

    describe('isBorderHex', () => {
        it('should return true for edge hex', () => {
            // Fill board with textures
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    emptyBoard[r][c].texture = 'plain.png';
                }
            }
            // Edge hex is still border (adjacent to board edge)
            expect(isBorderHex(emptyBoard, 0, 0)).toBe(true);
            expect(isBorderHex(emptyBoard, 4, 4)).toBe(true);
        });

        it('should return true when adjacent to empty hex', () => {
            emptyBoard[2][2].texture = 'plain.png';
            // Neighbors don't have texture, so it's a border
            expect(isBorderHex(emptyBoard, 2, 2)).toBe(true);
        });

        it('should return false for surrounded hex', () => {
            // Create a small filled area
            for (let r = 1; r <= 3; r++) {
                for (let c = 1; c <= 3; c++) {
                    emptyBoard[r][c].texture = 'plain.png';
                }
            }
            // Center hex (2,2) surrounded by textures
            expect(isBorderHex(emptyBoard, 2, 2)).toBe(false);
        });
    });

    describe('isAdjacentToTexture', () => {
        it('should return true when adjacent to textured hex', () => {
            emptyBoard[2][3].texture = 'plain.png';
            expect(isAdjacentToTexture(emptyBoard, 2, 2)).toBe(true);
        });

        it('should return false when no adjacent texture', () => {
            expect(isAdjacentToTexture(emptyBoard, 2, 2)).toBe(false);
        });
    });

    describe('isAdjacentToCity', () => {
        it('should return true when adjacent to city', () => {
            emptyBoard[2][3].pieces = [{ type: 'city', color: 'red' }];
            expect(isAdjacentToCity(emptyBoard, 2, 2)).toBe(true);
        });

        it('should return false when adjacent to other piece type', () => {
            emptyBoard[2][3].pieces = [{ type: 'knight', color: 'red' }];
            expect(isAdjacentToCity(emptyBoard, 2, 2)).toBe(false);
        });

        it('should return false when no adjacent pieces', () => {
            expect(isAdjacentToCity(emptyBoard, 2, 2)).toBe(false);
        });
    });

    describe('hasAnyTexture', () => {
        it('should return false for empty board', () => {
            expect(hasAnyTexture(emptyBoard)).toBe(false);
        });

        it('should return true when board has texture', () => {
            emptyBoard[0][0].texture = 'plain.png';
            expect(hasAnyTexture(emptyBoard)).toBe(true);
        });
    });

    describe('shuffleArray', () => {
        it('should maintain array length', () => {
            const arr = [1, 2, 3, 4, 5];
            const result = shuffleArray([...arr]);
            expect(result.length).toBe(arr.length);
        });

        it('should contain same elements', () => {
            const arr = [1, 2, 3, 4, 5];
            const result = shuffleArray([...arr]);
            expect(result.sort()).toEqual(arr.sort());
        });

        it('should return the same array reference', () => {
            const arr = [1, 2, 3];
            const result = shuffleArray(arr);
            expect(result).toBe(arr);
        });
    });

    describe('getResourceName', () => {
        it('should return correct resource names', () => {
            expect(getResourceName('field')).toBe('Field');
            expect(getResourceName('forest')).toBe('Forest');
            expect(getResourceName('mountain')).toBe('Mountain');
            expect(getResourceName('plain')).toBe('Plain');
        });

        it('should return original value for unknown resource', () => {
            expect(getResourceName('unknown')).toBe('unknown');
        });
    });

    describe('findHexes', () => {
        it('should find hexes matching predicate', () => {
            emptyBoard[1][1].texture = 'water.png';
            emptyBoard[2][2].texture = 'water.png';
            emptyBoard[3][3].texture = 'plain.png';

            const waterHexes = findHexes(emptyBoard, (hex) => hex.texture === 'water.png');
            expect(waterHexes.length).toBe(2);
        });

        it('should return empty array when no matches', () => {
            const result = findHexes(emptyBoard, (hex) => hex.texture === 'water.png');
            expect(result.length).toBe(0);
        });

        it('should include row and col in results', () => {
            emptyBoard[2][3].texture = 'plain.png';
            const result = findHexes(emptyBoard, (hex) => hex.texture === 'plain.png');
            expect(result[0].row).toBe(2);
            expect(result[0].col).toBe(3);
        });
    });

    describe('countPiecesOnBoard', () => {
        it('should count pieces of specific type', () => {
            emptyBoard[1][1].pieces = [{ type: 'knight', color: 'red' }];
            emptyBoard[2][2].pieces = [{ type: 'knight', color: 'blue' }];
            emptyBoard[3][3].pieces = [{ type: 'city', color: 'red' }];

            expect(countPiecesOnBoard(emptyBoard, 'knight')).toBe(2);
            expect(countPiecesOnBoard(emptyBoard, 'city')).toBe(1);
        });

        it('should count pieces by color when specified', () => {
            emptyBoard[1][1].pieces = [{ type: 'knight', color: 'red' }];
            emptyBoard[2][2].pieces = [{ type: 'knight', color: 'blue' }];

            expect(countPiecesOnBoard(emptyBoard, 'knight', 'red')).toBe(1);
            expect(countPiecesOnBoard(emptyBoard, 'knight', 'blue')).toBe(1);
        });

        it('should return 0 for empty board', () => {
            expect(countPiecesOnBoard(emptyBoard, 'knight')).toBe(0);
        });
    });

    describe('getPiecesAt', () => {
        it('should return pieces at position', () => {
            emptyBoard[2][2].pieces = [
                { type: 'city', color: 'red' },
                { type: 'knight', color: 'red' }
            ];

            const pieces = getPiecesAt(emptyBoard, 2, 2);
            expect(pieces.length).toBe(2);
        });

        it('should return empty array for hex without pieces', () => {
            const pieces = getPiecesAt(emptyBoard, 2, 2);
            expect(pieces).toEqual([]);
        });

        it('should return empty array for invalid position', () => {
            const pieces = getPiecesAt(emptyBoard, -1, -1);
            expect(pieces).toEqual([]);
        });
    });

    describe('hasPieceType', () => {
        it('should return true when hex has piece type', () => {
            emptyBoard[2][2].pieces = [{ type: 'city', color: 'red' }];
            expect(hasPieceType(emptyBoard, 2, 2, 'city')).toBe(true);
        });

        it('should return false when hex lacks piece type', () => {
            emptyBoard[2][2].pieces = [{ type: 'knight', color: 'red' }];
            expect(hasPieceType(emptyBoard, 2, 2, 'city')).toBe(false);
        });

        it('should check color when specified', () => {
            emptyBoard[2][2].pieces = [{ type: 'city', color: 'red' }];
            expect(hasPieceType(emptyBoard, 2, 2, 'city', 'red')).toBe(true);
            expect(hasPieceType(emptyBoard, 2, 2, 'city', 'blue')).toBe(false);
        });
    });
});
