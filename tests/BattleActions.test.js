import {
    executeRecruitment,
    executeMovement,
    processCombat,
    executeConstruction,
    executeNewCity,
    executeExpedition,
    executeNobleTitle,
    hasAdjacentCity,
    calculateFinalScore,
    checkVictoryCondition
} from '../server/BattleActions.js';
import { createEmptyBoard } from '../server/utils.js';

// Helper to create a mock player
function createMockPlayer(id, color, overrides = {}) {
    return {
        id,
        color,
        pieces: { knight: 7, city: 5, village: 14, stronghold: 2 },
        resources: { field: 0, forest: 0, mountain: 0, plain: 0 },
        title: 'baron',
        victoryPoints: 0,
        addResource(texture) {
            const map = {
                'farm.png': 'field',
                'forest.png': 'forest',
                'mountain.png': 'mountain',
                'plain.png': 'plain'
            };
            const resource = map[texture];
            if (resource) {
                this.resources[resource]++;
                return resource;
            }
            return null;
        },
        getTotalResources() {
            // field=5pts, forest=3pts, mountain=2pts, plain=4pts
            const values = { field: 5, forest: 3, mountain: 2, plain: 4 };
            let total = 0;
            for (const [resource, count] of Object.entries(this.resources)) {
                total += count * (values[resource] || 0);
            }
            return total;
        },
        spendResources(amount) {
            let remaining = amount;
            for (const key of Object.keys(this.resources)) {
                const spent = Math.min(this.resources[key], remaining);
                this.resources[key] -= spent;
                remaining -= spent;
                if (remaining <= 0) break;
            }
        },
        promoteTitle() {
            const titles = ['baron', 'viscount', 'count', 'marquis', 'duke'];
            const idx = titles.indexOf(this.title);
            if (idx < titles.length - 1) {
                this.title = titles[idx + 1];
            }
        },
        getTitleName() {
            const names = { baron: 'Baron', viscount: 'Viscount', count: 'Count', marquis: 'Marquis', duke: 'Duke' };
            return names[this.title];
        },
        addVictoryPoints(points) {
            this.victoryPoints += points;
        },
        ...overrides
    };
}

