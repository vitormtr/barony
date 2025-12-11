/**
 * InitialPlacement Module
 *
 * Handles the initial city placement phase of the game.
 * Implements Barony's special placement order.
 *
 * Design Patterns Used:
 * - State Pattern: Manages placement state transitions
 * - Iterator Pattern: Traverses placement sequence
 * - Command Pattern: Each placement is a discrete action
 */

import { CITY_VALID_TERRAINS } from './constants.js';
import * as BoardLogic from './BoardLogic.js';

/**
 * Create the placement sequence for Barony rules
 * Order: P1(1), P2(1), P3(1), P4(3), P3(2), P2(2), P1(2) = 3 each
 *
 * @param {Array} playerIds - Array of player IDs in order
 * @returns {Array} Placement sequence with playerId and citiesToPlace
 */
export function createPlacementSequence(playerIds) {
    if (playerIds.length < 1 || playerIds.length > 4) {
        throw new Error('Barony requires 1-4 players');
    }

    // Dynamic placement sequence based on number of players
    // Each player places 3 cities total, distributed across turns
    const numPlayers = playerIds.length;
    const sequence = [];

    if (numPlayers === 1) {
        // Single player: place all 3 cities at once
        sequence.push({ playerId: playerIds[0], citiesToPlace: 3 });
    } else if (numPlayers === 2) {
        // 2 players: alternate placing cities
        sequence.push({ playerId: playerIds[0], citiesToPlace: 1 });
        sequence.push({ playerId: playerIds[1], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[0], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[1], citiesToPlace: 1 });
    } else if (numPlayers === 3) {
        // 3 players: snake draft style
        sequence.push({ playerId: playerIds[0], citiesToPlace: 1 });
        sequence.push({ playerId: playerIds[1], citiesToPlace: 1 });
        sequence.push({ playerId: playerIds[2], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[1], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[0], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[2], citiesToPlace: 1 });
    } else {
        // 4 players: original sequence
        sequence.push({ playerId: playerIds[0], citiesToPlace: 1 });
        sequence.push({ playerId: playerIds[1], citiesToPlace: 1 });
        sequence.push({ playerId: playerIds[2], citiesToPlace: 1 });
        sequence.push({ playerId: playerIds[3], citiesToPlace: 3 });
        sequence.push({ playerId: playerIds[2], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[1], citiesToPlace: 2 });
        sequence.push({ playerId: playerIds[0], citiesToPlace: 2 });
    }

    return sequence;
}

/**
 * Create initial placement state
 * @param {Array} playerIds - Array of player IDs
 * @returns {Object} Initial placement state
 */
export function createInitialState(playerIds) {
    return {
        placementSequence: createPlacementSequence(playerIds),
        currentSequenceIndex: 0,
        citiesPlacedInTurn: 0
    };
}

/**
 * Get current turn info from placement state
 * @param {Object} state - Placement state
 * @returns {Object|null} Current turn info or null if complete
 */
export function getCurrentTurn(state) {
    if (state.currentSequenceIndex >= state.placementSequence.length) {
        return null;
    }
    return state.placementSequence[state.currentSequenceIndex];
}

/**
 * Get cities remaining for current turn
 * @param {Object} state - Placement state
 * @returns {number} Cities remaining to place
 */
export function getCitiesRemaining(state) {
    const turn = getCurrentTurn(state);
    if (!turn) return 0;
    return turn.citiesToPlace - state.citiesPlacedInTurn;
}

/**
 * Validate city placement
 * @param {Array} boardState - The game board
 * @param {Object} player - Player placing the city
 * @param {number} row - Target row
 * @param {number} col - Target column
 * @returns {Object} Validation result with success and error message
 */
