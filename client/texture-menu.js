import { socket, player, emitUpdatePlayerTexture } from "./ClientSocketEvents.js";
import { CONFIG } from "./config.js";

export function showTextureMenu(hex) {
  const menu = getOrCreateTextureMenu();
  menu.innerHTML = '';
  
  Object.keys(CONFIG.TEXTURES).forEach(texture => {
    menu.appendChild(createTextureOption(texture, hex));
  });

  menu.style.display = 'flex';
}

function getOrCreateTextureMenu() {
  let menu = document.getElementById('textureMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'textureMenu';
    document.body.appendChild(menu);
  }
  return menu;
}

function createTextureOption(textureFile, hex) {
  const container = document.createElement('div');
  container.classList.add('texture-option');
  container.style.backgroundImage = `url(/images/${textureFile})`;
  
  container.appendChild(createCountLabel(textureFile));
  container.onclick = createTextureClickHandler(hex, textureFile);
  
  return container;
}

function createTextureClickHandler(hex, texture) {
  return () => {
    if (!validateTexturePlacement(hex)) return;
    requestTexturePlacement(hex, texture);
  };
}

function createCountLabel(texture) {
  texture = texture.replace(".png", "");
  const label = document.createElement('span');
  label.classList.add('hex-count');
  label.textContent = player.hexCount[`${texture}`] || '0';
  return label;
}

export function updateCountLabel(player){
  const textureOptions = document.querySelectorAll('.texture-option');
  
  textureOptions.forEach(option => {
    const backgroundStyle = getComputedStyle(option).backgroundImage;
    const texturePath = backgroundStyle.match(/\/images\/(.+?)\.png/)[1];

    option.textContent = player.hexCount[`${texturePath}`] || '0';
  });

}

function validateTexturePlacement(hex) {
  if (hasAnyTexturedHex() && !isAdjacentToTexturedHex(hex)) {
    alert('A textura só pode ser colocada em um hexágono adjacente ao primeiro!');
    return false;
  }
  return true;
}

function requestTexturePlacement(hex, texture) {
  const payload = {
    row: parseInt(hex.dataset.row),
    col: parseInt(hex.dataset.col),
    texture
  };

  socket.emit('applyTextureToBoard', payload);
  socket.once('textureApplied', (success) => {
    handleTextureApplication(success, texture);
  });
}

function handleTextureApplication(success, textureUsed) {
  if (success){
    emitUpdatePlayerTexture(textureUsed);
    console.log('Textura aplicada com sucesso!');
  } else {
    console.log('Falha ao aplicar a textura.');
  }
}

function hasAnyTexturedHex() {
  return Array.from(document.querySelectorAll('.hexagon'))
    .some(hex => getHexTexture(hex) !== null);
}

function isAdjacentToTexturedHex(hex) {
  const row = parseInt(hex.dataset.row);
  const col = parseInt(hex.dataset.col);
  const directions = getDirections(row);

  return directions.some(([dRow, dCol]) => {
    const neighbor = findNeighborHex(row + dRow, col + dCol);
    return neighbor && getHexTexture(neighbor) !== null;
  });
}

function getDirections(row) {
  return row % 2 === 1 ? CONFIG.DIRECTION_MAP.ODD : CONFIG.DIRECTION_MAP.EVEN;
}

function findNeighborHex(row, col) {
  return document.querySelector(
    `.hexagon[data-row="${row}"][data-col="${col}"]`
  );
}

function getHexTexture(hexElement) {
  return JSON.parse(hexElement.dataset.hex).texture;
}

export function addClickEventToHexagons() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.addEventListener('click', handleHexClick);
  });
}

function handleHexClick(event) {
  document.querySelectorAll('.hexagon').forEach(h => 
    h.classList.remove('selected'));
  
  this.classList.add('selected');
  event.stopPropagation();
  showTextureMenu(this);
}

export function closeMenuOnClickOutside() {
  document.addEventListener('click', handleDocumentClick);
}

function handleDocumentClick(event) {
  const menu = document.getElementById('textureMenu');
  if (menu && !menu.contains(event.target) && !event.target.classList.contains('hexagon')) {
    hideTextureMenu();
  }
}

function hideTextureMenu() {
  const menu = document.getElementById('textureMenu');
  menu && (menu.style.display = 'none');
}
