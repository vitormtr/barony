// Battle phase actions for Barony game
import { DIRECTION_MAP, NOBLE_TITLE_COST, RESOURCE_VALUES, TITLE_RANK } from './constants.js';
import * as BoardLogic from './BoardLogic.js';

/**
 * RECRUITMENT: Add knights to a city (max 2, or 3 if adjacent to lake)
 * Player can choose how many to recruit (1 to max)
 */
export function executeRecruitment(boardState, player, payload, players) {
    const { row, col, knightCount } = payload;
    const hex = boardState[row]?.[col];

    if (!hex) {
        return { success: false, message: 'Invalid hex!' };
    }

    const hasCity = hex.pieces?.some(p => p.type === 'city' && p.color === player.color);
    if (!hasCity) {
        return { success: false, message: 'Select one of your cities!' };
    }

    const adjacentToWater = BoardLogic.isAdjacentToWater(boardState, row, col);
    const maxKnights = adjacentToWater ? 3 : 2;

    // If knightCount not specified, use max (backward compatibility)
    // Use explicit undefined/null check to allow 0 to fail validation
    const knightsToAdd = (knightCount !== undefined && knightCount !== null)
        ? Math.min(knightCount, maxKnights)
        : maxKnights;

    if (knightsToAdd < 1) {
        return { success: false, message: 'You must recruit at least 1 knight!' };
    }

    if (player.pieces.knight < knightsToAdd) {
        return { success: false, message: `You don't have ${knightsToAdd} knights available!` };
    }

    for (let i = 0; i < knightsToAdd; i++) {
        hex.pieces.push({
            type: 'knight',
            owner: player.id,
            color: player.color
        });
        player.pieces.knight--;
    }

    return {
        success: true,
        message: `${knightsToAdd} knight${knightsToAdd > 1 ? 's' : ''} recruited!${adjacentToWater && knightsToAdd === 3 ? ' (Lake bonus!)' : ''}`
    };
}

/**
 * MOVEMENT: Move a knight to adjacent hex (with combat)
 * movedKnightsCount tracks how many knights have moved TO each position this turn
 */
export function executeMovement(boardState, player, payload, players, movedKnightsCount = {}) {
    const { from, to } = payload;
    const fromHex = boardState[from.row]?.[from.col];
    const toHex = boardState[to.row]?.[to.col];

    if (!fromHex || !toHex) {
        return { success: false, message: 'Invalid hex!' };
    }

    const playerKnights = fromHex.pieces?.filter(p => p.type === 'knight' && p.color === player.color) || [];
    if (playerKnights.length === 0) {
        return { success: false, message: 'No knight of yours in this hex!' };
    }

    // Check if all knights from this hex have already moved this turn
    const key = `${from.row},${from.col}`;
    const movedCount = movedKnightsCount[key] || 0;
    if (movedCount >= playerKnights.length) {
        return { success: false, message: 'This knight already moved this turn!' };
    }

    if (!BoardLogic.isAdjacentToPosition(from.row, from.col, to.row, to.col)) {
        return { success: false, message: 'Destination must be adjacent!' };
    }

    if (!toHex.texture || toHex.texture === 'water.png') {
        return { success: false, message: 'Cannot move to water or empty hex!' };
    }

    const toPieces = toHex.pieces || [];

    const hasEnemyCity = toPieces.some(p => p.type === 'city' && p.color !== player.color);
    if (hasEnemyCity) {
        return { success: false, message: 'Cannot enter enemy city!' };
    }

    const hasEnemyStronghold = toPieces.some(p => p.type === 'stronghold' && p.color !== player.color);
    if (hasEnemyStronghold) {
        return { success: false, message: 'Cannot enter enemy stronghold!' };
    }

    const enemyKnights = toPieces.filter(p => p.type === 'knight' && p.color !== player.color);
    if (enemyKnights.length >= 2) {
        return { success: false, message: 'Cannot enter hex with 2+ enemy knights!' };
    }

    if (toHex.texture === 'mountain.png') {
        const hasAnyEnemyPiece = toPieces.some(p => p.color !== player.color);
        if (hasAnyEnemyPiece) {
            return { success: false, message: 'Cannot enter mountain occupied by enemy!' };
        }
    }

    // Check if movement would exceed 2 pieces limit
    // Combat will remove enemy pieces, so we calculate post-combat count
    const playerKnightsInDest = toPieces.filter(p => p.type === 'knight' && p.color === player.color).length;
    const playerStructureInDest = toPieces.some(p => ['city', 'stronghold', 'village'].includes(p.type) && p.color === player.color);
    const enemyVillage = toPieces.some(p => p.type === 'village' && p.color !== player.color);
    const enemyKnight = toPieces.some(p => p.type === 'knight' && p.color !== player.color);

    // After moving: +1 knight. After combat with 2+ knights: enemy removed
    const knightsAfterMove = playerKnightsInDest + 1;
    const willHaveCombat = knightsAfterMove >= 2 && (enemyVillage || enemyKnight);

    // Calculate pieces after move and potential combat
    let piecesAfterMove = knightsAfterMove + (playerStructureInDest ? 1 : 0);
    if (!willHaveCombat) {
        // Enemy pieces remain
        piecesAfterMove += toPieces.filter(p => p.color !== player.color).length;
    }

    if (piecesAfterMove > 2) {
        return { success: false, message: 'Cannot exceed 2 pieces per hex!' };
    }

    // Find the knight to move
    const knightIndex = fromHex.pieces.findIndex(p => p.type === 'knight' && p.color === player.color);
    const knight = fromHex.pieces.splice(knightIndex, 1)[0];
    if (!toHex.pieces) toHex.pieces = [];
    toHex.pieces.push(knight);

    const combatResult = processCombat(boardState, player, toHex, to.row, to.col, players);

    let message = 'Knight moved!';
    if (combatResult.occurred) {
        message = combatResult.message;
    }

    // Return the destination so it can be tracked as "moved"
    return { success: true, message, combatResult, movedTo: { row: to.row, col: to.col } };
}

