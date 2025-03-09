import { createBoard, updateBoard } from './BoardRender.js';
import { hideMenu } from './home-menu.js';
export const socket = io(); 

socket.on("connect", () => {
    console.log("Conectado ao servidor com ID:", socket.id);
});

socket.on('updateBoard', (boardState) => {
  console.log('Atualizando tabuleiro...');
  updateBoard(boardState); 
});

socket.on('createBoard', (boardState) => {
  console.log('Criando tabuleiro...');
  createBoard(boardState);
  hideMenu();
});

socket.on('error', (message) => {
  alert(`Erro: ${message}`);
});

export function emitJoinRoom(roomId) {
  socket.emit('joinRoom', roomId);
}

export function emitCreateRoom() {
    socket.emit('createRoom');
  }
  
