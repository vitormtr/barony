import { nanoid } from 'nanoid';

const rooms = {};

export const handleSocketEvents = (socket, io) => {
    console.log(`Novo jogador conectado: ${socket.id}`);

    socket.on('createRoom', () => {
        console.log('Criando Sala...');
        const roomId = nanoid(6); 
        const boardState = createEmptyBoard(15, 15)
        rooms[roomId] = { players: [socket.id], boardState: boardState }; 
        socket.join(roomId);      
        socket.emit('roomCreated', roomId);  
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms[roomId];
    
        if (room) {
            socket.join(roomId);
            socket.emit('roomState', room.boardState); 
            io.to(roomId).emit('playerJoined', roomId);
        } else {
            socket.emit('error', "Sala não encontrada!");
        }
    });

    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
    });    

    
};

function createEmptyBoard(rows, cols) {
    const boardState = [];
    for (let row = 0; row < rows; row++) {
        const rowState = [];
        for (let col = 0; col < cols; col++) {
            rowState.push({ texture: null });
        }
        boardState.push(rowState);
    }
    return boardState;
}

/*function getRandomHexagonTexture() {
    const hexTextures = [
        { type: "water", chance: 0.20 },
        { type: "mountain", chance: 0.20 },
        { type: "forest", chance: 0.20 },
        { type: "farm", chance: 0.20 },
        { type: "plain", chance: 0.20 }
    ];

    const rand = Math.random();
    let cumulative = 0;
    for (const texture of hexTextures) {
        cumulative += texture.chance;
        if (rand < cumulative) {
            return texture.type;
        }
    }
    return "water";  
}*/