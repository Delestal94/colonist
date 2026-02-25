// ============================================
// BOARD - Hexagonal Board Generation
// ============================================

import { TERRAIN, TERRAIN_TO_RESOURCE, BOARD_CONFIGS, NUMBER_TOKENS, PORT_TYPES, MAP_CONFIGS, MAP_TYPES } from './constants.js';

/**
 * Generates a hexagonal board using axial coordinates.
 * Supports different map shapes via mapType.
 */
export class Board {
    constructor(playerCount, mapType = MAP_TYPES.BASE) {
        const mapConfig = MAP_CONFIGS[mapType] || MAP_CONFIGS[MAP_TYPES.BASE];
        this.mapType = mapType;
        this.mapConfig = mapConfig;
        this.desertCount = mapConfig.deserts;
        this.victoryPoints = mapConfig.victoryPoints;

        this.hexes = [];        // { id, q, r, terrain, resource, numberToken, hasRobber, fog }
        this.vertices = [];     // { id, hexes: [{q,r}], position: {x,y}, building: null, port: null }
        this.edges = [];        // { id, vertices: [v1Id, v2Id], road: null }
        this.ports = [];        // { vertexIds: [v1, v2], type }
        this.robberHex = null;  // hex id where robber sits

        this._hexCoords = mapConfig.getHexes(playerCount);

        // Fog Island Special Layout: Gap at radius 1
        if (this.mapType === MAP_TYPES.FOG_ISLAND) {
            this._hexCoords = this._hexCoords.filter(coord => {
                const dist = (Math.abs(coord.q) + Math.abs(coord.q + coord.r) + Math.abs(coord.r)) / 2;
                return dist !== 1;
            });
        }

        this._generate();
    }

    _generate() {
        this._generateHexes();
        this._assignTerrain();
        this._assignNumberTokens();
        if (this.mapConfig.fogMode) {
            this._applyFog();
        }
        this._generateVertices();
        this._generateEdges();
        this._assignPorts();
    }

    _generateHexes() {
        this.hexes = this._hexCoords.map((coord, id) => ({
            id,
            q: coord.q,
            r: coord.r,
            terrain: null,
            resource: null,
            numberToken: null,
            hasRobber: false,
            fog: false,
        }));
    }

    _assignTerrain() {
        const isFogIsland = this.mapType === MAP_TYPES.FOG_ISLAND;
        const terrains = [];

        if (isFogIsland) {
            // In Fog Island, inner area is Forest, center is Desert
            this.hexes.forEach(hex => {
                const dist = (Math.abs(hex.q) + Math.abs(hex.q + hex.r) + Math.abs(hex.r)) / 2;
                if (dist === 0) {
                    hex.terrain = TERRAIN.DESERT;
                } else if (dist === 1) {
                    hex.terrain = TERRAIN.WATER; // Water moat
                } else if (dist <= 3) {
                    hex.terrain = TERRAIN.FOREST;
                }
            });

            // Remaining hexes (fog) get random terrains
            const fogHexes = this.hexes.filter(h => h.terrain === null);
            const otherTerrains = [TERRAIN.FOREST, TERRAIN.HILLS, TERRAIN.FIELDS, TERRAIN.PASTURE, TERRAIN.MOUNTAINS];
            fogHexes.forEach(hex => {
                hex.terrain = otherTerrains[Math.floor(Math.random() * otherTerrains.length)];
            });
        } else if (this.mapType === MAP_TYPES.RING_OF_FIRE) {
            this.hexes.forEach(hex => {
                const dist = (Math.abs(hex.q) + Math.abs(hex.q + hex.r) + Math.abs(hex.r)) / 2;
                if (dist === 0) hex.terrain = TERRAIN.DESERT;
                else if (dist === 3) {
                    // Outer ring is Fire!
                    hex.terrain = Math.random() > 0.5 ? TERRAIN.MOUNTAINS : TERRAIN.HILLS;
                } else {
                    const t = [TERRAIN.FOREST, TERRAIN.FIELDS, TERRAIN.PASTURE];
                    hex.terrain = t[Math.floor(Math.random() * t.length)];
                }
            });
        } else if (this.mapType === MAP_TYPES.TWIN_PEAKS) {
            this.hexes.forEach(hex => {
                const isPeak = Math.abs(hex.q) > 2;
                if (hex.q === 0 && hex.r === 0) {
                    hex.terrain = TERRAIN.FIELDS; // Bridge
                } else if (isPeak) {
                    hex.terrain = Math.random() > 0.5 ? TERRAIN.MOUNTAINS : TERRAIN.HILLS;
                } else {
                    const t = [TERRAIN.FOREST, TERRAIN.FIELDS, TERRAIN.PASTURE, TERRAIN.DESERT];
                    hex.terrain = t[Math.floor(Math.random() * t.length)];
                }
            });
        } else {
            const totalHexes = this.hexes.length;
            const nonDesert = totalHexes - this.desertCount;
            const terrainTypes = [TERRAIN.FOREST, TERRAIN.HILLS, TERRAIN.FIELDS, TERRAIN.PASTURE, TERRAIN.MOUNTAINS];

            for (let i = 0; i < this.desertCount; i++) terrains.push(TERRAIN.DESERT);
            const perType = Math.floor(nonDesert / terrainTypes.length);
            const extra = nonDesert % terrainTypes.length;
            for (let i = 0; i < terrainTypes.length; i++) {
                const count = perType + (i < extra ? 1 : 0);
                for (let j = 0; j < count; j++) terrains.push(terrainTypes[i]);
            }
            this._shuffle(terrains);
            this.hexes.forEach((hex, i) => {
                if (!hex.terrain) hex.terrain = terrains[i] || TERRAIN.DESERT;
            });
        }

        // Finalize resource assignment
        this.hexes.forEach(hex => {
            hex.resource = TERRAIN_TO_RESOURCE[hex.terrain];
            if (hex.terrain === TERRAIN.DESERT) {
                hex.hasRobber = true;
                this.robberHex = hex.id;
            }
        });
    }

