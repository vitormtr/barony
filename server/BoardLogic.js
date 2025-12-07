// Board logic utilities for hexagonal grid operations
import { DIRECTION_MAP } from './constants.js';

/**
 * Get directions array based on row (even/odd for hex grid offset)
 */
export function getDirections(row) {
    return row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;
}

/**
 * Check if position is within board bounds
 */
export function isWithinBounds(boardState, row, col) {
    return row >= 0 && row < boardState.length && col >= 0 && col < boardState[0].length;
}

/**
 * Get all valid neighbor positions for a hex
 */
export function getNeighbors(boardState, row, col) {
    const directions = getDirections(row);
    const neighbors = [];

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (isWithinBounds(boardState, newRow, newCol)) {
            neighbors.push({ row: newRow, col: newCol });
        }
    }

    return neighbors;
}

/**
 * Check if two positions are adjacent on the hex grid
 */
export function isAdjacentToPosition(row1, col1, row2, col2) {
    const directions = getDirections(row1);

    return directions.some(([dRow, dCol]) => {
        return (row1 + dRow === row2) && (col1 + dCol === col2);
    });
}

/**
 * Check if a hex is adjacent to water
 */
export function isAdjacentToWater(boardState, row, col) {
    const directions = getDirections(row);

    return directions.some(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (!isWithinBounds(boardState, newRow, newCol)) return false;
        return boardState[newRow][newCol].texture === 'water.png';
    });
}

/**
 * Check if a hex is on the border (adjacent to empty hex or edge)
 */
export function isBorderHex(boardState, row, col) {
    const directions = getDirections(row);

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (!isWithinBounds(boardState, newRow, newCol)) return true;
        if (!boardState[newRow][newCol].texture) return true;
    }
    return false;
}

/**
 * Check if a hex is adjacent to any existing texture
 */
export function isAdjacentToTexture(boardState, row, col) {
    const directions = getDirections(row);

    return directions.some(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (!isWithinBounds(boardState, newRow, newCol)) return false;
        return boardState[newRow][newCol].texture !== null;
    });
}

/**
 * Check if a hex is adjacent to any city
 */
export function isAdjacentToCity(boardState, row, col) {
    const directions = getDirections(row);

    return directions.some(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;
        if (!isWithinBounds(boardState, newRow, newCol)) return false;

        const hex = boardState[newRow][newCol];
        if (hex.pieces && hex.pieces.length > 0) {
            return hex.pieces.some(piece => piece.type === 'city');
        }
        return false;
    });
}

/**
 * Check if any texture exists on the board
 */
export function hasAnyTexture(boardState) {
    return boardState.some(row => row.some(hex => hex.texture !== null));
}

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Get resource name for display
 */
export function getResourceName(resource) {
    const names = {
        field: 'Field',
        forest: 'Forest',
        mountain: 'Mountain',
        plain: 'Plain'
    };
    return names[resource] || resource;
}

/**
 * Find all hexes matching a condition
 */
export function findHexes(boardState, predicate) {
    const results = [];
    for (let row = 0; row < boardState.length; row++) {
        for (let col = 0; col < boardState[row].length; col++) {
            if (predicate(boardState[row][col], row, col)) {
                results.push({ row, col, hex: boardState[row][col] });
            }
        }
    }
    return results;
}

/**
 * Count pieces of a specific type and color on the board
 */
export function countPiecesOnBoard(boardState, pieceType, color = null) {
    let count = 0;
    for (const row of boardState) {
        for (const hex of row) {
            if (hex.pieces) {
                for (const piece of hex.pieces) {
                    if (piece.type === pieceType && (color === null || piece.color === color)) {
                        count++;
                    }
                }
            }
        }
    }
    return count;
}

/**
 * Get all pieces at a specific hex
 */
export function getPiecesAt(boardState, row, col) {
    if (!isWithinBounds(boardState, row, col)) return [];
    return boardState[row][col].pieces || [];
}

/**
 * Check if a hex has a specific piece type
 */
export function hasPieceType(boardState, row, col, pieceType, color = null) {
    const pieces = getPiecesAt(boardState, row, col);
    return pieces.some(p => p.type === pieceType && (color === null || p.color === color));
}
