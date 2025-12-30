/**
 * TurnManager Module
 *
 * Handles turn progression, victory conditions, and game ending logic.
 *
 * Design Patterns Used:
 * - State Machine Pattern: manages game state transitions
 * - Strategy Pattern: different end game scoring strategies
 * - Observer Pattern: notifies players of turn changes
 */

import { GAME_PHASES, TITLE_RANK } from './constants.js';
import * as BattleActions from './BattleActions.js';

/**
 * Get the next player index in turn order
 * @param {Array} players - Array of players
 * @param {number} currentIndex - Current player index
 * @returns {number} Next player index
 */
export function getNextPlayerIndex(players, currentIndex) {
    return (currentIndex + 1) % players.length;
}

/**
 * Check if the round is complete (returned to first player)
 * @param {number} nextIndex - Next player index
 * @returns {boolean} True if round is complete
 */
export function isRoundComplete(nextIndex) {
    return nextIndex === 0;
}

/**
 * Check if a player is the current turn holder
 * @param {Object} session - The session object
 * @param {string} playerId - The player ID to check
 * @returns {boolean} True if it's the player's turn
 */
export function isPlayerTurn(session, playerId) {
    return session?.playerOnTurn?.id === playerId;
}

/**
 * Validate that it's the player's turn
 * @param {Object} session - The session object
 * @param {string} playerId - The player ID to validate
 * @returns {Object} Validation result
 */
export function validateTurn(session, playerId) {
    if (!session) {
        return { valid: false, error: 'Session not found' };
    }

    if (!isPlayerTurn(session, playerId)) {
        return { valid: false, error: 'Not your turn!' };
    }

    return { valid: true };
}

/**
 * Advance to the next player's turn
 * @param {Object} session - The session object
 * @param {Array} players - Array of players
 * @param {string} currentPlayerId - Current player's ID
 * @returns {Object} Result with next player and round status
 */
export function advanceTurn(session, players, currentPlayerId) {
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    const nextIndex = getNextPlayerIndex(players, currentIndex);
    const nextPlayer = players[nextIndex];

    return {
        nextPlayer,
        nextIndex,
        roundComplete: isRoundComplete(nextIndex)
    };
}

/**
 * Check if victory condition is met (player became Duke)
 * @param {Object} player - The player to check
 * @param {Object} session - The session object
 * @returns {Object} Victory check result
 */
export function checkVictoryCondition(player, session) {
    if (player.title === 'duke' && !session.gameEnding) {
        return {
            victory: true,
            message: `${player.color} became Duke! Finishing the round...`
        };
    }

    return { victory: false };
}

/**
 * Mark game as ending (Duke announced)
 * @param {Object} session - The session object
 * @param {string} playerId - The Duke player's ID
 */
export function markGameEnding(session, playerId) {
    session.gameEnding = true;
    session.dukePlayerId = playerId;
}

/**
 * Check if game should end after this turn
 * @param {Object} session - The session object
 * @param {boolean} roundComplete - Whether the round is complete
 * @returns {boolean} True if game should end
 */
export function shouldEndGame(session, roundComplete) {
    return session.gameEnding && roundComplete;
}

/**
 * Calculate a player's final score
 * @param {Object} player - The player
 * @returns {number} Final score
 */
export function calculateFinalScore(player) {
    return BattleActions.calculateFinalScore(player);
}

/**
 * Calculate scores for all players
 * @param {Array} players - Array of players (in turn order)
 * @returns {Array} Array of score objects with turn order index
 */
export function calculateAllScores(players) {
    const scores = players.map((p, index) => {
        // Count cities built (5 initial - remaining)
        const citiesBuilt = 5 - (p.pieces?.city || 0);

        return {
            id: p.id,
            color: p.color,
            name: p.name || p.color,
            score: calculateFinalScore(p),
            title: p.getTitleName(),
            titleRank: TITLE_RANK[p.title] || 0,
            citiesBuilt: citiesBuilt,
            battlesWon: p.battlesWon || 0,
            resources: p.getTotalResources(),
            victoryPoints: p.victoryPoints,
            turnOrderIndex: index
        };
    });

    return scores;
}

/**
 * Determine the winner from scores
 * Rules:
 * 1. Highest title wins
 * 2. If tied on title, most cities built wins
 * 3. If tied on cities, most battles won wins
 * @param {Array} scores - Array of score objects
 * @returns {Object} Winner score object
 */
export function determineWinner(scores) {
    const sorted = [...scores].sort((a, b) => {
        // Primary: highest title
        if (b.titleRank !== a.titleRank) {
            return b.titleRank - a.titleRank;
        }
        // Secondary: most cities built
        if (b.citiesBuilt !== a.citiesBuilt) {
            return b.citiesBuilt - a.citiesBuilt;
        }
        // Tertiary: most battles won
        return b.battlesWon - a.battlesWon;
    });

    return sorted[0];
}

/**
 * End the game and calculate final results
 * @param {Object} session - The session object
 * @returns {Object} Game end results
 */
export function endGame(session) {
    session.gamePhase = GAME_PHASES.ENDED;

    const players = Object.values(session.players);
    const scores = calculateAllScores(players);
    const winner = determineWinner(scores);

    // Sort by title rank, then cities built, then battles won
    const sortedScores = [...scores].sort((a, b) => {
        if (b.titleRank !== a.titleRank) return b.titleRank - a.titleRank;
        if (b.citiesBuilt !== a.citiesBuilt) return b.citiesBuilt - a.citiesBuilt;
        return b.battlesWon - a.battlesWon;
    });

    return {
        scores: sortedScores,
        winner,
        message: `Game over! ${winner.name} (${winner.title}) won!`
    };
}

/**
 * Check if the game is in battle phase
 * @param {Object} session - The session object
 * @returns {boolean} True if in battle phase
 */
export function isInBattlePhase(session) {
    return session?.gamePhase === GAME_PHASES.BATTLE;
}

/**
 * Check if the game has ended
 * @param {Object} session - The session object
 * @returns {boolean} True if game has ended
 */
export function isGameEnded(session) {
    return session?.gamePhase === GAME_PHASES.ENDED;
}

/**
 * Get current turn info
 * @param {Object} session - The session object
 * @returns {Object|null} Current turn info or null
 */
export function getCurrentTurnInfo(session) {
    if (!session?.playerOnTurn) {
        return null;
    }

    return {
        playerId: session.playerOnTurn.id,
        playerColor: session.playerOnTurn.color,
        playerName: session.playerOnTurn.name || session.playerOnTurn.color
    };
}

/**
 * Set the current turn player
 * @param {Object} session - The session object
 * @param {Object} player - The player to set as current turn
 */
export function setCurrentTurn(session, player) {
    session.playerOnTurn = player;
}

/**
 * Process end of turn
 * @param {Object} session - The session object
 * @param {string} currentPlayerId - Current player's ID
 * @returns {Object} Result with next turn info or game end
 */
export function processEndTurn(session, currentPlayerId) {
    const players = Object.values(session.players);
    const turnResult = advanceTurn(session, players, currentPlayerId);

    // Check if game should end
    if (shouldEndGame(session, turnResult.roundComplete)) {
        const endResult = endGame(session);
        return {
            gameEnded: true,
            ...endResult
        };
    }

    // Advance to next player
    setCurrentTurn(session, turnResult.nextPlayer);

    return {
        gameEnded: false,
        nextPlayer: turnResult.nextPlayer,
        turnInfo: getCurrentTurnInfo(session)
    };
}
