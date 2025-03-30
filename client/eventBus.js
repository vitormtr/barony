import { CONFIG } from './config.js';
import { domHelper } from './domUtils.js';
import { showTextureMenu } from './texture-menu.js';
export const eventBus = {
    handlers: new Map(),
  
    on(event, callback) {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, []);
      }
      this.handlers.get(event).push(callback);
    },
  
    emit(event, data) {
      this.handlers.get(event)?.forEach(handler => handler(data));
    }
  };
  
  eventBus.on(CONFIG.EVENTS.HEX_CLICKED, (data) => {
    handleHexSelection(data.element);
    showTextureMenu(data.element);
  });
  
  function handleHexSelection(hexElement) {
    domHelper.getAll(CONFIG.SELECTORS.SELECTED_HEX).forEach(hex => {
      domHelper.removeClass(hex, CONFIG.CLASSES.SELECTED);
    });
    
    domHelper.addClass(hexElement, CONFIG.CLASSES.SELECTED);
  }