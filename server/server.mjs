import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sessions } from './Sessions.js'; 
import { handleSocketEvents } from './ServerSocketEvents.js';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIO(this.server, this.getSocketConfig());
    this.sessionManager = new Sessions();
    
    this.setupPaths();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureSocket();
  }

  getSocketConfig() {
    return {
      cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST']
      },
      connectionStateRecovery: config.SOCKET_RECOVERY
    };
  }

  setupPaths() {
    this.clientPath = path.join(__dirname, '../client');
    this.homePage = path.join(this.clientPath, 'home.html');
  }

  configureMiddleware() {
    // Serve arquivos estáticos com charset UTF-8
    this.app.use(express.static(this.clientPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.set('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
          res.set('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.html')) {
          res.set('Content-Type', 'text/html; charset=utf-8');
        }
      }
    }));
    this.app.use(express.json());
    this.app.use(this.securityHeaders);
  }

  securityHeaders(req, res, next) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    next();
  }

  configureRoutes() {
    this.app.get('/', (req, res) => {
      res.sendFile(this.homePage);
    });

    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
  }

  configureSocket() {
    this.io.on('connection', socket => {
      console.log(`New connection: ${socket.id}`);
      handleSocketEvents(socket, this.io, this.sessionManager);
      
      socket.on('error', error => {
        console.error(`Socket error (${socket.id}):`, error);
      });
    });
  }

  start() {
    this.server.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });

    this.server.on('error', error => {
      console.error('Server error:', error);
      process.exit(1);
    });
  }
}

const gameServer = new GameServer();
gameServer.start();