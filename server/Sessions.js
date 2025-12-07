import { nanoid } from 'nanoid';
import { createEmptyBoard } from './utils.js';
import { Player } from './Player.js';
import {
    DIRECTION_MAP,
    GAME_PHASES,
    TEXTURES,
    CITY_VALID_TERRAINS,
    KNIGHT_VALID_TERRAINS,
    PLAYER_COLORS
} from './constants.js';
import * as BoardLogic from './BoardLogic.js';

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
            playerOnTurn: {},
            gamePhase: GAME_PHASES.WAITING,
            gameStarted: false,
            leaderId: socket.id,  // Leader is the room creator
            lockedForEntry: false, // Block entry after random distribution
            // Phase 2: initial placement
            initialPlacementState: {
                round: 0,           // 0 = first round, 1 = second round (reverse order)
                turnOrder: [],      // Normal player order
                currentTurnIndex: 0,
                placementStep: null,// 'city' or 'knights'
                knightsPlaced: 0,   // Knights placed this turn
                cityPosition: null  // Current city position for knight adjacency validation
            }
        };

        const player = new Player(socket.id, this.getRandomColor(roomId));
        this.session[roomId].players[socket.id] = player;
        this.session[roomId].playerOnTurn = player;
        socket.join(roomId);
        socket.emit('createBoard', boardState);
        console.log(`Session ${roomId} created! Leader: ${socket.id}`);
        socket.emit('drawPlayers', this.session[roomId].players);

        // Send initial turn info
        socket.emit('turnChanged', {
            currentPlayerId: player.id,
            currentPlayerColor: player.color
        });

        return roomId;
    }

    // Check if player is the room leader
    isLeader(socketId, roomId) {
        const session = this.session[roomId];
        return session && session.leaderId === socketId;
    }

    // Distribute textures randomly on the board
    randomDistribution(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        // Apenas o líder pode fazer isso
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Only the room leader can do this!' };
        }

        // Cannot do if game already started manually
        if (session.gameStarted && session.gamePhase !== GAME_PHASES.WAITING) {
            return { success: false, message: 'Game already in progress!' };
        }

        const players = Object.values(session.players);
        if (players.length < 4) {
            return { success: false, message: '4 players required to start the game!' };
        }

        // Block new player entries
        session.lockedForEntry = true;
        session.gameStarted = true;
        session.gamePhase = GAME_PHASES.PLACEMENT;

        // Calcula total de texturas de todos os jogadores
        let allTextures = [];
        players.forEach(player => {
            Object.entries(player.hexCount).forEach(([textureType, count]) => {
                for (let i = 0; i < count; i++) {
                    allTextures.push(`${textureType}.png`);
                }
            });
        });

        // Shuffle textures
        this.shuffleArray(allTextures);

        // Find valid positions to place (starting from center)
        const centerRow = Math.floor(session.boardState.length / 2);
        const centerCol = Math.floor(session.boardState[0].length / 2);

        // Coloca a primeira textura no centro
        if (allTextures.length > 0) {
            session.boardState[centerRow][centerCol].texture = allTextures.shift();
        }

        // Usa BFS para expandir a partir do centro
        const placed = new Set([`${centerRow},${centerCol}`]);
        const queue = [[centerRow, centerCol]];

        while (allTextures.length > 0 && queue.length > 0) {
            const [row, col] = queue.shift();
            const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

            // Shuffle directions for more randomness
            this.shuffleArray(directions);

            for (const [dRow, dCol] of directions) {
                if (allTextures.length === 0) break;

                const newRow = row + dRow;
                const newCol = col + dCol;
                const key = `${newRow},${newCol}`;

                // Check if within bounds and not used
                if (newRow >= 0 && newRow < session.boardState.length &&
                    newCol >= 0 && newCol < session.boardState[0].length &&
                    !placed.has(key)) {

                    session.boardState[newRow][newCol].texture = allTextures.shift();
                    placed.add(key);
                    queue.push([newRow, newCol]);
                }
            }
        }

        // Zera as texturas de todos os jogadores
        players.forEach(player => {
            Object.keys(player.hexCount).forEach(key => {
                player.hexCount[key] = 0;
            });
        });

        // Notify all players
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', players);
        io.to(roomId).emit('randomDistributionComplete', {
            message: 'Textures distributed randomly!',
            lockedForEntry: true
        });

        console.log(`Random distribution in room ${roomId}. Entry blocked.`);

        // Start initial placement phase (place cities and knights)
        this.startInitialPlacement(roomId, io);

        return { success: true, message: 'Textures distributed successfully!' };
    }

    // [TEST] Place pieces randomly and start battle phase
    skipToBattlePhase(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        // Apenas o líder pode fazer isso
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Only the leader can do this!' };
        }

        const players = Object.values(session.players);
        if (players.length < 2) {
            return { success: false, message: 'Need at least 2 players!' };
        }

        // First do texture distribution if not done yet
        if (session.gamePhase === GAME_PHASES.WAITING) {
            // Force distribution with fewer players for testing
            session.lockedForEntry = true;
            session.gameStarted = true;

            // Calculate total textures from all players
            let allTextures = [];
            players.forEach(player => {
                Object.entries(player.hexCount).forEach(([textureType, count]) => {
                    for (let i = 0; i < count; i++) {
                        allTextures.push(`${textureType}.png`);
                    }
                });
            });

            // Shuffle textures
            this.shuffleArray(allTextures);

            // Find valid positions (starting from center)
            const centerRow = Math.floor(session.boardState.length / 2);
            const centerCol = Math.floor(session.boardState[0].length / 2);

            // Place first texture in center
            if (allTextures.length > 0) {
                session.boardState[centerRow][centerCol].texture = allTextures.shift();
            }

            // Use BFS to expand from center
            const placed = new Set([`${centerRow},${centerCol}`]);
            const queue = [[centerRow, centerCol]];

            while (allTextures.length > 0 && queue.length > 0) {
                const [row, col] = queue.shift();
                const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;
                this.shuffleArray(directions);

                for (const [dRow, dCol] of directions) {
                    if (allTextures.length === 0) break;

                    const newRow = row + dRow;
                    const newCol = col + dCol;
                    const key = `${newRow},${newCol}`;

                    if (newRow >= 0 && newRow < session.boardState.length &&
                        newCol >= 0 && newCol < session.boardState[0].length &&
                        !placed.has(key)) {
                        session.boardState[newRow][newCol].texture = allTextures.shift();
                        placed.add(key);
                        queue.push([newRow, newCol]);
                    }
                }
            }

            // Reset all players' textures
            players.forEach(player => {
                Object.keys(player.hexCount).forEach(key => {
                    player.hexCount[key] = 0;
                });
            });
        }

        // Find valid hexes for cities (plain/field without pieces)
        const validCityHexes = [];
        for (let row = 0; row < session.boardState.length; row++) {
            for (let col = 0; col < session.boardState[row].length; col++) {
                const hex = session.boardState[row][col];
                if (CITY_VALID_TERRAINS.includes(hex.texture) && (!hex.pieces || hex.pieces.length === 0)) {
                    validCityHexes.push({ row, col });
                }
            }
        }

        this.shuffleArray(validCityHexes);

        // Place 3 cities + 3 knights for each player
        const citiesPerPlayer = 3;
        let hexIndex = 0;

        for (const player of players) {
            for (let i = 0; i < citiesPerPlayer && hexIndex < validCityHexes.length; i++) {
                const { row, col } = validCityHexes[hexIndex++];
                const hex = session.boardState[row][col];

                if (!hex.pieces) hex.pieces = [];

                // Place city
                hex.pieces.push({
                    type: 'city',
                    owner: player.id,
                    color: player.color
                });
                player.pieces.city--;

                // Place knight alongside
                hex.pieces.push({
                    type: 'knight',
                    owner: player.id,
                    color: player.color
                });
                player.pieces.knight--;
            }
        }

        // Start battle phase
        session.gamePhase = GAME_PHASES.BATTLE;
        session.playerOnTurn = players[0];

        // Notifica todos
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', players);
        io.to(roomId).emit('phaseChanged', { phase: 'battle' });
        io.to(roomId).emit('initialPlacementComplete', {
            message: '[TEST] Pieces placed! Battle phase started!'
        });
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        console.log(`[TEST] Skip to battle phase in room ${roomId}`);
        return { success: true, message: 'Pieces placed randomly!' };
    }

    // Start initial placement phase
    // Barony rules: special order - players 1,2,3 place 1 city, player 4 places 3, then back 3,2,1 placing 2 more each
    // Knight is placed automatically with the city
    startInitialPlacement(roomId, io) {
        const session = this.session[roomId];
        if (!session) return;

        session.gamePhase = GAME_PHASES.INITIAL_PLACEMENT;

        // Define player order (4 players)
        const players = Object.values(session.players);
        const playerIds = players.map(p => p.id);

        // Placement order:
        // Phase 1: player 0 (1x), player 1 (1x), player 2 (1x), player 3 (3x)
        // Phase 2: player 2 (2x), player 1 (2x), player 0 (2x)
        // Total per player: 3 cities each
        const placementSequence = [
            { playerId: playerIds[0], citiesToPlace: 1 },  // Player 1: 1 city
            { playerId: playerIds[1], citiesToPlace: 1 },  // Player 2: 1 city
            { playerId: playerIds[2], citiesToPlace: 1 },  // Player 3: 1 city
            { playerId: playerIds[3], citiesToPlace: 3 },  // Player 4: 3 cities
            { playerId: playerIds[2], citiesToPlace: 2 },  // Player 3: +2 cities
            { playerId: playerIds[1], citiesToPlace: 2 },  // Player 2: +2 cities
            { playerId: playerIds[0], citiesToPlace: 2 },  // Player 1: +2 cities
        ];

        session.initialPlacementState = {
            placementSequence,
            currentSequenceIndex: 0,
            citiesPlacedInTurn: 0,      // Cities placed in current turn
        };

        // Define o primeiro jogador
        const firstTurn = placementSequence[0];
        session.playerOnTurn = session.players[firstTurn.playerId];

        io.to(roomId).emit('phaseChanged', {
            phase: 'initialPlacement'
        });

        // Include turn data in start event to process after transition
        io.to(roomId).emit('initialPlacementStarted', {
            message: 'Initial placement phase! Place your city.',
            currentStep: 'city',
            citiesRemaining: firstTurn.citiesToPlace,
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        console.log(`Initial placement phase started in room ${roomId}`);
    }

    // Place a city on the board (knight is added automatically)
    placePiece(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room not found!' };
        }

        if (session.gamePhase !== GAME_PHASES.INITIAL_PLACEMENT) {
            return { success: false, error: 'WRONG_PHASE', message: 'Not in placement phase!' };
        }

        const { row, col } = payload;
        const player = session.players[socket.id];
        const state = session.initialPlacementState;
        const currentTurn = state.placementSequence[state.currentSequenceIndex];

        // Validação: é o turno do jogador?
        if (currentTurn.playerId !== socket.id) {
            return { success: false, error: 'NOT_YOUR_TURN', message: 'Not your turn!' };
        }

        // Validation: does player have a city available?
        if (player.pieces.city <= 0) {
            return { success: false, error: 'NO_PIECES', message: 'No more cities available!' };
        }

        // Validation: does player have a knight available?
        if (player.pieces.knight <= 0) {
            return { success: false, error: 'NO_PIECES', message: 'No more knights available!' };
        }

        // Validation: hex exists and has texture
        const hex = session.boardState[row]?.[col];
        if (!hex || !hex.texture) {
            return { success: false, error: 'INVALID_HEX', message: 'Invalid hex!' };
        }

        // Validation: hex is not occupied
        if (hex.pieces && hex.pieces.length > 0) {
            return { success: false, error: 'HEX_OCCUPIED', message: 'This hex is already occupied!' };
        }

        // Validation: valid terrain for city (only plain and field)
        if (!CITY_VALID_TERRAINS.includes(hex.texture)) {
            return { success: false, error: 'INVALID_TERRAIN', message: 'Cities can only be placed on plains or fields!' };
        }

        // Validation: city cannot be adjacent to another city
        if (this.isAdjacentToCity(session.boardState, row, col)) {
            return { success: false, error: 'ADJACENT_TO_CITY', message: 'Cities cannot be placed adjacent to other cities!' };
        }

        // Initialize pieces array
        hex.pieces = [];

        // Place the city
        hex.pieces.push({
            type: 'city',
            owner: socket.id,
            color: player.color
        });
        player.pieces.city--;

        // Place knight automatically on the same hex
        hex.pieces.push({
            type: 'knight',
            owner: socket.id,
            color: player.color
        });
        player.pieces.knight--;

        // Update city count placed this turn
        state.citiesPlacedInTurn++;

        io.to(roomId).emit('piecePlaced', {
            row, col, pieceType: 'city', playerId: socket.id, playerColor: player.color
        });
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', Object.values(session.players));

        // Check if player finished their turn
        if (state.citiesPlacedInTurn >= currentTurn.citiesToPlace) {
            // Move to next in sequence
            return this.advanceInitialPlacement(roomId, io);
        } else {
            // Still need to place more cities this turn
            const remaining = currentTurn.citiesToPlace - state.citiesPlacedInTurn;
            io.to(roomId).emit('initialPlacementUpdate', {
                message: `City placed! Place ${remaining} more city(ies).`,
                currentStep: 'city',
                citiesRemaining: remaining
            });
            return { success: true, citiesRemaining: remaining };
        }
    }

    // Advance to next player in initial placement
    advanceInitialPlacement(roomId, io) {
        const session = this.session[roomId];
        const state = session.initialPlacementState;

        state.currentSequenceIndex++;
        state.citiesPlacedInTurn = 0;

        // Check if sequence ended
        if (state.currentSequenceIndex >= state.placementSequence.length) {
            // Finished initial placement phase
            return this.endInitialPlacement(roomId, io);
        }

        // Next in sequence
        const nextTurn = state.placementSequence[state.currentSequenceIndex];
        session.playerOnTurn = session.players[nextTurn.playerId];

        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        io.to(roomId).emit('initialPlacementUpdate', {
            message: `Your turn! Place ${nextTurn.citiesToPlace} city(ies).`,
            currentStep: 'city',
            citiesRemaining: nextTurn.citiesToPlace
        });

        return { success: true, citiesRemaining: nextTurn.citiesToPlace };
    }

    // Finalize initial placement phase and start battle
    endInitialPlacement(roomId, io) {
        const session = this.session[roomId];

        session.gamePhase = GAME_PHASES.BATTLE;

        // Define first player for battle phase (the leader)
        const leaderPlayer = session.players[session.leaderId];
        session.playerOnTurn = leaderPlayer || Object.values(session.players)[0];

        io.to(roomId).emit('phaseChanged', { phase: 'battle' });
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });
        io.to(roomId).emit('initialPlacementComplete', {
            message: 'Initial placement complete! Starting battle phase!'
        });

        console.log(`Initial placement phase complete in room ${roomId}. Starting battle.`);

        return { success: true, phaseComplete: true };
    }

    // ========== BATTLE PHASE ACTIONS ==========

    // Process a battle action
    battleAction(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        if (session.gamePhase !== GAME_PHASES.BATTLE) {
            return { success: false, message: 'Not in battle phase!' };
        }

        const player = session.players[socket.id];
        if (session.playerOnTurn.id !== socket.id) {
            return { success: false, message: 'Not your turn!' };
        }

        const { action } = payload;

        switch (action) {
            case 'recruitment':
                return this.actionRecruitment(session, player, payload, io, roomId);
            case 'movement':
                return this.actionMovement(session, player, payload, io, roomId);
            case 'construction':
                return this.actionConstruction(session, player, payload, io, roomId);
            case 'newCity':
                return this.actionNewCity(session, player, payload, io, roomId);
            case 'expedition':
                return this.actionExpedition(session, player, payload, io, roomId);
            case 'nobleTitle':
                return this.actionNobleTitle(session, player, payload, io, roomId);
            default:
                return { success: false, message: 'Invalid action!' };
        }
    }

    // RECRUITMENT: Add 2 knights to a city (3 if adjacent to lake)
    actionRecruitment(session, player, payload, io, roomId) {
        const { row, col } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Invalid hex!' };
        }

        // Check if player has a city
        const hasCity = hex.pieces?.some(p => p.type === 'city' && p.color === player.color);
        if (!hasCity) {
            return { success: false, message: 'Select one of your cities!' };
        }

        // Check if adjacent to water (lake)
        const adjacentToWater = this.isAdjacentToWater(session.boardState, row, col);
        const knightsToAdd = adjacentToWater ? 3 : 2;

        // Check if enough knights available
        if (player.pieces.knight < knightsToAdd) {
            return { success: false, message: `You don't have ${knightsToAdd} knights available!` };
        }

        // Add knights
        for (let i = 0; i < knightsToAdd; i++) {
            hex.pieces.push({
                type: 'knight',
                owner: player.id,
                color: player.color
            });
            player.pieces.knight--;
        }

        this.emitBoardUpdate(session, io, roomId);

        return {
            success: true,
            message: `${knightsToAdd} knights recruited!${adjacentToWater ? ' (Lake bonus!)' : ''}`
        };
    }

    // MOVEMENT: Move a knight to adjacent hex (with combat)
    actionMovement(session, player, payload, io, roomId) {
        const { from, to } = payload;
        const fromHex = session.boardState[from.row]?.[from.col];
        const toHex = session.boardState[to.row]?.[to.col];

        if (!fromHex || !toHex) {
            return { success: false, message: 'Invalid hex!' };
        }

        // Check if player has knight in source hex
        const knightIndex = fromHex.pieces?.findIndex(p => p.type === 'knight' && p.color === player.color);
        if (knightIndex === -1 || knightIndex === undefined) {
            return { success: false, message: 'No knight of yours in this hex!' };
        }

        // Check adjacency
        if (!this.isAdjacentToPosition(from.row, from.col, to.row, to.col)) {
            return { success: false, message: 'Destination must be adjacent!' };
        }

        // Check if destination has texture and is not water
        if (!toHex.texture || toHex.texture === 'water.png') {
            return { success: false, message: 'Cannot move to water or empty hex!' };
        }

        const toPieces = toHex.pieces || [];

        // Check for enemy city (inaccessible)
        const hasEnemyCity = toPieces.some(p => p.type === 'city' && p.color !== player.color);
        if (hasEnemyCity) {
            return { success: false, message: 'Cannot enter enemy city!' };
        }

        // Check for enemy stronghold (inaccessible)
        const hasEnemyStronghold = toPieces.some(p => p.type === 'stronghold' && p.color !== player.color);
        if (hasEnemyStronghold) {
            return { success: false, message: 'Cannot enter enemy stronghold!' };
        }

        // Count enemy knights at destination
        const enemyKnights = toPieces.filter(p => p.type === 'knight' && p.color !== player.color);

        // Check for 2+ enemy knights (cannot enter)
        if (enemyKnights.length >= 2) {
            return { success: false, message: 'Cannot enter hex with 2+ enemy knights!' };
        }

        // Check mountain with any enemy piece
        if (toHex.texture === 'mountain.png') {
            const hasAnyEnemyPiece = toPieces.some(p => p.color !== player.color);
            if (hasAnyEnemyPiece) {
                return { success: false, message: 'Cannot enter mountain occupied by enemy!' };
            }
        }

        // Move the knight
        const knight = fromHex.pieces.splice(knightIndex, 1)[0];
        if (!toHex.pieces) toHex.pieces = [];
        toHex.pieces.push(knight);

        // Process combat after movement
        const combatResult = this.processCombat(session, player, toHex, to.row, to.col);

        this.emitBoardUpdate(session, io, roomId);

        let message = 'Knight moved!';
        if (combatResult.occurred) {
            message = combatResult.message;
        }

        return { success: true, message };
    }

    // Process combat in hex
    processCombat(session, player, hex, row, col) {
        const pieces = hex.pieces || [];

        // Count current player's pieces
        const playerKnights = pieces.filter(p => p.type === 'knight' && p.color === player.color);

        // Find enemy pieces
        const enemyPieces = pieces.filter(p => p.color !== player.color);

        if (enemyPieces.length === 0) {
            return { occurred: false };
        }

        // Player knights vs enemy pieces
        const playerKnightCount = playerKnights.length;

        // Check enemy villages (need 2 knights to destroy)
        const enemyVillages = enemyPieces.filter(p => p.type === 'village');
        const enemyKnights = enemyPieces.filter(p => p.type === 'knight');

        let destroyed = [];
        let resourceGained = null;

        // Combat against villages: 2 knights destroy 1 village
        if (playerKnightCount >= 2 && enemyVillages.length > 0) {
            const village = enemyVillages[0];
            const villageIndex = hex.pieces.findIndex(p => p === village);
            if (villageIndex !== -1) {
                hex.pieces.splice(villageIndex, 1);
                destroyed.push('village');

                // Return village to owner
                const villageOwner = Object.values(session.players).find(p => p.color === village.color);
                if (villageOwner) {
                    villageOwner.pieces.village++;
                }

                // Attacker gains terrain resource
                resourceGained = player.addResource(hex.texture);
            }
        }

        // Combat against knights: numerical superiority destroys
        // 2+ player knights destroy enemy knights (1 at a time per movement)
        if (playerKnightCount >= 2 && enemyKnights.length > 0) {
            // Peaceful coexistence: 1 vs 1 no combat
            // With 2+ knights, destroy enemy knight
            const enemyKnight = enemyKnights[0];
            const enemyKnightIndex = hex.pieces.findIndex(p => p === enemyKnight);
            if (enemyKnightIndex !== -1) {
                hex.pieces.splice(enemyKnightIndex, 1);
                destroyed.push('knight');

                // Return knight to owner
                const knightOwner = Object.values(session.players).find(p => p.color === enemyKnight.color);
                if (knightOwner) {
                    knightOwner.pieces.knight++;
                }
            }
        }

        if (destroyed.length > 0) {
            let message = `Combat! Destroyed: ${destroyed.join(', ')}`;
            if (resourceGained) {
                message += ` (+1 ${this.getResourceName(resourceGained)})`;
            }
            return { occurred: true, message, destroyed, resourceGained };
        }

        return { occurred: false };
    }

    // CONSTRUCTION: Replace knight with village or stronghold
    actionConstruction(session, player, payload, io, roomId) {
        const { row, col, buildType } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Invalid hex!' };
        }

        // Check if player has knight
        const knightIndex = hex.pieces?.findIndex(p => p.type === 'knight' && p.color === player.color);
        if (knightIndex === -1 || knightIndex === undefined) {
            return { success: false, message: 'No knight of yours in this hex!' };
        }

        // Check if structure already exists
        const hasStructure = hex.pieces?.some(p => ['city', 'stronghold', 'village'].includes(p.type));
        if (hasStructure) {
            return { success: false, message: 'A structure already exists in this hex!' };
        }

        // Check for enemy knight (cannot build)
        const hasEnemyKnight = hex.pieces?.some(p => p.type === 'knight' && p.color !== player.color);
        if (hasEnemyKnight) {
            return { success: false, message: 'Cannot build with enemy knight present!' };
        }

        // Check available pieces
        if (buildType === 'village' && player.pieces.village <= 0) {
            return { success: false, message: 'No villages available!' };
        }
        if (buildType === 'stronghold' && player.pieces.stronghold <= 0) {
            return { success: false, message: 'No strongholds available!' };
        }

        // Terrain validation for stronghold (any terrain except water)
        if (buildType === 'stronghold') {
            if (!hex.texture || hex.texture === 'water.png') {
                return { success: false, message: 'Strongholds cannot be built on water!' };
            }
        }

        // Remove knight (returns to reserve)
        hex.pieces.splice(knightIndex, 1);
        player.pieces.knight++;

        // Add structure
        hex.pieces.push({
            type: buildType,
            owner: player.id,
            color: player.color
        });
        player.pieces[buildType]--;

        // Gain resource corresponding to terrain
        const resource = player.addResource(hex.texture);

        this.emitBoardUpdate(session, io, roomId);

        const resourceName = resource ? this.getResourceName(resource) : '';
        return {
            success: true,
            message: `${buildType === 'village' ? 'Village' : 'Stronghold'} built!${resource ? ` +1 ${resourceName}` : ''}`
        };
    }

    // NEW CITY: Replace village with city
    actionNewCity(session, player, payload, io, roomId) {
        const { row, col } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Invalid hex!' };
        }

        // Check if player has village
        const villageIndex = hex.pieces?.findIndex(p => p.type === 'village' && p.color === player.color);
        if (villageIndex === -1 || villageIndex === undefined) {
            return { success: false, message: 'No village of yours in this hex!' };
        }

        // Check if city available
        if (player.pieces.city <= 0) {
            return { success: false, message: 'No cities available!' };
        }

        // Check not forest (city cannot be in forest)
        if (hex.texture === 'forest.png') {
            return { success: false, message: 'Cities cannot be built in forest!' };
        }

        // Check no adjacent city (from any player)
        if (this.hasAdjacentCity(session.boardState, row, col)) {
            return { success: false, message: 'Cannot build city adjacent to another city!' };
        }

        // Remove village (returns to reserve)
        hex.pieces.splice(villageIndex, 1);
        player.pieces.village++;

        // Add city
        hex.pieces.push({
            type: 'city',
            owner: player.id,
            color: player.color
        });
        player.pieces.city--;

        // Gain 10 victory points
        player.addVictoryPoints(10);

        // Verifica condição de vitória
        const victoryResult = this.checkVictoryCondition(session, player, io, roomId);

        this.emitBoardUpdate(session, io, roomId);

        let message = 'New city founded! +10 victory points!';
        if (victoryResult) {
            message += ' ' + victoryResult;
        }

        return { success: true, message };
    }

    // Check if there's an adjacent city
    hasAdjacentCity(boardState, row, col) {
        const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (newRow >= 0 && newRow < boardState.length &&
                newCol >= 0 && newCol < boardState[0].length) {
                const neighbor = boardState[newRow][newCol];
                if (neighbor.pieces?.some(p => p.type === 'city')) {
                    return true;
                }
            }
        }
        return false;
    }

    // EXPEDITION: Place knight on board edge
    actionExpedition(session, player, payload, io, roomId) {
        const { row, col } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Invalid hex!' };
        }

        // Check if 2 knights available in reserve
        if (player.pieces.knight < 2) {
            return { success: false, message: 'You need 2 knights in reserve!' };
        }

        // Check if hex has texture and is not water
        if (!hex.texture || hex.texture === 'water.png') {
            return { success: false, message: 'Select a valid hex!' };
        }

        // Check if empty
        if (hex.pieces && hex.pieces.length > 0) {
            return { success: false, message: 'The hex must be empty!' };
        }

        // Check if border
        if (!this.isBorderHex(session.boardState, row, col)) {
            return { success: false, message: 'Select a hex on the board edge!' };
        }

        // Remove 2 knights from reserve, 1 goes back to box (permanently lost)
        player.pieces.knight -= 2;

        // Place 1 knight on board
        if (!hex.pieces) hex.pieces = [];
        hex.pieces.push({
            type: 'knight',
            owner: player.id,
            color: player.color
        });

        this.emitBoardUpdate(session, io, roomId);

        return { success: true, message: 'Expedition complete! 1 knight placed on the edge.' };
    }

    // NOBLE TITLE: Spend 15 resources to advance title
    actionNobleTitle(session, player, payload, io, roomId) {
        const totalResources = player.getTotalResources();

        if (totalResources < 15) {
            return { success: false, message: `Insufficient resources! ${totalResources}/15` };
        }

        if (player.title === 'duke') {
            return { success: false, message: 'You are already Duke!' };
        }

        // Spend 15 resources
        player.spendResources(15);

        // Advance title
        const oldTitle = player.getTitleName();
        player.promoteTitle();
        const newTitle = player.getTitleName();

        // Check victory condition (if became Duke)
        const victoryResult = this.checkVictoryCondition(session, player, io, roomId);

        this.emitBoardUpdate(session, io, roomId);

        let message = `Title elevated from ${oldTitle} to ${newTitle}!`;
        if (victoryResult) {
            message += ' ' + victoryResult;
        }

        return { success: true, message };
    }

    // Check victory condition (someone became Duke)
    checkVictoryCondition(session, player, io, roomId) {
        if (player.title === 'duke' && !session.gameEnding) {
            // Mark that game is ending
            session.gameEnding = true;
            session.dukePlayerId = player.id;

            // Notify all that someone became Duke
            io.to(roomId).emit('dukeAnnounced', {
                playerId: player.id,
                playerColor: player.color,
                message: `${player.color} became Duke! Finishing the round...`
            });

            return 'You became Duke! The game will end at the end of this round.';
        }
        return null;
    }

    // Calculate player's final score
    calculateFinalScore(player) {
        // Accumulated victory points (new cities = 10 points each)
        let score = player.victoryPoints;

        // Points for remaining resources (silver value)
        // Each resource is worth 1 point at the end
        score += player.getTotalResources();

        // Points for title
        const titlePoints = {
            baron: 0,
            viscount: 5,
            count: 10,
            marquis: 15,
            duke: 25
        };
        score += titlePoints[player.title] || 0;

        return score;
    }

    // End game and calculate winner
    endGame(session, io, roomId) {
        session.gamePhase = GAME_PHASES.ENDED;

        const players = Object.values(session.players);
        const scores = players.map(p => ({
            id: p.id,
            color: p.color,
            score: this.calculateFinalScore(p),
            title: p.getTitleName(),
            resources: p.getTotalResources(),
            victoryPoints: p.victoryPoints
        }));

        // Sort by score (highest first)
        scores.sort((a, b) => b.score - a.score);

        // In case of tie, winner is furthest from first player
        // (simplified implementation: maintains current order in case of tie)

        io.to(roomId).emit('gameEnded', {
            scores,
            winner: scores[0],
            message: `Game over! ${scores[0].color} won with ${scores[0].score} points!`
        });

        console.log(`Game ended in room ${roomId}. Winner: ${scores[0].color}`);

        return scores;
    }

    // Pass turn to next player
    endTurn(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) return;

        if (session.playerOnTurn.id !== socket.id) return;

        const players = Object.values(session.players);
        const currentIndex = players.findIndex(p => p.id === socket.id);
        const nextIndex = (currentIndex + 1) % players.length;

        // Check if round ended (returned to first player) and game is ending
        if (session.gameEnding && nextIndex === 0) {
            // All played, end game
            this.endGame(session, io, roomId);
            return;
        }

        session.playerOnTurn = players[nextIndex];

        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        io.to(roomId).emit('drawPlayers', players);
    }

    // Utilities - delegating to BoardLogic module
    isAdjacentToWater(boardState, row, col) {
        return BoardLogic.isAdjacentToWater(boardState, row, col);
    }

    isBorderHex(boardState, row, col) {
        return BoardLogic.isBorderHex(boardState, row, col);
    }

    getResourceName(resource) {
        return BoardLogic.getResourceName(resource);
    }

    emitBoardUpdate(session, io, roomId) {
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', Object.values(session.players));
    }

    isAdjacentToPosition(row1, col1, row2, col2) {
        return BoardLogic.isAdjacentToPosition(row1, col1, row2, col2);
    }

    isAdjacentToCity(boardState, row, col) {
        return BoardLogic.isAdjacentToCity(boardState, row, col);
    }

    // Restart game (leader only with roomId confirmation)
    restartGame(socket, io, confirmRoomId) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        // Only leader can restart
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Only the room leader can restart!' };
        }

        // Confirmation: roomId must match
        if (confirmRoomId !== roomId) {
            return { success: false, message: 'Incorrect room code!' };
        }

        // Reset board
        session.boardState = createEmptyBoard(15, 15);
        session.gamePhase = GAME_PHASES.WAITING;
        session.gameStarted = false;
        session.lockedForEntry = false;

        // Reset initial placement state
        session.initialPlacementState = {
            placementSequence: [],
            currentSequenceIndex: 0,
            citiesPlacedInTurn: 0
        };

        // Reset all players' textures and pieces
        const players = Object.values(session.players);
        players.forEach(player => {
            player.hexCount = new Player(player.id, player.color).hexCount;
            player.pieces = new Player(player.id, player.color).pieces;
        });

        // Define first player as leader
        const leaderPlayer = session.players[session.leaderId];
        session.playerOnTurn = leaderPlayer || players[0];

        // Notify all
        io.to(roomId).emit('gameRestarted', {
            boardState: session.boardState,
            players: players,
            message: 'The game has been restarted!'
        });

        io.to(roomId).emit('createBoard', session.boardState);
        io.to(roomId).emit('drawPlayers', players);
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        console.log(`Game restarted in room ${roomId}`);

        return { success: true, message: 'Game restarted successfully!' };
    }

    shuffleArray(array) {
        return BoardLogic.shuffleArray(array);
    }

    addPlayerToSession(socket, io, roomId) {
        const session = this.session[roomId];

        if (!session) {
            socket.emit('error', "Room not found!");
            return;
        }

        if (Object.keys(session.players).length >= 4) {
            socket.emit('error', "Room is full!");
            return;
        }

        // Block entry after random distribution
        if (session.lockedForEntry) {
            socket.emit('error', "Entry blocked! The board has already been set up.");
            return;
        }

        // Block entry after game started manually
        if (session.gameStarted) {
            socket.emit('error', "Game already started! Cannot join.");
            return;
        }

        const player = new Player(socket.id, this.getRandomColor(roomId));
        this.session[roomId].players[socket.id] = player;
        socket.join(roomId);
        socket.emit('createBoard', this.session[roomId].boardState);
        socket.emit('drawPlayers', this.session[roomId].players);

        // Send info about whose turn it is
        socket.emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });
    }

    // Remove player from session (disconnection)
    removePlayerFromSession(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        if (!roomId) return;

        const session = this.session[roomId];
        if (!session) return;

        const disconnectedPlayer = session.players[socket.id];
        if (!disconnectedPlayer) return;

        // If game has started, DON'T remove the player - allow reconnection
        if (session.gameStarted) {
            console.log(`Player ${disconnectedPlayer.color} disconnected from room ${roomId} (can reconnect)`);
            // Notify other players
            io.to(roomId).emit('playerDisconnected', {
                playerId: socket.id,
                playerColor: disconnectedPlayer.color
            });
            return; // Don't remove the player, allow reconnection
        }

        const wasCurrentTurn = session.playerOnTurn?.id === socket.id;

        // Remove player (only if game hasn't started)
        delete session.players[socket.id];

        const remainingPlayers = Object.values(session.players);

        // If no one left, delete session
        if (remainingPlayers.length === 0) {
            delete this.session[roomId];
            console.log(`Session ${roomId} removed - no players.`);
            return;
        }

        // Update turnOrder if in initial placement phase
        if (session.initialPlacementState && session.initialPlacementState.turnOrder) {
            session.initialPlacementState.turnOrder = session.initialPlacementState.turnOrder.filter(
                p => p.id !== socket.id
            );
            // Adjust index if necessary
            if (session.initialPlacementState.currentTurnIndex >= session.initialPlacementState.turnOrder.length) {
                session.initialPlacementState.currentTurnIndex = 0;
            }
        }

        // If it was disconnected player's turn, pass to next
        if (wasCurrentTurn) {
            // Find next player in order
            const currentIndex = remainingPlayers.findIndex(p => p.id === session.playerOnTurn?.id);
            const nextIndex = (currentIndex + 1) % remainingPlayers.length;
            session.playerOnTurn = remainingPlayers[Math.max(0, nextIndex)] || remainingPlayers[0];

            io.to(roomId).emit('turnChanged', {
                currentPlayerId: session.playerOnTurn.id,
                currentPlayerColor: session.playerOnTurn.color
            });

            console.log(`Turn passed to ${session.playerOnTurn.color} after disconnection`);
        }

        // If leader left, promote another player
        if (session.leaderId === socket.id) {
            session.leaderId = remainingPlayers[0].id;
            console.log(`New leader: ${remainingPlayers[0].color}`);
            // Notify new leader
            io.to(session.leaderId).emit('youAreLeader');
        }

        // Notify other players
        io.to(roomId).emit('playerDisconnected', {
            playerId: socket.id,
            playerColor: disconnectedPlayer.color,
            remainingPlayers: remainingPlayers.length
        });

        io.to(roomId).emit('drawPlayers', remainingPlayers);

        console.log(`Player ${disconnectedPlayer.color} disconnected from room ${roomId}`);
    }

    applyTextureToBoard(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room not found!' };
        }

        // Block manual texture placement - only leader can distribute when there are 4 players
        const players = Object.values(session.players);
        if (players.length < 4) {
            return { success: false, error: 'NOT_ENOUGH_PLAYERS', message: 'Wait for 4 players to start!' };
        }

        const { row, col, texture } = payload;
        const player = session.players[socket.id];
        const textureType = texture.replace(".png", "");

        // Validação: é o turno do jogador?
        if (session.playerOnTurn !== player) {
            return { success: false, error: 'NOT_YOUR_TURN', message: 'Not your turn!' };
        }

        // Validation: does player have textures available?
        if (player.hexCount[textureType] <= 0) {
            return { success: false, error: 'NO_TEXTURES', message: 'You have no more of this texture!' };
        }

        // Validation: does hex already have texture?
        const hex = session.boardState[row][col];
        if (hex.texture !== null) {
            return { success: false, error: 'HEX_OCCUPIED', message: 'This hex already has a texture!' };
        }

        // Validation: adjacency (if textures exist on board)
        if (this.hasAnyTexture(session.boardState) && !this.isAdjacentToTexture(session.boardState, row, col)) {
            return { success: false, error: 'NOT_ADJACENT', message: 'Texture must be adjacent to an existing texture!' };
        }

        // Apply texture
        hex.texture = texture;
        player.hexCount[textureType]--;

        // Mark that game started
        if (!session.gameStarted) {
            session.gameStarted = true;
            session.gamePhase = 'placement';
        }

        // Emit updates
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('updatePlayerPieces', player);

        // Next player's turn
        const playersList = Object.values(session.players);
        const currentIndex = playersList.indexOf(session.playerOnTurn);
        const nextIndex = (currentIndex + 1) % playersList.length;
        session.playerOnTurn = playersList[nextIndex];

        // Emit turn change event
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        // Check if placement phase ended
        const phaseEnded = this.checkPlacementPhaseEnd(session);
        if (phaseEnded) {
            session.gamePhase = 'battle';
            io.to(roomId).emit('phaseChanged', { phase: 'battle' });
        }

        return { success: true };
    }

    hasAnyTexture(boardState) {
        return BoardLogic.hasAnyTexture(boardState);
    }

    isAdjacentToTexture(boardState, row, col) {
        return BoardLogic.isAdjacentToTexture(boardState, row, col);
    }

    // Check if all players used all textures
    checkPlacementPhaseEnd(session) {
        const players = Object.values(session.players);
        return players.every(player => {
            const totalTextures = Object.values(player.hexCount).reduce((sum, count) => sum + count, 0);
            return totalTextures === 0;
        });
    }

    getRoomIdBySocketId(socketId) {
        return Object.keys(this.session).find(roomId => this.session[roomId].players[socketId]);
    }

    getRandomColor(roomId) {
        const session = this.session[roomId];

        if (!session) {
            return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
        }

        const usedColors = Object.values(session.players).map(player => player.color);
        const availableColors = PLAYER_COLORS.filter(color => !usedColors.includes(color));

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

    // Rejoin a room after page refresh using player color
    rejoinRoom(socket, io, roomId, playerColor) {
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found' };
        }

        // Find existing player by color
        const existingPlayer = Object.values(session.players).find(p => p.color === playerColor);

        if (!existingPlayer) {
            return { success: false, message: 'Player not found in this room' };
        }

        // Get the old socket ID
        const oldSocketId = existingPlayer.id;

        // Update player's socket ID
        existingPlayer.id = socket.id;

        // Update players object with new key
        delete session.players[oldSocketId];
        session.players[socket.id] = existingPlayer;

        // Update leader if this was the leader
        if (session.leaderId === oldSocketId) {
            session.leaderId = socket.id;
        }

        // Update playerOnTurn if this player is on turn
        if (session.playerOnTurn && session.playerOnTurn.id === oldSocketId) {
            session.playerOnTurn.id = socket.id;
        }

        // Update turn order if exists
        if (session.initialPlacementState && session.initialPlacementState.turnOrder) {
            const turnOrderIndex = session.initialPlacementState.turnOrder.indexOf(oldSocketId);
            if (turnOrderIndex !== -1) {
                session.initialPlacementState.turnOrder[turnOrderIndex] = socket.id;
            }
        }

        // Update pieces ownership on board
        for (let row = 0; row < session.boardState.length; row++) {
            for (let col = 0; col < session.boardState[row].length; col++) {
                const hex = session.boardState[row][col];
                if (hex.pieces) {
                    hex.pieces.forEach(piece => {
                        if (piece.owner === oldSocketId) {
                            piece.owner = socket.id;
                        }
                    });
                }
            }
        }

        // Join socket to room
        socket.join(roomId);

        console.log(`Player ${playerColor} rejoined room ${roomId} with new socket ${socket.id}`);

        // Build response data
        const responseData = {
            roomId,
            player: existingPlayer,
            players: session.players,
            boardState: session.boardState,
            gamePhase: session.gamePhase,
            isLeader: session.leaderId === socket.id,
            currentTurn: session.playerOnTurn ? {
                currentPlayerId: session.playerOnTurn.id,
                currentPlayerColor: session.playerOnTurn.color
            } : null
        };

        // Add placement state if in initial placement
        if (session.gamePhase === 'initialPlacement') {
            responseData.placementState = {
                step: session.initialPlacementState.placementStep,
                citiesRemaining: this.getCitiesRemainingForPlayer(session, socket.id)
            };
        }

        return { success: true, data: responseData };
    }

    // Helper to get cities remaining for a player in initial placement
    getCitiesRemainingForPlayer(session, playerId) {
        if (!session.initialPlacementState || !session.initialPlacementState.placementSequence) {
            return 0;
        }

        const currentTurn = session.initialPlacementState.placementSequence[
            session.initialPlacementState.currentSequenceIndex
        ];

        if (currentTurn && currentTurn.playerId === playerId) {
            return currentTurn.citiesToPlace - (currentTurn.citiesPlaced || 0);
        }

        return 0;
    }
}