let firstHex = null; 
let placedTextures = 0;

export function showTextureMenu(hex) {
    let menu = document.getElementById('textureMenu');
    
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'textureMenu';
        menu.style.position = 'fixed';
        menu.style.bottom = '1vh';
        menu.style.marginBottom = '5vh'; 
        menu.style.left = '50%';
        menu.style.transform = 'translateX(-50%)';
        menu.style.display = 'flex';
        menu.style.gap = '15px'; 
        menu.style.padding = '10px';
        menu.style.backgroundColor = 'transparent'; 
        menu.style.zIndex = '1000';
        document.body.appendChild(menu);
    }

    const textures = ['plain.png', 'mountain.png', 'water.png', 'forest.png', 'farm.png'];

    menu.innerHTML = ''; 

    textures.forEach(texture => {
        const imgContainer = document.createElement('div');
        imgContainer.style.width = '90px'; 
        imgContainer.style.height = '90px'; 
        imgContainer.style.backgroundImage = `url(/images/${texture})`;
        imgContainer.style.backgroundSize = 'cover';
        imgContainer.style.cursor = 'pointer';
        imgContainer.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
        imgContainer.style.transition = 'transform 0.2s, border-color 0.2s';
        imgContainer.style.border = '2px solid transparent';
        imgContainer.style.borderRadius = '5px';

        imgContainer.onmouseover = () => imgContainer.style.transform = 'scale(1.1)';
        imgContainer.onmouseout = () => imgContainer.style.transform = 'scale(1)';

        imgContainer.onclick = function() {
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
            player.increaseHexCount(textureType);
            hideTextureMenu();
        };
        menu.appendChild(imgContainer);
    });
    menu.style.display = 'flex'; 
}

function applyTextureToHex(hex, texture) {
    hex.style.backgroundImage = `url(/images/${texture})`;
    hex.classList.add('has-texture'); 
}

function isAdjacentToTexturedHex(hex) {
    const row = parseInt(hex.dataset.row);
    const col = parseInt(hex.dataset.col);

    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, -1] 
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