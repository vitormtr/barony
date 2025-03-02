import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import { nanoid } from 'nanoid';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new socketIo(server);

const rooms = {}; 

app.use(express.static(path.join(process.cwd(), 'client')));


app.get('/', (req, res) => {
    res.sendFile(path.resolve("./client/index.html"));
});


app.get('/game', (req, res) => {
    const roomId = nanoid(6); 
    res.redirect(`/game/${roomId}`);
});

app.get('/game/:roomId', (req, res) => {
    res.sendFile(path.resolve("./client/index.html"));
});

io.on('connection', (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);

    socket.on('joinRoom', (roomId) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Sala não encontrada!');
            return;
        }

        socket.join(roomId);
        rooms[roomId].players.push(socket.id);
        console.log(`Jogador ${socket.id} entrou na sala ${roomId}`);

        io.to(roomId).emit('playerJoined', rooms[roomId].players);
    });

    socket.on('playerMove', ({ roomId, move }) => {
        if (rooms[roomId]) {
            console.log(`Jogada recebida na sala ${roomId}:`, move);
            io.to(roomId).emit('updateGame', move);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
            io.to(roomId).emit('playerLeft', socket.id);
        }
        console.log(`Jogador ${socket.id} desconectou`);
    });
});


server.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