export function validateCityPlacement(boardState, player, row, col) {
    // Check player has city available
    if (player.pieces.city <= 0) {
        return { valid: false, error: 'NO_PIECES', message: 'No more cities available!' };
    }

    // Check player has knight available
    if (player.pieces.knight <= 0) {
        return { valid: false, error: 'NO_PIECES', message: 'No more knights available!' };
    }

    // Check hex exists and has texture
    const hex = boardState[row]?.[col];
    if (!hex || !hex.texture) {
        return { valid: false, error: 'INVALID_HEX', message: 'Invalid hex!' };
    }

    // Check hex is not occupied
    if (hex.pieces && hex.pieces.length > 0) {
        return { valid: false, error: 'HEX_OCCUPIED', message: 'This hex is already occupied!' };
    }

    // Check valid terrain (plain or farm)
    if (!CITY_VALID_TERRAINS.includes(hex.texture)) {
        return { valid: false, error: 'INVALID_TERRAIN', message: 'Cities can only be placed on plains or fields!' };
    }

    // Check no adjacent city
    if (BoardLogic.isAdjacentToCity(boardState, row, col)) {
        return { valid: false, error: 'ADJACENT_TO_CITY', message: 'Cities cannot be placed adjacent to other cities!' };
    }

    return { valid: true };
}

/**
 * Place a city and knight on the board
 * @param {Array} boardState - The game board
 * @param {Object} player - Player placing the city
 * @param {number} row - Target row
 * @param {number} col - Target column
 * @returns {Object} Placement result
 */
export function placeCity(boardState, player, row, col) {
    const validation = validateCityPlacement(boardState, player, row, col);
    if (!validation.valid) {
        return { success: false, ...validation };
    }

    const hex = boardState[row][col];

    // Initialize pieces array
    hex.pieces = [];

    // Place city
    hex.pieces.push({
        type: 'city',
        owner: player.id,
        color: player.color
    });
    player.pieces.city--;

    // Place knight automatically
    hex.pieces.push({
        type: 'knight',
        owner: player.id,
        color: player.color
    });
    player.pieces.knight--;

    return {
        success: true,
        placed: { row, col, type: 'city' }
    };
}

/**
 * Advance placement state after a city is placed
 * @param {Object} state - Current placement state
 * @returns {Object} Result with next turn info or completion status
 */
export function advancePlacement(state) {
    state.citiesPlacedInTurn++;

    const currentTurn = getCurrentTurn(state);
    if (!currentTurn) {
        return { complete: true };
    }

    // Check if current player finished their turn
    if (state.citiesPlacedInTurn >= currentTurn.citiesToPlace) {
        state.currentSequenceIndex++;
        state.citiesPlacedInTurn = 0;

        // Check if all placements done
        if (state.currentSequenceIndex >= state.placementSequence.length) {
            return { complete: true };
        }

        const nextTurn = state.placementSequence[state.currentSequenceIndex];
        return {
            complete: false,
            turnChanged: true,
            nextPlayerId: nextTurn.playerId,
            citiesRemaining: nextTurn.citiesToPlace
        };
    }

    // Same player continues
    return {
        complete: false,
        turnChanged: false,
        citiesRemaining: currentTurn.citiesToPlace - state.citiesPlacedInTurn
    };
}

/**
 * Check if placement phase is complete
 * @param {Object} state - Placement state
 * @returns {boolean} True if all placements done
 */
export function isPlacementComplete(state) {
    return state.currentSequenceIndex >= state.placementSequence.length;
}

/**
 * Get placement progress summary
 * @param {Object} state - Placement state
 * @returns {Object} Progress info
 */
export function getPlacementProgress(state) {
    const totalPlacements = state.placementSequence.reduce(
        (sum, turn) => sum + turn.citiesToPlace, 0
    );

    let completedPlacements = 0;
    for (let i = 0; i < state.currentSequenceIndex; i++) {
        completedPlacements += state.placementSequence[i].citiesToPlace;
    }
    completedPlacements += state.citiesPlacedInTurn;

    return {
        completed: completedPlacements,
        total: totalPlacements,
        percentage: Math.round((completedPlacements / totalPlacements) * 100)
    };
}
