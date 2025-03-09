import { Hex } from "./Hex.js";
import { init } from "./board-ui.js";

export function destroyBoard() {
    const container = document.getElementById("hexContainer");
    if (container) {
        container.innerHTML = ""; 
    }
}

export function createBoard(boardState) {
    const container = document.getElementById("hexContainer");

    if (!container) {
        console.error("Erro: hexContainer não encontrado!");
        return;
    }

    for (let row = 0; row < boardState.length; row++) {
        const rowContainer = document.createElement("div");
        rowContainer.classList.add("hex-row");
        for (let col = 0; col < boardState[row].length; col++) {
            const hexTexture = boardState[row][col].texture;
            const hex = new Hex(row, col, hexTexture);
            rowContainer.appendChild(hex.element);
        }
        container.appendChild(rowContainer);
    }
    init();
}

export function updateBoard(boardState) {
    
    const newBoardState = boardState.boardState;
 
    for (let row = 0; row < newBoardState.length; row++) {
        for (let col = 0; col < newBoardState[row].length; col++) {
            const newHex = newBoardState[row][col];
            const hexElement = document.querySelector(`.hexagon[data-row="${row}"][data-col="${col}"]`);
            if (hexElement) {
                hexElement.style.backgroundImage = newHex.textureFile 
                    ? `url(/images/${newHex.textureFile})`
                    : "";
                hexElement.classList.toggle("has-texture", newHex.hasTexture);
            }
        }
    }
}