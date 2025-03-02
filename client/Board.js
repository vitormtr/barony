import { Hex } from "./Hex.js";

export class Board {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.container = document.getElementById("hexContainer");
        this.createBoard();
    }

    destroy() {
        this.container.innerHTML = "";
        this.rows = null;
        this.cols = null;
    }

    createBoard() {
        for (let row = 0; row < this.rows; row++) {
            const rowContainer = document.createElement("div");
            rowContainer.classList.add("hex-container");

            for (let col = 0; col < this.cols; col++) {
                const hex = new Hex(row, col);
                rowContainer.appendChild(hex.element);
            }
            this.container.appendChild(rowContainer);
        }
    }
}