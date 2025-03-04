import { socket } from './socket.js';
import { BoardRender } from './BoardRender.js';
import { hideMenu } from './ui.js';

socket.on('roomCreated', (roomId) => {
    socket.emit('joinRoom', roomId);
});

socket.on('playerJoined', (roomId) => {
    console.log(`Entrou na sala ${roomId}`);
});

socket.on('roomState', (boardState) => {
    const board = new BoardRender(boardState);
    hideMenu();
});

socket.on('error', (message) => {
    alert(`Erro: ${message}`);
});
