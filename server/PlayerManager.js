/**
 * PlayerManager Module
 *
 * Handles player lifecycle: joining, leaving, reconnecting, and color assignment.
 *
 * Design Patterns Used:
 * - Factory Pattern: Creates player instances with proper configuration
 * - Observer Pattern: Notifies other players of changes via io.emit
 * - Registry Pattern: Maintains player registry within sessions
 */

import { Player } from './Player.js';
import { PLAYER_COLORS } from './constants.js';

/**
 * Get a random available color for a new player
 * @param {Object} session - The session object
 * @returns {string|null} Available color or null if all taken
 */
export function getRandomColor(session) {
    if (!session) {
        return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    }

    const usedColors = Object.values(session.players).map(player => player.color);
    const availableColors = PLAYER_COLORS.filter(color => !usedColors.includes(color));

    return availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : null;
}

/**
 * Get all players in a room
 * @param {Object} session - The session object
 * @returns {Array} Array of player objects
 */
export function getPlayersInRoom(session) {
    return session ? Object.values(session.players) : [];
}

/**
 * Get a player by socket ID from a session
 * @param {Object} session - The session object
 * @param {string} socketId - The socket ID
 * @returns {Object|null} Player object or null
 */
export function getPlayer(session, socketId) {
    return session ? session.players[socketId] : null;
}

/**
 * Create a new player for a session
 * Factory method for player creation
 * @param {string} socketId - The socket ID
 * @param {Object} session - The session object
 * @returns {Object} New player object
 */
export function createPlayer(socketId, session) {
    const color = getRandomColor(session);
    return new Player(socketId, color);
}

/**
 * Create a new player with specific color and name
 * @param {string} socketId - The socket ID
 * @param {string} color - The player color
 * @param {string} name - The player name
 * @returns {Object} New player object
 */
export function createPlayerWithColor(socketId, color, name = null) {
    return new Player(socketId, color, name);
}

/**
 * Get available colors in a session
 * @param {Object} session - The session object
 * @returns {Array} Array of available colors
 */
export function getAvailableColors(session) {
    if (!session) {
        return PLAYER_COLORS;
    }
    const usedColors = Object.values(session.players).map(player => player.color);
    return PLAYER_COLORS.filter(color => !usedColors.includes(color));
}

/**
 * Check if a color is available in a session
 * @param {Object} session - The session object
 * @param {string} color - The color to check
 * @returns {boolean} True if available
 */
export function isColorAvailable(session, color) {
    const usedColors = Object.values(session.players).map(player => player.color);
    return !usedColors.includes(color);
}

/**
 * Check if a player can join a session
 * @param {Object} session - The session object
 * @returns {Object} Validation result with canJoin and error message
 */
export function canPlayerJoin(session) {
    if (!session) {
        return { canJoin: false, error: 'Room not found!' };
    }

    if (Object.keys(session.players).length >= 4) {
        return { canJoin: false, error: 'Room is full!' };
    }

    if (session.lockedForEntry) {
        return { canJoin: false, error: 'Entry blocked! The board has already been set up.' };
    }

    if (session.gameStarted) {
        return { canJoin: false, error: 'Game already started! Cannot join.' };
    }

    return { canJoin: true };
}

/**
 * Add a player to a session
 * @param {Object} session - The session object
 * @param {string} socketId - The socket ID
 * @returns {Object} Result with success status and player
 */
export function addPlayer(session, socketId) {
    const validation = canPlayerJoin(session);
    if (!validation.canJoin) {
        return { success: false, error: validation.error };
    }

    const player = createPlayer(socketId, session);
    session.players[socketId] = player;

    return { success: true, player };
}

/**
 * Find player by color in a session
 * @param {Object} session - The session object
 * @param {string} color - The player color
 * @returns {Object|null} Player object or null
 */
export function findPlayerByColor(session, color) {
    return Object.values(session.players).find(p => p.color === color);
}

/**
 * Update player socket ID (for reconnection)
 * @param {Object} session - The session object
 * @param {string} oldSocketId - The old socket ID
 * @param {string} newSocketId - The new socket ID
 * @param {Object} player - The player object
 */
export function updatePlayerSocketId(session, oldSocketId, newSocketId, player) {
    // Update player's socket ID
    player.id = newSocketId;

    // Update players object with new key
    delete session.players[oldSocketId];
    session.players[newSocketId] = player;

    // Update leader if this was the leader
    if (session.leaderId === oldSocketId) {
        session.leaderId = newSocketId;
    }

    // Update playerOnTurn if this player is on turn
    if (session.playerOnTurn && session.playerOnTurn.id === oldSocketId) {
        session.playerOnTurn.id = newSocketId;
    }
}

