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
            const hex = new Hex(row, col); 
            hex.element.dataset.hex = JSON.stringify(hex);
            rowContainer.appendChild(hex.element);
        }
        container.appendChild(rowContainer);
    }
    init();
}

export function updateBoard(board) {
    const newBoardState = board.boardState;
    for (let row = 0; row < newBoardState.length; row++) {
        for (let col = 0; col < newBoardState[row].length; col++) {
            const newHex = newBoardState[row][col];
            const hexElement = document.querySelector(`.hexagon[data-row="${row}"][data-col="${col}"]`);

            if (hexElement) {
                const hexObject = JSON.parse(hexElement.dataset.hex); 
                hexObject.texture = newHex.texture;
                //Salva o novo objeto com a textura
                hexElement.dataset.hex = JSON.stringify(hexObject);
                hexElement.style.backgroundImage = newHex.texture
                    ? `url(/images/${newHex.texture})`
                    : "";
            }
        }
    }
}