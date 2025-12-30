import {
    NOBLE_TITLES,
    TITLE_NAMES,
    INITIAL_PIECES,
    INITIAL_HEX_COUNT,
    INITIAL_RESOURCES,
    TERRAIN_TO_RESOURCE,
    RESOURCE_VALUES
} from './constants.js';

export class Player {
    constructor(id, color, name = null, hexCount = null, pieces = null, resources = null, title = null, victoryPoints = null, battlesWon = null) {
        this.id = id;
        this.color = color;
        this.name = name || this.capitalizeFirst(color);
        this.image = `${color}player.png`;
        this.hexCount = hexCount ?? this.initializePlayerHexCount();
        this.pieces = pieces ?? this.initializePlayerPieces();
        this.resources = resources ?? this.initializeResources();
        this.title = title ?? 'baron';
        this.victoryPoints = victoryPoints ?? 0;
        this.battlesWon = battlesWon ?? 0;
    }

    addBattleWon() {
        this.battlesWon++;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    updateTextures(textureUsed) {
        textureUsed = textureUsed.replace(".png", "");
        
        if (this.hexCount[textureUsed] > 0) {
            this.hexCount[textureUsed]--;
        }
    }

    initializePlayerPieces() {
        return { ...INITIAL_PIECES };
    }

    initializePlayerHexCount() {
        return { ...INITIAL_HEX_COUNT };
    }

    initializeResources() {
        return { ...INITIAL_RESOURCES };
    }

    addResource(terrainType) {
        const resource = TERRAIN_TO_RESOURCE[terrainType];
        if (resource && this.resources[resource] !== undefined) {
            this.resources[resource]++;
            return resource;
        }
        return null;
    }

    // Calculate total resource points (each resource type has different value)
    getTotalResources() {
        let total = 0;
        for (const [resource, count] of Object.entries(this.resources)) {
            total += count * (RESOURCE_VALUES[resource] || 0);
        }
        return total;
    }

    // Get resource count (number of tokens, not points)
    getResourceCount() {
        return Object.values(this.resources).reduce((sum, val) => sum + val, 0);
    }

    // Spend resources for noble title (spending points, not tokens)
    // Tries to spend exactly pointsToSpend, or minimal overspend if not possible
    // Prioritizes higher value tokens to minimize waste
    spendResources(pointsToSpend) {
        // Build list of all individual tokens with their values
        const tokens = [];
        for (const [resource, count] of Object.entries(this.resources)) {
            const value = RESOURCE_VALUES[resource] || 0;
            if (value === 0) continue;
            for (let i = 0; i < count; i++) {
                tokens.push({ resource, value });
            }
        }

        // Sort by value descending (higher value first)
        tokens.sort((a, b) => b.value - a.value);

        // Try to find exact match or minimal overspend using dynamic approach
        // First, try greedy with high-value tokens
        let bestSelection = null;
        let bestTotal = Infinity;

        // Greedy approach: take high-value tokens until we reach or exceed target
        const greedySelection = [];
        let greedyTotal = 0;
        for (const token of tokens) {
            if (greedyTotal >= pointsToSpend) break;
            greedySelection.push(token);
            greedyTotal += token.value;
        }

        if (greedyTotal >= pointsToSpend) {
            bestSelection = greedySelection;
            bestTotal = greedyTotal;
        }

        // Try to find exact match by checking if we can swap last token for smaller ones
        if (bestTotal > pointsToSpend && bestSelection && bestSelection.length > 0) {
            const lastToken = bestSelection[bestSelection.length - 1];
            const withoutLast = bestSelection.slice(0, -1);
            const withoutLastTotal = withoutLast.reduce((sum, t) => sum + t.value, 0);
            const needed = pointsToSpend - withoutLastTotal;

            // Look for combination of smaller tokens that sum to exactly needed
            const remaining = tokens.filter(t => !withoutLast.includes(t));
            const smallerTokens = remaining.filter(t => t.value <= lastToken.value);

            // Simple check: can we find tokens that sum exactly to needed?
            for (const t of smallerTokens) {
                if (t.value === needed) {
                    bestSelection = [...withoutLast, t];
                    bestTotal = pointsToSpend;
                    break;
                }
            }

            // Try pairs
            if (bestTotal > pointsToSpend) {
                for (let i = 0; i < smallerTokens.length && bestTotal > pointsToSpend; i++) {
                    for (let j = i + 1; j < smallerTokens.length && bestTotal > pointsToSpend; j++) {
                        const pairSum = smallerTokens[i].value + smallerTokens[j].value;
                        if (withoutLastTotal + pairSum >= pointsToSpend && withoutLastTotal + pairSum < bestTotal) {
                            bestSelection = [...withoutLast, smallerTokens[i], smallerTokens[j]];
                            bestTotal = withoutLastTotal + pairSum;
                        }
                    }
                }
            }
        }

        if (!bestSelection || bestTotal < pointsToSpend) {
            return false; // Not enough resources
        }

        // Apply the spending
        for (const token of bestSelection) {
            this.resources[token.resource]--;
        }

        return true;
    }

    // Promote to next title
    promoteTitle() {
        const currentIndex = NOBLE_TITLES.indexOf(this.title);
        if (currentIndex < NOBLE_TITLES.length - 1) {
            this.title = NOBLE_TITLES[currentIndex + 1];
            return true;
        }
        return false;
    }

    // Return title display name
    getTitleName() {
        return TITLE_NAMES[this.title] || this.title;
    }

    // Add victory points
    addVictoryPoints(points) {
        this.victoryPoints += points;
    }

    toJSON() {
        return {
          id: this.id,
          color: this.color,
          name: this.name,
          image: this.image,
          hexCount: this.hexCount,
          pieces: this.pieces,
          resources: this.resources,
          resourcePoints: this.getTotalResources(),
          title: this.title,
          titleName: this.getTitleName(),
          victoryPoints: this.victoryPoints,
          battlesWon: this.battlesWon
        };
    }
}