import { emitCreateRoom, emitJoinRoom } from './socket.js';

export const createRoomBtn = document.getElementById("createRoomBtn");
export const joinRoomBtn = document.getElementById("joinRoomBtn");
export const roomIdInput = document.getElementById("roomIdInput");
export const gameArea = document.getElementById("gameArea");

createRoomBtn.addEventListener('click', () => {
    emitCreateRoom();
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        emitJoinRoom(roomId);
    }
});