/**
 * Steal the most valuable resource from defender and give to attacker
 * Returns the resource type stolen, or null if defender has no resources
 */
function stealMostValuableResource(defender, attacker) {
    // Sort resources by value (highest first)
    const sortedResources = Object.keys(RESOURCE_VALUES).sort(
        (a, b) => RESOURCE_VALUES[b] - RESOURCE_VALUES[a]
    );

    // Find the most valuable resource the defender has
    for (const resource of sortedResources) {
        if (defender.resources[resource] > 0) {
            defender.resources[resource]--;
            attacker.resources[resource]++;
            return resource;
        }
    }

    // Defender has no resources
    return null;
}

/**
 * Process combat in hex after movement
 */
export function processCombat(boardState, player, hex, row, col, players) {
    const pieces = hex.pieces || [];

    const playerKnights = pieces.filter(p => p.type === 'knight' && p.color === player.color);
    const enemyPieces = pieces.filter(p => p.color !== player.color);

    if (enemyPieces.length === 0) {
        return { occurred: false };
    }

    const playerKnightCount = playerKnights.length;
    const enemyVillages = enemyPieces.filter(p => p.type === 'village');
    const enemyKnights = enemyPieces.filter(p => p.type === 'knight');

    let destroyed = [];
    let resourceGained = null;

    // Combat against villages: 2 knights destroy 1 village
    // Defender loses their most valuable resource to attacker
    if (playerKnightCount >= 2 && enemyVillages.length > 0 && enemyKnights.length === 0) {
        const village = enemyVillages[0];
        const villageIndex = hex.pieces.findIndex(p => p === village);
        if (villageIndex !== -1) {
            hex.pieces.splice(villageIndex, 1);
            destroyed.push('village');

            const villageOwner = Object.values(players).find(p => p.color === village.color);
            if (villageOwner) {
                villageOwner.pieces.village++;

                // Transfer most valuable resource from defender to attacker
                const stolenResource = stealMostValuableResource(villageOwner, player);
                if (stolenResource) {
                    resourceGained = stolenResource;
                }
            }
        }
    }

    // Combat against knights: numerical superiority destroys
    if (playerKnightCount >= 2 && enemyKnights.length > 0) {
        const enemyKnight = enemyKnights[0];
        const enemyKnightIndex = hex.pieces.findIndex(p => p === enemyKnight);
        if (enemyKnightIndex !== -1) {
            hex.pieces.splice(enemyKnightIndex, 1);
            destroyed.push('knight');

            const knightOwner = Object.values(players).find(p => p.color === enemyKnight.color);
            if (knightOwner) {
                knightOwner.pieces.knight++;
            }
        }
    }

    if (destroyed.length > 0) {
        // Increment battles won for the attacker
        if (player.addBattleWon) {
            player.addBattleWon();
        }

        let message = `Combat! Destroyed: ${destroyed.join(', ')}`;
        if (resourceGained) {
            message += ` (Stole 1 ${BoardLogic.getResourceName(resourceGained)}!)`;
        }
        return { occurred: true, message, destroyed, resourceGained };
    }

    return { occurred: false };
}

/**
 * CONSTRUCTION: Replace knight with village or stronghold
 */
export function executeConstruction(boardState, player, payload, players) {
    const { row, col, buildType } = payload;
    const hex = boardState[row]?.[col];

    if (!hex) {
        return { success: false, message: 'Invalid hex!' };
    }

    if (!hex.pieces) {
        return { success: false, message: 'No knight of yours in this hex!' };
    }
    const knightIndex = hex.pieces.findIndex(p => p.type === 'knight' && p.color === player.color);
    if (knightIndex === -1) {
        return { success: false, message: 'No knight of yours in this hex!' };
    }

    const hasStructure = hex.pieces?.some(p => ['city', 'stronghold', 'village'].includes(p.type));
    if (hasStructure) {
        return { success: false, message: 'A structure already exists in this hex!' };
    }

    const hasEnemyKnight = hex.pieces?.some(p => p.type === 'knight' && p.color !== player.color);
    if (hasEnemyKnight) {
        return { success: false, message: 'Cannot build with enemy knight present!' };
    }

    if (buildType === 'village' && player.pieces.village <= 0) {
        return { success: false, message: 'No villages available!' };
    }
    if (buildType === 'stronghold' && player.pieces.stronghold <= 0) {
        return { success: false, message: 'No strongholds available!' };
    }

    if (buildType === 'stronghold') {
        if (!hex.texture || hex.texture === 'water.png') {
            return { success: false, message: 'Strongholds cannot be built on water!' };
        }
    }

    hex.pieces.splice(knightIndex, 1);
    player.pieces.knight++;

    hex.pieces.push({
        type: buildType,
        owner: player.id,
        color: player.color
    });
    player.pieces[buildType]--;

    const resource = player.addResource(hex.texture);
    const resourceName = resource ? BoardLogic.getResourceName(resource) : '';

    return {
        success: true,
        message: `${buildType === 'village' ? 'Village' : 'Stronghold'} built!${resource ? ` +1 ${resourceName}` : ''}`,
        resource
    };
}

