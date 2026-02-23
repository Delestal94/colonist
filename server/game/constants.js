// ============================================
// CONSTANTS - Resources, Costs, Board Configs
// ============================================

export const RESOURCES = {
  WOOD: 'wood',
  BRICK: 'brick',
  WHEAT: 'wheat',
  SHEEP: 'sheep',
  ORE: 'ore',
};

export const TERRAIN = {
  FOREST: 'forest',
  HILLS: 'hills',
  FIELDS: 'fields',
  PASTURE: 'pasture',
  MOUNTAINS: 'mountains',
  DESERT: 'desert',
};

export const TERRAIN_TO_RESOURCE = {
  [TERRAIN.FOREST]: RESOURCES.WOOD,
  [TERRAIN.HILLS]: RESOURCES.BRICK,
  [TERRAIN.FIELDS]: RESOURCES.WHEAT,
  [TERRAIN.PASTURE]: RESOURCES.SHEEP,
  [TERRAIN.MOUNTAINS]: RESOURCES.ORE,
  [TERRAIN.DESERT]: null,
};

export const BUILDING_COSTS = {
  road: { [RESOURCES.WOOD]: 1, [RESOURCES.BRICK]: 1 },
  settlement: { [RESOURCES.WOOD]: 1, [RESOURCES.BRICK]: 1, [RESOURCES.WHEAT]: 1, [RESOURCES.SHEEP]: 1 },
  city: { [RESOURCES.ORE]: 3, [RESOURCES.WHEAT]: 2 },
  devCard: { [RESOURCES.ORE]: 1, [RESOURCES.WHEAT]: 1, [RESOURCES.SHEEP]: 1 },
};

export const BUILDING_LIMITS = {
  settlement: 5,
  city: 4,
  road: 15,
};

// Board size configs: radius is the number of rings around center
export const BOARD_CONFIGS = {
  2: { radius: 2, deserts: 1, victoryPoints: 10 },
  3: { radius: 2, deserts: 1, victoryPoints: 10 },
  4: { radius: 2, deserts: 1, victoryPoints: 10 },
  5: { radius: 3, deserts: 2, victoryPoints: 12 },
  6: { radius: 3, deserts: 2, victoryPoints: 12 },
  7: { radius: 4, deserts: 2, victoryPoints: 14 },
  8: { radius: 4, deserts: 3, victoryPoints: 14 },
};

// Number tokens (excluding 7) with their dot counts for probability
export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export const DEV_CARD_TYPES = {
  KNIGHT: 'knight',
  VICTORY_POINT: 'victory_point',
  ROAD_BUILDING: 'road_building',
  YEAR_OF_PLENTY: 'year_of_plenty',
  MONOPOLY: 'monopoly',
};

// Base deck composition (for 3-4 players)
export const BASE_DEV_DECK = {
  [DEV_CARD_TYPES.KNIGHT]: 14,
  [DEV_CARD_TYPES.VICTORY_POINT]: 5,
  [DEV_CARD_TYPES.ROAD_BUILDING]: 2,
  [DEV_CARD_TYPES.YEAR_OF_PLENTY]: 2,
  [DEV_CARD_TYPES.MONOPOLY]: 2,
};

export const PORT_TYPES = {
  GENERIC: 'generic',       // 3:1
  WOOD: RESOURCES.WOOD,     // 2:1
  BRICK: RESOURCES.BRICK,
  WHEAT: RESOURCES.WHEAT,
  SHEEP: RESOURCES.SHEEP,
  ORE: RESOURCES.ORE,
};

export const GAME_PHASES = {
  LOBBY: 'lobby',
  SETUP_SETTLEMENT_1: 'setup_settlement_1',
  SETUP_ROAD_1: 'setup_road_1',
  SETUP_SETTLEMENT_2: 'setup_settlement_2',
  SETUP_ROAD_2: 'setup_road_2',
  ROLL_DICE: 'roll_dice',
  DISCARD: 'discard',
  MOVE_ROBBER: 'move_robber',
  STEAL: 'steal',
  MAIN: 'main',
  GAME_OVER: 'game_over',
};

export const PLAYER_COLORS = [
  '#E74C3C', // Red
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#F39C12', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
  '#E91E63', // Pink
  '#FF9800', // Amber
];
