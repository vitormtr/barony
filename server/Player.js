import {
    NOBLE_TITLES,
    TITLE_NAMES,
    INITIAL_PIECES,
    INITIAL_HEX_COUNT,
    INITIAL_RESOURCES,
    TERRAIN_TO_RESOURCE
} from './constants.js';

export class Player {
    constructor(id, color, hexCount = null, pieces = null, resources = null, title = null, victoryPoints = null) {
        this.id = id;
        this.color = color;
        this.image = `${color}player.png`;
        this.hexCount = hexCount ?? this.initializePlayerHexCount();
        this.pieces = pieces ?? this.initializePlayerPieces();
        this.resources = resources ?? this.initializeResources();
        this.title = title ?? 'baron';
        this.victoryPoints = victoryPoints ?? 0;
    }

    updateTextures(textureUsed) {
        textureUsed = textureUsed.replace(".png", "");
        
        if (this.hexCount[textureUsed] > 0) {
            this.hexCount[textureUsed]--;
        } else {
            console.log(`No hexes available for texture ${textureUsed}`);
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

    // Calculate total resources
    getTotalResources() {
        return Object.values(this.resources).reduce((sum, val) => sum + val, 0);
    }

    // Spend resources for noble title
    spendResources(amount) {
        let remaining = amount;
        for (const key of Object.keys(this.resources)) {
            if (remaining <= 0) break;
            const toSpend = Math.min(this.resources[key], remaining);
            this.resources[key] -= toSpend;
            remaining -= toSpend;
        }
        return remaining === 0;
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
          image: this.image,
          hexCount: this.hexCount,
          pieces: this.pieces,
          resources: this.resources,
          title: this.title,
          titleName: this.getTitleName(),
          victoryPoints: this.victoryPoints
        };
    }
}

// Re-export for backward compatibility
export { NOBLE_TITLES, TITLE_NAMES } from './constants.js';