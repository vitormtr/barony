import { nanoid } from 'nanoid';
import { createEmptyBoard } from './utils.js';
import { Player } from './Player.js';

const DIRECTION_MAP = {
    EVEN: [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]],
    ODD: [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
};

const GAME_PHASES = {
    WAITING: 'waiting',
    PLACEMENT: 'placement',
    INITIAL_PLACEMENT: 'initialPlacement',  // Fase 2: colocação de cidades e cavaleiros
    BATTLE: 'battle',
    ENDED: 'ended'
};

// Terrenos onde cidades podem ser colocadas (apenas planície e campo - NÃO floresta, montanha ou água)
const CITY_VALID_TERRAINS = ['plain.png', 'farm.png'];
// Terrenos onde cavaleiros podem ser colocados (qualquer exceto água)
const KNIGHT_VALID_TERRAINS = ['farm.png', 'plain.png', 'forest.png', 'mountain.png'];

const TEXTURES = ['water.png', 'farm.png', 'mountain.png', 'plain.png', 'forest.png'];

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
            leaderId: socket.id,  // Líder é quem criou a sala
            lockedForEntry: false, // Bloqueia entrada após distribuição aleatória
            // Fase 2: posicionamento inicial
            initialPlacementState: {
                round: 0,           // 0 = primeira rodada, 1 = segunda rodada (ordem inversa)
                turnOrder: [],      // Ordem normal dos jogadores
                currentTurnIndex: 0,
                placementStep: null,// 'city' ou 'knights'
                knightsPlaced: 0,   // Quantos cavaleiros foram colocados neste turno
                cityPosition: null  // Posição da cidade atual para validar adjacência dos cavaleiros
            }
        };

        const player = new Player(socket.id, this.getRandomColor(roomId));
        this.session[roomId].players[socket.id] = player;
        this.session[roomId].playerOnTurn = player;
        socket.join(roomId);
        socket.emit('createBoard', boardState);
        console.log(`Sessão ${roomId} criada! Líder: ${socket.id}`);
        socket.emit('drawPlayers', this.session[roomId].players);

        // Envia informação de turno inicial
        socket.emit('turnChanged', {
            currentPlayerId: player.id,
            currentPlayerColor: player.color
        });

        return roomId;
    }

    // Verifica se o jogador é o líder da sala
    isLeader(socketId, roomId) {
        const session = this.session[roomId];
        return session && session.leaderId === socketId;
    }

    // Distribui texturas aleatoriamente no tabuleiro
    randomDistribution(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Sala não encontrada!' };
        }

        // Apenas o líder pode fazer isso
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Apenas o líder da sala pode fazer isso!' };
        }

        // Não pode fazer se o jogo já começou manualmente
        if (session.gameStarted && session.gamePhase !== GAME_PHASES.WAITING) {
            return { success: false, message: 'O jogo já está em andamento!' };
        }

        const players = Object.values(session.players);
        if (players.length < 4) {
            return { success: false, message: 'É necessário 4 jogadores para iniciar o jogo!' };
        }

        // Bloqueia entrada de novos jogadores
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

        // Embaralha as texturas
        this.shuffleArray(allTextures);

        // Encontra posições válidas para colocar (começando do centro)
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

            // Embaralha direções para mais aleatoriedade
            this.shuffleArray(directions);

            for (const [dRow, dCol] of directions) {
                if (allTextures.length === 0) break;

                const newRow = row + dRow;
                const newCol = col + dCol;
                const key = `${newRow},${newCol}`;

                // Verifica se está dentro dos limites e não foi usado
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

        // Notifica todos os jogadores
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', players);
        io.to(roomId).emit('randomDistributionComplete', {
            message: 'Texturas distribuídas aleatoriamente!',
            lockedForEntry: true
        });

        console.log(`Distribuição aleatória na sala ${roomId}. Entrada bloqueada.`);

        // Inicia a fase de posicionamento inicial (colocar cidades e cavaleiros)
        this.startInitialPlacement(roomId, io);

        return { success: true, message: 'Texturas distribuídas com sucesso!' };
    }

    // Inicia a fase de posicionamento inicial
    // Regras Barony: ordem especial - jogadores 1,2,3 colocam 1 cidade, jogador 4 coloca 3, depois volta 3,2,1 colocando mais 2 cada
    // Cavaleiro é colocado automaticamente junto com a cidade
    startInitialPlacement(roomId, io) {
        const session = this.session[roomId];
        if (!session) return;

        session.gamePhase = GAME_PHASES.INITIAL_PLACEMENT;

        // Define a ordem dos jogadores (4 jogadores)
        const players = Object.values(session.players);
        const playerIds = players.map(p => p.id);

        // Ordem de colocação:
        // Fase 1: jogador 0 (1x), jogador 1 (1x), jogador 2 (1x), jogador 3 (3x)
        // Fase 2: jogador 2 (2x), jogador 1 (2x), jogador 0 (2x)
        // Total por jogador: 3 cidades cada
        const placementSequence = [
            { playerId: playerIds[0], citiesToPlace: 1 },  // Jogador 1: 1 cidade
            { playerId: playerIds[1], citiesToPlace: 1 },  // Jogador 2: 1 cidade
            { playerId: playerIds[2], citiesToPlace: 1 },  // Jogador 3: 1 cidade
            { playerId: playerIds[3], citiesToPlace: 3 },  // Jogador 4: 3 cidades
            { playerId: playerIds[2], citiesToPlace: 2 },  // Jogador 3: +2 cidades
            { playerId: playerIds[1], citiesToPlace: 2 },  // Jogador 2: +2 cidades
            { playerId: playerIds[0], citiesToPlace: 2 },  // Jogador 1: +2 cidades
        ];

        session.initialPlacementState = {
            placementSequence,
            currentSequenceIndex: 0,
            citiesPlacedInTurn: 0,      // Cidades colocadas no turno atual
        };

        // Define o primeiro jogador
        const firstTurn = placementSequence[0];
        session.playerOnTurn = session.players[firstTurn.playerId];

        io.to(roomId).emit('phaseChanged', {
            phase: 'initialPlacement'
        });

        // Inclui dados do turno no evento de início para processar após a transição
        io.to(roomId).emit('initialPlacementStarted', {
            message: 'Fase de posicionamento inicial! Coloque sua cidade.',
            currentStep: 'city',
            citiesRemaining: firstTurn.citiesToPlace,
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        console.log(`Fase de posicionamento inicial iniciada na sala ${roomId}`);
    }

    // Coloca uma cidade no tabuleiro (cavaleiro é adicionado automaticamente)
    placePiece(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, error: 'ROOM_NOT_FOUND', message: 'Sala não encontrada!' };
        }

        if (session.gamePhase !== GAME_PHASES.INITIAL_PLACEMENT) {
            return { success: false, error: 'WRONG_PHASE', message: 'Não está na fase de posicionamento!' };
        }

        const { row, col } = payload;
        const player = session.players[socket.id];
        const state = session.initialPlacementState;
        const currentTurn = state.placementSequence[state.currentSequenceIndex];

        // Validação: é o turno do jogador?
        if (currentTurn.playerId !== socket.id) {
            return { success: false, error: 'NOT_YOUR_TURN', message: 'Não é seu turno!' };
        }

        // Validação: jogador tem cidade disponível?
        if (player.pieces.city <= 0) {
            return { success: false, error: 'NO_PIECES', message: 'Você não tem mais cidades!' };
        }

        // Validação: jogador tem cavaleiro disponível?
        if (player.pieces.knight <= 0) {
            return { success: false, error: 'NO_PIECES', message: 'Você não tem mais cavaleiros!' };
        }

        // Validação: hexágono existe e tem textura
        const hex = session.boardState[row]?.[col];
        if (!hex || !hex.texture) {
            return { success: false, error: 'INVALID_HEX', message: 'Hexágono inválido!' };
        }

        // Validação: hexágono não está ocupado
        if (hex.pieces && hex.pieces.length > 0) {
            return { success: false, error: 'HEX_OCCUPIED', message: 'Este hexágono já está ocupado!' };
        }

        // Validação: terreno válido para cidade (apenas planície e campo)
        if (!CITY_VALID_TERRAINS.includes(hex.texture)) {
            return { success: false, error: 'INVALID_TERRAIN', message: 'Cidades só podem ser colocadas em planície ou campo!' };
        }

        // Validação: cidade não pode ser adjacente a outra cidade
        if (this.isAdjacentToCity(session.boardState, row, col)) {
            return { success: false, error: 'ADJACENT_TO_CITY', message: 'Cidades não podem ser colocadas adjacentes a outras cidades!' };
        }

        // Inicializa array de peças
        hex.pieces = [];

        // Coloca a cidade
        hex.pieces.push({
            type: 'city',
            owner: socket.id,
            color: player.color
        });
        player.pieces.city--;

        // Coloca o cavaleiro automaticamente na mesma casa
        hex.pieces.push({
            type: 'knight',
            owner: socket.id,
            color: player.color
        });
        player.pieces.knight--;

        // Atualiza contagem de cidades colocadas neste turno
        state.citiesPlacedInTurn++;

        io.to(roomId).emit('piecePlaced', {
            row, col, pieceType: 'city', playerId: socket.id, playerColor: player.color
        });
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', Object.values(session.players));

        // Verifica se o jogador terminou seu turno
        if (state.citiesPlacedInTurn >= currentTurn.citiesToPlace) {
            // Passa para o próximo na sequência
            return this.advanceInitialPlacement(roomId, io);
        } else {
            // Ainda precisa colocar mais cidades neste turno
            const remaining = currentTurn.citiesToPlace - state.citiesPlacedInTurn;
            io.to(roomId).emit('initialPlacementUpdate', {
                message: `Cidade colocada! Coloque mais ${remaining} cidade(s).`,
                currentStep: 'city',
                citiesRemaining: remaining
            });
            return { success: true, citiesRemaining: remaining };
        }
    }

    // Avança para o próximo jogador no posicionamento inicial
    advanceInitialPlacement(roomId, io) {
        const session = this.session[roomId];
        const state = session.initialPlacementState;

        state.currentSequenceIndex++;
        state.citiesPlacedInTurn = 0;

        // Verifica se terminou a sequência
        if (state.currentSequenceIndex >= state.placementSequence.length) {
            // Terminou a fase de posicionamento inicial
            return this.endInitialPlacement(roomId, io);
        }

        // Próximo na sequência
        const nextTurn = state.placementSequence[state.currentSequenceIndex];
        session.playerOnTurn = session.players[nextTurn.playerId];

        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        io.to(roomId).emit('initialPlacementUpdate', {
            message: `Sua vez! Coloque ${nextTurn.citiesToPlace} cidade(s).`,
            currentStep: 'city',
            citiesRemaining: nextTurn.citiesToPlace
        });

        return { success: true, citiesRemaining: nextTurn.citiesToPlace };
    }

    // Finaliza a fase de posicionamento inicial e inicia a batalha
    endInitialPlacement(roomId, io) {
        const session = this.session[roomId];

        session.gamePhase = GAME_PHASES.BATTLE;

        // Define o primeiro jogador para a fase de batalha (o líder)
        const leaderPlayer = session.players[session.leaderId];
        session.playerOnTurn = leaderPlayer || Object.values(session.players)[0];

        io.to(roomId).emit('phaseChanged', { phase: 'battle' });
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });
        io.to(roomId).emit('initialPlacementComplete', {
            message: 'Posicionamento inicial completo! Iniciando fase de batalha!'
        });

        console.log(`Fase de posicionamento inicial completa na sala ${roomId}. Iniciando batalha.`);

        return { success: true, phaseComplete: true };
    }

    // ========== AÇÕES DA FASE DE BATALHA ==========

    // Processa uma ação de batalha
    battleAction(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Sala não encontrada!' };
        }

        if (session.gamePhase !== GAME_PHASES.BATTLE) {
            return { success: false, message: 'Não está na fase de batalha!' };
        }

        const player = session.players[socket.id];
        if (session.playerOnTurn.id !== socket.id) {
            return { success: false, message: 'Não é seu turno!' };
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
                return { success: false, message: 'Ação inválida!' };
        }
    }

    // RECRUTAMENTO: Adiciona 2 cavaleiros em uma cidade (3 se adjacente a lago)
    actionRecruitment(session, player, payload, io, roomId) {
        const { row, col } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Hexágono inválido!' };
        }

        // Verifica se tem cidade do jogador
        const hasCity = hex.pieces?.some(p => p.type === 'city' && p.color === player.color);
        if (!hasCity) {
            return { success: false, message: 'Selecione uma cidade sua!' };
        }

        // Verifica se está adjacente a água (lago)
        const adjacentToWater = this.isAdjacentToWater(session.boardState, row, col);
        const knightsToAdd = adjacentToWater ? 3 : 2;

        // Verifica se tem cavaleiros suficientes
        if (player.pieces.knight < knightsToAdd) {
            return { success: false, message: `Você não tem ${knightsToAdd} cavaleiros disponíveis!` };
        }

        // Adiciona cavaleiros
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
            message: `${knightsToAdd} cavaleiros recrutados!${adjacentToWater ? ' (Bônus de lago!)' : ''}`
        };
    }

    // MOVIMENTO: Move um cavaleiro para hexágono adjacente
    actionMovement(session, player, payload, io, roomId) {
        const { from, to } = payload;
        const fromHex = session.boardState[from.row]?.[from.col];
        const toHex = session.boardState[to.row]?.[to.col];

        if (!fromHex || !toHex) {
            return { success: false, message: 'Hexágono inválido!' };
        }

        // Verifica se tem cavaleiro do jogador no hex de origem
        const knightIndex = fromHex.pieces?.findIndex(p => p.type === 'knight' && p.color === player.color);
        if (knightIndex === -1 || knightIndex === undefined) {
            return { success: false, message: 'Não há cavaleiro seu neste hexágono!' };
        }

        // Verifica adjacência
        if (!this.isAdjacentToPosition(from.row, from.col, to.row, to.col)) {
            return { success: false, message: 'O destino deve ser adjacente!' };
        }

        // Verifica se destino tem textura e não é água
        if (!toHex.texture || toHex.texture === 'water.png') {
            return { success: false, message: 'Não pode mover para água ou hex vazio!' };
        }

        // Move o cavaleiro
        const knight = fromHex.pieces.splice(knightIndex, 1)[0];
        if (!toHex.pieces) toHex.pieces = [];
        toHex.pieces.push(knight);

        this.emitBoardUpdate(session, io, roomId);

        return { success: true, message: 'Cavaleiro movido!' };
    }

    // CONSTRUÇÃO: Substitui cavaleiro por vila ou fortaleza
    actionConstruction(session, player, payload, io, roomId) {
        const { row, col, buildType } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Hexágono inválido!' };
        }

        // Verifica se tem cavaleiro do jogador
        const knightIndex = hex.pieces?.findIndex(p => p.type === 'knight' && p.color === player.color);
        if (knightIndex === -1 || knightIndex === undefined) {
            return { success: false, message: 'Não há cavaleiro seu neste hexágono!' };
        }

        // Verifica se já tem estrutura
        const hasStructure = hex.pieces?.some(p => ['city', 'stronghold', 'village'].includes(p.type));
        if (hasStructure) {
            return { success: false, message: 'Já existe uma estrutura neste hexágono!' };
        }

        // Verifica peça disponível
        if (buildType === 'village' && player.pieces.village <= 0) {
            return { success: false, message: 'Você não tem vilas disponíveis!' };
        }
        if (buildType === 'stronghold' && player.pieces.stronghold <= 0) {
            return { success: false, message: 'Você não tem fortalezas disponíveis!' };
        }

        // Validação de terreno para fortaleza (apenas montanha ou floresta)
        if (buildType === 'stronghold') {
            if (!['mountain.png', 'forest.png'].includes(hex.texture)) {
                return { success: false, message: 'Fortalezas só podem ser construídas em montanha ou floresta!' };
            }
        }

        // Remove o cavaleiro (volta para reserva)
        hex.pieces.splice(knightIndex, 1);
        player.pieces.knight++;

        // Adiciona a estrutura
        hex.pieces.push({
            type: buildType,
            owner: player.id,
            color: player.color
        });
        player.pieces[buildType]--;

        // Ganha recurso correspondente ao terreno
        const resource = player.addResource(hex.texture);

        this.emitBoardUpdate(session, io, roomId);

        const resourceName = resource ? this.getResourceName(resource) : '';
        return {
            success: true,
            message: `${buildType === 'village' ? 'Vila' : 'Fortaleza'} construída!${resource ? ` +1 ${resourceName}` : ''}`
        };
    }

    // NOVA CIDADE: Substitui vila por cidade
    actionNewCity(session, player, payload, io, roomId) {
        const { row, col } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Hexágono inválido!' };
        }

        // Verifica se tem vila do jogador
        const villageIndex = hex.pieces?.findIndex(p => p.type === 'village' && p.color === player.color);
        if (villageIndex === -1 || villageIndex === undefined) {
            return { success: false, message: 'Não há vila sua neste hexágono!' };
        }

        // Verifica se tem cidade disponível
        if (player.pieces.city <= 0) {
            return { success: false, message: 'Você não tem cidades disponíveis!' };
        }

        // Remove a vila (volta para reserva)
        hex.pieces.splice(villageIndex, 1);
        player.pieces.village++;

        // Adiciona a cidade
        hex.pieces.push({
            type: 'city',
            owner: player.id,
            color: player.color
        });
        player.pieces.city--;

        // Ganha 10 pontos de vitória
        player.addVictoryPoints(10);

        this.emitBoardUpdate(session, io, roomId);

        return { success: true, message: 'Nova cidade fundada! +10 pontos de vitória!' };
    }

    // EXPEDIÇÃO: Coloca cavaleiro na borda do tabuleiro
    actionExpedition(session, player, payload, io, roomId) {
        const { row, col } = payload;
        const hex = session.boardState[row]?.[col];

        if (!hex) {
            return { success: false, message: 'Hexágono inválido!' };
        }

        // Verifica se precisa de 2 cavaleiros na reserva
        if (player.pieces.knight < 2) {
            return { success: false, message: 'Você precisa de 2 cavaleiros na reserva!' };
        }

        // Verifica se hex tem textura e não é água
        if (!hex.texture || hex.texture === 'water.png') {
            return { success: false, message: 'Selecione um hexágono válido!' };
        }

        // Verifica se está vazio
        if (hex.pieces && hex.pieces.length > 0) {
            return { success: false, message: 'O hexágono deve estar vazio!' };
        }

        // Verifica se é borda
        if (!this.isBorderHex(session.boardState, row, col)) {
            return { success: false, message: 'Selecione um hexágono na borda do tabuleiro!' };
        }

        // Remove 2 cavaleiros da reserva, 1 volta para a caixa (permanentemente perdido)
        player.pieces.knight -= 2;

        // Coloca 1 cavaleiro no tabuleiro
        if (!hex.pieces) hex.pieces = [];
        hex.pieces.push({
            type: 'knight',
            owner: player.id,
            color: player.color
        });

        this.emitBoardUpdate(session, io, roomId);

        return { success: true, message: 'Expedição realizada! 1 cavaleiro posicionado na borda.' };
    }

    // TÍTULO NOBRE: Gasta 15 recursos para subir de título
    actionNobleTitle(session, player, payload, io, roomId) {
        const totalResources = player.getTotalResources();

        if (totalResources < 15) {
            return { success: false, message: `Recursos insuficientes! ${totalResources}/15` };
        }

        if (player.title === 'duke') {
            return { success: false, message: 'Você já é Duque!' };
        }

        // Gasta 15 recursos
        player.spendResources(15);

        // Sobe de título
        const oldTitle = player.getTitleName();
        player.promoteTitle();
        const newTitle = player.getTitleName();

        this.emitBoardUpdate(session, io, roomId);

        return { success: true, message: `Título elevado de ${oldTitle} para ${newTitle}!` };
    }

    // Passa o turno para o próximo jogador
    endTurn(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) return;

        if (session.playerOnTurn.id !== socket.id) return;

        const players = Object.values(session.players);
        const currentIndex = players.findIndex(p => p.id === socket.id);
        const nextIndex = (currentIndex + 1) % players.length;
        session.playerOnTurn = players[nextIndex];

        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        io.to(roomId).emit('drawPlayers', players);
    }

    // Utilitários
    isAdjacentToWater(boardState, row, col) {
        const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

        return directions.some(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (newRow < 0 || newRow >= boardState.length) return false;
            if (newCol < 0 || newCol >= boardState[0].length) return false;
            return boardState[newRow][newCol].texture === 'water.png';
        });
    }

    isBorderHex(boardState, row, col) {
        const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (newRow < 0 || newRow >= boardState.length) return true;
            if (newCol < 0 || newCol >= boardState[0].length) return true;
            if (!boardState[newRow][newCol].texture) return true;
        }
        return false;
    }

    getResourceName(resource) {
        const names = {
            field: 'Campo',
            forest: 'Floresta',
            mountain: 'Montanha',
            plain: 'Planície'
        };
        return names[resource] || resource;
    }

    emitBoardUpdate(session, io, roomId) {
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('drawPlayers', Object.values(session.players));
    }

    // Verifica se duas posições são adjacentes
    isAdjacentToPosition(row1, col1, row2, col2) {
        const directions = row1 % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

        return directions.some(([dRow, dCol]) => {
            return (row1 + dRow === row2) && (col1 + dCol === col2);
        });
    }

    // Verifica se a posição é adjacente a alguma cidade existente
    isAdjacentToCity(boardState, row, col) {
        const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

        return directions.some(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            // Verifica limites do tabuleiro
            if (newRow < 0 || newRow >= boardState.length) return false;
            if (newCol < 0 || newCol >= boardState[0].length) return false;

            const hex = boardState[newRow][newCol];

            // Verifica se tem uma cidade neste hexágono
            if (hex.pieces && hex.pieces.length > 0) {
                return hex.pieces.some(piece => piece.type === 'city');
            }

            return false;
        });
    }

    // Reinicia o jogo (apenas líder com confirmação do roomId)
    restartGame(socket, io, confirmRoomId) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, message: 'Sala não encontrada!' };
        }

        // Apenas o líder pode reiniciar
        if (session.leaderId !== socket.id) {
            return { success: false, message: 'Apenas o líder da sala pode reiniciar!' };
        }

        // Confirmação: roomId deve coincidir
        if (confirmRoomId !== roomId) {
            return { success: false, message: 'Código da sala incorreto!' };
        }

        // Reseta o tabuleiro
        session.boardState = createEmptyBoard(15, 15);
        session.gamePhase = GAME_PHASES.WAITING;
        session.gameStarted = false;
        session.lockedForEntry = false;

        // Reseta o estado de posicionamento inicial
        session.initialPlacementState = {
            placementSequence: [],
            currentSequenceIndex: 0,
            citiesPlacedInTurn: 0
        };

        // Reseta as texturas e peças de todos os jogadores
        const players = Object.values(session.players);
        players.forEach(player => {
            player.hexCount = new Player(player.id, player.color).hexCount;
            player.pieces = new Player(player.id, player.color).pieces;
        });

        // Define o primeiro jogador como o líder
        const leaderPlayer = session.players[session.leaderId];
        session.playerOnTurn = leaderPlayer || players[0];

        // Notifica todos
        io.to(roomId).emit('gameRestarted', {
            boardState: session.boardState,
            players: players,
            message: 'O jogo foi reiniciado!'
        });

        io.to(roomId).emit('createBoard', session.boardState);
        io.to(roomId).emit('drawPlayers', players);
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        console.log(`Jogo reiniciado na sala ${roomId}`);

        return { success: true, message: 'Jogo reiniciado com sucesso!' };
    }

    // Função auxiliar para embaralhar array
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    addPlayerToSession(socket, io, roomId) {
        const session = this.session[roomId];

        if (!session) {
            socket.emit('error', "Sala não encontrada!");
            return;
        }

        if (Object.keys(session.players).length >= 4) {
            socket.emit('error', "Sala cheia!");
            return;
        }

        // Bloqueia entrada após distribuição aleatória
        if (session.lockedForEntry) {
            socket.emit('error', "Entrada bloqueada! O tabuleiro já foi montado.");
            return;
        }

        // Bloqueia entrada após o jogo começar manualmente
        if (session.gameStarted) {
            socket.emit('error', "O jogo já começou! Não é possível entrar.");
            return;
        }

        const player = new Player(socket.id, this.getRandomColor(roomId));
        this.session[roomId].players[socket.id] = player;
        socket.join(roomId);
        socket.emit('createBoard', this.session[roomId].boardState);
        socket.emit('drawPlayers', this.session[roomId].players);

        // Envia informação de quem é o turno atual
        socket.emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });
    }

    // Remove jogador da sessão (desconexão)
    removePlayerFromSession(socket, io) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        if (!roomId) return;

        const session = this.session[roomId];
        if (!session) return;

        const disconnectedPlayer = session.players[socket.id];
        const wasCurrentTurn = session.playerOnTurn === disconnectedPlayer;

        // Remove o jogador
        delete session.players[socket.id];

        const remainingPlayers = Object.values(session.players);

        // Se não sobrou ninguém, deleta a sessão
        if (remainingPlayers.length === 0) {
            delete this.session[roomId];
            console.log(`Sessão ${roomId} removida - sem jogadores.`);
            return;
        }

        // Se era o turno do jogador desconectado, passa para o próximo
        if (wasCurrentTurn) {
            session.playerOnTurn = remainingPlayers[0];
            io.to(roomId).emit('turnChanged', {
                currentPlayerId: session.playerOnTurn.id,
                currentPlayerColor: session.playerOnTurn.color
            });
        }

        // Notifica os outros jogadores
        io.to(roomId).emit('playerDisconnected', {
            playerId: socket.id,
            playerColor: disconnectedPlayer.color,
            remainingPlayers: remainingPlayers.length
        });

        io.to(roomId).emit('drawPlayers', remainingPlayers);

        console.log(`Jogador ${disconnectedPlayer.color} desconectou da sala ${roomId}`);
    }

    applyTextureToBoard(socket, io, payload) {
        const roomId = this.getRoomIdBySocketId(socket.id);
        const session = this.session[roomId];

        if (!session) {
            return { success: false, error: 'ROOM_NOT_FOUND', message: 'Sala não encontrada!' };
        }

        // Bloqueia colocação manual de texturas - apenas o líder pode distribuir quando houver 4 jogadores
        const players = Object.values(session.players);
        if (players.length < 4) {
            return { success: false, error: 'NOT_ENOUGH_PLAYERS', message: 'Aguarde 4 jogadores para iniciar!' };
        }

        const { row, col, texture } = payload;
        const player = session.players[socket.id];
        const textureType = texture.replace(".png", "");

        // Validação: é o turno do jogador?
        if (session.playerOnTurn !== player) {
            return { success: false, error: 'NOT_YOUR_TURN', message: 'Não é seu turno!' };
        }

        // Validação: jogador tem texturas disponíveis?
        if (player.hexCount[textureType] <= 0) {
            return { success: false, error: 'NO_TEXTURES', message: 'Você não tem mais dessa textura!' };
        }

        // Validação: hexágono já tem textura?
        const hex = session.boardState[row][col];
        if (hex.texture !== null) {
            return { success: false, error: 'HEX_OCCUPIED', message: 'Este hexágono já possui uma textura!' };
        }

        // Validação: adjacência (se já existe alguma textura no tabuleiro)
        if (this.hasAnyTexture(session.boardState) && !this.isAdjacentToTexture(session.boardState, row, col)) {
            return { success: false, error: 'NOT_ADJACENT', message: 'A textura deve ser adjacente a uma textura existente!' };
        }

        // Aplica a textura
        hex.texture = texture;
        player.hexCount[textureType]--;

        // Marca que o jogo começou
        if (!session.gameStarted) {
            session.gameStarted = true;
            session.gamePhase = 'placement';
        }

        // Emite atualizações
        io.to(roomId).emit('updateBoard', { boardId: session.boardId, boardState: session.boardState });
        io.to(roomId).emit('updatePlayerPieces', player);

        // Próximo jogador no turno
        const playersList = Object.values(session.players);
        const currentIndex = playersList.indexOf(session.playerOnTurn);
        const nextIndex = (currentIndex + 1) % playersList.length;
        session.playerOnTurn = playersList[nextIndex];

        // Emite evento de mudança de turno
        io.to(roomId).emit('turnChanged', {
            currentPlayerId: session.playerOnTurn.id,
            currentPlayerColor: session.playerOnTurn.color
        });

        // Verifica se a fase de placement terminou
        const phaseEnded = this.checkPlacementPhaseEnd(session);
        if (phaseEnded) {
            session.gamePhase = 'battle';
            io.to(roomId).emit('phaseChanged', { phase: 'battle' });
        }

        return { success: true };
    }

    // Verifica se existe alguma textura no tabuleiro
    hasAnyTexture(boardState) {
        return boardState.some(row => row.some(hex => hex.texture !== null));
    }

    // Verifica se a posição é adjacente a uma textura existente
    isAdjacentToTexture(boardState, row, col) {
        const directions = row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

        return directions.some(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            // Verifica limites do tabuleiro
            if (newRow < 0 || newRow >= boardState.length) return false;
            if (newCol < 0 || newCol >= boardState[0].length) return false;

            return boardState[newRow][newCol].texture !== null;
        });
    }

    // Verifica se todos os jogadores usaram todas as texturas
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
            return ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)];
        }

        const usedColors = Object.values(session.players).map(player => player.color);
        const availableColors = ['red', 'blue', 'green', 'yellow'].filter(color => !usedColors.includes(color));

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
}