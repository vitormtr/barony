

export class Player {
    constructor(color, id) {
        this.id = id;
        this.color = color;
        this.image = `${color}player.png`;
        this.hexCount = {
            water: 4,
            farm: 6,
            mountain: 5, 
            plain: 6,
            forest: 6 
        };
        this.pieces = {
            city: 5,
            stronghold: 2,
            knight: 7,
            village: 14
        };
    }
}