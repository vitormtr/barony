import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new socketIo(server);

app.use(express.static(path.join(__dirname, '../client')));

app.use('/', routes);

io.on('connection', (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);

    socket.on('createRoom', () => {
        const roomId = nanoid(6);
        socket.join(roomId);  
        console.log(`Sala criada com ID: ${roomId}`);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        const rooms = io.sockets.adapter.rooms;
        if (rooms.has(roomId)) {
            socket.join(roomId);
            console.log(`Jogador ${socket.id} entrou na sala ${roomId}`);
            io.to(roomId).emit('playerJoined', roomId);
        } else {
            socket.emit('error', "Sala não encontrada!");
        }
    });
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