describe('BattleActions', () => {
    let board;
    let player;
    let players;

    beforeEach(() => {
        board = createEmptyBoard(5, 5);
        player = createMockPlayer('p1', 'red');
        players = { p1: player };
    });

    describe('executeRecruitment', () => {
        it('should recruit 2 knights at city', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];

            const result = executeRecruitment(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('2 knights recruited');
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(2);
            expect(player.pieces.knight).toBe(5);
        });

        it('should recruit 3 knights when adjacent to water', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'water.png';

            const result = executeRecruitment(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('3 knights recruited');
            expect(result.message).toContain('Lake bonus');
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(3);
            expect(player.pieces.knight).toBe(4);
        });

        it('should fail if no city at hex', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [];

            const result = executeRecruitment(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('cities');
        });

        it('should fail if not enough knights available', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];
            player.pieces.knight = 1;

            const result = executeRecruitment(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('knights available');
        });

        it('should fail for invalid hex', () => {
            const result = executeRecruitment(board, player, { row: 99, col: 99 }, players);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid hex!');
        });

        it('should recruit specified number of knights', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];

            const result = executeRecruitment(board, player, { row: 2, col: 2, knightCount: 1 }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('1 knight recruited');
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(1);
            expect(player.pieces.knight).toBe(6);
        });

        it('should not exceed max knights when adjacent to water', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'water.png';

            // Request 5 knights but max is 3 near water
            const result = executeRecruitment(board, player, { row: 2, col: 2, knightCount: 5 }, players);

            expect(result.success).toBe(true);
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(3);
            expect(player.pieces.knight).toBe(4);
        });

        it('should not exceed max knights when not adjacent to water', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];

            // Request 5 knights but max is 2 without water
            const result = executeRecruitment(board, player, { row: 2, col: 2, knightCount: 5 }, players);

            expect(result.success).toBe(true);
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(2);
            expect(player.pieces.knight).toBe(5);
        });

        it('should fail if recruiting zero knights', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'city', owner: 'p1', color: 'red' }];

            const result = executeRecruitment(board, player, { row: 2, col: 2, knightCount: 0 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('at least 1');
        });
    });

    describe('executeMovement', () => {
        it('should move knight to adjacent hex', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'plain.png';
            board[2][3].pieces = [];

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(true);
            expect(board[2][2].pieces.length).toBe(0);
            expect(board[2][3].pieces.length).toBe(1);
        });

        it('should fail to move to water', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'water.png';

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('water');
        });

        it('should fail to move to non-adjacent hex', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[4][4].texture = 'plain.png';

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 4, col: 4 } }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('adjacent');
        });

        it('should fail to enter enemy city', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'plain.png';
            board[2][3].pieces = [{ type: 'city', owner: 'p2', color: 'blue' }];

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('enemy city');
        });

        it('should fail to enter enemy stronghold', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'plain.png';
            board[2][3].pieces = [{ type: 'stronghold', owner: 'p2', color: 'blue' }];

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('enemy stronghold');
        });

        it('should fail to enter hex with 2+ enemy knights', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'plain.png';
            board[2][3].pieces = [
                { type: 'knight', owner: 'p2', color: 'blue' },
                { type: 'knight', owner: 'p2', color: 'blue' }
            ];

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('2+ enemy knights');
        });

        it('should fail to enter mountain with enemy piece', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'mountain.png';
            board[2][3].pieces = [{ type: 'knight', owner: 'p2', color: 'blue' }];

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('mountain');
        });

        it('should remove only one knight when moving from hex with multiple knights', () => {
            // Setup: city with 3 knights (like after recruitment)
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [
                { type: 'city', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' }
            ];
            board[2][3].texture = 'plain.png';
            board[2][3].pieces = [];

            const result = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);

            expect(result.success).toBe(true);
            // Origin should have city + 2 knights remaining
            expect(board[2][2].pieces.length).toBe(3);
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(2);
            expect(board[2][2].pieces.filter(p => p.type === 'city').length).toBe(1);
            // Destination should have 1 knight
            expect(board[2][3].pieces.length).toBe(1);
            expect(board[2][3].pieces[0].type).toBe('knight');
        });

        it('should move knight correctly when hex has city and multiple knights', () => {
            // Setup similar to in-game scenario
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [
                { type: 'city', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' }
            ];
            board[2][3].texture = 'forest.png';
            board[2][3].pieces = [];

            // Move first knight
            const result1 = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 3 } }, players);
            expect(result1.success).toBe(true);
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(1);
            expect(board[2][3].pieces.length).toBe(1);

            // Move second knight to different hex
            board[2][1].texture = 'plain.png';
            board[2][1].pieces = [];
            const result2 = executeMovement(board, player, { from: { row: 2, col: 2 }, to: { row: 2, col: 1 } }, players);
            expect(result2.success).toBe(true);
            expect(board[2][2].pieces.filter(p => p.type === 'knight').length).toBe(0);
            expect(board[2][2].pieces.filter(p => p.type === 'city').length).toBe(1);
            expect(board[2][1].pieces.length).toBe(1);
        });
    });

    describe('processCombat', () => {
        it('should return no combat when no enemies', () => {
            const hex = { pieces: [{ type: 'knight', color: 'red' }] };
            const result = processCombat(board, player, hex, 2, 2, players);
            expect(result.occurred).toBe(false);
        });

        it('should destroy enemy village with 2 knights and steal most valuable resource', () => {
            const enemy = createMockPlayer('p2', 'blue');
            // Give enemy some resources - field is most valuable (5 points)
            enemy.resources = { field: 2, forest: 1, mountain: 3, plain: 0 };
            players.p2 = enemy;
            board[2][2].texture = 'plain.png';

            const hex = board[2][2];
            hex.pieces = [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'village', owner: 'p2', color: 'blue' }
            ];

            const result = processCombat(board, player, hex, 2, 2, players);

            expect(result.occurred).toBe(true);
            expect(result.destroyed).toContain('village');
            expect(result.resourceGained).toBe('field'); // Most valuable stolen
            expect(enemy.pieces.village).toBe(15); // Returned to reserve
            expect(enemy.resources.field).toBe(1); // Lost one field
            expect(player.resources.field).toBe(1); // Gained one field
        });

        it('should not steal resource if defender has none', () => {
            const enemy = createMockPlayer('p2', 'blue');
            // Enemy has no resources
            enemy.resources = { field: 0, forest: 0, mountain: 0, plain: 0 };
            players.p2 = enemy;
            board[2][2].texture = 'plain.png';

            const hex = board[2][2];
            hex.pieces = [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'village', owner: 'p2', color: 'blue' }
            ];

            const result = processCombat(board, player, hex, 2, 2, players);

            expect(result.occurred).toBe(true);
            expect(result.destroyed).toContain('village');
            expect(result.resourceGained).toBeNull(); // No resource to steal
            expect(enemy.pieces.village).toBe(15);
        });

        it('should not destroy village if enemy knight is present', () => {
            const enemy = createMockPlayer('p2', 'blue');
            enemy.resources = { field: 2, forest: 0, mountain: 0, plain: 0 };
            players.p2 = enemy;
            board[2][2].texture = 'plain.png';

            const hex = board[2][2];
            hex.pieces = [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'village', owner: 'p2', color: 'blue' },
                { type: 'knight', owner: 'p2', color: 'blue' }  // Enemy knight protects village
            ];

            const result = processCombat(board, player, hex, 2, 2, players);

            expect(result.occurred).toBe(true);
            // Knight should be destroyed, not village
            expect(result.destroyed).toContain('knight');
            expect(result.destroyed).not.toContain('village');
            // Village owner should not lose resources
            expect(enemy.resources.field).toBe(2);
        });

        it('should destroy enemy knight with 2+ knights', () => {
            const enemy = createMockPlayer('p2', 'blue');
            players.p2 = enemy;

            const hex = { pieces: [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p2', color: 'blue' }
            ]};

            const result = processCombat(board, player, hex, 2, 2, players);

            expect(result.occurred).toBe(true);
            expect(result.destroyed).toContain('knight');
            expect(enemy.pieces.knight).toBe(8); // Returned to reserve
        });

        it('should not combat with only 1 knight vs 1 enemy', () => {
            const hex = { pieces: [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p2', color: 'blue' }
            ]};

            const result = processCombat(board, player, hex, 2, 2, players);

            expect(result.occurred).toBe(false);
        });
    });

    describe('executeConstruction', () => {
        it('should build village', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];

            const result = executeConstruction(board, player, { row: 2, col: 2, buildType: 'village' }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Village built');
            expect(board[2][2].pieces.some(p => p.type === 'village')).toBe(true);
            expect(player.pieces.knight).toBe(8); // Returned to reserve
            expect(player.pieces.village).toBe(13);
        });

        it('should build stronghold', () => {
            board[2][2].texture = 'mountain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];

            const result = executeConstruction(board, player, { row: 2, col: 2, buildType: 'stronghold' }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Stronghold built');
            expect(board[2][2].pieces.some(p => p.type === 'stronghold')).toBe(true);
            expect(player.pieces.stronghold).toBe(1);
        });

        it('should fail if structure already exists', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'city', owner: 'p1', color: 'red' }
            ];

            const result = executeConstruction(board, player, { row: 2, col: 2, buildType: 'village' }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('structure already exists');
        });

        it('should fail with enemy knight present', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [
                { type: 'knight', owner: 'p1', color: 'red' },
                { type: 'knight', owner: 'p2', color: 'blue' }
            ];

            const result = executeConstruction(board, player, { row: 2, col: 2, buildType: 'village' }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('enemy knight');
        });

        it('should fail if no villages available', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'knight', owner: 'p1', color: 'red' }];
            player.pieces.village = 0;

            const result = executeConstruction(board, player, { row: 2, col: 2, buildType: 'village' }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('No villages');
        });
    });

    describe('executeNewCity', () => {
        it('should convert village to city', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'village', owner: 'p1', color: 'red' }];

            const result = executeNewCity(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('city founded');
            expect(board[2][2].pieces.some(p => p.type === 'city')).toBe(true);
            expect(player.pieces.village).toBe(15); // Returned
            expect(player.pieces.city).toBe(4);
            expect(player.victoryPoints).toBe(10);
        });

        it('should fail in forest', () => {
            board[2][2].texture = 'forest.png';
            board[2][2].pieces = [{ type: 'village', owner: 'p1', color: 'red' }];

            const result = executeNewCity(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('forest');
        });

        it('should fail if adjacent to city', () => {
            board[2][2].texture = 'plain.png';
            board[2][2].pieces = [{ type: 'village', owner: 'p1', color: 'red' }];
            board[2][3].texture = 'plain.png';
            board[2][3].pieces = [{ type: 'city', owner: 'p2', color: 'blue' }];

            const result = executeNewCity(board, player, { row: 2, col: 2 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('adjacent');
        });
    });

    describe('executeExpedition', () => {
        it('should place knight on border', () => {
            // Make hex a border by having it on edge
            board[0][0].texture = 'plain.png';
            board[0][0].pieces = [];

            const result = executeExpedition(board, player, { row: 0, col: 0 }, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Expedition complete');
            expect(board[0][0].pieces.length).toBe(1);
            expect(player.pieces.knight).toBe(5); // 7 - 2
        });

        it('should fail if not enough knights', () => {
            board[0][0].texture = 'plain.png';
            board[0][0].pieces = [];
            player.pieces.knight = 1;

            const result = executeExpedition(board, player, { row: 0, col: 0 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('2 knights');
        });

        it('should fail if hex not empty', () => {
            board[0][0].texture = 'plain.png';
            board[0][0].pieces = [{ type: 'knight', owner: 'p2', color: 'blue' }];

            const result = executeExpedition(board, player, { row: 0, col: 0 }, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('empty');
        });

        it('should fail on water', () => {
            board[0][0].texture = 'water.png';
            board[0][0].pieces = [];

            const result = executeExpedition(board, player, { row: 0, col: 0 }, players);

            expect(result.success).toBe(false);
        });
    });

    describe('executeNobleTitle', () => {
        it('should promote title when enough resources', () => {
            player.resources = { field: 5, forest: 5, mountain: 3, plain: 2 };

            const result = executeNobleTitle(board, player, {}, players);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Baron');
            expect(result.message).toContain('Viscount');
            expect(player.title).toBe('viscount');
            expect(player.getTotalResources()).toBe(0);
        });

        it('should fail if not enough resources', () => {
            player.resources = { field: 1, forest: 1, mountain: 1, plain: 1 };

            const result = executeNobleTitle(board, player, {}, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Insufficient');
        });

        it('should fail if already duke', () => {
            player.title = 'duke';
            player.resources = { field: 10, forest: 10, mountain: 10, plain: 10 };

            const result = executeNobleTitle(board, player, {}, players);

            expect(result.success).toBe(false);
            expect(result.message).toContain('already Duke');
        });
    });

    describe('hasAdjacentCity', () => {
        it('should return true when adjacent to city', () => {
            board[2][3].pieces = [{ type: 'city', color: 'red' }];
            expect(hasAdjacentCity(board, 2, 2)).toBe(true);
        });

        it('should return false when no adjacent city', () => {
            expect(hasAdjacentCity(board, 2, 2)).toBe(false);
        });
    });

    describe('calculateFinalScore', () => {
        it('should calculate score correctly', () => {
            player.victoryPoints = 20;
            // field=5pts, forest=3pts, mountain=2pts, plain=4pts
            player.resources = { field: 2, forest: 3, mountain: 1, plain: 0 };

            const score = calculateFinalScore(player);

            // 20 VP + (2*5 + 3*3 + 1*2) = 20 + 21 = 41
            expect(score).toBe(41);
        });

        it('should not give points for title (only VP + resources)', () => {
            player.victoryPoints = 0;
            player.resources = { field: 0, forest: 0, mountain: 0, plain: 0 };
            player.title = 'duke';

            const score = calculateFinalScore(player);
            expect(score).toBe(0); // No VP, no resources = 0 points
        });
    });

    describe('checkVictoryCondition', () => {
        it('should detect duke victory', () => {
            player.title = 'duke';
            const session = { gameEnding: false };

            const result = checkVictoryCondition(session, player);

            expect(result.isDuke).toBe(true);
            expect(session.gameEnding).toBe(true);
            expect(session.dukePlayerId).toBe('p1');
        });

        it('should not trigger if not duke', () => {
            player.title = 'marquis';
            const session = { gameEnding: false };

            const result = checkVictoryCondition(session, player);

            expect(result.isDuke).toBe(false);
        });

        it('should not trigger if game already ending', () => {
            player.title = 'duke';
            const session = { gameEnding: true };

            const result = checkVictoryCondition(session, player);

            expect(result.isDuke).toBe(false);
        });
    });
});
