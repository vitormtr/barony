export class Hex {
    constructor(row, col, texture) {
        this.row = row;
        this.col = col;
        this.texture = texture;  
        this.element = this.createHexElement();
    }

    createHexElement() {
        const hex = document.createElement("div");
        hex.classList.add("hexagon");
        hex.style.backgroundImage = `url(/images/${this.texture}.png)`;  
        return hex;
    }
}