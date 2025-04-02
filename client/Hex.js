import { CONFIG } from './config.js';

export class Hex {
  constructor(row, col, texture = null) {
    this.row = row;
    this.col = col;
    this.texture = texture;
    this.element = this.createHexElement();
  }

  createHexElement() {
    const hex = this.createBaseElement();
    this.applyTexture(hex);
    this.addDataAttributes(hex);
    hex.appendChild(this.createCoordinateLabel());
    return hex;
  }

  createBaseElement() {
    const element = document.createElement('div');
    element.classList.add(CONFIG.CLASSES.HEX);
    return element;
  }

  applyTexture(element) {
    if (this.texture) {
      element.style.backgroundImage = `${CONFIG.PATHS.IMAGES}${this.texture}${CONFIG.FILE_EXTENSIONS.IMAGES}`;
    }
  }

  addDataAttributes(element) {
    element.dataset[CONFIG.HEXROWCOL.ROW] = this.row;
    element.dataset[CONFIG.HEXROWCOL.COL] = this.col;
  }

  createCoordinateLabel() {
    const coordText = document.createElement('span');
    coordText.classList.add(CONFIG.CLASSES.COORDINATE);
    coordText.textContent = `(${this.row}, ${this.col})`;
    return coordText;
  }
}