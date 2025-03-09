import { nanoid } from 'nanoid';
import { createEmptyBoard } from './utils.js';
import { Player } from './Player.js';

export class Sessions {
    constructor() {
        this.session = {}; 
    }

    createSession(socket, io) {
        const roomId = nanoid(6);
        const boardId = nanoid(10);
        const boardState = createEmptyBoard(15, 15);

        this.session[roomId] = {
            boardId,
            players: {},  
            boardState
        };

        const player = new Player(this.getRandomColor(roomId));
        this.session[roomId].players[socket.id] = player;
        socket.join(roomId);
        socket.emit('createBoard', boardState);
        console.log(`Sessão ${roomId} criada!`);

        return roomId;
    }

    addPlayerToSession(socket, io, roomId) {
        const session = this.session[roomId];

        if (!session) {
            socket.emit('error', "Sala não encontrada!");
            return;
        }

        if (Object.keys(session.players).length >= 4) {
            socket.emit('error', "Sala cheia!");
            return;
        }

        const player = new Player(this.getRandomColor(roomId));
        this.session[roomId].players[socket.id] = player;
        socket.join(roomId);
        console.log(this.session[roomId].players);

        socket.emit('createBoard', this.session[roomId].boardState);
        
    }

    applyTextureToBoard(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) return false;

        if (Object.keys(session.players).length < 4){
            console.log('Não é possível adicionar uma textura enquanto não existir 4 jogadores.')
            return false;
        }
    
        const { row, col, textureFile } = payload;
        const hex = session.boardState[row][col];

        if (!hex) return false;

        hex.textureFile = textureFile;
        hex.hasTexture = true;

        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        return true;
    }

    getRoomIdBySocketId(socketId) {
        return Object.keys(this.session).find(roomId => this.session[roomId].players[socketId]);
    }

    getRandomColor(roomId) {
        const session = this.session[roomId];

        if (!session) {
            return ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)];
        }

        const usedColors = Object.values(session.players).map(player => player.color);
        const availableColors = ['red', 'blue', 'green', 'yellow'].filter(color => !usedColors.includes(color));

        return availableColors.length > 0 
            ? availableColors[Math.floor(Math.random() * availableColors.length)]
            : null; 
    }
}
