// ============================================
// PLAYER - Player State Model
// ============================================

import { RESOURCES } from './constants.js';

export class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.connected = true;

        // Resources
        this.resources = {
            [RESOURCES.WOOD]: 0,
            [RESOURCES.BRICK]: 0,
            [RESOURCES.WHEAT]: 0,
            [RESOURCES.SHEEP]: 0,
            [RESOURCES.ORE]: 0,
        };

        // Development cards
        this.devCards = [];
        this.playedDevCards = [];
        this.devCardPlayedThisTurn = false;
        this.devCardsBoughtThisTurn = []; // Can't play cards bought this turn

        // Buildings tracking
        this.settlements = [];  // vertex IDs
        this.cities = [];       // vertex IDs
        this.roads = [];        // edge IDs

        // Achievements
        this.knightsPlayed = 0;
        this.longestRoadLength = 0;
        this.hasLargestArmy = false;
        this.hasLongestRoad = false;

        // What needs to be discarded (robber)
        this.mustDiscard = 0;
    }

    get totalResources() {
        return Object.values(this.resources).reduce((a, b) => a + b, 0);
    }

    get victoryPoints() {
        let vp = 0;
        vp += this.settlements.length;      // 1 VP each
        vp += this.cities.length * 2;       // 2 VP each
        vp += this.hasLargestArmy ? 2 : 0;  // 2 VP
        vp += this.hasLongestRoad ? 2 : 0;  // 2 VP
        // VP from dev cards
        vp += this.playedDevCards.filter(c => c === 'victory_point').length;
        vp += this.devCards.filter(c => c === 'victory_point').length;
        return vp;
    }

    // Public VP (excludes hidden VP cards in hand)
    get publicVictoryPoints() {
        let vp = 0;
        vp += this.settlements.length;
        vp += this.cities.length * 2;
        vp += this.hasLargestArmy ? 2 : 0;
        vp += this.hasLongestRoad ? 2 : 0;
        vp += this.playedDevCards.filter(c => c === 'victory_point').length;
        return vp;
    }

    canAfford(costs) {
        return Object.entries(costs).every(([resource, amount]) =>
            this.resources[resource] >= amount
        );
    }

    pay(costs) {
        Object.entries(costs).forEach(([resource, amount]) => {
            this.resources[resource] -= amount;
        });
    }

    addResource(resource, amount = 1) {
        if (resource && this.resources[resource] !== undefined) {
            this.resources[resource] += amount;
        }
    }

    removeResource(resource, amount = 1) {
        if (resource && this.resources[resource] !== undefined) {
            this.resources[resource] = Math.max(0, this.resources[resource] - amount);
        }
    }

    // Serialize for the owning player (shows everything)
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            connected: this.connected,
            resources: { ...this.resources },
            totalResources: this.totalResources,
            devCards: [...this.devCards],
            devCardCount: this.devCards.length,
            playedDevCards: [...this.playedDevCards],
            settlements: [...this.settlements],
            cities: [...this.cities],
            roads: [...this.roads],
            knightsPlayed: this.knightsPlayed,
            longestRoadLength: this.longestRoadLength,
            hasLargestArmy: this.hasLargestArmy,
            hasLongestRoad: this.hasLongestRoad,
            victoryPoints: this.victoryPoints,
            publicVictoryPoints: this.publicVictoryPoints,
            mustDiscard: this.mustDiscard,
        };
    }

    // Serialize for OTHER players (hides resources and dev cards)
    toPublicJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            connected: this.connected,
            totalResources: this.totalResources,
            devCardCount: this.devCards.length,
            playedDevCards: [...this.playedDevCards],
            settlements: [...this.settlements],
            cities: [...this.cities],
            roads: [...this.roads],
            knightsPlayed: this.knightsPlayed,
            longestRoadLength: this.longestRoadLength,
            hasLargestArmy: this.hasLargestArmy,
            hasLongestRoad: this.hasLongestRoad,
            publicVictoryPoints: this.publicVictoryPoints,
            mustDiscard: this.mustDiscard,
        };
    }
}
