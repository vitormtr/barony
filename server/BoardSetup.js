/**
 * BoardSetup Module
 *
 * Handles board initialization and texture distribution.
 *
 * Design Patterns Used:
 * - Module Pattern: Encapsulates related functionality
 * - Strategy Pattern: Different distribution strategies (BFS expansion)
 * - Template Method: Common distribution algorithm with customizable steps
 */

import { DIRECTION_MAP, CITY_VALID_TERRAINS } from './constants.js';
import * as BoardLogic from './BoardLogic.js';

/**
 * Collect all textures from players into a single array
 * @param {Array} players - Array of player objects
 * @returns {Array} Array of texture strings (e.g., ['water.png', 'farm.png', ...])
 */
export function collectPlayerTextures(players) {
    const allTextures = [];
    players.forEach(player => {
        Object.entries(player.hexCount).forEach(([textureType, count]) => {
            for (let i = 0; i < count; i++) {
                allTextures.push(`${textureType}.png`);
            }
        });
    });
    return allTextures;
}

/**
 * Reset all players' texture counts to zero
 * @param {Array} players - Array of player objects
 */
export function resetPlayerTextures(players) {
    players.forEach(player => {
        Object.keys(player.hexCount).forEach(key => {
            player.hexCount[key] = 0;
        });
    });
}

/**
 * Distribute textures on board using BFS expansion from center
 * Uses Breadth-First Search algorithm to create organic, connected terrain
 *
 * @param {Array} boardState - 2D array representing the board
 * @param {Array} textures - Array of texture strings to place
 * @returns {Object} Result with placed count and positions
 */
export function distributeTexturesBFS(boardState, textures) {
    if (textures.length === 0) {
        return { placedCount: 0, positions: [] };
    }

    // Shuffle for randomness
    BoardLogic.shuffleArray(textures);

    const centerRow = Math.floor(boardState.length / 2);
    const centerCol = Math.floor(boardState[0].length / 2);

    // Place first texture at center
    boardState[centerRow][centerCol].texture = textures.shift();

    const placed = new Set([`${centerRow},${centerCol}`]);
    const positions = [{ row: centerRow, col: centerCol }];
    const queue = [[centerRow, centerCol]];

    // BFS expansion
    while (textures.length > 0 && queue.length > 0) {
        const [row, col] = queue.shift();
        const directions = BoardLogic.getDirections(row);

        // Shuffle directions for randomness
        BoardLogic.shuffleArray(directions);

        for (const [dRow, dCol] of directions) {
            if (textures.length === 0) break;

            const newRow = row + dRow;
            const newCol = col + dCol;
            const key = `${newRow},${newCol}`;

            // Check bounds and availability
            if (newRow >= 0 && newRow < boardState.length &&
                newCol >= 0 && newCol < boardState[0].length &&
                !placed.has(key)) {

                boardState[newRow][newCol].texture = textures.shift();
                placed.add(key);
                positions.push({ row: newRow, col: newCol });
                queue.push([newRow, newCol]);
            }
        }
    }

    return { placedCount: positions.length, positions };
}

/**
 * Find all valid hexes for city placement
 * @param {Array} boardState - 2D array representing the board
 * @returns {Array} Array of {row, col} positions
 */
export function findValidCityHexes(boardState) {
    const validHexes = [];

    for (let row = 0; row < boardState.length; row++) {
        for (let col = 0; col < boardState[row].length; col++) {
            const hex = boardState[row][col];
            if (CITY_VALID_TERRAINS.includes(hex.texture) &&
                (!hex.pieces || hex.pieces.length === 0)) {
                validHexes.push({ row, col });
            }
        }
    }

    return validHexes;
}

/**
 * Place initial cities and knights for testing/debug purposes
 * @param {Array} boardState - 2D array representing the board
 * @param {Array} players - Array of player objects
 * @param {number} citiesPerPlayer - Number of cities to place per player
 * @returns {Object} Result with placed pieces info
 */
export function placeInitialPieces(boardState, players, citiesPerPlayer = 3) {
    const validHexes = findValidCityHexes(boardState);
    BoardLogic.shuffleArray(validHexes);

    let hexIndex = 0;
    const placements = [];

    for (const player of players) {
        for (let i = 0; i < citiesPerPlayer && hexIndex < validHexes.length; i++) {
            const { row, col } = validHexes[hexIndex++];
            const hex = boardState[row][col];

            if (!hex.pieces) hex.pieces = [];

            // Place city
            hex.pieces.push({
                type: 'city',
                owner: player.id,
                color: player.color
            });
            player.pieces.city--;

            // Place knight
            hex.pieces.push({
                type: 'knight',
                owner: player.id,
                color: player.color
            });
            player.pieces.knight--;

            placements.push({
                row,
                col,
                playerId: player.id,
                playerColor: player.color
            });
        }
    }

    return { placements, hexesUsed: hexIndex };
}

/**
 * Full board setup: collect textures, distribute, reset player counts
 * Facade pattern - provides simple interface for complex operation
 *
 * @param {Array} boardState - 2D array representing the board
 * @param {Array} players - Array of player objects
 * @returns {Object} Setup result
 */
export function setupBoard(boardState, players) {
    const textures = collectPlayerTextures(players);
    const distribution = distributeTexturesBFS(boardState, textures);
    resetPlayerTextures(players);

    return {
        success: true,
        texturesPlaced: distribution.placedCount,
        positions: distribution.positions
    };
}

/**
 * Quick setup for testing: distribute textures and place pieces
 * @param {Array} boardState - 2D array representing the board
 * @param {Array} players - Array of player objects
 * @returns {Object} Setup result with textures and pieces info
 */
export function quickSetupForTesting(boardState, players) {
    const textureResult = setupBoard(boardState, players);
    const pieceResult = placeInitialPieces(boardState, players, 3);

    return {
        success: true,
        texturesPlaced: textureResult.texturesPlaced,
        piecesPlaced: pieceResult.placements.length
    };
}