    _assignNumberTokens() {
        // Exclude Desert and Water Moat from receiving number tokens
        const nonDesertHexes = this.hexes.filter(h => h.terrain !== TERRAIN.DESERT && h.terrain !== TERRAIN.WATER);
        const tokens = [];

        while (tokens.length < nonDesertHexes.length) {
            tokens.push(...NUMBER_TOKENS);
        }
        tokens.length = nonDesertHexes.length;
        this._shuffle(tokens);

        // Better distribution: avoid adjacent 6/8
        // Using a greedy swap algorithm for efficiency on large boards
        const maxAttempts = 1000; // Passes of the whole board
        let attempt = 0;

        for (attempt = 0; attempt < maxAttempts; attempt++) {
            let conflictFound = false;

            for (let i = 0; i < nonDesertHexes.length; i++) {
                const hexA = nonDesertHexes[i];
                const tokenA = tokens[i];
                if (tokenA !== 6 && tokenA !== 8) continue;

                // Check for neighbors that are also red
                for (let j = 0; j < nonDesertHexes.length; j++) {
                    if (i === j) continue;
                    const hexB = nonDesertHexes[j];
                    const tokenB = tokens[j];
                    if (tokenB !== 6 && tokenB !== 8) continue;

                    const dq = hexA.q - hexB.q;
                    const dr = hexA.r - hexB.r;
                    const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;

                    if (dist < 1.1) { // They are adjacent and both red
                        conflictFound = true;
                        // Attempt to swap tokenB with a non-red token elsewhere that doesn't create a new conflict
                        let swapped = false;
                        const potentialSwapIndices = [...Array(tokens.length).keys()].sort(() => Math.random() - 0.5);

                        for (const targetIdx of potentialSwapIndices) {
                            const targetToken = tokens[targetIdx];
                            if (targetToken === 6 || targetToken === 8) continue;

                            // Check if swapping targetToken into position j creates a conflict with neighbors of j
                            let createsNewConflict = false;
                            const hexJ = nonDesertHexes[j];
                            for (let k = 0; k < nonDesertHexes.length; k++) {
                                if (j === k) continue;
                                const tokenK = tokens[k];
                                if (tokenK !== 6 && tokenK !== 8) continue;
                                const hK = nonDesertHexes[k];
                                const dJK = (Math.abs(hexJ.q - hK.q) + Math.abs(hexJ.q + hexJ.r - hK.q - hK.r) + Math.abs(hexJ.r - hK.r)) / 2;
                                if (dJK < 1.1) {
                                    // Normally targetToken is NOT red, so this is fine.
                                    // But we also need to check if the RED token moved to targetIdx creates a conflict there.
                                    const hexTarget = nonDesertHexes[targetIdx];
                                    const dRedTarget = (Math.abs(hexTarget.q - hK.q) + Math.abs(hexTarget.q + hexTarget.r - hK.q - hK.r) + Math.abs(hexTarget.r - hK.r)) / 2;
                                    if (dRedTarget < 1.1) {
                                        createsNewConflict = true;
                                        break;
                                    }
                                }
                            }

                            if (!createsNewConflict) {
                                // Perform swap
                                tokens[j] = tokens[targetIdx];
                                tokens[targetIdx] = tokenB;
                                swapped = true;
                                break;
                            }
                        }
                        if (swapped) break; // Break out of inner loop after swap
                    }
                }
            }
            if (!conflictFound) break;
        }

        if (attempt >= maxAttempts) {
            console.warn(`[Board] Failed to find perfect token distribution after greedy swap passes.`);
        }

        nonDesertHexes.forEach((hex, i) => {
            hex.numberToken = tokens[i];
        });
    }

