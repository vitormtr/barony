export const socket = io(); 

export function emitCreateRoom() {
    socket.emit('createRoom');
}

export function emitJoinRoom(roomId) {
    socket.emit('joinRoom', roomId);
}