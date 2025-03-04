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
        hex.dataset.row = this.row;
        hex.dataset.col = this.col;

        const coordText = document.createElement("span");
        coordText.textContent = `(${this.row}, ${this.col})`;
        coordText.style.position = "absolute";
        coordText.style.top = "50%";
        coordText.style.left = "50%";
        coordText.style.transform = "translate(-50%, -50%)";
        coordText.style.color = "white";
        coordText.style.fontSize = "12px";
        coordText.style.fontWeight = "bold";
        coordText.style.textShadow = "1px 1px 3px rgba(0,0,0,0.8)"; 
        coordText.style.pointerEvents = "none"; 

        hex.appendChild(coordText);

        return hex;
    }
}