    _applyFog() {
        const fogRadius = this.mapConfig.fogRadius || 2;
        this.hexes.forEach(hex => {
            const distance = (Math.abs(hex.q) + Math.abs(hex.q + hex.r) + Math.abs(hex.r)) / 2;
            if (distance > fogRadius) {
                hex.fog = true;
            }
        });
    }

    revealHex(hexId) {
        const hex = this.hexes[hexId];
        if (hex && hex.fog) {
            hex.fog = false;
            return true;
        }
        return false;
    }

    _generateVertices() {
        // Each hex has 6 corners. Vertices are shared between adjacent hexes.
        // Use a map to deduplicate vertices by their rounded position.
        const vertexMap = new Map();
        const SIZE = 1; // hex size for coordinate calculation

        this.hexes.forEach(hex => {
            const center = this._hexToPixel(hex.q, hex.r, SIZE);

            for (let corner = 0; corner < 6; corner++) {
                const angle = (Math.PI / 180) * (60 * corner - 30);
                const vx = center.x + SIZE * Math.cos(angle);
                const vy = center.y + SIZE * Math.sin(angle);

                // Round to avoid floating point issues
                const key = `${Math.round(vx * 1000)},${Math.round(vy * 1000)}`;

                if (!vertexMap.has(key)) {
                    vertexMap.set(key, {
                        id: vertexMap.size,
                        position: { x: vx, y: vy },
                        hexes: [],
                        building: null, // { type: 'settlement'|'city', playerId }
                        port: null,
                    });
                }

                const vertex = vertexMap.get(key);
                if (!vertex.hexes.find(h => h.q === hex.q && h.r === hex.r)) {
                    vertex.hexes.push({ q: hex.q, r: hex.r, hexId: hex.id });
                }
            }
        });

        this.vertices = Array.from(vertexMap.values());
    }

