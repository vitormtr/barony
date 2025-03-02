import { Hex } from "./Hex.js";

export class Board {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.container = document.getElementById("hexContainer");

        if (!this.container) {
            console.error("Erro: hexContainer não encontrado!");
            return;
        }

        this.createBoard();
    }

    createBoard() {
        console.log("Criando tabuleiro...");

        for (let row = 0; row < this.rows; row++) {
            const rowContainer = document.createElement("div");
            rowContainer.classList.add("hex-container");

            for (let col = 0; col < this.cols; col++) {
                const hex = new Hex(row, col);
                rowContainer.appendChild(hex.element);
            }
            
            this.container.appendChild(rowContainer);
        }

        console.log("Tabuleiro criado com sucesso!");
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = ""; 
        }
        this.rows = null;
        this.cols = null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("roomId");

    if (!roomId) {
        console.error("Erro: Nenhum ID de sala foi encontrado.");
        return;
    }

    console.log(`Entrando na sala ${roomId}`);

    new Board(10, 10);
});
