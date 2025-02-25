export class Hex {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.texture = this.getRandomHexagonTexture();
        this.element = this.createHexElement();
        this.addKnightImage();
    }

    getRandomHexagonTexture() {
        const hexTextures = [
            { type: "water", chance: 0.20 },
            { type: "mountain", chance: 0.20 },
            { type: "forest", chance: 0.20 },
            { type: "farm", chance: 0.20 },
            { type: "plain", chance: 0.20 }
        ];
        
        const rand = Math.random();
        let cumulative = 0;
        for (const texture of hexTextures) {
            cumulative += texture.chance;
            if (rand < cumulative) {
                return texture.type;
            }
        }
        return "water";
    }

    createHexElement() {
        const hex = document.createElement("div");
        hex.classList.add("hexagon");
        hex.style.backgroundImage = `url(./images/${this.texture}.png)`;
        return hex;
    }

    getRandomKnightColor() {
        const knightColors = ["yellow", "blue", "green", "red"];
        const randomIndex = Math.floor(Math.random() * knightColors.length);
        return knightColors[randomIndex];
    }

    addKnightImage() {
        const knightImage = document.createElement("img");
        const knightColor = this.getRandomKnightColor(); 
        knightImage.src = `./images/${knightColor}knight.png`; 
        knightImage.classList.add("knight-image");
        this.element.appendChild(knightImage);
    }
}