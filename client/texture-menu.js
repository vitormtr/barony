import { socket } from "./ClientSocketEvents.js";

let firstHex = null;
let placedTextures = 0;


export function showTextureMenu(hex) {
    let menu = document.getElementById('textureMenu');

    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'textureMenu';
        document.body.appendChild(menu);
    }

    const textures = {
        'plain.png': 'plain',
        'mountain.png': 'mountain',
        'water.png': 'water',
        'forest.png': 'forest',
        'farm.png': 'farm'
    };

    menu.innerHTML = '';

    Object.entries(textures).forEach(([textureFile, textureType]) => {
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('texture-option');
        imgContainer.dataset.textureType = textureType;
        imgContainer.style.backgroundImage = `url(/images/${textureFile})`;

        const countLabel = document.createElement('span');
        countLabel.classList.add('hex-count');

        imgContainer.onclick = function () {
                if (placedTextures === 0) {
                    if (requestTexturePlacement(hex, textureFile, textureType, true)) {
                        firstHex = hex;
                        placedTextures++;
                    }
                } else {
                    if (isAdjacentToTexturedHex(hex)) {
                        if(requestTexturePlacement(hex, textureFile, textureType, false)){
                            placedTextures++;
                        }
                    } else {
                        alert('A textura só pode ser colocada em um hexágono adjacente ao primeiro!');
                        return;
                    }
                }
            } 
  
        imgContainer.appendChild(countLabel);
        menu.appendChild(imgContainer);
    });

    menu.style.display = 'flex';
}

function requestTexturePlacement(hex, textureFile, textureType, isFirst) {
    const payload = {
        row: parseInt(hex.dataset.row),
        col: parseInt(hex.dataset.col),
        textureFile,
        textureType,
        isFirst
    };

    socket.emit('applyTextureToBoard', payload);

    socket.once('textureApplied', (success) => {
        if (success) {
            console.log("Textura aplicada com sucesso!");
            return true;
        } else {
            console.log("Falha ao aplicar a textura.");
            return false;
        }
    });
}

function isAdjacentToTexturedHex(hex) {
    const row = parseInt(hex.dataset.row);
    const col = parseInt(hex.dataset.col);
    let directions = [];
    if (row % 2 === 1){
        directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [1, -1], [1, 1], [-1, -1]
        ];
    } else {
        directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, 1], [1, 1], [-1, -1]
        ];
    }


    return directions.some(([dRow, dCol]) => {
        const neighbor = document.querySelector(`.hexagon[data-row="${row + dRow}"][data-col="${col + dCol}"]`);
        return neighbor && neighbor.classList.contains('has-texture');
    });
}

//funções auxiliares
function hideTextureMenu() {
    const menu = document.getElementById('textureMenu');
    if (menu) {
        menu.style.display = 'none';
    }
}

export function addClickEventToHexagons() {
    document.querySelectorAll('.hexagon').forEach(hex => {
        hex.addEventListener('click', function(event) {
            document.querySelectorAll('.hexagon').forEach(h => h.classList.remove('selected'));
            this.classList.add('selected');
            event.stopPropagation();
            showTextureMenu(this);
        });
    });
}

export function closeMenuOnClickOutside() {
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('textureMenu');
        if (menu && !menu.contains(event.target) && !event.target.classList.contains('hexagon')) {
            hideTextureMenu();
        }
    });
}

