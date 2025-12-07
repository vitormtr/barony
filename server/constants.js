// Shared constants for Barony game

// Direction maps for hexagonal grid navigation
export const DIRECTION_MAP = {
    EVEN: [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]],
    ODD: [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]]
};

// Helper function to get directions based on row
export const getDirections = (row) => row % 2 === 1 ? DIRECTION_MAP.ODD : DIRECTION_MAP.EVEN;

// Game phases
export const GAME_PHASES = {
    WAITING: 'waiting',
    PLACEMENT: 'placement',
    INITIAL_PLACEMENT: 'initialPlacement',
    BATTLE: 'battle',
    ENDED: 'ended'
};

// Available textures
export const TEXTURES = ['water.png', 'farm.png', 'mountain.png', 'plain.png', 'forest.png'];

// Terrain types (without .png extension)
export const TERRAIN_TYPES = {
    WATER: 'water',
    FARM: 'farm',
    MOUNTAIN: 'mountain',
    PLAIN: 'plain',
    FOREST: 'forest'
};

// Terrains where cities can be placed (only plain and field - NOT forest, mountain or water)
export const CITY_VALID_TERRAINS = ['plain.png', 'farm.png'];

// Terrains where knights can be placed (any except water)
export const KNIGHT_VALID_TERRAINS = ['farm.png', 'plain.png', 'forest.png', 'mountain.png'];

// Piece types
export const PIECE_TYPES = {
    CITY: 'city',
    STRONGHOLD: 'stronghold',
    KNIGHT: 'knight',
    VILLAGE: 'village'
};

// Structure types (pieces that are buildings)
export const STRUCTURE_TYPES = ['city', 'stronghold', 'village'];

// Player colors
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'];

// Initial player pieces
export const INITIAL_PIECES = {
    city: 5,
    stronghold: 2,
    knight: 7,
    village: 14
};

// Initial hex count per player
export const INITIAL_HEX_COUNT = {
    water: 4,
    farm: 6,
    mountain: 5,
    plain: 6,
    forest: 6
};

// Resource types and their terrain mapping
export const TERRAIN_TO_RESOURCE = {
    'farm.png': 'field',
    'forest.png': 'forest',
    'mountain.png': 'mountain',
    'plain.png': 'plain'
};

// Cost for noble title promotion
export const NOBLE_TITLE_COST = 15;

// Board dimensions
export const DEFAULT_BOARD_SIZE = {
    rows: 15,
    cols: 15
};

// Noble titles in order of progression
export const NOBLE_TITLES = ['baron', 'viscount', 'count', 'marquis', 'duke'];

// Noble title display names
export const TITLE_NAMES = {
    baron: 'Baron',
    viscount: 'Viscount',
    count: 'Count',
    marquis: 'Marquis',
    duke: 'Duke'
};

// Initial resources (all start at 0)
export const INITIAL_RESOURCES = {
    field: 0,
    forest: 0,
    mountain: 0,
    plain: 0
};
