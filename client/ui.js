import { emitCreateRoom, emitJoinRoom } from './socket.js';
import { showTextureMenu, hideTextureMenu } from './texture-menu.js';

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomIdInput = document.getElementById("roomIdInput");
const board = document.getElementById("boardContainer");
const menu = document.getElementById("logoMenuContainer");

export function clickEventHexagon() {
    document.querySelectorAll('.hexagon').forEach(hex => {
        hex.addEventListener('click', function(event) {
            document.querySelectorAll('.hexagon').forEach(h => h.classList.remove('selected'));
            this.classList.add('selected');
            event.stopPropagation();
            showTextureMenu(this);
        });
    });
}

export function closeMenuOnClickOutside() {
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('textureMenu');
        if (menu && !menu.contains(event.target) && !event.target.classList.contains('hexagon')) {
            hideTextureMenu();
        }
    });
}

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
    board.style.display = 'block';
}