/**
 * Check if there's an adjacent city (any player)
 */
export function hasAdjacentCity(boardState, row, col) {
    const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (newRow >= 0 && newRow < boardState.length &&
            newCol >= 0 && newCol < boardState[0].length) {
            const neighbor = boardState[newRow][newCol];
            if (neighbor.pieces?.some(p => p.type === 'city')) {
                return true;
            }
        }
    }
    return false;
}

/**
 * NEW CITY: Replace village with city
 */
export function executeNewCity(boardState, player, payload, players) {
    const { row, col } = payload;
    const hex = boardState[row]?.[col];

    if (!hex) {
        return { success: false, message: 'Invalid hex!' };
    }

    if (!hex.pieces) {
        return { success: false, message: 'No village of yours in this hex!' };
    }
    const villageIndex = hex.pieces.findIndex(p => p.type === 'village' && p.color === player.color);
    if (villageIndex === -1) {
        return { success: false, message: 'No village of yours in this hex!' };
    }

    if (player.pieces.city <= 0) {
        return { success: false, message: 'No cities available!' };
    }

    if (hex.texture === 'forest.png') {
        return { success: false, message: 'Cities cannot be built in forest!' };
    }

    if (hasAdjacentCity(boardState, row, col)) {
        return { success: false, message: 'Cannot build city adjacent to another city!' };
    }

    hex.pieces.splice(villageIndex, 1);
    player.pieces.village++;

    hex.pieces.push({
        type: 'city',
        owner: player.id,
        color: player.color
    });
    player.pieces.city--;

    player.addVictoryPoints(10);

    return {
        success: true,
        message: 'New city founded! +10 victory points!',
        checkVictory: true
    };
}

/**
 * EXPEDITION: Place knight on board edge
 */
export function executeExpedition(boardState, player, payload, players) {
    const { row, col } = payload;
    const hex = boardState[row]?.[col];

    if (!hex) {
        return { success: false, message: 'Invalid hex!' };
    }

    if (player.pieces.knight < 2) {
        return { success: false, message: 'You need 2 knights in reserve!' };
    }

    if (!hex.texture || hex.texture === 'water.png') {
        return { success: false, message: 'Select a valid hex!' };
    }

    if (hex.pieces && hex.pieces.length > 0) {
        return { success: false, message: 'The hex must be empty!' };
    }

    if (!BoardLogic.isBorderHex(boardState, row, col)) {
        return { success: false, message: 'Select a hex on the board edge!' };
    }

    player.pieces.knight -= 2;

    if (!hex.pieces) hex.pieces = [];
    hex.pieces.push({
        type: 'knight',
        owner: player.id,
        color: player.color
    });

    return { success: true, message: 'Expedition complete! 1 knight placed on the edge.' };
}

/**
 * NOBLE TITLE: Spend 15 resources to advance title
 */
export function executeNobleTitle(boardState, player, payload, players) {
    const totalResources = player.getTotalResources();

    if (totalResources < NOBLE_TITLE_COST) {
        return { success: false, message: `Insufficient resources! ${totalResources}/${NOBLE_TITLE_COST}` };
    }

    if (player.title === 'duke') {
        return { success: false, message: 'You are already Duke!' };
    }

    player.spendResources(NOBLE_TITLE_COST);

    const oldTitle = player.getTitleName();
    player.promoteTitle();
    const newTitle = player.getTitleName();

    return {
        success: true,
        message: `Title elevated from ${oldTitle} to ${newTitle}!`,
        checkVictory: true
    };
}

/**
 * Calculate player's final score (VP + resources, NOT including title)
 * Title is used as primary tiebreaker, cities built as secondary
 */
export function calculateFinalScore(player) {
    let score = player.victoryPoints;
    score += player.getTotalResources();
    return score;
}

/**
 * Check victory condition (someone became Duke)
 */
export function checkVictoryCondition(session, player) {
    if (player.title === 'duke' && !session.gameEnding) {
        session.gameEnding = true;
        session.dukePlayerId = player.id;
        return {
            isDuke: true,
            message: `${player.color} became Duke! Finishing the round...`
        };
    }
    return { isDuke: false };
}
