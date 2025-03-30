import { socket } from "./ClientSocketEvents.js";

// Constantes e configurações
const TEXTURES = {
  'plain.png': 'plain',
  'mountain.png': 'mountain',
  'water.png': 'water',
  'forest.png': 'forest',
  'farm.png': 'farm'
};

const DIRECTION_MAP = {
  even: [
    [-1, -1], [-1, 0], [0, 1],
    [1, 0], [1, -1], [0, -1]
  ],
  odd: [
    [-1, 0], [-1, 1], [0, 1],
    [1, 1], [1, 0], [0, -1]
  ]
};

/******************************
 * GERENCIAMENTO DO MENU DE TEXTURAS *
 ******************************/

/**
 * Exibe o menu de texturas para um hexágono específico
 * @param {HTMLElement} hex - Elemento do hexágono clicado
 * @returns {void}
 */
export function showTextureMenu(hex) {
  const menu = getOrCreateTextureMenu();
  menu.innerHTML = '';
  
  Object.keys(TEXTURES).forEach(texture => {
    menu.appendChild(createTextureOption(texture, hex));
  });

  menu.style.display = 'flex';
}

/**
 * Obtém ou cria o container do menu de texturas
 * @returns {HTMLElement} Elemento do menu
 */
function getOrCreateTextureMenu() {
  let menu = document.getElementById('textureMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'textureMenu';
    document.body.appendChild(menu);
  }
  return menu;
}

/**
 * Cria uma opção de textura clicável
 * @param {string} textureFile - Nome do arquivo de textura
 * @param {HTMLElement} hex - Elemento hexágono relacionado
 * @returns {HTMLElement} Elemento da opção de textura
 */
function createTextureOption(textureFile, hex) {
  const container = document.createElement('div');
  container.classList.add('texture-option');
  container.style.backgroundImage = `url(/images/${textureFile})`;
  
  container.appendChild(createCountLabel());
  container.onclick = createTextureClickHandler(hex, textureFile);
  
  return container;
}

/**
 * Cria o handler de clique para uma textura específica
 * @param {HTMLElement} hex - Elemento hexágono alvo
 * @param {string} texture - Nome da textura selecionada
 * @returns {Function} Função de handler de clique
 */
function createTextureClickHandler(hex, texture) {
  return () => {
    if (!validateTexturePlacement(hex)) return;
    requestTexturePlacement(hex, texture);
  };
}

/**
 * Cria o rótulo de contagem para a textura
 * @returns {HTMLElement} Elemento span vazio para contagem
 */
function createCountLabel() {
  const label = document.createElement('span');
  label.classList.add('hex-count');
  return label;
}

/*********************************
 * LÓGICA DE APLICAÇÃO DE TEXTURAS *
 *********************************/

/**
 * Valida a posição para colocação da textura
 * @param {HTMLElement} hex - Elemento hexágono alvo
 * @returns {boolean} True se a posição é válida
 */
function validateTexturePlacement(hex) {
  if (hasAnyTexturedHex() && !isAdjacentToTexturedHex(hex)) {
    alert('A textura só pode ser colocada em um hexágono adjacente ao primeiro!');
    return false;
  }
  return true;
}

/**
 * Envia requisição para aplicação da textura no servidor
 * @param {HTMLElement} hex - Elemento hexágono alvo
 * @param {string} texture - Nome da textura selecionada
 * @returns {void}
 */
function requestTexturePlacement(hex, texture) {
  const payload = {
    row: parseInt(hex.dataset.row),
    col: parseInt(hex.dataset.col),
    texture
  };

  socket.emit('applyTextureToBoard', payload);
  socket.once('textureApplied', handleTextureApplication);
}

/**
 * Manipula a resposta da aplicação da textura
 * @param {boolean} success - Indica se a aplicação foi bem sucedida
 * @returns {void}
 */
function handleTextureApplication(success) {
  const message = success 
    ? "Textura aplicada com sucesso!"
    : "Falha ao aplicar a textura.";
  console.log(message);
}

/***************************
 * VERIFICAÇÕES DE HEXÁGONOS *
 ***************************/

/**
 * Verifica se existe pelo menos um hexágono texturizado
 * @returns {boolean} True se encontrar algum hexágono com textura
 */
function hasAnyTexturedHex() {
  return Array.from(document.querySelectorAll('.hexagon'))
    .some(hex => getHexTexture(hex) !== null);
}

/**
 * Verifica se o hexágono é adjacente a outro com textura
 * @param {HTMLElement} hex - Elemento hexágono alvo
 * @returns {boolean} True se houver vizinho texturizado
 */
function isAdjacentToTexturedHex(hex) {
  const row = parseInt(hex.dataset.row);
  const col = parseInt(hex.dataset.col);
  const directions = getDirections(row);

  return directions.some(([dRow, dCol]) => {
    const neighbor = findNeighborHex(row + dRow, col + dCol);
    return neighbor && getHexTexture(neighbor) !== null;
  });
}

/**
 * Obtém as direções de vizinhança com base na linha
 * @param {number} row - Número da linha do hexágono
 * @returns {Array} Array com coordenadas dos vizinhos
 */
function getDirections(row) {
  return row % 2 === 1 ? DIRECTION_MAP.odd : DIRECTION_MAP.even;
}

/**
 * Encontra um hexágono vizinho específico
 * @param {number} row - Linha do vizinho
 * @param {number} col - Coluna do vizinho
 * @returns {HTMLElement|null} Elemento do vizinho ou null
 */
function findNeighborHex(row, col) {
  return document.querySelector(
    `.hexagon[data-row="${row}"][data-col="${col}"]`
  );
}

/**
 * Obtém a textura atual de um hexágono
 * @param {HTMLElement} hexElement - Elemento do hexágono
 * @returns {string|null} Nome da textura ou null
 */
function getHexTexture(hexElement) {
  return JSON.parse(hexElement.dataset.hex).texture;
}

/*************************
 * GERENCIAMENTO DE EVENTOS *
 *************************/

/**
 * Adiciona eventos de clique a todos os hexágonos
 * @returns {void}
 */
export function addClickEventToHexagons() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.addEventListener('click', handleHexClick);
  });
}

/**
 * Manipula o clique em um hexágono
 * @param {Event} event - Evento de clique
 * @returns {void}
 */
function handleHexClick(event) {
  document.querySelectorAll('.hexagon').forEach(h => 
    h.classList.remove('selected'));
  
  this.classList.add('selected');
  event.stopPropagation();
  showTextureMenu(this);
}

/**
 * Configura o fechamento do menu ao clicar fora
 * @returns {void}
 */
export function closeMenuOnClickOutside() {
  document.addEventListener('click', handleDocumentClick);
}

/**
 * Manipula o clique fora do menu
 * @param {Event} event - Evento de clique
 * @returns {void}
 */
function handleDocumentClick(event) {
  const menu = document.getElementById('textureMenu');
  if (menu && !menu.contains(event.target) && !event.target.classList.contains('hexagon')) {
    hideTextureMenu();
  }
}

/**
 * Oculta o menu de texturas
 * @returns {void}
 */
function hideTextureMenu() {
  const menu = document.getElementById('textureMenu');
  menu && (menu.style.display = 'none');
}