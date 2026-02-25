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
  WATER: 'water',
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

// ---- MAP TYPES ----

export const MAP_TYPES = {
  BASE: 'base',
  BASE_5_6: 'base_5_6',
  DIAMOND: 'diamond',
  RANDOM: 'random',
  BIG: 'big',
  FOG_ISLAND: 'fog_island',
  ARCHIPELAGO: 'archipelago',
  RING_OF_FIRE: 'ring_of_fire',
  TWIN_PEAKS: 'twin_peaks',
};

// Generate hexagonal grid coordinates for a given radius
function hexRadius(r) {
  const hexes = [];
  for (let q = -r; q <= r; q++) {
    const r1 = Math.max(-r, -q - r);
    const r2 = Math.min(r, -q + r);
    for (let rr = r1; rr <= r2; rr++) {
      hexes.push({ q, r: rr });
    }
  }
  return hexes;
}

// Generate diamond-shaped hex grid
function diamondShape(playerCount) {
  const hexes = [];
  const size = playerCount > 6 ? 5 : (playerCount > 4 ? 4 : 3);
  for (let q = -size; q <= size; q++) {
    for (let r = -size; r <= size; r++) {
      if (Math.abs(q) + Math.abs(r) + Math.abs(-(q + r)) <= size * 2 && Math.abs(q) <= size && Math.abs(r) <= size) {
        // Simple diamond filter
        if (Math.abs(q - r) <= size) hexes.push({ q, r });
      }
    }
  }
  return hexes;
}

function archipelagoShape(playerCount) {
  const hexes = [];
  // Small islands in corners + middle
  const count = playerCount > 6 ? 9 : (playerCount > 4 ? 6 : 4);
  const spread = playerCount > 4 ? 5 : 3;

  const centers = [
    { q: -spread, r: 0 }, { q: spread, r: -spread }, { q: 0, r: spread }, { q: spread, r: 0 },
  ];
  if (count >= 6) {
    centers.push({ q: -spread, r: spread }, { q: 0, r: -spread });
  }
  if (count >= 9) {
    centers.push({ q: -spread * 1.5, r: 0 }, { q: spread * 1.5, r: -spread * 1.5 }, { q: 0, r: spread * 1.5 });
  }

  centers.forEach(c => {
    hexes.push({ q: c.q, r: c.r });
    hexes.push({ q: c.q + 1, r: c.r });
    hexes.push({ q: c.q, r: c.r + 1 });
  });
  return hexes;
}

function ringOfFireShape(playerCount) {
  const radius = playerCount > 6 ? 5 : (playerCount > 4 ? 4 : 3);
  return hexRadius(radius);
}

function twinPeaksShape(playerCount) {
  const hexes = [];
  const spread = playerCount > 6 ? 6 : (playerCount > 4 ? 5 : 4);
  // Two clusters
  for (let q = -spread; q <= -1; q++) {
    for (let r = -2; r <= spread - 2; r++) {
      if (Math.abs(q + r) <= 2) hexes.push({ q, r });
    }
  }
  for (let q = 1; q <= spread; q++) {
    for (let r = -(spread - 2); r <= 2; r++) {
      if (Math.abs(q + r) <= 2) hexes.push({ q, r });
    }
  }
  // Bridge hex
  hexes.push({ q: 0, r: 0 });
  return hexes;
}

export const MAP_CONFIGS = {
  [MAP_TYPES.BASE]: {
    label: 'Base',
    icon: '🏝️',
    description: 'Dynamic board for 2-8 players',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: (p) => hexRadius(p > 6 ? 4 : (p > 4 ? 3 : 2)),
    deserts: 1,
    victoryPoints: 10,
  },
  [MAP_TYPES.BASE_5_6]: {
    label: 'Base 5-6P',
    icon: '🗺️',
    description: 'Classic Extended board',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: (p) => hexRadius(p > 6 ? 5 : 3),
    deserts: 2,
    victoryPoints: 12,
  },
  [MAP_TYPES.DIAMOND]: {
    label: 'Diamond',
    icon: '💎',
    description: 'Scalable diamond board',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: diamondShape,
    deserts: 1,
    victoryPoints: 10,
  },
  [MAP_TYPES.RANDOM]: {
    label: 'Random',
    icon: '🎲',
    description: 'Scalable randomized layout',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: (p) => hexRadius(p > 6 ? 4 : (p > 4 ? 3 : 2)),
    deserts: 1,
    victoryPoints: 10,
    fullyRandom: true,
  },
  [MAP_TYPES.BIG]: {
    label: 'Big 7-8P',
    icon: '🌍',
    description: 'Always massive board',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: (p) => hexRadius(p > 4 ? 5 : 4),
    deserts: 3,
    victoryPoints: 14,
  },
  [MAP_TYPES.FOG_ISLAND]: {
    label: 'Fog Island',
    icon: '🌫️',
    description: 'Discover more land!',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: (p) => hexRadius(p > 6 ? 6 : 5),
    deserts: 1,
    victoryPoints: 10,
    fogMode: true,
    fogRadius: 3,
  },
  [MAP_TYPES.ARCHIPELAGO]: {
    label: 'Archipelago',
    icon: '🏝️🏝️',
    description: 'Islands grow with players',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: archipelagoShape,
    deserts: 0,
    victoryPoints: 10,
  },
  [MAP_TYPES.RING_OF_FIRE]: {
    label: 'Ring of Fire',
    icon: '🌋',
    description: 'Fire ring scales up',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: ringOfFireShape,
    deserts: 1,
    victoryPoints: 12,
  },
  [MAP_TYPES.TWIN_PEAKS]: {
    label: 'Twin Peaks',
    icon: '🏔️🏔️',
    description: 'Peaks move apart for more players',
    minPlayers: 2,
    maxPlayers: 8,
    getHexes: twinPeaksShape,
    deserts: 2,
    victoryPoints: 12,
  },
};

// ---- GAME SETTINGS ----

export const DEFAULT_GAME_SETTINGS = {
  mapType: MAP_TYPES.BASE,
  friendlyRobber: false,  // Robber can't target players with ≤2 VP
  speedMode: false,        // Start with extra resources
  victoryPoints: 10,
  harbormaster: false,    // Bonus VP for having most ports
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
