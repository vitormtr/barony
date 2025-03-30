// Constantes de configuração
const HUD_ID = "hud";
const PLAYER_CLASSES = {
  container: "player",          // Container principal do jogador
  image: "playerImage",         // Imagem do perfil do jogador
  info: "playerInfo",           // Container de informações do jogador
  name: "playerName",           // Elemento do nome do jogador
  pieces: "playerPieces",       // Container das peças do jogador
  piece: "piece",               // Container de cada tipo de peça
  count: countType => `${countType}Count` // Classe dinâmica para contadores
};

/**
 * Cria e exibe os elementos dos jogadores no HUD
 * @param {Array} players - Lista de jogadores com suas propriedades
 * @returns {void} 
 */
export function createPlayersElement(players) {
  const hud = getHudElement();
  clearElement(hud);

  players.forEach(player => {
    hud.appendChild(createPlayerElement(player));
  });
}

/**
 * Obtém o elemento HUD do documento
 * @returns {HTMLElement} Elemento HUD
 */
function getHudElement() {
  return document.getElementById(HUD_ID);
}

/**
 * Limpa o conteúdo de um elemento HTML
 * @param {HTMLElement} element - Elemento a ser limpo
 * @returns {void}
 */
function clearElement(element) {
  element.innerHTML = "";
}

/**
 * Cria o container completo de um jogador
 * @param {Object} player - Dados do jogador 
 * @returns {HTMLElement} Container do jogador com todos os elementos
 */
function createPlayerElement(player) {
  const container = createElementWithClass("div", PLAYER_CLASSES.container);
  container.appendChild(createProfileImage(player));
  container.appendChild(createPlayerInfo(player));
  return container;
}

/**
 * Cria a imagem de perfil do jogador
 * @param {Object} player - Dados do jogador
 * @returns {HTMLImageElement} Elemento de imagem configurado
 */
function createProfileImage(player) {
  const img = createElementWithClass("img", PLAYER_CLASSES.image);
  img.src = `./images/${player.image}`;
  img.alt = `Jogador ${player.name}`;
  return img;
}

/**
 * Cria o container de informações do jogador (nome e peças)
 * @param {Object} player - Dados do jogador
 * @returns {HTMLElement} Container de informações
 */
function createPlayerInfo(player) {
  const infoContainer = createElementWithClass("div", PLAYER_CLASSES.info);
  infoContainer.appendChild(createPlayerName(player.color));
  infoContainer.appendChild(createPiecesElements(player.pieces, player.color));
  return infoContainer;
}

/**
 * Cria o elemento de exibição do nome do jogador
 * @param {string} color - Cor do jogador
 * @returns {HTMLElement} Elemento com o nome formatado
 */
function createPlayerName(color) {
  const nameElement = createElementWithClass("div", PLAYER_CLASSES.name);
  nameElement.textContent = `${color} Player`;
  return nameElement;
}

/**
 * Cria todos os elementos de peças do jogador
 * @param {Object} pieces - Objeto com tipos e quantidades de peças
 * @param {string} color - Cor do jogador para assets
 * @returns {HTMLElement} Container com todas as peças
 */
function createPiecesElements(pieces, color) {
  const piecesContainer = createElementWithClass("div", PLAYER_CLASSES.pieces);
  Object.entries(pieces).forEach(([pieceType, count]) => {
    piecesContainer.appendChild(createPieceElement(color, pieceType, count));
  });
  return piecesContainer;
}

/**
 * Cria um elemento individual de peça com contador
 * @param {string} color - Cor do jogador para o asset
 * @param {string} pieceType - Tipo da peça (ex: 'Warrior')
 * @param {number} count - Quantidade disponível
 * @returns {HTMLElement} Container completo da peça
 */
function createPieceElement(color, pieceType, count) {
  const pieceContainer = createElementWithClass("div", PLAYER_CLASSES.piece);
  const formattedType = pieceType.toLowerCase();
  
  pieceContainer.appendChild(createPieceImage(color, formattedType));
  pieceContainer.appendChild(createCountElement(formattedType, count));
  
  return pieceContainer;
}

/**
 * Cria a imagem de uma peça
 * @param {string} color - Cor do jogador
 * @param {string} pieceType - Tipo da peça em lowercase
 * @returns {HTMLImageElement} Imagem configurada
 */
function createPieceImage(color, pieceType) {
  const img = document.createElement("img");
  img.src = `./images/${color}${pieceType}.png`;
  img.alt = capitalizeFirstLetter(pieceType);
  return img;
}

/**
 * Cria o elemento de contagem para uma peça
 * @param {string} pieceType - Tipo da peça em lowercase
 * @param {number} count - Quantidade a exibir
 * @returns {HTMLElement} Elemento de contagem configurado
 */
function createCountElement(pieceType, count) {
  const countElement = createElementWithClass("span", PLAYER_CLASSES.count(pieceType));
  countElement.textContent = count;
  return countElement;
}

/**
 * Utilitário: Cria elemento HTML com classe
 * @param {string} elementType - Tipo do elemento (div, span, etc)
 * @param {string} className - Classe CSS a ser adicionada
 * @returns {HTMLElement} Elemento criado
 */
function createElementWithClass(elementType, className) {
  const element = document.createElement(elementType);
  element.classList.add(className);
  return element;
}

/**
 * Utilitário: Capitaliza a primeira letra de uma string
 * @param {string} string - Texto a formatar
 * @returns {string} Texto capitalizado
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}