import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

//página inicial
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/home.html'));
});

//página do tabuleiro
router.get('/board.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/barony-board.html'));
});

export default router;
