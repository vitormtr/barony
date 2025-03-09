import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sessions } from './Sessions.js';
import { handleSocketEvents } from './serverSocketEvents.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new socketIo(server); 
const sessionManager = new Sessions(); 
const router = express.Router();

app.use(express.static(path.join(__dirname, '../client')));
app.use(router);

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/home.html'));
});

io.on('connection', (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);
    handleSocketEvents(socket, io, sessionManager);  
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