/**
 * Update pieces ownership on board after reconnection
 * @param {Array} boardState - The board state
 * @param {string} oldSocketId - The old socket ID
 * @param {string} newSocketId - The new socket ID
 */
export function updatePiecesOwnership(boardState, oldSocketId, newSocketId) {
    for (let row = 0; row < boardState.length; row++) {
        for (let col = 0; col < boardState[row].length; col++) {
            const hex = boardState[row][col];
            if (hex.pieces) {
                hex.pieces.forEach(piece => {
                    if (piece.owner === oldSocketId) {
                        piece.owner = newSocketId;
                    }
                });
            }
        }
    }
}

/**
 * Update turn order after reconnection
 * @param {Object} initialPlacementState - The placement state
 * @param {string} oldSocketId - The old socket ID
 * @param {string} newSocketId - The new socket ID
 */
export function updateTurnOrder(initialPlacementState, oldSocketId, newSocketId) {
    if (initialPlacementState && initialPlacementState.turnOrder) {
        const turnOrderIndex = initialPlacementState.turnOrder.indexOf(oldSocketId);
        if (turnOrderIndex !== -1) {
            initialPlacementState.turnOrder[turnOrderIndex] = newSocketId;
        }
    }
}

/**
 * Handle player rejoin (reconnection after disconnect)
 * @param {Object} session - The session object
 * @param {string} newSocketId - The new socket ID
 * @param {string} playerColor - The player's color to identify them
 * @returns {Object} Result with success status and data
 */
export function rejoinPlayer(session, newSocketId, playerColor) {
    if (!session) {
        return { success: false, error: 'Room not found' };
    }

    const existingPlayer = findPlayerByColor(session, playerColor);
    if (!existingPlayer) {
        return { success: false, error: 'Player not found in this room' };
    }

    const oldSocketId = existingPlayer.id;

    // Update all references to the player's socket ID
    updatePlayerSocketId(session, oldSocketId, newSocketId, existingPlayer);
    updatePiecesOwnership(session.boardState, oldSocketId, newSocketId);
    updateTurnOrder(session.initialPlacementState, oldSocketId, newSocketId);

    return {
        success: true,
        player: existingPlayer,
        oldSocketId,
        isLeader: session.leaderId === newSocketId
    };
}

/**
 * Remove player from turn order (for disconnection during waiting phase)
 * @param {Object} initialPlacementState - The placement state
 * @param {string} socketId - The socket ID to remove
 */
export function removeFromTurnOrder(initialPlacementState, socketId) {
    if (initialPlacementState && initialPlacementState.turnOrder) {
        initialPlacementState.turnOrder = initialPlacementState.turnOrder.filter(
            p => p.id !== socketId
        );
        // Adjust index if necessary
        if (initialPlacementState.currentTurnIndex >= initialPlacementState.turnOrder.length) {
            initialPlacementState.currentTurnIndex = 0;
        }
    }
}

/**
 * Get next player in turn order
 * @param {Array} players - Array of players
 * @param {string} currentPlayerId - Current player's ID
 * @returns {Object} Next player
 */
export function getNextPlayer(players, currentPlayerId) {
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[Math.max(0, nextIndex)] || players[0];
}

/**
 * Promote new leader when current leader leaves
 * @param {Object} session - The session object
 * @param {Array} remainingPlayers - Array of remaining players
 * @returns {Object} New leader player
 */
export function promoteNewLeader(session, remainingPlayers) {
    const newLeader = remainingPlayers[0];
    session.leaderId = newLeader.id;
    return newLeader;
}

/**
 * Reset player pieces and textures (for game restart)
 * @param {Object} player - The player object
 */
export function resetPlayer(player) {
    const freshPlayer = new Player(player.id, player.color);
    player.hexCount = freshPlayer.hexCount;
    player.pieces = freshPlayer.pieces;
    player.resources = freshPlayer.resources;
    player.title = freshPlayer.title;
    player.victoryPoints = freshPlayer.victoryPoints;
}

/**
 * Reset all players in a session
 * @param {Array} players - Array of player objects
 */
export function resetAllPlayers(players) {
    players.forEach(player => resetPlayer(player));
}

/**
 * Get cities remaining for a player in initial placement
 * @param {Object} initialPlacementState - The placement state
 * @param {string} playerId - The player ID
 * @returns {number} Cities remaining
 */
export function getCitiesRemainingForPlayer(initialPlacementState, playerId) {
    if (!initialPlacementState || !initialPlacementState.placementSequence) {
        return 0;
    }

    const currentTurn = initialPlacementState.placementSequence[
        initialPlacementState.currentSequenceIndex
    ];

    if (currentTurn && currentTurn.playerId === playerId) {
        return currentTurn.citiesToPlace - (currentTurn.citiesPlaced || 0);
    }

    return 0;
}
