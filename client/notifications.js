// Non-blocking toast notification system

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Remove the toast after duration
  setTimeout(() => {
    toast.remove();
  }, duration);
}

export function showSuccess(message) {
  showToast(message, 'success');
}

export function showError(message) {
  showToast(message, 'error');
}

export function showWarning(message) {
  showToast(message, 'warning');
}

export function showInfo(message) {
  showToast(message, 'info');
}
