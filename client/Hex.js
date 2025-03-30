// Constantes de configuração
const HEX_CLASSES = {
  main: 'hexagon',
  coordinate: 'coordinate-text'
};

const DATA_ATTRIBUTES = {
  row: 'row',
  col: 'col'
};

const IMAGE_BASE_PATH = '/images/';
const IMAGE_EXTENSION = '.png';

export class Hex {
  /**
   * Cria uma representação de hexágono para a interface
   * @param {number} row - Coordenada X do hexágono no grid
   * @param {number} col - Coordenada Y do hexágono no grid
   * @param {string|null} texture - Nome da textura a ser aplicada
   */
  constructor(row, col, texture = null) {
    this.row = row;
    this.col = col;
    this.texture = texture;
    this.element = this.createHexElement();
  }

  /**
   * Cria o elemento HTML do hexágono
   * @returns {HTMLElement} Elemento DOM configurado
   */
  createHexElement() {
    const hex = this.createBaseElement();
    this.applyTexture(hex);
    this.addDataAttributes(hex);
    hex.appendChild(this.createCoordinateLabel());
    return hex;
  }

  /**
   * Cria o elemento base do hexágono
   * @private
   * @returns {HTMLElement}
   */
  createBaseElement() {
    const element = document.createElement('div');
    element.classList.add(HEX_CLASSES.main);
    return element;
  }

  /**
   * Aplica a textura ao elemento do hexágono
   * @private
   * @param {HTMLElement} element - Elemento a receber a textura
   */
  applyTexture(element) {
    if (this.texture) {
      element.style.backgroundImage = `${IMAGE_BASE_PATH}${this.texture}${IMAGE_EXTENSION}`;
    }
  }

  /**
   * Adiciona atributos de dados (dataset) ao elemento
   * @private
   * @param {HTMLElement} element - Elemento a ser configurado
   */
  addDataAttributes(element) {
    element.dataset[DATA_ATTRIBUTES.row] = this.row;
    element.dataset[DATA_ATTRIBUTES.col] = this.col;
  }

  /**
   * Cria o rótulo de coordenadas do hexágono
   * @private
   * @returns {HTMLElement} Elemento span com as coordenadas
   */
  createCoordinateLabel() {
    const coordText = document.createElement('span');
    coordText.classList.add(HEX_CLASSES.coordinate);
    coordText.textContent = `(${this.row}, ${this.col})`;
    return coordText;
  }
}