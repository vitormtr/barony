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
import * as BattleActions from './BattleActions.js';
import * as BoardSetup from './BoardSetup.js';

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

        // Only leader can do this
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

        // Use BoardSetup module to distribute textures
        BoardSetup.setupBoard(session.boardState, players);

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

        // Only leader can do this
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Only the leader can do this!' };
        }

        const players = Object.values(session.players);
        if (players.length < 2) {
            return { success: false, message: 'Need at least 2 players!' };
        }

        // First do texture distribution if not done yet
        if (session.gamePhase === GAME_PHASES.WAITING) {
            session.lockedForEntry = true;
            session.gameStarted = true;

            // Use BoardSetup module for quick setup
            BoardSetup.quickSetupForTesting(session.boardState, players);
        } else {
            // Just place pieces if textures already distributed
            BoardSetup.placeInitialPieces(session.boardState, players, 3);
        }

        // Start battle phase
        session.gamePhase = GAME_PHASES.BATTLE;
        session.playerOnTurn = players[0];

        // Notify all players
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
        const result = BattleActions.executeRecruitment(session.boardState, player, payload, session.players);
        if (result.success) {
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // MOVEMENT: Move a knight to adjacent hex (with combat)
    actionMovement(session, player, payload, io, roomId) {
        const result = BattleActions.executeMovement(session.boardState, player, payload, session.players);
        if (result.success) {
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // CONSTRUCTION: Replace knight with village or stronghold
    actionConstruction(session, player, payload, io, roomId) {
        const result = BattleActions.executeConstruction(session.boardState, player, payload, session.players);
        if (result.success) {
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // NEW CITY: Replace village with city
    actionNewCity(session, player, payload, io, roomId) {
        const result = BattleActions.executeNewCity(session.boardState, player, payload, session.players);
        if (result.success) {
            // Check victory condition
            if (result.checkVictory) {
                const victoryResult = this.checkVictoryCondition(session, player, io, roomId);
                if (victoryResult) {
                    result.message += ' ' + victoryResult;
                }
            }
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // EXPEDITION: Place knight on board edge
    actionExpedition(session, player, payload, io, roomId) {
        const result = BattleActions.executeExpedition(session.boardState, player, payload, session.players);
        if (result.success) {
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // NOBLE TITLE: Spend 15 resources to advance title
    actionNobleTitle(session, player, payload, io, roomId) {
        const result = BattleActions.executeNobleTitle(session.boardState, player, payload, session.players);
        if (result.success) {
            // Check victory condition
            if (result.checkVictory) {
                const victoryResult = this.checkVictoryCondition(session, player, io, roomId);
                if (victoryResult) {
                    result.message += ' ' + victoryResult;
                }
            }
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
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
        return BattleActions.calculateFinalScore(player);
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