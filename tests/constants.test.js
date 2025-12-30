import {
    DIRECTION_MAP,
    GAME_PHASES,
    CITY_VALID_TERRAINS,
    KNIGHT_VALID_TERRAINS,
    STRUCTURE_TYPES,
    PLAYER_COLORS,
    INITIAL_PIECES,
    INITIAL_HEX_COUNT,
    TERRAIN_TO_RESOURCE,
    NOBLE_TITLE_COST,
    DEFAULT_BOARD_SIZE,
    NOBLE_TITLES,
    TITLE_NAMES,
    INITIAL_RESOURCES
} from '../server/constants.js';

describe('Constants', () => {
    describe('DIRECTION_MAP', () => {
        it('should have EVEN and ODD direction arrays', () => {
            expect(DIRECTION_MAP.EVEN).toBeDefined();
            expect(DIRECTION_MAP.ODD).toBeDefined();
        });

        it('should have 6 directions for hexagonal grid', () => {
            expect(DIRECTION_MAP.EVEN.length).toBe(6);
            expect(DIRECTION_MAP.ODD.length).toBe(6);
        });

        it('should have correct EVEN row directions', () => {
            expect(DIRECTION_MAP.EVEN).toEqual([
                [-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]
            ]);
        });

        it('should have correct ODD row directions', () => {
            expect(DIRECTION_MAP.ODD).toEqual([
                [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]
            ]);
        });
    });

    describe('GAME_PHASES', () => {
        it('should have all game phases', () => {
            expect(GAME_PHASES.WAITING).toBe('waiting');
            expect(GAME_PHASES.PLACEMENT).toBe('placement');
            expect(GAME_PHASES.INITIAL_PLACEMENT).toBe('initialPlacement');
            expect(GAME_PHASES.BATTLE).toBe('battle');
            expect(GAME_PHASES.ENDED).toBe('ended');
        });

        it('should have 5 phases', () => {
            expect(Object.keys(GAME_PHASES).length).toBe(5);
        });
    });

    describe('CITY_VALID_TERRAINS', () => {
        it('should only allow cities on plain and farm', () => {
            expect(CITY_VALID_TERRAINS).toContain('plain.png');
            expect(CITY_VALID_TERRAINS).toContain('farm.png');
            expect(CITY_VALID_TERRAINS.length).toBe(2);
        });

        it('should NOT include water, mountain, or forest', () => {
            expect(CITY_VALID_TERRAINS).not.toContain('water.png');
            expect(CITY_VALID_TERRAINS).not.toContain('mountain.png');
            expect(CITY_VALID_TERRAINS).not.toContain('forest.png');
        });
    });

    describe('KNIGHT_VALID_TERRAINS', () => {
        it('should allow knights on all terrains except water', () => {
            expect(KNIGHT_VALID_TERRAINS).toContain('plain.png');
            expect(KNIGHT_VALID_TERRAINS).toContain('farm.png');
            expect(KNIGHT_VALID_TERRAINS).toContain('forest.png');
            expect(KNIGHT_VALID_TERRAINS).toContain('mountain.png');
            expect(KNIGHT_VALID_TERRAINS.length).toBe(4);
        });

        it('should NOT include water', () => {
            expect(KNIGHT_VALID_TERRAINS).not.toContain('water.png');
        });
    });

    describe('STRUCTURE_TYPES', () => {
        it('should include buildings (not knights)', () => {
            expect(STRUCTURE_TYPES).toContain('city');
            expect(STRUCTURE_TYPES).toContain('stronghold');
            expect(STRUCTURE_TYPES).toContain('village');
            expect(STRUCTURE_TYPES).not.toContain('knight');
        });
    });

    describe('PLAYER_COLORS', () => {
        it('should have 4 player colors', () => {
            expect(PLAYER_COLORS.length).toBe(4);
        });

        it('should include red, blue, green, yellow', () => {
            expect(PLAYER_COLORS).toContain('red');
            expect(PLAYER_COLORS).toContain('blue');
            expect(PLAYER_COLORS).toContain('green');
            expect(PLAYER_COLORS).toContain('yellow');
        });
    });

    describe('INITIAL_PIECES', () => {
        it('should have correct starting pieces', () => {
            expect(INITIAL_PIECES.city).toBe(5);
            expect(INITIAL_PIECES.stronghold).toBe(2);
            expect(INITIAL_PIECES.knight).toBe(7);
            expect(INITIAL_PIECES.village).toBe(14);
        });
    });

    describe('INITIAL_HEX_COUNT', () => {
        it('should have correct starting hex counts', () => {
            expect(INITIAL_HEX_COUNT.water).toBe(4);
            expect(INITIAL_HEX_COUNT.farm).toBe(6);
            expect(INITIAL_HEX_COUNT.mountain).toBe(5);
            expect(INITIAL_HEX_COUNT.plain).toBe(6);
            expect(INITIAL_HEX_COUNT.forest).toBe(6);
        });

        it('should total 27 hexes per player', () => {
            const total = Object.values(INITIAL_HEX_COUNT).reduce((sum, val) => sum + val, 0);
            expect(total).toBe(27);
        });
    });

    describe('TERRAIN_TO_RESOURCE', () => {
        it('should map terrains to resources correctly', () => {
            expect(TERRAIN_TO_RESOURCE['farm.png']).toBe('field');
            expect(TERRAIN_TO_RESOURCE['forest.png']).toBe('forest');
            expect(TERRAIN_TO_RESOURCE['mountain.png']).toBe('mountain');
            expect(TERRAIN_TO_RESOURCE['plain.png']).toBe('plain');
        });

        it('should NOT include water (no resource from water)', () => {
            expect(TERRAIN_TO_RESOURCE['water.png']).toBeUndefined();
        });
    });

    describe('NOBLE_TITLE_COST', () => {
        it('should be 15 resources', () => {
            expect(NOBLE_TITLE_COST).toBe(15);
        });
    });

    describe('DEFAULT_BOARD_SIZE', () => {
        it('should be 15x15', () => {
            expect(DEFAULT_BOARD_SIZE.rows).toBe(15);
            expect(DEFAULT_BOARD_SIZE.cols).toBe(15);
        });
    });

    describe('NOBLE_TITLES', () => {
        it('should have 5 titles in correct order', () => {
            expect(NOBLE_TITLES).toEqual(['baron', 'viscount', 'count', 'marquis', 'duke']);
        });

        it('should start with baron and end with duke', () => {
            expect(NOBLE_TITLES[0]).toBe('baron');
            expect(NOBLE_TITLES[NOBLE_TITLES.length - 1]).toBe('duke');
        });
    });

    describe('TITLE_NAMES', () => {
        it('should have display names for all titles', () => {
            expect(TITLE_NAMES.baron).toBe('Baron');
            expect(TITLE_NAMES.viscount).toBe('Viscount');
            expect(TITLE_NAMES.count).toBe('Count');
            expect(TITLE_NAMES.marquis).toBe('Marquis');
            expect(TITLE_NAMES.duke).toBe('Duke');
        });
    });

    describe('INITIAL_RESOURCES', () => {
        it('should have all resources starting at 0', () => {
            expect(INITIAL_RESOURCES.field).toBe(0);
            expect(INITIAL_RESOURCES.forest).toBe(0);
            expect(INITIAL_RESOURCES.mountain).toBe(0);
            expect(INITIAL_RESOURCES.plain).toBe(0);
        });
    });
});
