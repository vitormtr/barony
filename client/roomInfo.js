// Module for displaying room information
import { showSuccess, showInfo } from './notifications.js';

let roomInfoElement = null;
let currentRoomId = null;

export function showRoomInfo(roomId) {
  currentRoomId = roomId;

  if (!roomInfoElement) {
    roomInfoElement = document.createElement('div');
    roomInfoElement.id = 'room-info';
    roomInfoElement.innerHTML = `
      <span class="label">Room</span>
      <span class="room-id" title="Click to copy">${roomId}</span>
      <span class="copy-hint">click to copy</span>
    `;
    document.body.appendChild(roomInfoElement);

    // Click event to copy
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
    showSuccess('Room code copied!');

    // Visual feedback
    const roomIdSpan = roomInfoElement.querySelector('.room-id');
    roomIdSpan.style.background = 'rgba(76, 175, 80, 0.3)';
    setTimeout(() => {
      roomIdSpan.style.background = '';
    }, 300);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = currentRoomId;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showSuccess('Room code copied!');
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
