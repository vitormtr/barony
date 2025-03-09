
import { emitCreateRoom, emitJoinRoom } from './ClientSocketEvents.js';

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomIdInput = document.getElementById("roomIdInput");
const menu = document.getElementById("logoMenuContainer");


createRoomBtn.addEventListener('click', () => {
    emitCreateRoom();
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        emitJoinRoom(roomId);
    }
});

export function hideMenu() {
    createRoomBtn.style.display = 'none';
    joinRoomBtn.style.display = 'none';
    roomIdInput.style.display = 'none';
    menu.style.display = 'none';
    document.body.style.backgroundImage = "none";
}

