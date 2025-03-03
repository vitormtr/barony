import { socket } from './socket.js';
import { BoardRender } from './BoardRender.js';
import { createRoomBtn, joinRoomBtn, roomIdInput, gameArea } from './ui.js';

socket.on('roomCreated', (roomId) => {
    socket.emit('joinRoom', roomId);
});

socket.on('playerJoined', (roomId) => {
    console.log(`Entrou na sala ${roomId}`);
});

socket.on('roomState', (boardState) => {
    const board = new BoardRender(boardState);
    createRoomBtn.style.display = 'none';
    joinRoomBtn.style.display = 'none';
    roomIdInput.style.display = 'none';
    gameArea.style.display = 'block';
});

socket.on('error', (message) => {
    alert(`Erro: ${message}`);
});
