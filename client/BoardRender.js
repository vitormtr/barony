import { Hex } from "./Hex.js";

export class BoardRender {
    constructor(boardState) {
        this.container = document.getElementById("hexContainer");
        if (!this.container) {
            console.error("Erro: hexContainer não encontrado!");
            return;
        }
        this.boardState = boardState; 
        this.createBoard();
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = ""; 
        }
    }

    createBoard() {
        console.log("Reconstruindo o tabuleiro...");

        for (let row = 0; row < this.boardState.length; row++) {
            const rowContainer = document.createElement("div");
            rowContainer.classList.add("hex-container");
            for (let col = 0; col < this.boardState[row].length; col++) {
                const hexTexture = this.boardState[row][col].texture;
                const hex = new Hex(row, col, hexTexture);  
                rowContainer.appendChild(hex.element);
            }
            this.container.appendChild(rowContainer);
        }
    }
}
