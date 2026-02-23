// ============================================
// BOARD - Hexagonal Board Generation
// ============================================

import { TERRAIN, TERRAIN_TO_RESOURCE, BOARD_CONFIGS, NUMBER_TOKENS, PORT_TYPES } from './constants.js';

/**
 * Generates a hexagonal board using axial coordinates.
 * Scales based on player count.
 */
export class Board {
    constructor(playerCount) {
        const config = BOARD_CONFIGS[playerCount] || BOARD_CONFIGS[4];
        this.radius = config.radius;
        this.desertCount = config.deserts;

        this.hexes = [];        // { id, q, r, terrain, resource, numberToken, hasRobber }
        this.vertices = [];     // { id, hexes: [{q,r}], position: {x,y}, building: null, port: null }
        this.edges = [];        // { id, vertices: [v1Id, v2Id], road: null }
        this.ports = [];        // { vertexIds: [v1, v2], type }
        this.robberHex = null;  // hex id where robber sits

        this._generate();
    }

    _generate() {
        this._generateHexes();
        this._assignTerrain();
        this._assignNumberTokens();
        this._generateVertices();
        this._generateEdges();
        this._assignPorts();
    }

    _generateHexes() {
        let id = 0;
        for (let q = -this.radius; q <= this.radius; q++) {
            const r1 = Math.max(-this.radius, -q - this.radius);
            const r2 = Math.min(this.radius, -q + this.radius);
            for (let r = r1; r <= r2; r++) {
                this.hexes.push({
                    id: id++,
                    q,
                    r,
                    terrain: null,
                    resource: null,
                    numberToken: null,
                    hasRobber: false,
                });
            }
        }
    }

    _assignTerrain() {
        const totalHexes = this.hexes.length;
        const nonDesert = totalHexes - this.desertCount;

        // Distribute terrain types roughly equally
        const terrainTypes = [TERRAIN.FOREST, TERRAIN.HILLS, TERRAIN.FIELDS, TERRAIN.PASTURE, TERRAIN.MOUNTAINS];
        const terrains = [];

        // Add deserts
        for (let i = 0; i < this.desertCount; i++) {
            terrains.push(TERRAIN.DESERT);
        }

        // Fill remaining with resource terrains
        const perType = Math.floor(nonDesert / terrainTypes.length);
        const extra = nonDesert % terrainTypes.length;

        for (let i = 0; i < terrainTypes.length; i++) {
            const count = perType + (i < extra ? 1 : 0);
            for (let j = 0; j < count; j++) {
                terrains.push(terrainTypes[i]);
            }
        }

        // Shuffle
        this._shuffle(terrains);

        // Assign to hexes
        this.hexes.forEach((hex, i) => {
            hex.terrain = terrains[i];
            hex.resource = TERRAIN_TO_RESOURCE[hex.terrain];
            if (hex.terrain === TERRAIN.DESERT) {
                hex.hasRobber = true;
                this.robberHex = hex.id;
            }
        });
    }

    _assignNumberTokens() {
        // Create enough number tokens for non-desert hexes
        const nonDesertHexes = this.hexes.filter(h => h.terrain !== TERRAIN.DESERT);
        const tokens = [];

        // Repeat the base token set as needed
        while (tokens.length < nonDesertHexes.length) {
            tokens.push(...NUMBER_TOKENS);
        }
        tokens.length = nonDesertHexes.length;

        this._shuffle(tokens);

        // Avoid placing 6 or 8 next to each other (best effort)
        nonDesertHexes.forEach((hex, i) => {
            hex.numberToken = tokens[i];
        });
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
            PORT_TYPES.GENERIC, PORT_TYPES.GENERIC, PORT_TYPES.GENERIC, PORT_TYPES.GENERIC,
            PORT_TYPES.WOOD, PORT_TYPES.BRICK, PORT_TYPES.WHEAT, PORT_TYPES.SHEEP, PORT_TYPES.ORE,
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

    // Serialize for client
    toJSON() {
        return {
            radius: this.radius,
            hexes: this.hexes,
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
