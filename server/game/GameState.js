// ============================================
// GAME STATE - Core Game Logic
// ============================================

import { Board } from './Board.js';
import { Player } from './Player.js';
import { DevelopmentCards } from './DevelopmentCards.js';
import { TradeManager } from './TradeManager.js';
import {
    RESOURCES, BUILDING_COSTS, BUILDING_LIMITS,
    GAME_PHASES, PLAYER_COLORS, BOARD_CONFIGS, DEV_CARD_TYPES,
    DEFAULT_GAME_SETTINGS, MAP_CONFIGS, MAP_TYPES,
} from './constants.js';

export class GameState {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
        this.board = null;
        this.devCards = null;
        this.tradeManager = new TradeManager();
        this.settings = { ...DEFAULT_GAME_SETTINGS };

        this.phase = GAME_PHASES.LOBBY;
        this.currentPlayerIndex = 0;
        this.setupRound = 1; // 1 or 2 for setup phase
        this.setupDirection = 1; // 1 = forward, -1 = backward (snake draft)

        this.lastDiceRoll = null;
        this.winner = null;
        this.turnNumber = 0;

        this.log = []; // game log messages
    }

    // ---- SETTINGS (lobby only) ----

    updateSettings(playerId, newSettings) {
        if (this.phase !== GAME_PHASES.LOBBY) return { error: 'Game already started' };
        // Only host (first player) can change settings
        if (this.players.length === 0 || this.players[0].id !== playerId) {
            return { error: 'Only the host can change settings' };
        }

        // Validate mapType
        if (newSettings.mapType && MAP_CONFIGS[newSettings.mapType]) {
            this.settings.mapType = newSettings.mapType;
        }
        if (typeof newSettings.friendlyRobber === 'boolean') {
            this.settings.friendlyRobber = newSettings.friendlyRobber;
        }
        if (typeof newSettings.speedMode === 'boolean') {
            this.settings.speedMode = newSettings.speedMode;
        }
        if (newSettings.victoryPoints && [10, 12, 14, 16, 18].includes(newSettings.victoryPoints)) {
            this.settings.victoryPoints = newSettings.victoryPoints;
        }
        if (typeof newSettings.harbormaster === 'boolean') {
            this.settings.harbormaster = newSettings.harbormaster;
        }

        return { success: true, settings: this.settings };
    }

    // ---- LOBBY ----

    addPlayer(id, name) {
        if (this.phase !== GAME_PHASES.LOBBY) return { error: 'Game already started' };
        if (this.players.length >= 8) return { error: 'Room is full' };
        if (this.players.find(p => p.id === id)) return { error: 'Already in room' };

        const color = PLAYER_COLORS[this.players.length];
        const player = new Player(id, name, color);
        this.players.push(player);
        this._addLog(`${name} joined the game`);
        return { success: true, player };
    }

    removePlayer(id) {
        if (this.phase === GAME_PHASES.LOBBY) {
            this.players = this.players.filter(p => p.id !== id);
            // Reassign colors
            this.players.forEach((p, i) => { p.color = PLAYER_COLORS[i]; });
        } else {
            const player = this.getPlayer(id);
            if (player) {
                player.connected = false;
                this._addLog(`${player.name} disconnected`);
            }
        }
    }

    reconnectPlayer(id) {
        const player = this.getPlayer(id);
        if (player) {
            player.connected = true;
            this._addLog(`${player.name} reconnected`);
        }
    }

    getPlayer(id) {
        return this.players.find(p => p.id === id);
    }

    get currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // ---- START GAME ----

    startGame(playerId) {
        if (this.phase !== GAME_PHASES.LOBBY) return { error: 'Game already started' };
        if (this.players.length === 0 || this.players[0].id !== playerId) {
            return { error: 'Only the host can start the game' };
        }

        // Validate player count for selected map
        const mapConfig = MAP_CONFIGS[this.settings.mapType];
        if (this.players.length > mapConfig.maxPlayers) {
            return { error: `${mapConfig.label} supports max ${mapConfig.maxPlayers} players` };
        }

        // Initialize board and cards
        this.board = new Board(this.players.length, this.settings.mapType);

        // Override board victory points with user setting
        if (this.settings.victoryPoints) {
            this.board.victoryPoints = this.settings.victoryPoints;
        }

        this.devCards = new DevelopmentCards(this.players.length); // Keep original parameter for dev cards

        // Randomize player order
        this._shuffleArray(this.players);
        this.players.forEach((p, i) => { p.color = PLAYER_COLORS[i]; });

        // Give starting resources in speed mode
        if (this.settings.speedMode) {
            this.players.forEach(player => {
                Object.values(RESOURCES).forEach(res => {
                    player.addResource(res, 2);
                });
            });
            this._addLog('⚡ Speed Mode: each player starts with 2 of each resource');
        }

        this.phase = GAME_PHASES.SETUP_SETTLEMENT_1;
        this.currentPlayerIndex = 0;
        this.setupRound = 1;
        this.turnNumber = 1;

        this._addLog(`Game started! Map: ${mapConfig.label}`);
        this._addLog(`${this.currentPlayer.name}'s turn to place a settlement`);

        return { success: true };
    }

    // ---- SETUP PHASE ----

    placeSetupSettlement(playerId, vertexId) {
        if (this.phase !== GAME_PHASES.SETUP_SETTLEMENT_1 && this.phase !== GAME_PHASES.SETUP_SETTLEMENT_2) {
            return { error: 'Not in setup settlement phase' };
        }
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const validation = this._validateSettlementPlacement(vertexId, true);
        if (validation.error) return validation;

        // Place settlement
        this.board.vertices[vertexId].building = { type: 'settlement', playerId };
        this.currentPlayer.settlements.push(vertexId);

        // In second round, give resources from adjacent hexes
        if (this.phase === GAME_PHASES.SETUP_SETTLEMENT_2) {
            const adjacentHexes = this.board.getVertexHexes(vertexId);
            adjacentHexes.forEach(hex => {
                if (hex.resource) {
                    this.currentPlayer.addResource(hex.resource);
                }
            });
        }

        this._addLog(`${this.currentPlayer.name} placed a settlement`);

        // Move to road placement
        this.phase = this.setupRound === 1 ? GAME_PHASES.SETUP_ROAD_1 : GAME_PHASES.SETUP_ROAD_2;

        return { success: true };
    }

    placeSetupRoad(playerId, edgeId) {
        if (this.phase !== GAME_PHASES.SETUP_ROAD_1 && this.phase !== GAME_PHASES.SETUP_ROAD_2) {
            return { error: 'Not in setup road phase' };
        }
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const edge = this.board.edges[edgeId];
        if (!edge) return { error: 'Invalid edge' };
        if (edge.road) return { error: 'Edge already has a road' };

        // Must connect to the settlement just placed
        const lastSettlement = this.currentPlayer.settlements[this.currentPlayer.settlements.length - 1];
        if (!edge.vertices.includes(lastSettlement)) {
            return { error: 'Road must connect to your last placed settlement' };
        }

        // Place road
        edge.road = { playerId };
        this.currentPlayer.roads.push(edgeId);

        this._addLog(`${this.currentPlayer.name} placed a road`);
        this._revealAdjacentFog(edgeId);

        // Advance to next player or next phase
        this._advanceSetup();

        return { success: true };
    }

    _advanceSetup() {
        if (this.setupRound === 1) {
            // First round: forward
            if (this.currentPlayerIndex < this.players.length - 1) {
                this.currentPlayerIndex++;
                this.phase = GAME_PHASES.SETUP_SETTLEMENT_1;
            } else {
                // Start second round (reverse)
                this.setupRound = 2;
                this.phase = GAME_PHASES.SETUP_SETTLEMENT_2;
                // Stay on last player
            }
        } else {
            // Second round: backward
            if (this.currentPlayerIndex > 0) {
                this.currentPlayerIndex--;
                this.phase = GAME_PHASES.SETUP_SETTLEMENT_2;
            } else {
                // Setup complete! Start normal play
                this.phase = GAME_PHASES.ROLL_DICE;
                this.currentPlayerIndex = 0;
                this._addLog('Setup complete! Game begins.');
                this._addLog(`${this.currentPlayer.name}'s turn — roll the dice!`);
            }
        }

        if (this.phase === GAME_PHASES.SETUP_SETTLEMENT_1 || this.phase === GAME_PHASES.SETUP_SETTLEMENT_2) {
            this._addLog(`${this.currentPlayer.name}'s turn to place a settlement`);
        }
    }

    // ---- DICE ----

    rollDice(playerId) {
        if (this.phase !== GAME_PHASES.ROLL_DICE) return { error: 'Not in dice rolling phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2;
        this.lastDiceRoll = { die1, die2, total };

        this._addLog(`${this.currentPlayer.name} rolled ${die1} + ${die2} = ${total}`);

        if (total === 7) {
            // Check if any player has more than 7 cards
            let anyMustDiscard = false;
            this.players.forEach(p => {
                if (p.totalResources > 7) {
                    p.mustDiscard = Math.floor(p.totalResources / 2);
                    anyMustDiscard = true;
                }
            });

            if (anyMustDiscard) {
                this.phase = GAME_PHASES.DISCARD;
                this._addLog('Players with more than 7 resources must discard half');
            } else {
                this.phase = GAME_PHASES.MOVE_ROBBER;
                this._addLog(`${this.currentPlayer.name} must move the robber`);
            }
        } else {
            // Distribute resources
            this._distributeResources(total);
            this.phase = GAME_PHASES.MAIN;
        }

        return { success: true, dice: this.lastDiceRoll };
    }

    _distributeResources(diceRoll) {
        const producingHexes = this.board.hexes.filter(h =>
            h.numberToken === diceRoll && !h.hasRobber && h.resource
        );

        producingHexes.forEach(hex => {
            // Find vertices with buildings on this hex
            this.board.vertices.forEach(vertex => {
                if (!vertex.building) return;

                const touchesHex = vertex.hexes
                    ? vertex.hexes.some(h => h.hexId === hex.id)
                    : false;

                if (touchesHex) {
                    const player = this.getPlayer(vertex.building.playerId);
                    if (player) {
                        const amount = vertex.building.type === 'city' ? 2 : 1;
                        player.addResource(hex.resource, amount);
                    }
                }
            });
        });
    }

    // ---- DISCARD ----

    discardResources(playerId, resources) {
        if (this.phase !== GAME_PHASES.DISCARD) return { error: 'Not in discard phase' };

        const player = this.getPlayer(playerId);
        if (!player) return { error: 'Player not found' };
        if (player.mustDiscard === 0) return { error: 'You dont need to discard' };

        const totalDiscarding = Object.values(resources).reduce((a, b) => a + b, 0);
        if (totalDiscarding !== player.mustDiscard) {
            return { error: `Must discard exactly ${player.mustDiscard} cards` };
        }

        // Validate player has enough of each resource
        for (const [resource, amount] of Object.entries(resources)) {
            if (player.resources[resource] < amount) {
                return { error: `Not enough ${resource}` };
            }
        }

        // Remove resources
        for (const [resource, amount] of Object.entries(resources)) {
            player.removeResource(resource, amount);
        }
        player.mustDiscard = 0;

        this._addLog(`${player.name} discarded ${totalDiscarding} resources`);

        // Check if all players have discarded
        if (this.players.every(p => p.mustDiscard === 0)) {
            this.phase = GAME_PHASES.MOVE_ROBBER;
            this._addLog(`${this.currentPlayer.name} must move the robber`);
        }

        return { success: true };
    }

    // ---- ROBBER ----

    moveRobber(playerId, hexId) {
        if (this.phase !== GAME_PHASES.MOVE_ROBBER) return { error: 'Not in robber phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const hex = this.board.hexes[hexId];
        if (!hex) return { error: 'Invalid hex' };
        if (hex.id === this.board.robberHex) return { error: 'Must move robber to a different hex' };

        // Move robber
        this.board.hexes[this.board.robberHex].hasRobber = false;
        hex.hasRobber = true;
        this.board.robberHex = hexId;

        this._addLog(`${this.currentPlayer.name} moved the robber`);

        // Check who can be stolen from
        const stealTargets = this._getStealTargets(hexId, playerId);

        if (stealTargets.length > 0) {
            this.phase = GAME_PHASES.STEAL;
            return { success: true, stealTargets: stealTargets.map(p => p.id) };
        } else {
            this.phase = GAME_PHASES.MAIN;
            return { success: true, stealTargets: [] };
        }
    }

    stealResource(playerId, targetId) {
        if (this.phase !== GAME_PHASES.STEAL) return { error: 'Not in steal phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const target = this.getPlayer(targetId);
        if (!target) return { error: 'Invalid target' };

        // Verify target is actually on the robber hex or in valid targets
        const validTargets = this._getStealTargets(this.board.robberHex, playerId);
        if (!validTargets.find(p => p.id === targetId)) {
            return { error: 'Target not on robber hex' };
        }

        if (target.totalResources === 0) return { error: 'Target has no resources' };

        // Steal random resource
        const availableResources = [];
        Object.entries(target.resources).forEach(([resource, amount]) => {
            for (let i = 0; i < amount; i++) availableResources.push(resource);
        });

        const stolen = availableResources[Math.floor(Math.random() * availableResources.length)];
        target.removeResource(stolen);
        this.currentPlayer.addResource(stolen);

        this._addLog(`${this.currentPlayer.name} stole a resource from ${target.name}`);

        this.phase = GAME_PHASES.MAIN;
        return { success: true, resource: stolen };
    }

    _getStealTargets(hexId, playerId) {
        const targets = new Set();

        this.board.vertices.forEach(vertex => {
            if (!vertex.building) return;
            if (vertex.building.playerId === playerId) return;

            const touchesHex = vertex.hexes
                ? vertex.hexes.some(h => h.hexId === hexId)
                : false;

            if (touchesHex) {
                const player = this.getPlayer(vertex.building.playerId);
                if (player && player.totalResources > 0) {
                    // Friendly robber: can't target players with ≤2 VP
                    if (this.settings.friendlyRobber && player.publicVictoryPoints <= 2) {
                        return;
                    }
                    targets.add(player);
                }
            }
        });

        return Array.from(targets);
    }

    // ---- BUILDING ----

    buildSettlement(playerId, vertexId) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;
        if (!player.canAfford(BUILDING_COSTS.settlement)) return { error: 'Cannot afford settlement' };
        if (player.settlements.length >= BUILDING_LIMITS.settlement) return { error: 'Max settlements reached' };

        const validation = this._validateSettlementPlacement(vertexId, false, playerId);
        if (validation.error) return validation;

        player.pay(BUILDING_COSTS.settlement);
        this.board.vertices[vertexId].building = { type: 'settlement', playerId };
        player.settlements.push(vertexId);

        this._addLog(`${player.name} built a settlement`);
        this._checkLongestRoad();
        this._checkWin();

        return { success: true };
    }

    buildCity(playerId, vertexId) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;
        if (!player.canAfford(BUILDING_COSTS.city)) return { error: 'Cannot afford city' };
        if (player.cities.length >= BUILDING_LIMITS.city) return { error: 'Max cities reached' };

        const vertex = this.board.vertices[vertexId];
        if (!vertex) return { error: 'Invalid vertex' };
        if (!vertex.building || vertex.building.type !== 'settlement' || vertex.building.playerId !== playerId) {
            return { error: 'Must upgrade your own settlement' };
        }

        player.pay(BUILDING_COSTS.city);
        vertex.building = { type: 'city', playerId };
        player.settlements = player.settlements.filter(v => v !== vertexId);
        player.cities.push(vertexId);

        this._addLog(`${player.name} built a city`);
        this._checkWin();

        return { success: true };
    }

    buildRoad(playerId, edgeId) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;
        if (!player.canAfford(BUILDING_COSTS.road)) return { error: 'Cannot afford road' };
        if (player.roads.length >= BUILDING_LIMITS.road) return { error: 'Max roads reached' };

        const validation = this._validateRoadPlacement(edgeId, playerId);
        if (validation.error) return validation;

        player.pay(BUILDING_COSTS.road);
        this.board.edges[edgeId].road = { playerId };
        player.roads.push(edgeId);

        this._addLog(`${player.name} built a road`);
        this._revealAdjacentFog(edgeId);
        this._updateLongestRoad(playerId);
        this._checkLongestRoad();
        this._checkWin();

        return { success: true };
    }

    // Free road building (from dev card)
    buildFreeRoad(playerId, edgeId) {
        const validation = this._validateRoadPlacement(edgeId, playerId);
        if (validation.error) return validation;

        const player = this.getPlayer(playerId);
        this.board.edges[edgeId].road = { playerId };
        player.roads.push(edgeId);

        this._addLog(`${player.name} built a free road`);
        this._revealAdjacentFog(edgeId);
        this._updateLongestRoad(playerId);
        this._checkLongestRoad();

        return { success: true };
    }

    // ---- VALIDATION ----

    _validateSettlementPlacement(vertexId, isSetup = false, playerId = null) {
        const vertex = this.board.vertices[vertexId];
        if (!vertex) return { error: 'Invalid vertex' };
        if (vertex.building) return { error: 'Vertex already occupied' };

        // Distance rule: no adjacent vertex can have a building
        const adjacentVertices = this.board.getAdjacentVertices(vertexId);
        for (const adjId of adjacentVertices) {
            if (this.board.vertices[adjId].building) {
                return { error: 'Too close to another settlement (distance rule)' };
            }
        }

        // During normal play, must connect to player's road network
        if (!isSetup && playerId) {
            const connectedEdges = this.board.getVertexEdges(vertexId);
            const hasRoad = connectedEdges.some(e => e.road && e.road.playerId === playerId);
            if (!hasRoad) return { error: 'Must be connected to your road network' };
        }

        // Fog Island rule: all adjacent hexes must be revealed
        if (this.settings.mapType === MAP_TYPES.FOG_ISLAND) {
            const touchesFog = vertex.hexes.some(vh => this.board.hexes[vh.hexId].fog);
            if (touchesFog) {
                return { error: 'No puedes construir aquí: todos los hexágonos adyacentes deben estar descubiertos' };
            }
        }

        return { success: true };
    }

    _validateRoadPlacement(edgeId, playerId) {
        const edge = this.board.edges[edgeId];
        if (!edge) return { error: 'Invalid edge' };
        if (edge.road) return { error: 'Edge already has a road' };

        // Must connect to player's existing road or building
        const [v1, v2] = edge.vertices;

        const hasConnectionAtV1 = this._playerHasConnectionAt(v1, playerId);
        const hasConnectionAtV2 = this._playerHasConnectionAt(v2, playerId);

        if (!hasConnectionAtV1 && !hasConnectionAtV2) {
            return { error: 'Road must connect to your network' };
        }

        return { success: true };
    }

    _playerHasConnectionAt(vertexId, playerId) {
        const vertex = this.board.vertices[vertexId];

        // Has a building here
        if (vertex.building && vertex.building.playerId === playerId) return true;

        // Has a road leading here (and no enemy building blocking)
        if (vertex.building && vertex.building.playerId !== playerId) return false;

        const edges = this.board.getVertexEdges(vertexId);
        return edges.some(e => e.road && e.road.playerId === playerId);
    }

    // ---- LONGEST ROAD ----

    _updateLongestRoad(playerId) {
        const player = this.getPlayer(playerId);
        player.longestRoadLength = this._calculateLongestRoad(playerId);
    }

    _calculateLongestRoad(playerId) {
        const playerEdges = this.board.edges.filter(e => e.road && e.road.playerId === playerId);
        if (playerEdges.length === 0) return 0;

        let maxLength = 0;

        // Try starting from each vertex that has the player's road
        const startVertices = new Set();
        playerEdges.forEach(e => {
            startVertices.add(e.vertices[0]);
            startVertices.add(e.vertices[1]);
        });

        for (const startVertex of startVertices) {
            const length = this._dfsRoadLength(playerId, startVertex, new Set());
            maxLength = Math.max(maxLength, length);
        }

        return maxLength;
    }

    _dfsRoadLength(playerId, vertexId, visitedEdges) {
        // Check if blocked by enemy building
        const vertex = this.board.vertices[vertexId];
        if (vertex.building && vertex.building.playerId !== playerId && visitedEdges.size > 0) {
            return 0;
        }

        let maxLength = 0;
        const edges = this.board.getVertexEdges(vertexId);

        for (const edge of edges) {
            if (visitedEdges.has(edge.id)) continue;
            if (!edge.road || edge.road.playerId !== playerId) continue;

            visitedEdges.add(edge.id);
            const nextVertex = edge.vertices.find(v => v !== vertexId);
            const length = 1 + this._dfsRoadLength(playerId, nextVertex, visitedEdges);
            maxLength = Math.max(maxLength, length);
            visitedEdges.delete(edge.id);
        }

        return maxLength;
    }

    _checkLongestRoad() {
        let longestPlayer = null;
        let longestLength = 4; // Minimum 5 roads needed

        this.players.forEach(player => {
            this._updateLongestRoad(player.id);
            if (player.longestRoadLength > longestLength) {
                longestLength = player.longestRoadLength;
                longestPlayer = player;
            }
        });

        // Reset all
        this.players.forEach(p => { p.hasLongestRoad = false; });

        if (longestPlayer) {
            longestPlayer.hasLongestRoad = true;
        }
    }

    // ---- DEVELOPMENT CARDS ----

    buyDevCard(playerId) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;
        if (!player.canAfford(BUILDING_COSTS.devCard)) return { error: 'Cannot afford development card' };

        const card = this.devCards.draw();
        if (!card) return { error: 'No more development cards' };

        player.pay(BUILDING_COSTS.devCard);
        player.devCards.push(card);
        player.devCardsBoughtThisTurn.push(card);

        this._addLog(`${player.name} bought a development card`);

        if (card === DEV_CARD_TYPES.VICTORY_POINT) {
            this._checkWin();
        }

        return { success: true, card };
    }

    playDevCard(playerId, cardType, params = {}) {
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;

        // Can't play VP cards actively
        if (cardType === DEV_CARD_TYPES.VICTORY_POINT) {
            return { error: 'Victory point cards are played automatically' };
        }

        // Can only play one dev card per turn
        if (player.devCardPlayedThisTurn) {
            return { error: 'Already played a development card this turn' };
        }

        // Can't play cards bought this turn
        const cardIndex = player.devCards.indexOf(cardType);
        if (cardIndex === -1) return { error: 'You don\'t have this card' };
        if (player.devCardsBoughtThisTurn.includes(cardType) &&
            player.devCards.filter(c => c === cardType).length <= player.devCardsBoughtThisTurn.filter(c => c === cardType).length) {
            return { error: 'Cannot play a card bought this turn' };
        }

        // Remove card from hand
        player.devCards.splice(cardIndex, 1);
        player.playedDevCards.push(cardType);
        player.devCardPlayedThisTurn = true;

        switch (cardType) {
            case DEV_CARD_TYPES.KNIGHT:
                return this._playKnight(player);
            case DEV_CARD_TYPES.ROAD_BUILDING:
                return this._playRoadBuilding(player);
            case DEV_CARD_TYPES.YEAR_OF_PLENTY:
                return this._playYearOfPlenty(player, params);
            case DEV_CARD_TYPES.MONOPOLY:
                return this._playMonopoly(player, params);
            default:
                return { error: 'Unknown card type' };
        }
    }

    _playKnight(player) {
        player.knightsPlayed++;
        this._checkLargestArmy();
        this.phase = GAME_PHASES.MOVE_ROBBER;
        this._addLog(`${player.name} played a Knight`);
        return { success: true, action: 'move_robber' };
    }

    _playRoadBuilding(player) {
        this._addLog(`${player.name} played Road Building`);
        return { success: true, action: 'build_two_roads', freeRoads: 2 };
    }

    _playYearOfPlenty(player, { resource1, resource2 }) {
        if (!resource1 || !resource2) return { error: 'Must choose 2 resources' };
        player.addResource(resource1);
        player.addResource(resource2);
        this._addLog(`${player.name} played Year of Plenty`);
        return { success: true };
    }

    _playMonopoly(player, { resource }) {
        if (!resource) return { error: 'Must choose a resource' };
        let totalStolen = 0;

        this.players.forEach(p => {
            if (p.id === player.id) return;
            const amount = p.resources[resource] || 0;
            if (amount > 0) {
                p.resources[resource] = 0;
                totalStolen += amount;
            }
        });

        player.addResource(resource, totalStolen);
        this._addLog(`${player.name} played Monopoly on ${resource} and took ${totalStolen}`);
        return { success: true, totalStolen };
    }

    _checkLargestArmy() {
        let largestPlayer = null;
        let largestCount = 2; // Need at least 3

        this.players.forEach(player => {
            if (player.knightsPlayed > largestCount) {
                largestCount = player.knightsPlayed;
                largestPlayer = player;
            }
        });

        this.players.forEach(p => { p.hasLargestArmy = false; });

        if (largestPlayer) {
            largestPlayer.hasLargestArmy = true;
        }
    }

    // ---- TRADING ----

    proposeTrade(playerId, offering, requesting) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;

        // Validate player has the offered resources
        for (const [resource, amount] of Object.entries(offering)) {
            if (player.resources[resource] < amount) {
                return { error: `Not enough ${resource}` };
            }
        }

        const trade = this.tradeManager.proposeTrade(playerId, offering, requesting);
        this._addLog(`${player.name} proposed a trade`);
        return { success: true, trade };
    }

    respondToTrade(playerId, accepted) {
        const trade = this.tradeManager.respondToTrade(playerId, accepted);
        if (!trade) return { error: 'No active trade' };

        const player = this.getPlayer(playerId);
        this._addLog(`${player.name} ${accepted ? 'accepted' : 'declined'} the trade`);

        if (accepted) {
            // Execute trade
            const proposer = this.getPlayer(trade.proposerId);

            // Validate both players still have resources
            for (const [resource, amount] of Object.entries(trade.offering)) {
                if (proposer.resources[resource] < amount) {
                    this.tradeManager.cancelTrade();
                    return { error: 'Proposer no longer has enough resources' };
                }
            }
            for (const [resource, amount] of Object.entries(trade.requesting)) {
                if (player.resources[resource] < amount) {
                    this.tradeManager.cancelTrade();
                    return { error: 'You don\'t have enough resources' };
                }
            }

            // Execute
            for (const [resource, amount] of Object.entries(trade.offering)) {
                proposer.removeResource(resource, amount);
                player.addResource(resource, amount);
            }
            for (const [resource, amount] of Object.entries(trade.requesting)) {
                player.removeResource(resource, amount);
                proposer.addResource(resource, amount);
            }

            this._addLog(`Trade complete between ${proposer.name} and ${player.name}`);
            this.tradeManager.cancelTrade();
        }

        return { success: true, trade };
    }

    cancelTrade(playerId) {
        this.tradeManager.cancelTrade();
        return { success: true };
    }

    bankTrade(playerId, offering, requesting) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        const player = this.currentPlayer;
        if (!TradeManager.canBankTrade(player, offering, requesting, this.board)) {
            return { error: 'Invalid bank trade' };
        }

        TradeManager.executeBankTrade(player, offering, requesting);
        this._addLog(`${player.name} traded with the bank`);

        return { success: true };
    }

    // ---- TURN MANAGEMENT ----

    endTurn(playerId) {
        if (this.phase !== GAME_PHASES.MAIN) return { error: 'Not in main phase' };
        if (this.currentPlayer.id !== playerId) return { error: 'Not your turn' };

        // Reset turn state
        this.currentPlayer.devCardPlayedThisTurn = false;
        this.currentPlayer.devCardsBoughtThisTurn = [];
        this.tradeManager.cancelTrade();

        // Advance to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.turnNumber++;
        this.phase = GAME_PHASES.ROLL_DICE;

        this._addLog(`${this.currentPlayer.name}'s turn — roll the dice!`);

        return { success: true };
    }

    // ---- WIN CHECK ----

    _checkWin() {
        const config = BOARD_CONFIGS[this.players.length] || BOARD_CONFIGS[4];
        const vpToWin = config.victoryPoints;

        for (const player of this.players) {
            if (player.victoryPoints >= vpToWin) {
                this.phase = GAME_PHASES.GAME_OVER;
                this.winner = player.id;
                this._addLog(`🎉 ${player.name} wins with ${player.victoryPoints} victory points!`);
                return true;
            }
        }
        return false;
    }

    // ---- VALID PLACEMENTS ----

    getValidSettlementPlacements(playerId, isSetup = false) {
        return this.board.vertices
            .filter(v => !this._validateSettlementPlacement(v.id, isSetup, playerId).error)
            .map(v => v.id);
    }

    getValidRoadPlacements(playerId) {
        return this.board.edges
            .filter(e => !this._validateRoadPlacement(e.id, playerId).error)
            .map(e => e.id);
    }

    getValidCityPlacements(playerId) {
        return this.board.vertices
            .filter(v => v.building && v.building.type === 'settlement' && v.building.playerId === playerId)
            .map(v => v.id);
    }

    // ---- UTILITY ----

    _addLog(message) {
        this.log.push({
            message,
            timestamp: Date.now(),
            turn: this.turnNumber,
        });
        // Keep last 100 messages
        if (this.log.length > 100) this.log.shift();
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    _revealAdjacentFog(edgeId) {
        if (this.settings.mapType !== MAP_TYPES.FOG_ISLAND) return;

        const edge = this.board.edges[edgeId];
        edge.vertices.forEach(vertexId => {
            const hexes = this.board.getVertexHexes(vertexId);
            hexes.forEach(hex => {
                if (hex.fog) {
                    if (this.board.revealHex(hex.id)) {
                        this._addLog(`A path into the fog was found!`);
                    }
                }
            });
        });
    }

    // ---- SERIALIZATION ----

    // Get game state for a specific player (hides other players' cards)
    getStateForPlayer(playerId) {
        const player = this.getPlayer(playerId);

        return {
            roomCode: this.roomCode,
            phase: this.phase,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.currentPlayer?.id,
            turnNumber: this.turnNumber,
            lastDiceRoll: this.lastDiceRoll,
            winner: this.winner,
            board: this.board?.toJSON(),
            settings: this.settings,
            players: this.players.map(p =>
                p.id === playerId ? p.toJSON() : p.toPublicJSON()
            ),
            myPlayerId: playerId,
            devCardsRemaining: this.devCards?.remaining ?? 0,
            activeTrade: this.tradeManager.activeTrade,
            log: this.log.slice(-20),
            validPlacements: this._getValidPlacements(playerId),
        };
    }

    _getValidPlacements(playerId) {
        if (this.currentPlayer?.id !== playerId) return {};

        const isSetup = [
            GAME_PHASES.SETUP_SETTLEMENT_1,
            GAME_PHASES.SETUP_SETTLEMENT_2,
        ].includes(this.phase);

        const isSetupRoad = [
            GAME_PHASES.SETUP_ROAD_1,
            GAME_PHASES.SETUP_ROAD_2,
        ].includes(this.phase);

        const result = {};

        if (isSetup) {
            result.settlements = this.getValidSettlementPlacements(playerId, true);
        } else if (isSetupRoad) {
            result.roads = this.getValidRoadPlacements(playerId);
        } else if (this.phase === GAME_PHASES.MAIN) {
            const player = this.getPlayer(playerId);
            if (player.canAfford(BUILDING_COSTS.settlement)) {
                result.settlements = this.getValidSettlementPlacements(playerId, false);
            }
            if (player.canAfford(BUILDING_COSTS.road)) {
                result.roads = this.getValidRoadPlacements(playerId);
            }
            if (player.canAfford(BUILDING_COSTS.city)) {
                result.cities = this.getValidCityPlacements(playerId);
            }
        } else if (this.phase === GAME_PHASES.STEAL) {
            const targets = this._getStealTargets(this.board.robberHex, playerId);
            result.stealTargets = targets.map(p => p.id);
        }

        return result;
    }
    debugUpdatePort(playerId, edgeId, type) {
        // In a real game we'd check if host, but for debug let anyone
        if (!this.board) return { error: 'No board' };
        this.board.updatePort(edgeId, type);
        return { success: true };
    }

    debugClearPorts(playerId) {
        if (!this.board) return { error: 'No board' };
        this.board.clearAllPorts();
        return { success: true };
    }
}
