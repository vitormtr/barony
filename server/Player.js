export class Player {
    constructor(id, color, hexCount = null, pieces = null) {
        this.id = id;
        this.color = color;
        this.image = `${color}player.png`;
        this.hexCount = hexCount ?? this.initializePlayerHexCount();
        this.pieces = pieces ?? this.initializePlayerPieces();
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

    toJSON() {
        return {
          id: this.id,
          color: this.color,
          image: this.image,
          hexCount: this.hexCount,
          pieces: this.pieces,
        };
    }
}