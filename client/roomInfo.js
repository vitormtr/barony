// Módulo para exibir informações da sala
import { showSuccess, showInfo } from './notifications.js';

let roomInfoElement = null;
let currentRoomId = null;

export function showRoomInfo(roomId) {
  currentRoomId = roomId;

  if (!roomInfoElement) {
    roomInfoElement = document.createElement('div');
    roomInfoElement.id = 'room-info';
    roomInfoElement.innerHTML = `
      <span class="label">Sala</span>
      <span class="room-id" title="Clique para copiar">${roomId}</span>
      <span class="copy-hint">clique para copiar</span>
    `;
    document.body.appendChild(roomInfoElement);

    // Evento de clique para copiar
    const roomIdSpan = roomInfoElement.querySelector('.room-id');
    roomIdSpan.addEventListener('click', copyRoomId);
  } else {
    roomInfoElement.querySelector('.room-id').textContent = roomId;
    roomInfoElement.style.display = 'flex';
  }
}

async function copyRoomId() {
  if (!currentRoomId) return;

  try {
    await navigator.clipboard.writeText(currentRoomId);
    showSuccess('Código da sala copiado!');

    // Feedback visual
    const roomIdSpan = roomInfoElement.querySelector('.room-id');
    roomIdSpan.style.background = 'rgba(76, 175, 80, 0.3)';
    setTimeout(() => {
      roomIdSpan.style.background = '';
    }, 300);
  } catch (err) {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = currentRoomId;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showSuccess('Código da sala copiado!');
  }
}

export function hideRoomInfo() {
  if (roomInfoElement) {
    roomInfoElement.style.display = 'none';
  }
}

export function getRoomId() {
  return currentRoomId;
}
