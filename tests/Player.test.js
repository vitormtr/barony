import { Player, NOBLE_TITLES, TITLE_NAMES } from '../server/Player.js';

describe('Player', () => {
  let player;

  beforeEach(() => {
    player = new Player('socket123', 'red');
  });

  describe('initialization', () => {
    test('should create player with correct id and color', () => {
      expect(player.id).toBe('socket123');
      expect(player.color).toBe('red');
    });

    test('should set correct image path', () => {
      expect(player.image).toBe('redplayer.png');
    });

    test('should initialize with baron title', () => {
      expect(player.title).toBe('baron');
    });

    test('should initialize with 0 victory points', () => {
      expect(player.victoryPoints).toBe(0);
    });

    test('should initialize correct hex counts', () => {
      expect(player.hexCount).toEqual({
        water: 4,
        farm: 6,
        mountain: 5,
        plain: 6,
        forest: 6
      });
    });

    test('should initialize correct pieces', () => {
      expect(player.pieces).toEqual({
        city: 5,
        stronghold: 2,
        knight: 7,
        village: 14
      });
    });

    test('should initialize resources to zero', () => {
      expect(player.resources).toEqual({
        field: 0,
        forest: 0,
        mountain: 0,
        plain: 0
      });
    });
  });

  describe('updateTextures', () => {
    test('should decrement texture count when used', () => {
      player.updateTextures('forest.png');
      expect(player.hexCount.forest).toBe(5);
    });

    test('should handle texture name without .png', () => {
      player.updateTextures('mountain');
      expect(player.hexCount.mountain).toBe(4);
    });

    test('should not go below zero', () => {
      player.hexCount.water = 0;
      player.updateTextures('water.png');
      expect(player.hexCount.water).toBe(0);
    });
  });

  describe('addResource', () => {
    test('should add field resource for farm terrain', () => {
      const result = player.addResource('farm.png');
      expect(result).toBe('field');
      expect(player.resources.field).toBe(1);
    });

    test('should add forest resource for forest terrain', () => {
      const result = player.addResource('forest.png');
      expect(result).toBe('forest');
      expect(player.resources.forest).toBe(1);
    });

    test('should add mountain resource for mountain terrain', () => {
      const result = player.addResource('mountain.png');
      expect(result).toBe('mountain');
      expect(player.resources.mountain).toBe(1);
    });

    test('should add plain resource for plain terrain', () => {
      const result = player.addResource('plain.png');
      expect(result).toBe('plain');
      expect(player.resources.plain).toBe(1);
    });

    test('should return null for water terrain', () => {
      const result = player.addResource('water.png');
      expect(result).toBe(null);
    });
  });

  describe('getTotalResources', () => {
    test('should return 0 for new player', () => {
      expect(player.getTotalResources()).toBe(0);
    });

    test('should sum all resources', () => {
      player.resources.field = 3;
      player.resources.forest = 2;
      player.resources.mountain = 5;
      player.resources.plain = 4;
      expect(player.getTotalResources()).toBe(14);
    });
  });

  describe('spendResources', () => {
    test('should spend resources correctly', () => {
      player.resources.field = 10;
      player.resources.forest = 5;
      const success = player.spendResources(15);
      expect(success).toBe(true);
      expect(player.getTotalResources()).toBe(0);
    });

    test('should return true when exact amount available', () => {
      player.resources.field = 15;
      const success = player.spendResources(15);
      expect(success).toBe(true);
    });

    test('should spend from multiple resource types', () => {
      player.resources.field = 5;
      player.resources.forest = 5;
      player.resources.mountain = 5;
      player.spendResources(12);
      expect(player.getTotalResources()).toBe(3);
    });
  });

  describe('promoteTitle', () => {
    test('should promote from baron to viscount', () => {
      const result = player.promoteTitle();
      expect(result).toBe(true);
      expect(player.title).toBe('viscount');
    });

    test('should promote through all titles', () => {
      player.promoteTitle(); // viscount
      player.promoteTitle(); // count
      player.promoteTitle(); // marquis
      player.promoteTitle(); // duke
      expect(player.title).toBe('duke');
    });

    test('should return false when already duke', () => {
      player.title = 'duke';
      const result = player.promoteTitle();
      expect(result).toBe(false);
      expect(player.title).toBe('duke');
    });
  });

  describe('getTitleName', () => {
    test('should return Baron for baron', () => {
      expect(player.getTitleName()).toBe('Baron');
    });

    test('should return correct names for all titles', () => {
      player.title = 'viscount';
      expect(player.getTitleName()).toBe('Viscount');

      player.title = 'count';
      expect(player.getTitleName()).toBe('Count');

      player.title = 'marquis';
      expect(player.getTitleName()).toBe('Marquis');

      player.title = 'duke';
      expect(player.getTitleName()).toBe('Duke');
    });
  });

  describe('addVictoryPoints', () => {
    test('should add victory points', () => {
      player.addVictoryPoints(10);
      expect(player.victoryPoints).toBe(10);
    });

    test('should accumulate victory points', () => {
      player.addVictoryPoints(10);
      player.addVictoryPoints(10);
      player.addVictoryPoints(10);
      expect(player.victoryPoints).toBe(30);
    });
  });

  describe('toJSON', () => {
    test('should return serializable object', () => {
      const json = player.toJSON();
      expect(json).toHaveProperty('id', 'socket123');
      expect(json).toHaveProperty('color', 'red');
      expect(json).toHaveProperty('titleName', 'Baron');
    });
  });
});

describe('NOBLE_TITLES', () => {
  test('should have correct order', () => {
    expect(NOBLE_TITLES).toEqual(['baron', 'viscount', 'count', 'marquis', 'duke']);
  });
});

describe('TITLE_NAMES', () => {
  test('should have English names', () => {
    expect(TITLE_NAMES.baron).toBe('Baron');
    expect(TITLE_NAMES.duke).toBe('Duke');
  });
});
