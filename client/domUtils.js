export const domHelper = {
    create(elementType, classes = [], attributes = {}) {
      const element = document.createElement(elementType);
      element.classList.add(...classes);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
      return element;
    },
  
    get(selector) {
      return document.querySelector(selector);
    },
  
    batchSetDisplay(elements, displayValue) {
      elements.forEach(el => el.style.display = displayValue);
    },

    hide(element) {
      element.style.display = 'none';
    },

    hideBackground(element) {
      element.style.backgroundImage = 'none';
    },

    clear(element) {
      element.innerHTML = "";
    },
      
    setDataset(element, data) {
        Object.entries(data).forEach(([key, value]) => {
          element.dataset[key] = value;
        });
    },
    
    getDataset(element) {
        return Object.entries(element.dataset).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    },
    
    setBackgroundImage(element, imageUrl) {
        element.style.backgroundImage = imageUrl ? `url(${imageUrl})` : '';
    },

    onClick(element, handler) {
        element.addEventListener('click', handler);
    },
      
    onDocumentClick(handler) {
        document.addEventListener('click', handler);
    },

    setBackgroundImage(element, url) {
        element.style.backgroundImage = `url(${url})`;
    },
      
    append(parent, child) {
        parent.appendChild(child);
    },

    getAll(selector) {
      return document.querySelectorAll(selector);
    },

    addClass(element, className) {
      if (!element || !className) return;
      
      const classes = Array.isArray(className) ? className : [className];
      element.classList.add(...classes.filter(c => c));
    },
  
    removeClass(element, className) {
      if (!element || !className) return;
      
      const classes = Array.isArray(className) ? className : [className];
      element.classList.remove(...classes.filter(c => c));
    },
  
    toggleClass(element, className, force) {
      if (!element || !className) return;
      element.classList.toggle(className, force);
    },
  
    hasClass(element, className) {
      return element?.classList?.contains(className);
    },

    appendToBody(element) {
      if (element instanceof HTMLElement) {
        document.body.appendChild(element);
      }
    },

    setStyle(element, property, value) {
      if (element && property) {
        element.style[property] = value;
      }
    },

    getDatasetValue(element, key) {
      return element?.dataset?.[key] || null;
    }

  };