    _generateEdges() {
        // Edges connect adjacent vertices. Two vertices are adjacent if they
        // share exactly 2 hexes (internal edge) or 1 hex (border edge) and
        // are geometrically adjacent on a hex.
        const edgeMap = new Map();

        this.hexes.forEach(hex => {
            const center = this._hexToPixel(hex.q, hex.r, 1);
            const corners = [];

            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);
                const vx = center.x + Math.cos(angle);
                const vy = center.y + Math.sin(angle);
                const key = `${Math.round(vx * 1000)},${Math.round(vy * 1000)}`;

                // Find vertex by position
                const vertex = this.vertices.find(v =>
                    `${Math.round(v.position.x * 1000)},${Math.round(v.position.y * 1000)}` === key
                );
                if (vertex) corners.push(vertex.id);
            }

            // Connect consecutive corners
            for (let i = 0; i < corners.length; i++) {
                const v1 = Math.min(corners[i], corners[(i + 1) % corners.length]);
                const v2 = Math.max(corners[i], corners[(i + 1) % corners.length]);
                const edgeKey = `${v1}-${v2}`;

                if (!edgeMap.has(edgeKey)) {
                    edgeMap.set(edgeKey, {
                        id: edgeMap.size,
                        vertices: [v1, v2],
                        road: null, // { playerId }
                    });
                }
            }
        });

        this.edges = Array.from(edgeMap.values());
    }

    _assignPorts() {
        if (this.mapType === MAP_TYPES.FOG_ISLAND) {
            this._assignFogIslandPorts();
            return;
        }

        // Find border vertices (vertices that touch fewer than 3 hexes)
        const borderVertices = this.vertices.filter(v => v.hexes.length < 3);

        // Find pairs of adjacent border vertices (border edges)
        const borderEdges = this.edges.filter(e => {
            const v1 = this.vertices[e.vertices[0]];
            const v2 = this.vertices[e.vertices[1]];
            return v1.hexes.length < 3 && v2.hexes.length < 3;
        });

        if (borderEdges.length === 0) return;

        // Sort border edges by angle from center for even distribution
        const edgeAngles = borderEdges.map(e => {
            const v1 = this.vertices[e.vertices[0]];
            const v2 = this.vertices[e.vertices[1]];
            const mx = (v1.position.x + v2.position.x) / 2;
            const my = (v1.position.y + v2.position.y) / 2;
            return { edge: e, angle: Math.atan2(my, mx) };
        });
        edgeAngles.sort((a, b) => a.angle - b.angle);
        const sortedEdges = edgeAngles.map(ea => ea.edge);

        // Port types to assign
        const portTypes = [
            PORT_TYPES.WOOD, PORT_TYPES.BRICK, PORT_TYPES.WHEAT,
            PORT_TYPES.SHEEP, PORT_TYPES.ORE,
            PORT_TYPES.GENERIC, PORT_TYPES.GENERIC, PORT_TYPES.GENERIC, PORT_TYPES.GENERIC
        ];

        // Scale port count for larger boards
        const targetPorts = Math.min(portTypes.length + Math.max(0, Math.floor(sortedEdges.length / 6) - portTypes.length), sortedEdges.length);
        while (portTypes.length < targetPorts) {
            portTypes.push(PORT_TYPES.GENERIC);
        }

        this._shuffle(portTypes);

        // Assign ports, ensuring NO vertex is shared between two ports
        const usedVertices = new Set();
        const spacing = Math.max(1, Math.floor(sortedEdges.length / portTypes.length));

        let portIndex = 0;
        for (let i = 0; i < sortedEdges.length && portIndex < portTypes.length; i++) {
            // Try edges spaced evenly, but skip if vertices are already used
            const candidateIdx = (i * spacing) % sortedEdges.length;
            const edge = sortedEdges[candidateIdx];

            // Skip if either vertex is already used by another port
            if (usedVertices.has(edge.vertices[0]) || usedVertices.has(edge.vertices[1])) {
                continue;
            }

            const type = portTypes[portIndex++];

            usedVertices.add(edge.vertices[0]);
            usedVertices.add(edge.vertices[1]);

            this.vertices[edge.vertices[0]].port = type;
            this.vertices[edge.vertices[1]].port = type;

            this.ports.push({
                edgeId: edge.id,
                vertexIds: [...edge.vertices],
                type,
            });
        }

        // If we didn't place all ports (due to conflicts), do a second pass
        if (portIndex < portTypes.length) {
            for (const edge of sortedEdges) {
                if (portIndex >= portTypes.length) break;
                if (usedVertices.has(edge.vertices[0]) || usedVertices.has(edge.vertices[1])) continue;

                const type = portTypes[portIndex++];
                usedVertices.add(edge.vertices[0]);
                usedVertices.add(edge.vertices[1]);

                this.vertices[edge.vertices[0]].port = type;
                this.vertices[edge.vertices[1]].port = type;

                this.ports.push({
                    edgeId: edge.id,
                    vertexIds: [...edge.vertices],
                    type,
                });
            }
        }
    }

    _hexToPixel(q, r, size) {
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = size * (3 / 2 * r);
        return { x, y };
    }

    _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Get adjacent vertex IDs for a given vertex
    getAdjacentVertices(vertexId) {
        return this.edges
            .filter(e => e.vertices.includes(vertexId))
            .map(e => e.vertices.find(v => v !== vertexId));
    }

    // Get edges connected to a vertex
    getVertexEdges(vertexId) {
        return this.edges.filter(e => e.vertices.includes(vertexId));
    }

    // Get hexes touching a vertex
    getVertexHexes(vertexId) {
        const vertex = this.vertices[vertexId];
        return vertex ? vertex.hexes.map(h => this.hexes[h.hexId]) : [];
    }

    _assignFogIslandPorts() {
        // We want to place 6 ports on the "inner" side of the radius 2 ring (forest).
        // Those edges touch the water gap (radius 1).
        const potentialEdges = this.edges.filter(edge => {
            const v1 = this.vertices[edge.vertices[0]];
            const v2 = this.vertices[edge.vertices[1]];

            // Edge must touch at least one land hex (radius 2)
            const touchesLand = v1.hexes.some(vh => {
                const h = this.hexes[vh.hexId];
                const d = (Math.abs(h.q) + Math.abs(h.q + h.r) + Math.abs(h.r)) / 2;
                return d === 2 && !h.fog;
            });
            if (!touchesLand) return false;

            // Both vertices must be on the inner side of the ring.
            // Inner vertices of radius 2 are at dist ~2.2 or ~2.5 (unit scale).
            const v1Dist = Math.sqrt(v1.position.x ** 2 + v1.position.y ** 2);
            const v2Dist = Math.sqrt(v2.position.x ** 2 + v2.position.y ** 2);

            return v1Dist < 2.8 && v2Dist < 2.8;
        });

        // Sort them by angle to pick 6 evenly spaced ones
        potentialEdges.sort((a, b) => {
            const v1a = this.vertices[a.vertices[0]];
            const v2a = this.vertices[a.vertices[1]];
            const v1b = this.vertices[b.vertices[0]];
            const v2b = this.vertices[b.vertices[1]];
            const ax = (v1a.position.x + v2a.position.x) / 2;
            const ay = (v1a.position.y + v2a.position.y) / 2;
            const bx = (v1b.position.x + v2b.position.x) / 2;
            const by = (v1b.position.y + v2b.position.y) / 2;
            return Math.atan2(ay, ax) - Math.atan2(by, bx);
        });

        // Pick exactly 6 edges (there should be 12 potential inner edges)
        const step = potentialEdges.length / 6;
        for (let i = 0; i < 6; i++) {
            const idx = Math.floor(i * step);
            const edge = potentialEdges[idx];
            if (!edge) continue;

            const type = PORT_TYPES.WOOD; // 2:1 Wood as per user request for Fog Island
            this.vertices[edge.vertices[0]].port = type;
            this.vertices[edge.vertices[1]].port = type;
            this.ports.push({ edgeId: edge.id, vertexIds: [...edge.vertices], type });
        }
    }

    updatePort(edgeId, type) {
        const edge = this.edges[edgeId];
        if (!edge) return false;

        // Remove existing port on these vertices
        const [v1Id, v2Id] = edge.vertices;
        this.ports = this.ports.filter(p => p.edgeId !== edgeId);
        this.vertices[v1Id].port = null;
        this.vertices[v2Id].port = null;

        if (type) {
            this.vertices[v1Id].port = type;
            this.vertices[v2Id].port = type;
            this.ports.push({
                edgeId,
                vertexIds: [v1Id, v2Id],
                type
            });
        }
        return true;
    }

    clearAllPorts() {
        this.ports = [];
        this.vertices.forEach(v => { v.port = null; });
        return true;
    }

    // Serialize for client
    toJSON() {
        return {
            mapType: this.mapType,
            radius: this.radius,
            hexes: this.hexes.map(hex => {
                if (hex.fog) {
                    return {
                        id: hex.id,
                        q: hex.q,
                        r: hex.r,
                        terrain: 'fog',
                        resource: null,
                        numberToken: null,
                        hasRobber: false,
                        fog: true,
                    };
                }
                return hex;
            }),
            vertices: this.vertices.map(v => ({
                id: v.id,
                position: v.position,
                building: v.building,
                port: v.port,
                hexIds: v.hexes.map(h => h.hexId),
            })),
            edges: this.edges.map(e => ({
                id: e.id,
                vertices: e.vertices,
                road: e.road,
            })),
            ports: this.ports,
            robberHex: this.robberHex,
        };
    }
}
