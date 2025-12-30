import { nanoid } from 'nanoid';
import { createEmptyBoard } from './utils.js';
import { Player } from './Player.js';
import { GAME_PHASES, MAX_HISTORY_ENTRIES } from './constants.js';
import * as BoardLogic from './BoardLogic.js';
import * as BattleActions from './BattleActions.js';
import * as BoardSetup from './BoardSetup.js';
import * as InitialPlacement from './InitialPlacement.js';
import * as PlayerManager from './PlayerManager.js';
import * as TurnManager from './TurnManager.js';
import * as SaveManager from './SaveManager.js';

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
            gameHistory: [], // Synchronized game log for all players
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

        const player = PlayerManager.createPlayer(socket.id, this.session[roomId]);
        this.session[roomId].players[socket.id] = player;
        this.session[roomId].playerOnTurn = player;
        socket.join(roomId);
        socket.emit('createBoard', boardState);
        socket.emit('drawPlayers', this.session[roomId].players);

        // Send initial turn info
        socket.emit('turnChanged', {
            currentPlayerId: player.id,
            currentPlayerColor: player.color,
            currentPlayerName: player.name || player.color
        });

        return roomId;
    }

    // Check if player is the room leader
    isLeader(socketId, roomId) {
        const session = this.session[roomId];
        return session && session.leaderId === socketId;
    }

    // Add entry to game history and broadcast to all players
    addHistoryEntry(session, io, roomId, action, playerColor, details = '') {
        const entry = {
            action,
            playerColor,
            details,
            timestamp: Date.now()
        };

        if (!session.gameHistory) {
            session.gameHistory = [];
        }

        session.gameHistory.unshift(entry);
        if (session.gameHistory.length > MAX_HISTORY_ENTRIES) {
            session.gameHistory.pop();
        }

        // Broadcast to all players in room
        io.to(roomId).emit('historyEntry', entry);
    }

    // Get available colors for a room
    getAvailableColors(roomId) {
        const session = this.session[roomId];
        if (!session) {
            return { error: 'Room not found!' };
        }
        if (session.lockedForEntry) {
            return { error: 'Entry blocked! The board has already been set up.' };
        }
        if (session.gameStarted) {
            return { error: 'Game already started! Cannot join.' };
        }
        const colors = PlayerManager.getAvailableColors(session);
        return { colors, roomId };
    }

    // Create session with specific color
    createSessionWithColor(socket, io, color, playerName) {
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
            leaderId: socket.id,
            lockedForEntry: false,
            initialPlacementState: {
                round: 0,
                turnOrder: [],
                currentTurnIndex: 0,
                placementStep: null,
                knightsPlaced: 0,
                cityPosition: null
            }
        };

        const player = PlayerManager.createPlayerWithColor(socket.id, color, playerName);
        this.session[roomId].players[socket.id] = player;
        this.session[roomId].playerOnTurn = player;
        socket.join(roomId);
        socket.emit('createBoard', boardState);
        socket.emit('drawPlayers', this.session[roomId].players);

        socket.emit('turnChanged', {
            currentPlayerId: player.id,
            currentPlayerColor: player.color,
            currentPlayerName: player.name || player.color
        });

        return roomId;
    }

    // Add player with specific color and name
    addPlayerWithColor(socket, io, roomId, color, playerName) {
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        // Validate
        const validation = PlayerManager.canPlayerJoin(session);
        if (!validation.canJoin) {
            return { success: false, message: validation.error };
        }

        // Check if color is available
        if (!PlayerManager.isColorAvailable(session, color)) {
            return { success: false, message: 'This color is already taken!' };
        }

        const player = PlayerManager.createPlayerWithColor(socket.id, color, playerName);
        session.players[socket.id] = player;

        socket.join(roomId);
        socket.emit('createBoard', session.boardState);
        socket.emit('drawPlayers', session.players);

        socket.emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color,
            currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
        });

        return { success: true, player };
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
        if (players.length < 1) {
            return { success: false, message: 'At least 1 player required to start the game!' };
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

        // Start initial placement phase (place cities and knights)
        this.startInitialPlacement(roomId, io);

        return { success: true, message: 'Textures distributed successfully!' };
    }

    // Start initial placement phase using InitialPlacement module
    startInitialPlacement(roomId, io) {
        const session = this.session[roomId];
        if (!session) return;

        session.gamePhase = GAME_PHASES.INITIAL_PLACEMENT;

        // Use InitialPlacement module to create state
        const players = Object.values(session.players);
        const playerIds = players.map(p => p.id);
        session.initialPlacementState = InitialPlacement.createInitialState(playerIds);

        // Set first player
        const firstTurn = InitialPlacement.getCurrentTurn(session.initialPlacementState);
        session.playerOnTurn = session.players[firstTurn.playerId];

        io.to(roomId).emit('phaseChanged', { phase: 'initialPlacement' });
        io.to(roomId).emit('initialPlacementStarted', {
            message: 'Initial placement phase! Place your city.',
            currentStep: 'city',
            citiesRemaining: firstTurn.citiesToPlace,
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color,
            currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
        });
    }

    // Place a city on the board using InitialPlacement module
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
        const currentTurn = InitialPlacement.getCurrentTurn(state);

        // Validate turn
        if (currentTurn.playerId !== socket.id) {
            return { success: false, error: 'NOT_YOUR_TURN', message: 'Not your turn!' };
        }

        // Use InitialPlacement module for validation and placement
        const placeResult = InitialPlacement.placeCity(session.boardState, player, row, col);
        if (!placeResult.success) {
            return { success: false, error: placeResult.error, message: placeResult.message };
        }

        io.to(roomId).emit('piecePlaced', {
            row, col, pieceType: 'city', playerId: socket.id, playerColor: player.color
        });
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', Object.values(session.players));

        // Advance placement state
        const advanceResult = InitialPlacement.advancePlacement(state);

        if (advanceResult.complete) {
            return this.endInitialPlacement(roomId, io);
        }

        if (advanceResult.turnChanged) {
            session.playerOnTurn = session.players[advanceResult.nextPlayerId];
            io.to(roomId).emit('turnChanged', {
                currentPlayerId: session.playerOnTurn.id,
                currentPlayerColor: session.playerOnTurn.color,
                currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
            });
            io.to(roomId).emit('initialPlacementUpdate', {
                message: `Your turn! Place ${advanceResult.citiesRemaining} city(ies).`,
                currentStep: 'city',
                citiesRemaining: advanceResult.citiesRemaining
            });
        } else {
            io.to(roomId).emit('initialPlacementUpdate', {
                message: `City placed! Place ${advanceResult.citiesRemaining} more city(ies).`,
                currentStep: 'city',
                citiesRemaining: advanceResult.citiesRemaining
            });
        }

        return { success: true, citiesRemaining: advanceResult.citiesRemaining };
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
            currentPlayerColor: session.playerOnTurn.color,
            currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
        });
        io.to(roomId).emit('initialPlacementComplete', {
            message: 'Initial placement complete! Starting battle phase!'
        });

        // Add game start history entry
        this.addHistoryEntry(session, io, roomId, 'gameStart', session.playerOnTurn.color, 'Battle phase');

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
            const knightCount = result.knightsRecruited || payload.knightCount || 2;
            this.addHistoryEntry(session, io, roomId, 'recruitment', player.color, `${knightCount} knight${knightCount > 1 ? 's' : ''}`);
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // MOVEMENT: Move a knight to adjacent hex (with combat)
    actionMovement(session, player, payload, io, roomId) {
        // Initialize movedKnightsCount object if not exists
        if (!session.movedKnightsCount) {
            session.movedKnightsCount = {};
        }

        const result = BattleActions.executeMovement(
            session.boardState,
            player,
            payload,
            session.players,
            session.movedKnightsCount
        );

        if (result.success && result.movedTo) {
            // Track the destination position - increment counter
            const key = `${result.movedTo.row},${result.movedTo.col}`;
            session.movedKnightsCount[key] = (session.movedKnightsCount[key] || 0) + 1;
        }

        if (result.success) {
            const from = payload.from;
            const to = payload.to;
            this.addHistoryEntry(session, io, roomId, 'movement', player.color, `(${from.row},${from.col}) → (${to.row},${to.col})`);
            if (result.combatResult && result.combatResult.destroyed) {
                this.addHistoryEntry(session, io, roomId, 'combat', player.color, result.combatResult.destroyed.join(', '));
            }
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // CONSTRUCTION: Replace knight with village or stronghold
    actionConstruction(session, player, payload, io, roomId) {
        const result = BattleActions.executeConstruction(session.boardState, player, payload, session.players);
        if (result.success) {
            this.addHistoryEntry(session, io, roomId, 'construction', player.color, payload.buildType || 'village');
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // NEW CITY: Replace village with city
    actionNewCity(session, player, payload, io, roomId) {
        const result = BattleActions.executeNewCity(session.boardState, player, payload, session.players);
        if (result.success) {
            this.addHistoryEntry(session, io, roomId, 'newCity', player.color, `(${payload.row},${payload.col})`);
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
            this.addHistoryEntry(session, io, roomId, 'expedition', player.color, `(${payload.row},${payload.col})`);
            this.emitBoardUpdate(session, io, roomId);
        }
        return result;
    }

    // NOBLE TITLE: Spend 15 resources to advance title
    actionNobleTitle(session, player, payload, io, roomId) {
        const result = BattleActions.executeNobleTitle(session.boardState, player, payload, session.players);
        if (result.success) {
            this.addHistoryEntry(session, io, roomId, 'nobleTitle', player.color, result.newTitle || 'Promoted');
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
        const result = TurnManager.checkVictoryCondition(player, session);

        if (result.victory) {
            TurnManager.markGameEnding(session, player.id);

            // Notify all that someone became Duke
            io.to(roomId).emit('dukeAnnounced', {
                playerId: player.id,
                playerColor: player.color,
                message: result.message
            });

            return 'You became Duke! The game will end at the end of this round.';
        }
        return null;
    }

    // End game and calculate winner
    endGame(session, io, roomId) {
        const result = TurnManager.endGame(session);

        io.to(roomId).emit('gameEnded', {
            scores: result.scores,
            winner: result.winner,
            message: result.message
        });

        return result.scores;
    }

    // Pass turn to next player
    endTurn(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return;
        }

        // Validate it's this player's turn
        if (!TurnManager.isPlayerTurn(session, socket.id)) {
            return;
        }

        // Clear moved knights tracking for next turn
        session.movedKnightsCount = {};

        // Process end of turn
        const result = TurnManager.processEndTurn(session, socket.id);

        if (result.gameEnded) {
            // Game ended, notify players
            io.to(roomId).emit('gameEnded', {
                scores: result.scores,
                winner: result.winner,
                message: result.message
            });
            return;
        }

        // Add history entry for turn change
        this.addHistoryEntry(session, io, roomId, 'turnEnd', result.turnInfo.playerColor, `${result.turnInfo.playerName}'s turn`);

        // Emit turn change
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: result.turnInfo.playerId,
            currentPlayerColor: result.turnInfo.playerColor,
            currentPlayerName: result.turnInfo.playerName || result.turnInfo.playerColor
        });

        io.to(roomId).emit('drawPlayers', Object.values(session.players));
    }

    emitBoardUpdate(session, io, roomId) {
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', Object.values(session.players));
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

    shuffleArray(array) {
        return BoardLogic.shuffleArray(array);
    }

    // Update piece owner IDs when player joins a loaded game
    updatePieceOwners(boardState, oldId, newId) {
        for (const row of boardState) {
            for (const hex of row) {
                if (hex.pieces) {
                    for (const piece of hex.pieces) {
                        if (piece.owner === oldId) {
                            piece.owner = newId;
                        }
                    }
                }
            }
        }
    }

    // Ensure all pieces have color property (for backwards compatibility with old saves)
    ensurePiecesHaveColor(boardState, playerIdToColor) {
        for (const row of boardState) {
            for (const hex of row) {
                if (hex.pieces) {
                    for (const piece of hex.pieces) {
                        // If piece has owner but no color, derive color from owner
                        if (piece.owner && !piece.color) {
                            piece.color = playerIdToColor[piece.owner] || null;
                        }
                    }
                }
            }
        }
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

        // If loaded game, check if all players have joined
        if (session.loadedGame && session.availableColors?.length > 0) {
            return { success: false, message: `Waiting for ${session.availableColors.length} more player(s) to join!` };
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
        PlayerManager.resetAllPlayers(players);

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
            currentPlayerColor: session.playerOnTurn.color,
            currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
        });

        return { success: true, message: 'Game restarted successfully!' };
    }

    shuffleArray(array) {
        return BoardLogic.shuffleArray(array);
    }

    addPlayerToSession(socket, io, roomId) {
        const session = this.session[roomId];

        if (!session) {
            socket.emit('error', 'Room not found!');
            return;
        }

        // If this is a loaded game, show color selection
        if (session.loadedGame && session.availableColors?.length > 0) {
            socket.emit('loadedGameColorSelect', {
                roomId,
                availableColors: session.availableColors,
                gamePhase: session.gamePhase
            });
            return;
        }

        // Use PlayerManager for validation
        const validation = PlayerManager.canPlayerJoin(session);
        if (!validation.canJoin) {
            socket.emit('error', validation.error);
            return;
        }

        // Use PlayerManager to add player
        const result = PlayerManager.addPlayer(session, socket.id);
        if (!result.success) {
            socket.emit('error', result.error);
            return;
        }

        socket.join(roomId);
        socket.emit('createBoard', session.boardState);
        socket.emit('drawPlayers', session.players);

        // Send info about whose turn it is
        socket.emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color,
            currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
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
            // Notify other players
            io.to(roomId).emit('playerDisconnected', {
                playerId: socket.id,
                playerColor: disconnectedPlayer.color,
                playerName: disconnectedPlayer.name || disconnectedPlayer.color
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
            return;
        }

        // Update turnOrder if in initial placement phase
        PlayerManager.removeFromTurnOrder(session.initialPlacementState, socket.id);

        // If it was disconnected player's turn, pass to next
        if (wasCurrentTurn) {
            session.playerOnTurn = PlayerManager.getNextPlayer(remainingPlayers, socket.id);

            io.to(roomId).emit('turnChanged', {
                currentPlayerId: session.playerOnTurn.id,
                currentPlayerColor: session.playerOnTurn.color,
                currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
            });
        }

        // If leader left, promote another player
        if (session.leaderId === socket.id) {
            const newLeader = PlayerManager.promoteNewLeader(session, remainingPlayers);
            // Notify new leader
            io.to(newLeader.id).emit('youAreLeader');
        }

        // Notify other players
        io.to(roomId).emit('playerDisconnected', {
            playerId: socket.id,
            playerColor: disconnectedPlayer.color,
            playerName: disconnectedPlayer.name || disconnectedPlayer.color,
            remainingPlayers: remainingPlayers.length
        });

        io.to(roomId).emit('drawPlayers', remainingPlayers);
    }

    applyTextureToBoard(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room not found!' };
        }

        // Block manual texture placement - only leader can distribute when there is at least 1 player
        const players = Object.values(session.players);
        if (players.length < 1) {
            return { success: false, error: 'NOT_ENOUGH_PLAYERS', message: 'Need at least 1 player to start!' };
        }

        const { row, col, texture } = payload;
        const player = session.players[socket.id];
        const textureType = texture.replace(".png", "");

        // Validation: is it the player's turn?
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
            currentPlayerColor: session.playerOnTurn.color,
            currentPlayerName: session.playerOnTurn.name || session.playerOnTurn.color
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
        return PlayerManager.getRandomColor(this.session[roomId]);
    }

    getPlayersInRoom(roomId) {
        return PlayerManager.getPlayersInRoom(this.session[roomId]);
    }

    getPlayer(socketId) {
        const roomId = this.getRoomIdBySocketId(socketId);
        const session = this.session[roomId];
        return session ? session.players[socketId] : null;
    }

    calculateFinalScore(player) {
        return TurnManager.calculateFinalScore(player);
    }

    // Rejoin a room after page refresh using player color
    rejoinRoom(socket, io, roomId, playerColor) {
        const session = this.session[roomId];

        // Use PlayerManager for rejoin logic
        const result = PlayerManager.rejoinPlayer(session, socket.id, playerColor);
        if (!result.success) {
            return { success: false, message: result.error };
        }

        // Join socket to room
        socket.join(roomId);

        // Build response data
        const responseData = {
            roomId,
            player: result.player,
            players: session.players,
            boardState: session.boardState,
            gamePhase: session.gamePhase,
            isLeader: result.isLeader,
            gameHistory: session.gameHistory || [],
            currentTurn: session.playerOnTurn ? {
                currentPlayerId: session.playerOnTurn.id,
                currentPlayerColor: session.playerOnTurn.color
            } : null
        };

        // Add placement state if in initial placement
        if (session.gamePhase === 'initialPlacement') {
            responseData.placementState = {
                step: session.initialPlacementState.placementStep,
                citiesRemaining: PlayerManager.getCitiesRemainingForPlayer(
                    session.initialPlacementState, socket.id
                )
            };
        }

        return { success: true, data: responseData };
    }

    // ========== SAVE/LOAD GAME ==========

    // Save current game state to file
    saveGame(socket) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        // Only leader can save
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Only the room leader can save the game!' };
        }

        // Must have started the game
        if (!session.gameStarted) {
            return { success: false, message: 'Game has not started yet!' };
        }

        return SaveManager.saveGame(session, roomId);
    }

    // List available save files
    listSaves() {
        return SaveManager.listSaves();
    }

    // Load a saved game (creates a new session from save data)
    loadGame(socket, io, filename) {
        const loadResult = SaveManager.loadGame(filename);

        if (!loadResult.success) {
            return loadResult;
        }

        const saveData = loadResult.data;

        // Create new room with loaded data
        const roomId = nanoid(6);
        const boardId = saveData.boardId || nanoid(10);

        // Reconstruct players as Player instances
        const players = {};
        // Use playerOrder if saved, otherwise use Object.entries order
        const playerEntries = saveData.playerOrder
            ? saveData.playerOrder.map(id => [id, saveData.players[id]])
            : Object.entries(saveData.players);

        for (const [oldId, playerData] of playerEntries) {
            // Use socket.id for the loading player, keep color mapping
            const player = new Player(
                oldId, // Keep original ID temporarily
                playerData.color,
                playerData.name || null,
                playerData.hexCount || null,
                playerData.pieces || null,
                playerData.resources || null,
                playerData.title || null,
                playerData.victoryPoints || 0
            );
            players[oldId] = player;
        }

        // Create session
        this.session[roomId] = {
            boardId,
            players,
            boardState: saveData.boardState,
            playerOnTurn: null, // Will be set after player mapping
            gamePhase: saveData.gamePhase,
            gameStarted: saveData.gameStarted,
            leaderId: socket.id,
            lockedForEntry: true, // Loaded games are locked
            initialPlacementState: saveData.initialPlacementState || {
                round: 0,
                turnOrder: [],
                currentTurnIndex: 0,
                placementStep: null,
                knightsPlaced: 0,
                cityPosition: null
            },
            // Game ending state
            gameEnding: saveData.gameEnding || false,
            dukePlayerId: saveData.dukePlayerId || null,
            finalRoundStartPlayerId: saveData.finalRoundStartPlayerId || null,
            // Track which colors need to be claimed
            loadedGame: true,
            availableColors: Object.values(saveData.players).map(p => p.color),
            playerOnTurnColor: saveData.playerOnTurnColor
        };

        return {
            success: true,
            roomId,
            playerColors: this.session[roomId].availableColors,
            gamePhase: saveData.gamePhase,
            savedAt: saveData.savedAt,
            boardState: saveData.boardState
        };
    }

    // Load a game from local save data (uploaded from client)
    loadLocalSave(socket, io, saveData) {
        // Validate save data
        if (!saveData || !saveData.gameState) {
            return { success: false, message: 'Invalid save data!' };
        }

        const gameState = saveData.gameState;

        // boardState may be nested { boardState: [...] } or just [...]
        let boardState = gameState.boardState;
        if (boardState && boardState.boardState && Array.isArray(boardState.boardState)) {
            boardState = boardState.boardState;
        }

        if (!boardState || !gameState.players) {
            return { success: false, message: 'Save data is missing required fields!' };
        }

        // Create new room with loaded data
        const roomId = nanoid(6);
        const boardId = nanoid(10);

        // Reconstruct players as Player instances
        const players = {};
        const playersArray = Array.isArray(gameState.players) ? gameState.players : Object.values(gameState.players);

        for (const playerData of playersArray) {
            const player = new Player(
                playerData.id || nanoid(10), // Keep original ID temporarily
                playerData.color,
                playerData.name || null,     // name
                playerData.hexCount || null, // hexCount
                playerData.pieces || null,   // pieces
                playerData.resources || null, // resources
                playerData.title || null,    // title
                playerData.victoryPoints || 0 // victoryPoints
            );
            players[player.id] = player;
        }

        // Get player colors
        const availableColors = playersArray.map(p => p.color);

        // Build a map of player ID to color
        const playerIdToColor = {};
        for (const playerData of playersArray) {
            playerIdToColor[playerData.id] = playerData.color;
        }

        // Ensure all pieces have color property (some old saves might have only owner)
        this.ensurePiecesHaveColor(boardState, playerIdToColor);

        // Determine current turn color
        let playerOnTurnColor = null;
        if (gameState.currentTurn?.currentPlayerColor) {
            playerOnTurnColor = gameState.currentTurn.currentPlayerColor;
        }

        // Create session
        this.session[roomId] = {
            boardId,
            players,
            boardState: boardState,
            playerOnTurn: null, // Will be set after player mapping
            gamePhase: gameState.gamePhase || 'battle',
            gameStarted: true,
            leaderId: socket.id,
            lockedForEntry: true, // Loaded games are locked
            gameHistory: [], // Start fresh history for loaded game
            initialPlacementState: {
                round: 0,
                turnOrder: [],
                currentTurnIndex: 0,
                placementStep: null,
                knightsPlaced: 0,
                cityPosition: null
            },
            // Game ending state
            gameEnding: false,
            dukePlayerId: null,
            finalRoundStartPlayerId: null,
            // Track which colors need to be claimed
            loadedGame: true,
            availableColors,
            playerOnTurnColor
        };

        return {
            success: true,
            roomId,
            playerColors: availableColors,
            gamePhase: gameState.gamePhase || 'battle',
            boardState: boardState
        };
    }

    // Join a loaded game by claiming a color
    joinLoadedGame(socket, io, roomId, claimedColor) {
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Room not found!' };
        }

        if (!session.loadedGame) {
            return { success: false, message: 'This is not a loaded game!' };
        }

        // Check if color is available
        if (!session.availableColors.includes(claimedColor)) {
            return { success: false, message: 'This color is already claimed!' };
        }

        // Find the player with this color and update their socket ID
        const oldPlayerId = Object.keys(session.players).find(
            id => session.players[id].color === claimedColor
        );

        if (!oldPlayerId) {
            return { success: false, message: 'Player not found!' };
        }

        // Move player to new socket ID
        const player = session.players[oldPlayerId];
        player.id = socket.id;
        delete session.players[oldPlayerId];
        session.players[socket.id] = player;

        // Update owner IDs in board pieces
        this.updatePieceOwners(session.boardState, oldPlayerId, socket.id);

        // Remove from available colors
        session.availableColors = session.availableColors.filter(c => c !== claimedColor);

        // If this is the first player, make them the leader
        if (Object.keys(session.players).filter(id => id === session.players[id].id).length === 1) {
            session.leaderId = socket.id;
        }

        // Update playerOnTurn if needed
        if (session.playerOnTurnColor === claimedColor) {
            session.playerOnTurn = player;
        }

        // Update turn order in initialPlacementState if exists
        if (session.initialPlacementState?.turnOrder) {
            const turnIndex = session.initialPlacementState.turnOrder.indexOf(oldPlayerId);
            if (turnIndex !== -1) {
                session.initialPlacementState.turnOrder[turnIndex] = socket.id;
            }
        }

        // Update placementSequence playerIds if exists
        if (session.initialPlacementState?.placementSequence) {
            session.initialPlacementState.placementSequence.forEach(entry => {
                if (entry.playerId === oldPlayerId) {
                    entry.playerId = socket.id;
                }
            });
        }

        // Join socket to room
        socket.join(roomId);

        // Check if all players have joined
        const allJoined = session.availableColors.length === 0;

        if (allJoined) {
            // Set playerOnTurn based on saved color
            if (session.playerOnTurnColor) {
                const turnPlayer = Object.values(session.players).find(
                    p => p.color === session.playerOnTurnColor
                );
                if (turnPlayer) {
                    session.playerOnTurn = turnPlayer;
                }
            }

            // Fallback: if playerOnTurn is still null, set to first player
            if (!session.playerOnTurn) {
                const players = Object.values(session.players);
                if (players.length > 0) {
                    session.playerOnTurn = players[0];
                }
            }

            // Clean up loaded game flags
            delete session.loadedGame;
            delete session.availableColors;
            delete session.playerOnTurnColor;
        }

        return {
            success: true,
            player: player.toJSON(),
            allJoined,
            remainingColors: session.availableColors,
            isLeader: session.leaderId === socket.id
        };
    }

    // Get loaded game info for lobby display
    getLoadedGameInfo(roomId) {
        const session = this.session[roomId];

        if (!session || !session.loadedGame) {
            return null;
        }

        return {
            roomId,
            availableColors: session.availableColors,
            gamePhase: session.gamePhase,
            boardState: session.boardState,
            players: Object.values(session.players).map(p => ({
                color: p.color,
                claimed: !session.availableColors.includes(p.color)
            }))
        };
    }
}