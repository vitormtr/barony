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
            boardState,
            playerOnTurn: {}
        };

        const player = new Player(this.getRandomColor(roomId), socket.id);
        this.session[roomId].players[socket.id] = player;
        this.session[roomId].playerOnTurn = player;
        socket.join(roomId);
        socket.emit('createBoard', boardState);
        console.log(`Sessão ${roomId} criada!`);
        socket.emit('drawPlayers', this.session[roomId].players);

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

        const player = new Player(this.getRandomColor(roomId), socket.id);
        this.session[roomId].players[socket.id] = player;
        socket.join(roomId);
        socket.emit('createBoard', this.session[roomId].boardState);
        socket.emit('drawPlayers', this.session[roomId].players);
    }

    applyTextureToBoard(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) return false;

        // if (Object.keys(session.players).length < 4){
            // console.log('Não é possível adicionar uma textura enquanto não existir 4 jogadores.')
            // return false;
        // }
        const { row, col, texture } = payload;

        //textura é um png, necessario entao remover o .png para decrementar do jogador
        let textureType = texture.replace(".png", "");
        console.log(this.session[roomId].players[socket.id].hexCount[textureType]);
        if (this.session[roomId].players[socket.id].hexCount[textureType] > 0 && this.session[roomId].playerOnTurn === this.session[roomId].players[socket.id]){
            const hex = session.boardState[row][col];
            hex.texture = texture;

            //decrementa quantidade da textura posicionada do jogador
            this.session[roomId].players[socket.id].hexCount[textureType]--;

            io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
            io.to(roomId).emit('updatePlayerPieces', this.session[roomId].players[socket.id]);
            //proximo jogador no turno
            const playersList = Object.values(this.session[roomId].players);
            const currentIndex = playersList.indexOf(this.session[roomId].playerOnTurn);
            const nextIndex = (currentIndex + 1) % playersList.length;
            this.session[roomId].playerOnTurn = playersList[nextIndex];
            
            return true;
        } 

        return false;
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

    getPlayersInRoom(roomId) {
        const session = this.session[roomId];
        return session ? Object.values(session.players) : [];
    }

    getPlayer(socketId) {
        const roomId = this.getRoomIdBySocketId(socketId);
        const session = this.session[roomId];
        console.log(session.players[socketId])
        return session ? session.players[socketId] : null;
    }
}