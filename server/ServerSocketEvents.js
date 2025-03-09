export function handleSocketEvents(socket, io, sessionManager) {

    socket.on('createRoom', () => {
        console.log('Criando sala...');
        const roomId = sessionManager.createSession(socket, io);
        console.log(`Jogador ${socket.id} criou a sala ${roomId}`);
    });

    socket.on('joinRoom', (roomId) => {
        sessionManager.addPlayerToSession(socket, io, roomId);
    });

    socket.on('applyTextureToBoard', (payload) => {
        const success = sessionManager.applyTextureToBoard(socket, io, payload);    
        socket.emit('textureApplied', success);
    });

    socket.on('disconnect', () => {
        console.log(`Jogador ${socket.id} desconectado`);
    });

    
    
}