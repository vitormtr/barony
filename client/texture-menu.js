let firstHex = null; 
let placedTextures = 0;

export function showTextureMenu(hex) {
    let menu = document.getElementById('textureMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'textureMenu';
        menu.style.position = 'absolute';
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '10px';
        menu.style.backgroundColor = 'white';
        menu.style.zIndex = '1000';
        document.body.appendChild(menu);
    }

    const textures = ['plain.png', 'mountain.png', 'water.png', 'forest.png', 'farm.png'];

    menu.innerHTML = '';

    textures.forEach(texture => {
        const button = document.createElement('button');
        button.textContent = texture;
        button.onclick = function() {
            if (placedTextures === 0) {
                applyTextureToHex(hex, texture);
                firstHex = hex;
                placedTextures++;
            } else {
                if (isAdjacentToTexturedHex(hex)) {
                    applyTextureToHex(hex, texture);
                    placedTextures++;
                } else {
                    alert('A textura só pode ser colocada em um hexágono adjacente ao primeiro hexágono!');
                }
            }
            hideTextureMenu();
        };
        menu.appendChild(button);
    });

    const rect = hex.getBoundingClientRect();
    menu.style.top = `${rect.top + window.scrollY + rect.height + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    menu.style.display = 'block';
}

function applyTextureToHex(hex, texture) {
    hex.style.backgroundImage = `url(/images/${texture})`;
    hex.classList.add('has-texture'); 
}

function isAdjacentToTexturedHex(hex) {
    const row = parseInt(hex.dataset.row);
    const col = parseInt(hex.dataset.col);

    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], 
        [-1, 1], [1, -1] 
    ];

    return directions.some(([dRow, dCol]) => {
        const neighbor = document.querySelector(`.hexagon[data-row="${row + dRow}"][data-col="${col + dCol}"]`);
        return neighbor && neighbor.classList.contains('has-texture'); 
    });
}

export function hideTextureMenu() {
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