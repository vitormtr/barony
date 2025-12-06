// Títulos de nobreza em ordem
const NOBLE_TITLES = ['baron', 'viscount', 'count', 'marquis', 'duke'];
const TITLE_NAMES = {
    baron: 'Baron',
    viscount: 'Viscount',
    count: 'Count',
    marquis: 'Marquis',
    duke: 'Duke'
};

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
            console.log(`Sem hexágonos disponíveis para a textura ${textureUsed}`);
        }
    }

    initializePlayerPieces() {
        return {
            city: 5,
            stronghold: 2,
            knight: 7,
            village: 14
        };
    }

    initializePlayerHexCount() {
        return {
            water: 4,
            farm: 6,
            mountain: 5,
            plain: 6,
            forest: 6
        };
    }

    initializeResources() {
        return {
            field: 0,      // Campo (farm)
            forest: 0,     // Floresta
            mountain: 0,   // Montanha
            plain: 0       // Planície
        };
    }

    // Adiciona recurso baseado no tipo de terreno
    addResource(terrainType) {
        const resourceMap = {
            'farm.png': 'field',
            'forest.png': 'forest',
            'mountain.png': 'mountain',
            'plain.png': 'plain'
        };
        const resource = resourceMap[terrainType];
        if (resource && this.resources[resource] !== undefined) {
            this.resources[resource]++;
            return resource;
        }
        return null;
    }

    // Calcula total de recursos
    getTotalResources() {
        return Object.values(this.resources).reduce((sum, val) => sum + val, 0);
    }

    // Gasta recursos para título nobre
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

    // Sobe de título
    promoteTitle() {
        const currentIndex = NOBLE_TITLES.indexOf(this.title);
        if (currentIndex < NOBLE_TITLES.length - 1) {
            this.title = NOBLE_TITLES[currentIndex + 1];
            return true;
        }
        return false;
    }

    // Retorna nome do título em português
    getTitleName() {
        return TITLE_NAMES[this.title] || this.title;
    }

    // Adiciona pontos de vitória
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

export { NOBLE_TITLES, TITLE_NAMES };