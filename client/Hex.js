

export class Hex {
    constructor(row, col, texture = null) {
        this.row = row;
        this.col = col;
        this.texture = texture;  
        this.element = this.createHexElement();
    }

    createHexElement() {
        const hex = document.createElement("div");
        hex.classList.add("hexagon");
        hex.style.backgroundImage = `url(/images/${this.texture}.png)`;
        hex.dataset.row = this.row;
        hex.dataset.col = this.col;
    
        const coordText = document.createElement("span");
        coordText.textContent = `(${this.row}, ${this.col})`;
    
        hex.appendChild(coordText);
        return hex;
    }
}
