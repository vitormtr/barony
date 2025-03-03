import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js'; 
import { handleSocketEvents } from './socketEvents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new socketIo(server);

app.use(express.static(path.join(__dirname, '../client')));

app.use('/', routes);

io.on('connection', (socket) => {
    handleSocketEvents(socket, io);  
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
