// Save game manager - stores and loads game states to JSON files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAVES_DIR = path.join(__dirname, '..', 'saves');

// Ensure saves directory exists
function ensureSavesDir() {
    if (!fs.existsSync(SAVES_DIR)) {
        fs.mkdirSync(SAVES_DIR, { recursive: true });
    }
}

// Generate save filename with timestamp
function generateSaveFilename(roomId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `save_${roomId}_${timestamp}.json`;
}

// Save game state to file
export function saveGame(session, roomId) {
    ensureSavesDir();

    const saveData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        roomId: roomId,
        boardId: session.boardId,
        gamePhase: session.gamePhase,
        gameStarted: session.gameStarted,
        lockedForEntry: session.lockedForEntry,
        boardState: session.boardState,
        players: serializePlayers(session.players),
        playerOnTurnColor: session.playerOnTurn?.color || null,
        initialPlacementState: session.initialPlacementState,
        // Game ending state
        gameEnding: session.gameEnding || false,
        dukePlayerId: session.dukePlayerId || null,
        finalRoundStartPlayerId: session.finalRoundStartPlayerId || null
    };

    const filename = generateSaveFilename(roomId);
    const filepath = path.join(SAVES_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(saveData, null, 2));

    console.log(`Game saved to ${filename}`);
    console.log(`  playerOnTurnColor: ${saveData.playerOnTurnColor}`);

    return {
        success: true,
        filename,
        savedAt: saveData.savedAt
    };
}

// Serialize players object (convert Player instances to plain objects)
function serializePlayers(players) {
    const serialized = {};
    for (const [id, player] of Object.entries(players)) {
        serialized[id] = {
            id: player.id,
            color: player.color,
            image: player.image,
            hexCount: player.hexCount,
            pieces: player.pieces,
            resources: player.resources,
            title: player.title,
            victoryPoints: player.victoryPoints
        };
    }
    return serialized;
}

// List available save files
export function listSaves() {
    ensureSavesDir();

    const files = fs.readdirSync(SAVES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(filename => {
            const filepath = path.join(SAVES_DIR, filename);
            const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            return {
                filename,
                savedAt: content.savedAt,
                roomId: content.roomId,
                gamePhase: content.gamePhase,
                playerCount: Object.keys(content.players).length,
                playerColors: Object.values(content.players).map(p => p.color)
            };
        })
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)); // Most recent first

    return files;
}

// Load game state from file
export function loadGame(filename) {
    ensureSavesDir();

    const filepath = path.join(SAVES_DIR, filename);

    if (!fs.existsSync(filepath)) {
        return { success: false, message: 'Save file not found' };
    }

    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const saveData = JSON.parse(content);

        return {
            success: true,
            data: saveData
        };
    } catch (error) {
        console.error('Error loading save:', error);
        return { success: false, message: 'Error reading save file' };
    }
}

// Delete a save file
export function deleteSave(filename) {
    ensureSavesDir();

    const filepath = path.join(SAVES_DIR, filename);

    if (!fs.existsSync(filepath)) {
        return { success: false, message: 'Save file not found' };
    }

    try {
        fs.unlinkSync(filepath);
        return { success: true };
    } catch (error) {
        console.error('Error deleting save:', error);
        return { success: false, message: 'Error deleting save file' };
    }
}
