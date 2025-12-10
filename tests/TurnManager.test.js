import {
    getNextPlayerIndex,
    isRoundComplete,
    isPlayerTurn,
    validateTurn,
    advanceTurn,
    checkVictoryCondition,
    markGameEnding,
    shouldEndGame,
    calculateFinalScore,
    calculateAllScores,
    determineWinner,
    endGame,
    isInBattlePhase,
    isGameEnded,
    getCurrentTurnInfo,
    setCurrentTurn,
    processEndTurn
} from '../server/TurnManager.js';
import { Player } from '../server/Player.js';
import { GAME_PHASES } from '../server/constants.js';

describe('TurnManager', () => {
    let mockSession;
    let players;

    beforeEach(() => {
        players = [
            new Player('p1', 'red'),
            new Player('p2', 'blue'),
            new Player('p3', 'green'),
            new Player('p4', 'yellow')
        ];

        mockSession = {
            players: {
                p1: players[0],
                p2: players[1],
                p3: players[2],
                p4: players[3]
            },
            playerOnTurn: players[0],
            gamePhase: GAME_PHASES.BATTLE,
            gameEnding: false,
            dukePlayerId: null
        };
    });

    describe('getNextPlayerIndex', () => {
        it('should return next index', () => {
            expect(getNextPlayerIndex(players, 0)).toBe(1);
            expect(getNextPlayerIndex(players, 1)).toBe(2);
            expect(getNextPlayerIndex(players, 2)).toBe(3);
        });

        it('should wrap around to first player', () => {
            expect(getNextPlayerIndex(players, 3)).toBe(0);
        });
    });

    describe('isRoundComplete', () => {
        it('should return true when index is 0', () => {
            expect(isRoundComplete(0)).toBe(true);
        });

        it('should return false for other indices', () => {
            expect(isRoundComplete(1)).toBe(false);
            expect(isRoundComplete(2)).toBe(false);
            expect(isRoundComplete(3)).toBe(false);
        });
    });

    describe('isPlayerTurn', () => {
        it('should return true for current player', () => {
            expect(isPlayerTurn(mockSession, 'p1')).toBe(true);
        });

        it('should return false for other players', () => {
            expect(isPlayerTurn(mockSession, 'p2')).toBe(false);
            expect(isPlayerTurn(mockSession, 'p3')).toBe(false);
        });

        it('should return false for null session', () => {
            expect(isPlayerTurn(null, 'p1')).toBe(false);
        });
    });

    describe('validateTurn', () => {
        it('should validate correct turn', () => {
            const result = validateTurn(mockSession, 'p1');
            expect(result.valid).toBe(true);
        });

        it('should reject wrong player turn', () => {
            const result = validateTurn(mockSession, 'p2');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Not your turn');
        });

        it('should reject null session', () => {
            const result = validateTurn(null, 'p1');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('advanceTurn', () => {
        it('should advance to next player', () => {
            const result = advanceTurn(mockSession, players, 'p1');

            expect(result.nextPlayer.id).toBe('p2');
            expect(result.nextIndex).toBe(1);
            expect(result.roundComplete).toBe(false);
        });

        it('should wrap around and mark round complete', () => {
            const result = advanceTurn(mockSession, players, 'p4');

            expect(result.nextPlayer.id).toBe('p1');
            expect(result.nextIndex).toBe(0);
            expect(result.roundComplete).toBe(true);
        });
    });

    describe('checkVictoryCondition', () => {
        it('should detect Duke victory', () => {
            players[0].title = 'duke';

            const result = checkVictoryCondition(players[0], mockSession);

            expect(result.victory).toBe(true);
            expect(result.message).toContain('Duke');
        });

        it('should not trigger if not Duke', () => {
            players[0].title = 'baron';

            const result = checkVictoryCondition(players[0], mockSession);

            expect(result.victory).toBe(false);
        });

        it('should not trigger if game already ending', () => {
            players[0].title = 'duke';
            mockSession.gameEnding = true;

            const result = checkVictoryCondition(players[0], mockSession);

            expect(result.victory).toBe(false);
        });
    });

    describe('markGameEnding', () => {
        it('should set game ending state', () => {
            markGameEnding(mockSession, 'p1');

            expect(mockSession.gameEnding).toBe(true);
            expect(mockSession.dukePlayerId).toBe('p1');
        });
    });

    describe('shouldEndGame', () => {
        it('should return true when game ending and round complete', () => {
            mockSession.gameEnding = true;
            expect(shouldEndGame(mockSession, true)).toBe(true);
        });

        it('should return false when game not ending', () => {
            expect(shouldEndGame(mockSession, true)).toBe(false);
        });

        it('should return false when round not complete', () => {
            mockSession.gameEnding = true;
            expect(shouldEndGame(mockSession, false)).toBe(false);
        });
    });

    describe('calculateFinalScore', () => {
        it('should calculate score based on victory points and resources', () => {
            players[0].victoryPoints = 20;
            // field=5pts, forest=3pts, mountain=2pts, plain=4pts
            players[0].resources = { field: 2, forest: 0, mountain: 0, plain: 0 };
            const score = calculateFinalScore(players[0]);
            expect(score).toBe(30); // 20 VP + 2*5 = 30
        });

        it('should include victory points', () => {
            players[0].victoryPoints = 10;
            const score = calculateFinalScore(players[0]);
            expect(score).toBeGreaterThanOrEqual(10);
        });
    });

    describe('calculateAllScores', () => {
        it('should calculate scores for all players', () => {
            players[0].victoryPoints = 30;
            players[1].victoryPoints = 5;

            const scores = calculateAllScores(players);

            expect(scores.length).toBe(4);
            expect(scores[0].score).toBe(30);
            expect(scores[1].score).toBe(5);
        });

        it('should return scores in player order (not sorted)', () => {
            players[0].victoryPoints = 10;
            players[1].victoryPoints = 30;

            const scores = calculateAllScores(players);

            // calculateAllScores returns in player order, not sorted
            expect(scores[0].id).toBe('p1');
            expect(scores[1].id).toBe('p2');
            expect(scores[0].score).toBe(10);
            expect(scores[1].score).toBe(30);
        });
    });

    describe('determineWinner', () => {
        it('should return first player in sorted scores', () => {
            const scores = [
                { id: 'p2', score: 30 },
                { id: 'p1', score: 20 }
            ];

            const winner = determineWinner(scores);
            expect(winner.id).toBe('p2');
        });
    });

    describe('endGame', () => {
        it('should set game phase to ended', () => {
            players[0].title = 'duke';
            const result = endGame(mockSession);

            expect(mockSession.gamePhase).toBe(GAME_PHASES.ENDED);
            expect(result.scores).toBeDefined();
            expect(result.winner).toBeDefined();
            expect(result.message).toContain('Game over');
        });
    });

    describe('isInBattlePhase', () => {
        it('should return true for battle phase', () => {
            expect(isInBattlePhase(mockSession)).toBe(true);
        });

        it('should return false for other phases', () => {
            mockSession.gamePhase = GAME_PHASES.WAITING;
            expect(isInBattlePhase(mockSession)).toBe(false);
        });

        it('should return false for null session', () => {
            expect(isInBattlePhase(null)).toBe(false);
        });
    });

    describe('isGameEnded', () => {
        it('should return true when game ended', () => {
            mockSession.gamePhase = GAME_PHASES.ENDED;
            expect(isGameEnded(mockSession)).toBe(true);
        });

        it('should return false for other phases', () => {
            expect(isGameEnded(mockSession)).toBe(false);
        });
    });

    describe('getCurrentTurnInfo', () => {
        it('should return current turn info', () => {
            const info = getCurrentTurnInfo(mockSession);

            expect(info.playerId).toBe('p1');
            expect(info.playerColor).toBe('red');
        });

        it('should return null for null playerOnTurn', () => {
            mockSession.playerOnTurn = null;
            expect(getCurrentTurnInfo(mockSession)).toBeNull();
        });
    });

    describe('setCurrentTurn', () => {
        it('should set the current turn player', () => {
            setCurrentTurn(mockSession, players[2]);
            expect(mockSession.playerOnTurn.id).toBe('p3');
        });
    });

    describe('processEndTurn', () => {
        it('should advance to next player', () => {
            const result = processEndTurn(mockSession, 'p1');

            expect(result.gameEnded).toBe(false);
            expect(result.nextPlayer.id).toBe('p2');
            expect(mockSession.playerOnTurn.id).toBe('p2');
        });

        it('should end game when conditions met', () => {
            mockSession.gameEnding = true;
            mockSession.playerOnTurn = players[3]; // Last player

            const result = processEndTurn(mockSession, 'p4');

            expect(result.gameEnded).toBe(true);
            expect(result.scores).toBeDefined();
            expect(result.winner).toBeDefined();
        });

        it('should continue if game ending but round not complete', () => {
            mockSession.gameEnding = true;

            const result = processEndTurn(mockSession, 'p1');

            expect(result.gameEnded).toBe(false);
            expect(result.nextPlayer.id).toBe('p2');
        });
    });
});
